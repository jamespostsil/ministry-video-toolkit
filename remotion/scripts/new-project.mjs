#!/usr/bin/env node
/**
 * Starts a new video by copying the example project.
 *
 * Usage: npm run new -- <name>
 *   e.g. npm run new -- 2027-03-update
 *
 * Creates src/projects/<name>/. That's all: projects are found automatically,
 * and your project folders are git-ignored, so nothing tracked is touched.
 *
 * It borrows the example's footage so it renders straight away, with a starter
 * beat plan, placeholder titles and a placeholder end frame. Then you replace
 * things one at a time, starting with your own recording.
 */
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PROJECTS_DIR, ROOT, fail, listProjects } from "./lib.mjs";

const name = process.argv[2];
if (!name) fail("Give the new project a name, e.g.  npm run new -- 2027-03-update");
// The name is also the composition id, which Remotion limits to letters,
// numbers and hyphens. Lowercase keeps folder and id identical on every OS.
if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) fail(`"${name}": use lowercase letters, numbers and hyphens only, e.g. 2027-03-update`);

const dest = join(PROJECTS_DIR, name);
if (existsSync(dest)) fail(`src/projects/${name} already exists. Pick another name, or delete that folder to start over.`);
// Compared ignoring case: on Windows and macOS, renders for "example" and
// "Example" would land in the same files and overwrite each other.
const clash = listProjects().find((p) => p.id.toLowerCase() === name || p.folder.toLowerCase() === name);
if (clash) fail(`"${name}" is too close to the existing project "${clash.folder}" (id ${clash.id}). Pick another name.`);

try {
  cpSync(join(PROJECTS_DIR, "_example"), dest, {
    recursive: true,
    // Never copy the example's transcript (it is of a test tone).
    filter: (src) => !/transcript\.(json|txt)$/.test(src),
  });
  const jsonPath = join(dest, "project.json");
  const json = JSON.parse(readFileSync(jsonPath, "utf8"));
  json.id = name;
  // footage.src and titleStill stay pointed at the example's, so the new
  // project renders straight away. `npm run footage` writes this project's own
  // files and re-points them.
  json.footagePrep = {
    source: "PATH/TO/your-camera-original.mp4",
    segments: [],
    crossfadeSeconds: 0.4,
    notes: ["Set source to your recording, and list the [in, out] segments to keep (see the footage-prep skill). Leave segments empty to keep the whole recording."],
  };
  // Placeholder titles: the example's are real people's names.
  json.titleCard = { eyebrow: "YOUR ORGANIZATION", title: "Ministry Update", byline: "Your Name Here", date: "Month Year" };
  json.thumbnail = { ...json.thumbnail, eyebrow: "YOUR ORGANIZATION", byline: "Your Name Here", date: "Month Year" };
  writeFileSync(jsonPath, JSON.stringify(json, null, 2) + "\n");
  // The end frame starts from labelled placeholders, never the example's real
  // name, web address and QR code, which would be easy to ship by mistake.
  cpSync(join(ROOT, "scripts/templates/partner.ts.template"), join(dest, "partner.ts"));
  // A starter beat plan: the example's is real people's names, family photos
  // and Wycliffe's photos, none of which a new video should inherit.
  cpSync(join(ROOT, "scripts/templates/beats.ts.template"), join(dest, "beats.ts"));
} catch (err) {
  // Don't leave a half-made project behind: it would block a retry.
  rmSync(dest, { recursive: true, force: true });
  fail(`Could not create the project: ${err.message}`);
}

console.log(`
✓ created src/projects/${name}/

It starts out on the example's footage with a starter beat plan, so you can open it in
the Studio right away. Next, from this folder:
  1. In src/projects/${name}/project.json, set footagePrep.source to your recording.
  2. npm run footage -- ${name}     cut your footage and make its title still
  3. Replace the rest one at a time: see "Making your own video" in the README.
`);
