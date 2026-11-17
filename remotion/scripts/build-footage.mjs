#!/usr/bin/env node
/**
 * Cuts a project's camera original into the footage the video plays.
 *
 * Reads `footagePrep` from the project's project.json:
 *   source            the camera original (relative paths resolve from remotion/),
 *                     or a list of them when the recording came in parts
 *   segments          [in, out] pairs in SOURCE seconds; the gaps between rows
 *                     are removed. With several parts, [part, in, out] with
 *                     part counting from 1 in the source list's order. Omit
 *                     to keep the whole recording (every part, in order).
 *   crossfadeSeconds  each join is a short cross-dissolve, video and audio, so
 *                     an edit reads as a blend rather than a cut. Default 0.4.
 *
 * Writes public/base/<project>.mp4 (the cut footage) and
 * public/base/<project>-title-still.jpg (its first frame: the title card and
 * thumbnail are built on it, so the title card hands over to live footage with
 * nothing but the type changing). Then points footage.src and titleStill at
 * them in project.json, with the footage's real width, height and duration, so
 * those numbers can never drift from the file.
 *
 * Choosing the segments is the footage-prep skill: cut only at sentence
 * boundaries, and land each dissolve entirely inside measured silence.
 *
 * Usage: npm run footage -- <project>
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { ROOT, exampleHint, fail, loadProject, probe, publicPath, requireFfmpeg } from "./lib.mjs";

requireFfmpeg();
const proj = loadProject(process.argv[2]);
const { json } = proj;
const prep = json.footagePrep;
if (!prep?.source)
  fail(
    proj.folder === "_example"
      ? "The example's footage downloads ready-cut, so there is nothing to build. Run: npm run example:media\n  (Its real cut list is in footagePrep.segments, kept as a worked example.)"
      : `${proj.folder}/project.json has no footagePrep.source — set it to your camera original.`
  );

const sourceList = Array.isArray(prep.source) ? prep.source : [prep.source];
if (sourceList.some((p) => p.startsWith("PATH/TO")))
  fail(`footagePrep.source in src/projects/${proj.folder}/project.json is still the placeholder.\n  Set it to your recording, e.g. "C:/Videos/my-update.mp4", then run this again.`);
const srcs = sourceList.map((p) => (isAbsolute(p) ? p : resolve(ROOT, p)));
const infos = srcs.map((src) => {
  if (!existsSync(src)) fail(`footagePrep.source not found: ${src}${exampleHint(proj)}`);
  const info = probe(src);
  if (!info.hasAudio) fail(`${src} has no audio track. The narration comes from the footage's own audio.`);
  return info;
});

// Always this project's own files under public/base/, so a project that
// started out borrowing the example's footage never overwrites it.
const footageSrc = `base/${proj.folder}.mp4`;
const stillSrc = `base/${proj.folder}-title-still.jpg`;
const out = publicPath(footageSrc);
const still = publicPath(stillSrc);
mkdirSync(dirname(out), { recursive: true });
mkdirSync(dirname(still), { recursive: true });

const XFADE = prep.crossfadeSeconds ?? 0.4;
// Every segment as {part (0-based), a, b, fade}: [in, out] means part 1. [part, in, out, fade] sets this join's
// dissolve (the one INTO the segment) when the usual one doesn't fit: a retake that starts 0.1s after a false start.
const segments = prep.segments?.length
  ? prep.segments.map((g) => (g.length >= 3 ? { part: g[0] - 1, a: g[1], b: g[2], fade: g[3] ?? XFADE } : { part: 0, a: g[0], b: g[1], fade: XFADE }))
  : infos.map((info, part) => ({ part, a: 0, b: info.duration, fade: XFADE }));

// Sanity-check the segments before handing ffmpeg anything.
segments.forEach(({ part, a, b, fade }, i) => {
  if (!infos[part]) fail(`segment ${i + 1} names part ${part + 1}, but footagePrep.source lists ${infos.length}`);
  if (!(b > a)) fail(`segment ${i + 1} [${a}, ${b}]: out must be after in`);
  if (b > infos[part].duration + 0.05) fail(`segment ${i + 1} ends at ${b}s but part ${part + 1} is only ${infos[part].duration.toFixed(2)}s`);
  const prev = segments[i - 1];
  if (prev && prev.part === part && a < prev.b) fail(`segment ${i + 1} starts before segment ${i} ends`);
  const fades = (i > 0 ? fade : 0) + (segments[i + 1]?.fade ?? 0);
  if (!(fade > 0)) fail(`segment ${i + 1}: its dissolve must be more than 0s`);
  if (segments.length > 1 && b - a <= fades) fail(`segment ${i + 1} is shorter than its dissolves (${fades.toFixed(2)}s)`);
});

const lens = segments.map(({ a, b }) => b - a);
const parts = [];
// Parts recorded at a different size or rate would break xfade, so every segment is brought to part 1's.
const { width: W, height: H } = infos[0];
const FPS = json.fps ?? 30;
segments.forEach(({ part, a, b }, i) => {
  parts.push(`[${part}:v]trim=${a}:${b},setpts=PTS-STARTPTS,scale=${W}:${H},fps=${FPS},format=yuv420p[v${i}]`);
  parts.push(`[${part}:a]atrim=${a}:${b},asetpts=PTS-STARTPTS,aresample=48000[a${i}]`);
});
// xfade offsets are measured in the ACCUMULATED output timeline.
let acc = lens[0];
let vPrev = "v0";
let aPrev = "a0";
for (let i = 1; i < segments.length; i++) {
  const d = segments[i].fade;
  const offset = (acc - d).toFixed(3);
  parts.push(`[${vPrev}][v${i}]xfade=transition=fade:duration=${d}:offset=${offset}[vx${i}]`);
  parts.push(`[${aPrev}][a${i}]acrossfade=d=${d}:c1=tri:c2=tri[ax${i}]`);
  vPrev = `vx${i}`;
  aPrev = `ax${i}`;
  acc = acc + lens[i] - d;
}

srcs.forEach((src, k) => console.log(`source${srcs.length > 1 ? ` part ${k + 1}` : ""}: ${src} (${infos[k].duration.toFixed(2)}s)`));
console.log(`segments: ${lens.map((l) => l.toFixed(2)).join(" + ")}, ${XFADE}s dissolves → ~${acc.toFixed(2)}s`);

execFileSync(
  "ffmpeg",
  [
    "-hide_banner", "-loglevel", "error", "-stats",
    "-y", ...srcs.flatMap((src) => ["-i", src]),
    "-filter_complex", parts.join(";"),
    "-map", `[${vPrev}]`, "-map", `[${aPrev}]`,
    "-c:v", "libx264", "-preset", "slow", "-crf", "15", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
    out,
  ],
  { stdio: ["ignore", "inherit", "inherit"] }
);

// The title still: frame 0 of the cut, so the title card matches the footage's
// first frame exactly.
execFileSync("ffmpeg", ["-y", "-v", "error", "-i", out, "-frames:v", "1", "-q:v", "2", still], { stdio: "inherit" });

const info = probe(out);
proj.save({
  ...json,
  footage: { src: footageSrc, width: info.width, height: info.height, durationSeconds: Number(info.duration.toFixed(3)) },
  titleStill: stillSrc,
});

console.log(`\n✓ ${out}`);
console.log(`✓ ${still}`);
console.log(`✓ recorded ${info.width}x${info.height}, ${info.duration.toFixed(3)}s in ${proj.folder}/project.json`);
console.log(`\n  The beat plan is timed against THIS file. If it changed length, re-check`);
console.log(`  your beat times against a fresh transcript.`);
