#!/usr/bin/env node
/**
 * Checks that this machine and every project are ready to render, and says
 * exactly what to do about anything that is not.
 *
 * Usage: npm run doctor
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { PUBLIC_DIR, ROOT, have, imageReport, listProjects, loadProject, probe, publicPath } from "./lib.mjs";



let problems = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m, fix) => {
  problems++;
  console.log(`  ✗ ${m}${fix ? `\n      → ${fix}` : ""}`);
};
const warn = (m) => console.log(`  ! ${m}`);

console.log("\nThis machine");
const [major] = process.versions.node.split(".").map(Number);
major >= 18 ? ok(`Node ${process.versions.node}`) : bad(`Node ${process.versions.node} is too old`, "Install Node 18 or newer (20 LTS recommended).");
existsSync(join(ROOT, "node_modules/@remotion/cli")) ? ok("npm packages installed") : bad("npm packages missing", "Run: npm install");
if (have("ffmpeg") && have("ffprobe")) {
  const v = execFileSync("ffmpeg", ["-version"], { encoding: "utf8" }).split("\n")[0];
  ok(v.replace(/ Copyright.*/, ""));
  const filters = execFileSync("ffmpeg", ["-hide_banner", "-filters"], { encoding: "utf8" });
  for (const f of ["xfade", "acrossfade", "testsrc2", "aevalsrc"])
    filters.includes(` ${f} `) ? null : bad(`your ffmpeg lacks the "${f}" filter`, "Install ffmpeg 4.3 or newer (a 'full' build).");
  const enc = execFileSync("ffmpeg", ["-hide_banner", "-encoders"], { encoding: "utf8" });
  enc.includes("libx264") ? null : bad("your ffmpeg lacks libx264", "Install an ffmpeg build that includes libx264 (most do).");
} else bad("ffmpeg / ffprobe not found on PATH", "See SETUP.md, step 1.");

// Windows can't start a program whose full path is over 260 characters, and
// Remotion's Chrome sits ~140 characters deep inside the repo. Past the limit
// every render fails with "spawn ... chrome-headless-shell.exe ENOENT".
if (process.platform === "win32") {
  const chrome = join(ROOT, "node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe");
  chrome.length < 255
    ? ok("folder path short enough for Windows")
    : bad(`the repository's folder path is too long for Windows (Remotion's browser would be ${chrome.length} characters deep; the limit is 260)`, "Move or clone the repository to a shorter folder, e.g. C:\\Users\\you\\Documents\\ministry-video-toolkit");
}

const fonts = ["Alegreya-Regular", "Alegreya-Bold", "Alegreya-Italic", "Alegreya-Medium", "Poppins-Regular", "Poppins-Medium", "Poppins-SemiBold", "Poppins-Bold"];
const missingFonts = fonts.filter((f) => !existsSync(join(PUBLIC_DIR, `fonts/${f}.woff2`)));
missingFonts.length ? bad(`fonts missing: ${missingFonts.join(", ")}`, "Restore public/fonts/ from the repository.") : ok("fonts present");

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
(pkg.sideEffects ?? []).some((s) => s.includes("fonts"))
  ? ok("fonts module protected from tree-shaking")
  : bad('package.json "sideEffects" does not list the fonts module — every render will silently use the wrong typeface', 'Restore "sideEffects": ["*.css", "**/fonts.ts"]. See docs/gotchas.md section 1.');

for (const { folder } of listProjects()) {
  const { json } = loadProject(folder);
  console.log(`\nProject ${folder}  (id ${json.id})`);
  const prep = json.footagePrep;
  if (prep?.source) {
    const src = isAbsolute(prep.source) ? prep.source : resolve(ROOT, prep.source);
    if (prep.source.startsWith("PATH/TO"))
      warn("footagePrep.source is still the placeholder: set it to your recording, then run  npm run footage -- " + folder);
    else existsSync(src) ? ok("camera original found") : warn(`camera original not found: ${prep.source}`);
  }
  const footage = publicPath(json.footage.src);
  if (!existsSync(footage)) {
    bad(
      `footage not built: ${json.footage.src}`,
      folder === "_example" ? "Run: npm run example:media" : `Run: npm run footage -- ${folder}`
    );
  } else {
    const info = probe(footage);
    ok(`footage ${info.width}x${info.height}, ${info.duration.toFixed(2)}s`);
    if (Math.abs(info.duration - json.footage.durationSeconds) > 0.1)
      bad(`project.json says the footage is ${json.footage.durationSeconds}s but the file is ${info.duration.toFixed(2)}s`, `Re-run: npm run footage -- ${folder}  (it records the real length)`);
    if (info.width !== json.footage.width || info.height !== json.footage.height)
      bad(`project.json says ${json.footage.width}x${json.footage.height} but the file is ${info.width}x${info.height}`, `Re-run: npm run footage -- ${folder}`);
    if (!info.hasAudio) bad("footage has no audio track — the narration comes from it");
  }
  existsSync(publicPath(json.titleStill))
    ? ok("title still")
    : bad(`title still missing: ${json.titleStill}`, folder === "_example" ? "Run: npm run example:media" : `Run: npm run footage -- ${folder}`);
  if (json.music) existsSync(publicPath(json.music.src)) ? ok("music") : bad(`music missing: ${json.music.src}`, folder === "_example" ? "Run: npm run example:media" : 'Fix music.src, or remove "music" from project.json.');
  if (json.endingSeconds < 7) warn(`endingSeconds is ${json.endingSeconds}: under 7s is too short to scan a QR code`);

  // Every image file named in beats.ts / partner.ts. A missing one stops a
  // render partway, so catch it here.
  const { named, missing } = imageReport(loadProject(folder).dir);
  if (folder === "_example" && !existsSync(publicPath("_example/media/footage.mp4"))) {
    bad("the example's media isn't downloaded yet", "Run: npm run example:media");
    continue;
  }
  missing.length
    ? bad(`image files not found under public/: ${missing.join(", ")}`, "Add them, or fix the paths in beats.ts / partner.ts.")
    : ok(`${named.size} image file(s) referenced, all present`);
}

console.log(problems ? `\n✗ ${problems} problem(s) above.\n` : "\n✓ Everything is ready.\n");
process.exit(problems ? 1 : 0);
