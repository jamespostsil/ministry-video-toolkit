// Helpers shared by the scripts in this folder.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The remotion/ folder. Every relative path in a project.json resolves from here. */
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const PROJECTS_DIR = join(ROOT, "src/projects");
export const PUBLIC_DIR = join(ROOT, "public");

export const fail = (msg) => {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
};

/** Every project folder (has a project.json). */
export const listProjects = () =>
  readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(PROJECTS_DIR, d.name, "project.json")))
    .map((d) => {
      const json = JSON.parse(readFileSync(join(PROJECTS_DIR, d.name, "project.json"), "utf8"));
      return { folder: d.name, id: json.id };
    });

/**
 * Find a project by folder name ("my-video") or by its id ("MyVideo").
 * Returns { folder, dir, jsonPath, json, save(json) }.
 */
export const loadProject = (name) => {
  if (!name) {
    const known = listProjects().map((p) => `${p.folder} (id ${p.id})`).join(", ");
    fail(`Say which project. Known: ${known || "none"}`);
  }
  const hit = listProjects().find((p) => p.folder === name || p.id === name);
  if (!hit) {
    const known = listProjects().map((p) => `${p.folder} (id ${p.id})`).join(", ");
    fail(`No project "${name}". Known: ${known}`);
  }
  const dir = join(PROJECTS_DIR, hit.folder);
  const jsonPath = join(dir, "project.json");
  const json = JSON.parse(readFileSync(jsonPath, "utf8"));
  return {
    folder: hit.folder,
    dir,
    jsonPath,
    json,
    save: (next) => writeFileSync(jsonPath, JSON.stringify(next, null, 2) + "\n"),
  };
};

/** Absolute path for a path under public/, as used by staticFile(). */
export const publicPath = (p) => join(PUBLIC_DIR, p);

let publicPaths = null;
/** Every file under public/, as lower-cased "/"-separated relative paths. */
const publicFilePaths = () => {
  if (!publicPaths) {
    publicPaths = [];
    const walk = (d, rel) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        if (e.isDirectory()) walk(join(d, e.name), `${rel}${e.name}/`);
        else publicPaths.push(`${rel}${e.name}`.toLowerCase());
      }
    };
    walk(PUBLIC_DIR, "");
  }
  return publicPaths;
};

/**
 * Image files a project's beats.ts / partner.ts name that don't exist.
 * Returns { named, missing }.
 *
 * A name is found if it is the full path under public/, or the END of one at a
 * folder boundary — beats.ts often builds paths in a helper, so the literal is
 * "dedications/fur.jpg" while the file is _example/media/dedications/fur.jpg.
 * Matching whole trailing folders (not just the file name) still catches a
 * path pointed at the wrong folder.
 */
export const imageReport = (projectDir) => {
  const named = new Set();
  for (const f of ["beats.ts", "partner.ts"]) {
    const p = join(projectDir, f);
    if (!existsSync(p)) continue;
    // Drop comments first: a commented-out example path is not a reference.
    const code = readFileSync(p, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|\s)\/\/.*$/gm, "$1");
    for (const m of code.matchAll(/["'`]([^"'`\n]+\.(?:png|jpe?g|webp|gif|svg))["'`]/gi)) named.add(m[1]);
  }
  const paths = publicFilePaths();
  const missing = [...named].filter((n) => {
    const want = n.replace(/^\/+/, "").toLowerCase();
    return !paths.some((p) => p === want || p.endsWith(`/${want}`));
  });
  return { named, missing };
};

/** Stop before rendering if a project names an image that isn't there. */
export const requireImages = (proj) => {
  const { missing } = imageReport(proj.dir);
  if (missing.length)
    fail(
      `${proj.folder} names image files that are not under public/:\n    ${missing.join("\n    ")}\n  Add them, or fix the paths in beats.ts / partner.ts.`
    );
};

/** For the example, the usual fix for missing media is to generate it. */
export const exampleHint = (proj) => (proj.folder === "_example" ? "\n  (For the example, run  npm run example:media  first.)" : "");

/** Is a command on PATH? */
export const have = (cmd, versionFlag = cmd.startsWith("ff") ? "-version" : "--version") => {
  try {
    execFileSync(cmd, [versionFlag], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

export const requireFfmpeg = () => {
  if (!have("ffmpeg") || !have("ffprobe"))
    fail("ffmpeg and ffprobe must be installed and on your PATH. See SETUP.md, step 1.");
};

/** Width, height and duration of a media file. */
export const probe = (file) => {
  const out = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "stream=codec_type,width,height:format=duration", "-of", "json", file],
    { encoding: "utf8" }
  );
  const j = JSON.parse(out);
  const video = j.streams.find((s) => s.codec_type === "video");
  return {
    width: video?.width,
    height: video?.height,
    hasAudio: j.streams.some((s) => s.codec_type === "audio"),
    duration: Number(j.format.duration),
  };
};

/** Run a command, streaming its output. On failure, stop with one plain line
 *  rather than a Node stack trace: the tool's own error is already printed
 *  above it, and a trace buries that. */
export const run = (cmd, args, opts = {}) => {
  const isRemotion = cmd === process.execPath;
  const shown = isRemotion ? "remotion" : cmd;
  const visible = isRemotion ? args.slice(1) : args;
  console.log(`\n$ ${shown} ${visible.slice(0, 6).join(" ")}${visible.length > 6 ? " …" : ""}`);
  try {
    execFileSync(cmd, args, { stdio: "inherit", cwd: ROOT, ...opts });
  } catch (err) {
    fail(
      `${shown} stopped with an error (exit ${err.status ?? "?"}). The cause is in its output above.` +
        (isRemotion ? "\n  Tip: run `npm run studio` and open the composition to see the error on screen." : "")
    );
  }
};

/** Quieter ffmpeg: errors and one progress line, without the banner. */
export const FFMPEG_QUIET = ["-hide_banner", "-loglevel", "error", "-stats"];

/** Run the Remotion CLI through Node directly. Spawning `npx` is unreliable on
 *  Windows (it is a .cmd shim), and going through a shell would mangle paths
 *  that contain spaces. */
export const remotion = (args) => {
  const cli = join(ROOT, "node_modules/@remotion/cli/remotion-cli.js");
  if (!existsSync(cli)) fail("Remotion is not installed. Run: npm install");
  run(process.execPath, [cli, ...args]);
};
