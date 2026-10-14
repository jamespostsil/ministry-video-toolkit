#!/usr/bin/env node
/**
 * Renders one frame of a project to a PNG — for proofing without a full render.
 *
 * Usage: npm run still -- <project> <what> [output.png]
 *   what:  thumbnail      the 1280x720 YouTube thumbnail
 *          endframe       the closing partner frame
 *          <seconds>      that moment of the video, e.g. 12.5
 */
import { join, resolve } from "node:path";
import { ROOT, fail, loadProject, remotion, requireImages } from "./lib.mjs";

const [name, what, outArg] = process.argv.slice(2);
const proj = loadProject(name);
const { json } = proj;
if (!what) fail("Say what to render: thumbnail, endframe, or a time in seconds.");
requireImages(proj);

let comp = json.id;
const extra = [];
if (what === "thumbnail") comp = `${json.id}-Thumbnail`;
else if (what === "endframe") comp = `${json.id}-EndFrame`;
else if (!Number.isNaN(Number(what))) extra.push(`--frame=${Math.round(Number(what) * json.fps)}`);
else fail(`"${what}" is not thumbnail, endframe or a number of seconds.`);

const out = resolve(outArg ?? join(ROOT, `out/${comp}${extra.length ? "-" + what + "s" : ""}.png`));
remotion(["still", comp, out, "--overwrite", ...extra]);
console.log(`\n✓ ${out}`);
if (extra.length) {
  // Two clocks: this command takes seconds into the FINISHED video, while
  // beats.ts and the transcript use seconds into the FOOTAGE. Say both.
  const footageT = Number(what) - json.titleCardSeconds;
  console.log(
    footageT >= 0
      ? `  ${what}s into the video = ${footageT.toFixed(2)}s into the footage (the clock beats.ts uses)`
      : `  ${what}s into the video is during the ${json.titleCardSeconds}s title card, before the footage starts`
  );
}
