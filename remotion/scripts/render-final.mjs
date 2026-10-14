#!/usr/bin/env node
/**
 * Renders a project to a finished mp4.
 *
 *   1. Remotion writes a JPEG image sequence (headless Chrome — no ffmpeg).
 *   2. The SYSTEM ffmpeg builds the audio: the footage's own narration, offset
 *      by the title card, mixed with the music bed under its gain curve.
 *   3. The system ffmpeg muxes the two.
 *
 * WHY NOT `npx remotion render out.mp4`: on Windows with Smart App Control
 * enforcing, every binary Remotion ships (its own ffmpeg included) is blocked
 * from running, and the stitch step dies with no output. Frame rendering is
 * unaffected. Going through the system ffmpeg works on every platform, so this
 * is the one supported path. See docs/gotchas.md section 3.
 *
 * Usage: npm run render -- <project> [output.mp4] [--skip-frames] [--audio-only]
 *   --skip-frames  reuse the frames from the last run (iterate on audio/encode)
 *   --audio-only   build the mix and stop
 *   --frames=A-B   render only frames A..B into the existing sequence, then
 *                  re-encode (for patching a short section after a small change)
 *   --clean        delete the frames once the video is encoded (they take
 *                  several GB; keep them if more changes are likely)
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { FFMPEG_QUIET, ROOT, exampleHint, fail, loadProject, publicPath, remotion, requireFfmpeg, requireImages, run } from "./lib.mjs";
import { musicCurve } from "../src/lib/musicCurve.mjs";

requireFfmpeg();
const flags = process.argv.slice(2).filter((a) => a.startsWith("--"));
const positional = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const proj = loadProject(positional[0]);
const { json } = proj;
const skipFrames = flags.includes("--skip-frames") || flags.includes("--audio-only");
const audioOnly = flags.includes("--audio-only");
const patch = flags.find((f) => f.startsWith("--frames="))?.slice("--frames=".length);

const FPS = json.fps;
const footage = publicPath(json.footage.src);
const music = json.music ? publicPath(json.music.src) : null;
if (!existsSync(footage)) fail(`Footage not found: ${footage}\n  Run: npm run footage -- ${proj.folder}${exampleHint(proj)}`);
if (!audioOnly) requireImages(proj);
if (music && !existsSync(music)) fail(`Music not found: ${music}\n  Fix music.src in ${proj.folder}/project.json, or remove "music".`);

const outFile = resolve(positional[1] ?? join(ROOT, `out/${json.id}.mp4`));
const framesDir = join(ROOT, `out/frames-${json.id}`);
const audioFile = join(ROOT, `out/${json.id}-mix.wav`);
const totalSeconds = json.titleCardSeconds + json.footage.durationSeconds + json.endingSeconds;

/** Piecewise-linear gain automation as an ffmpeg volume expression. */
const envelopeExpr = (points) => {
  let expr = String(points[points.length - 1][1]);
  for (let i = points.length - 2; i >= 0; i--) {
    const [t0, g0] = points[i];
    const [t1, g1] = points[i + 1];
    const seg = t1 === t0 ? String(g1) : `(${g0}+(${g1 - g0})*(t-${t0})/${(t1 - t0).toFixed(6)})`;
    expr = `if(lt(t\\,${t1})\\,${seg}\\,${expr})`;
  }
  return `if(lt(t\\,${points[0][0]})\\,${points[0][1]}\\,${expr})`;
};

// ---- 1. frames -------------------------------------------------------------
const remotionFrames = (dir, extra = []) =>
  remotion(["render", json.id, dir, "--sequence", "--image-format=jpeg", "--jpeg-quality=100", ...extra]);

if (patch) {
  if (!existsSync(framesDir)) fail(`--frames needs an existing full render in ${framesDir}`);
  console.log(`== re-rendering frames ${patch} into the existing sequence ==`);
  // Remotion names sequence files by absolute frame number, so a range render
  // drops straight into place over the old frames.
  remotionFrames(framesDir, [`--frames=${patch}`]);
} else if (skipFrames) {
  console.log("== reusing existing frames ==");
} else {
  console.log("== rendering image sequence ==");
  rmSync(framesDir, { recursive: true, force: true });
  mkdirSync(framesDir, { recursive: true });
  remotionFrames(framesDir);
}

const frameFiles = existsSync(framesDir) ? readdirSync(framesDir).filter((f) => f.endsWith(".jpeg")) : [];
if (!audioOnly && frameFiles.length === 0) fail("No frames were rendered.");
// Remotion zero-pads to the width of the highest frame number (element-0.jpeg
// for a 4-frame test, element-0000.jpeg for a long render). Read it off disk.
const padWidth = frameFiles.length ? (frameFiles[0].match(/element-(\d+)\.jpeg$/)?.[1].length ?? 1) : 1;
const durationSeconds = frameFiles.length ? frameFiles.length / FPS : totalSeconds;
console.log(`\n${frameFiles.length} frames (${durationSeconds.toFixed(2)}s)`);

// ---- 2. audio --------------------------------------------------------------
console.log("\n== building audio mix ==");
const delayMs = Math.round(json.titleCardSeconds * 1000);
const inputs = ["-i", footage];
let graph = `[0:a]adelay=${delayMs}|${delayMs},apad[speech]`;
let mixOut = "[speech]";
if (music) {
  const envPath = join(proj.dir, "musicEnvelope.json");
  const envelope = existsSync(envPath) ? JSON.parse(readFileSync(envPath, "utf8")) : {};
  const points = musicCurve(json, envelope);
  inputs.push("-stream_loop", "-1", "-i", music);
  graph =
    `[0:a]adelay=${delayMs}|${delayMs},apad[speech];` +
    `[1:a]volume='${envelopeExpr(points)}':eval=frame[music];` +
    `[speech][music]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[mixed]`;
  mixOut = "[mixed]";
}
mkdirSync(dirname(audioFile), { recursive: true });
run("ffmpeg", [
  ...FFMPEG_QUIET,
  "-y", ...inputs,
  "-filter_complex", graph,
  "-map", mixOut,
  "-t", durationSeconds.toFixed(3),
  "-ac", "2", "-ar", "48000",
  audioFile,
]);
if (audioOnly) {
  console.log(`\n✓ ${audioFile}`);
  process.exit(0);
}

// ---- 3. mux ----------------------------------------------------------------
console.log("\n== encoding final video ==");
mkdirSync(dirname(outFile), { recursive: true });
run("ffmpeg", [
  ...FFMPEG_QUIET,
  "-y",
  "-framerate", String(FPS),
  "-start_number", "0",
  "-i", join(framesDir, `element-%0${padWidth}d.jpeg`),
  "-i", audioFile,
  "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p",
  "-movflags", "+faststart",
  "-c:a", "aac", "-b:a", "192k",
  "-shortest",
  outFile,
]);
if (!existsSync(outFile)) fail("The encode produced no file.");
console.log(`\n✓ ${outFile}`);
if (flags.includes("--clean")) {
  rmSync(framesDir, { recursive: true, force: true });
  console.log(`  deleted the frames (out/frames-${json.id}/)`);
} else {
  console.log(`  The frames are kept in out/frames-${json.id}/ (several GB) for --skip-frames; delete them when done, or add --clean next time.`);
}
