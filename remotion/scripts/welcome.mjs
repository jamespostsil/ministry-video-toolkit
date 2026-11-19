// Shows the welcome page (welcome.html at the toolkit's top level).
//   npm run welcome          opens it in the browser
//   after npm ci / install   prints a clickable link, and opens it the first time only
// Set NO_WELCOME=1 (or run in CI) to skip opening it.
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const page = resolve(here, "..", "..", "welcome.html");
const marker = resolve(here, "..", ".welcome-shown");
const afterInstall = process.argv.includes("--after-install");

if (!existsSync(page)) process.exit(0);
const url = pathToFileURL(page).href;
console.log(`\n  Ministry Video Toolkit is installed. Next steps:\n  ${url}\n`);

const skip = process.env.CI || process.env.NO_WELCOME || (afterInstall && existsSync(marker));
if (!skip) {
  const [cmd, args] =
    process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] :
    process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
  try {
    const p = spawn(cmd, args, { detached: true, stdio: "ignore" });
    p.on("error", () => {});
    p.unref();
  } catch {}
  if (afterInstall) try { writeFileSync(marker, new Date().toISOString() + "\n"); } catch {}
}
