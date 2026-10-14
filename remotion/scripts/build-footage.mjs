#!/usr/bin/env node
/**
 * Cuts a project's camera original into the footage the video plays.
 *
 * Reads `footagePrep` from the project's project.json:
 *   source            the camera original (relative paths resolve from remotion/)
 *   segments          [in, out] pairs in SOURCE seconds; the gaps between rows
 *                     are removed. Omit to keep the whole recording.
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

if (prep.source.startsWith("PATH/TO"))
  fail(`footagePrep.source in src/projects/${proj.folder}/project.json is still the placeholder.\n  Set it to your recording, e.g. "C:/Videos/my-update.mp4", then run this again.`);
const src = isAbsolute(prep.source) ? prep.source : resolve(ROOT, prep.source);
if (!existsSync(src)) fail(`footagePrep.source not found: ${src}${exampleHint(proj)}`);
const srcInfo = probe(src);
if (!srcInfo.hasAudio) fail(`${src} has no audio track. The narration comes from the footage's own audio.`);

// Always this project's own files under public/base/, so a project that
// started out borrowing the example's footage never overwrites it.
const footageSrc = `base/${proj.folder}.mp4`;
const stillSrc = `base/${proj.folder}-title-still.jpg`;
const out = publicPath(footageSrc);
const still = publicPath(stillSrc);
mkdirSync(dirname(out), { recursive: true });
mkdirSync(dirname(still), { recursive: true });

const XFADE = prep.crossfadeSeconds ?? 0.4;
const segments = prep.segments?.length ? prep.segments : [[0, srcInfo.duration]];

// Sanity-check the segments before handing ffmpeg anything.
segments.forEach(([a, b], i) => {
  if (!(b > a)) fail(`segment ${i + 1} [${a}, ${b}]: out must be after in`);
  if (b > srcInfo.duration + 0.05) fail(`segment ${i + 1} ends at ${b}s but the source is only ${srcInfo.duration.toFixed(2)}s`);
  if (i > 0 && a < segments[i - 1][1]) fail(`segment ${i + 1} starts before segment ${i} ends`);
  if (segments.length > 1 && b - a <= XFADE * 2) fail(`segment ${i + 1} is shorter than two crossfades (${(XFADE * 2).toFixed(2)}s)`);
});

const lens = segments.map(([a, b]) => b - a);
const parts = [];
segments.forEach(([a, b], i) => {
  parts.push(`[0:v]trim=${a}:${b},setpts=PTS-STARTPTS[v${i}]`);
  parts.push(`[0:a]atrim=${a}:${b},asetpts=PTS-STARTPTS[a${i}]`);
});
// xfade offsets are measured in the ACCUMULATED output timeline.
let acc = lens[0];
let vPrev = "v0";
let aPrev = "a0";
for (let i = 1; i < segments.length; i++) {
  const offset = (acc - XFADE).toFixed(3);
  parts.push(`[${vPrev}][v${i}]xfade=transition=fade:duration=${XFADE}:offset=${offset}[vx${i}]`);
  parts.push(`[${aPrev}][a${i}]acrossfade=d=${XFADE}:c1=tri:c2=tri[ax${i}]`);
  vPrev = `vx${i}`;
  aPrev = `ax${i}`;
  acc = acc + lens[i] - XFADE;
}

console.log(`source: ${src} (${srcInfo.duration.toFixed(2)}s)`);
console.log(`segments: ${lens.map((l) => l.toFixed(2)).join(" + ")}, ${XFADE}s dissolves → ~${acc.toFixed(2)}s`);

execFileSync(
  "ffmpeg",
  [
    "-hide_banner", "-loglevel", "error", "-stats",
    "-y", "-i", src,
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
