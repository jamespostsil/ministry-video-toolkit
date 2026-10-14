#!/usr/bin/env node
/**
 * Word-level transcript of a project's footage — the clock every beat is timed
 * against (see the script-to-beats skill).
 *
 * Writes, next to the project's beats.ts:
 *   transcript.json   every word with its start and end time, in FOOTAGE seconds
 *   transcript.txt    the same, readable: one line per sentence, each word timed
 *
 * Uses Whisper through an API. Set ONE of these, either in your environment or
 * in a file called .env in this remotion/ folder (it is git-ignored):
 *   GROQ_API_KEY=...     preferred: fast and inexpensive (console.groq.com/keys)
 *   OPENAI_API_KEY=...   works too
 *
 * The audio is sent to that service. Only use it for recordings you are
 * comfortable sending.
 *
 * Usage: npm run transcribe -- <project>
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ROOT, fail, loadProject, publicPath, requireFfmpeg } from "./lib.mjs";

requireFfmpeg();
const proj = loadProject(process.argv[2]);
const footage = publicPath(proj.json.footage.src);
if (!existsSync(footage)) fail(`Footage not built yet. Run: npm run footage -- ${proj.folder}`);

// Keys: environment first, then remotion/.env.
const envFile = join(ROOT, ".env");
const fileEnv = existsSync(envFile)
  ? Object.fromEntries(
      readFileSync(envFile, "utf8")
        .split(/\r?\n/)
        .map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/))
        .filter(Boolean)
        .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")])
    )
  : {};
const key = (k) => process.env[k] || fileEnv[k];
const service = key("GROQ_API_KEY")
  ? { url: "https://api.groq.com/openai/v1/audio/transcriptions", key: key("GROQ_API_KEY"), model: "whisper-large-v3" }
  : key("OPENAI_API_KEY")
    ? { url: "https://api.openai.com/v1/audio/transcriptions", key: key("OPENAI_API_KEY"), model: "whisper-1" }
    : null;
if (!service) fail("No API key. Put GROQ_API_KEY=... (or OPENAI_API_KEY=...) in remotion/.env — see SETUP.md.");

// Mono 16 kHz speech-quality audio keeps the upload small (~0.25 MB/min), well
// under the services' 25 MB limit for any video this toolkit is meant for.
const audio = join(tmpdir(), `transcribe-${proj.json.id}.m4a`);
execFileSync("ffmpeg", ["-y", "-v", "error", "-i", footage, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "32k", audio]);

const form = new FormData();
form.append("file", new Blob([readFileSync(audio)], { type: "audio/mp4" }), "audio.m4a");
form.append("model", service.model);
form.append("response_format", "verbose_json");
form.append("timestamp_granularities[]", "word");
form.append("timestamp_granularities[]", "segment");

console.log(`Transcribing ${proj.json.footage.src} with ${service.model}…`);
const res = await fetch(service.url, {
  method: "POST",
  // A custom User-Agent: some API gateways reject generic client defaults.
  headers: { Authorization: `Bearer ${service.key}`, "User-Agent": "ministry-video-toolkit/1.0" },
  body: form,
});
if (!res.ok) fail(`Transcription failed: ${res.status} ${await res.text()}`);
const data = await res.json();
const words = (data.words ?? []).map((w) => ({ word: w.word.trim(), start: +w.start.toFixed(2), end: +w.end.toFixed(2) }));
if (!words.length) fail("The service returned no word timings.");

writeFileSync(join(proj.dir, "transcript.json"), JSON.stringify({ text: data.text?.trim(), words }, null, 1) + "\n");

// Readable form: a line per sentence, starting with that sentence's time.
const lines = [];
let line = [];
for (const w of words) {
  line.push(`${w.word}(${w.start.toFixed(2)})`);
  if (/[.!?]$/.test(w.word)) {
    lines.push(line);
    line = [];
  }
}
if (line.length) lines.push(line);
const txt = lines.map((l) => `${l[0].match(/\(([\d.]+)\)/)[1].padStart(7)}  ${l.join(" ")}`).join("\n");
writeFileSync(join(proj.dir, "transcript.txt"), txt + "\n");

console.log(`\n✓ ${words.length} words → src/projects/${proj.folder}/transcript.json and transcript.txt`);
console.log("  Times are footage seconds — the same clock as beats.ts.");
