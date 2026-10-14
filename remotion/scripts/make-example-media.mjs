#!/usr/bin/env node
/**
 * Downloads the example project's media: the footage, photos and end-frame
 * images of a real, published video (about 80 MB). They are attached to a
 * GitHub release rather than committed, because git handles large binary files
 * badly. Files already downloaded and intact are skipped, so this is safe to
 * re-run.
 *
 * The music is not included: it is a Pixabay track, and Pixabay's licence
 * allows using it in a video but not redistributing the file. A quiet stand-in
 * chord is generated instead. To hear the original, see the note this prints.
 *
 * Everything lands in public/_example/media/ (git-ignored).
 *
 * Usage: npm run example:media
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { FFMPEG_QUIET, PUBLIC_DIR, ROOT, fail, have, requireFfmpeg, run } from "./lib.mjs";

requireFfmpeg();
const { repo, tag, files } = JSON.parse(readFileSync(join(ROOT, "scripts/example-media.json"), "utf8"));
const OUT = join(PUBLIC_DIR, "_example/media");

const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const mb = (n) => (n / 1e6).toFixed(1);

const todo = files.filter((f) => {
  const dest = join(OUT, f.dest);
  return !(existsSync(dest) && sha256(dest) === f.sha256);
});
const total = todo.reduce((s, f) => s + f.bytes, 0);
console.log(todo.length ? `Downloading ${todo.length} file(s), ${mb(total)} MB, from ${repo} release ${tag}…` : "Example media already downloaded.");

let failure = null;
for (const [i, f] of todo.entries()) {
  const dest = join(OUT, f.dest);
  mkdirSync(dirname(dest), { recursive: true });
  const tmp = dest + ".part";
  process.stdout.write(`  [${i + 1}/${todo.length}] ${f.dest} (${mb(f.bytes)} MB)… `);
  const url = `https://github.com/${repo}/releases/download/${tag}/${encodeURIComponent(f.asset)}`;
  let ok = false;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "ministry-video-toolkit" } });
    if (res.ok) {
      writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
      ok = true;
    }
  } catch {
    /* fall through to gh */
  }
  // A private repository's release needs signing in. If the GitHub CLI is
  // installed and signed in, use it.
  if (!ok && have("gh")) {
    try {
      execFileSync("gh", ["release", "download", tag, "-R", repo, "-p", f.asset, "-O", tmp, "--clobber"], { stdio: "ignore" });
      ok = true;
    } catch {
      /* reported below */
    }
  }
  if (!ok) {
    console.log("failed");
    failure = `Could not download ${f.asset}.\n  Check your internet connection and that you can open https://github.com/${repo}/releases/tag/${tag}` +
      "\n  If that page needs you to sign in (a private repository), install the GitHub CLI and run  gh auth login";
    break;
  }
  if (sha256(tmp) !== f.sha256) {
    console.log("damaged");
    failure = `${f.dest} downloaded but is damaged (checksum mismatch). Run this again.`;
    break;
  }
  renameSync(tmp, dest);
  console.log("ok");
}
// Report a failure after the loop rather than exiting inside it: exiting
// while a download is still open crashed Node on Windows.
if (failure) {
  console.error(`\n✗ ${failure}\n`);
  process.exitCode = 1;
} else {

// Music. With --music <file>, build the published video's bed from the
// Pixabay track you downloaded: its first 95s, which are evenly loud (the
// track has a near-silent stretch towards its end that would otherwise land
// under the closing frame), looped with 3s crossfades to cover the video. The
// bed is built on your machine from your own download, so nothing is
// redistributed. Without --music, a soft stand-in chord.
const music = join(OUT, "music.m4a");
// Remembers that music.m4a is the user's own track, not the stand-in.
const musicMarker = join(OUT, "music-is-yours");
const musicArg = process.argv.indexOf("--music");
if (musicArg > -1) {
  const src = process.argv[musicArg + 1];
  if (!src || src.startsWith("--"))
    fail(`--music needs the path to the track you downloaded from Pixabay, e.g.\n  npm run example:media -- --music "C:/Users/you/Downloads/ambient-ambient-ambient-music-574003.mp3"`);
  if (!existsSync(src)) fail(`--music: file not found: ${src}`);
  run("ffmpeg", [
    ...FFMPEG_QUIET, "-y", "-i", src,
    "-filter_complex",
    "[0:a]atrim=0:95,asetpts=N/SR/TB,asplit=3[a][b][c];[a][b]acrossfade=d=3:c1=tri:c2=tri[ab];[ab][c]acrossfade=d=3:c1=tri:c2=tri,volume=-0.7dB[bed]",
    "-map", "[bed]", "-t", "230", "-ar", "48000", "-ac", "2", "-c:a", "aac", "-b:a", "192k",
    music,
  ]);
  writeFileSync(musicMarker, "user");
  console.log("\n✓ music bed built from your download: public/_example/media/music.m4a");
} else if (!existsSync(music)) {
  const chord = "0.07*(sin(2*PI*220*t)+0.8*sin(2*PI*277.18*t)+0.7*sin(2*PI*329.63*t))*(0.8+0.2*sin(2*PI*0.2*t))";
  run("ffmpeg", [...FFMPEG_QUIET, "-y", "-f", "lavfi", "-i", `aevalsrc='${chord}|${chord}':s=48000:d=230`, "-c:a", "aac", "-b:a", "160k", music]);
}

console.log(`
✓ example media in public/_example/media/

${existsSync(musicMarker) ? "  Music: your download of the original track.\n  (To go back to the stand-in, delete public/_example/media/music.m4a and\n  music-is-yours, then run this again.)\n\n" : `  Music: a generated stand-in is playing. For the published video's real music,
  download "Ambient - Ambient Music" by paulyudin (free) from
    https://pixabay.com/music/ambient-ambient-ambient-music-574003/
  then run:  npm run example:media -- --music "<path to the downloaded mp3>"
  (Its licence allows using it in videos but not passing the file on, so it
  can't be included in the download.)

`}  Next: npm run studio`);
}
