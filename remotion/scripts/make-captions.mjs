#!/usr/bin/env node
/**
 * Captions for a finished video, from the project's word-level transcript.
 *
 * Writes, in remotion/out/:
 *   <project>.en.vtt   WebVTT: what Vimeo wants (it refuses .srt), and YouTube takes it too
 *   <project>.en.srt   SubRip: what Facebook, LinkedIn and most editors take
 *
 * The times are the video's own: each word's footage time plus the title card's length, so the captions line up
 * with the rendered video. The words are what the transcription heard (see `npm run transcribe`), so read the
 * file once against your script before uploading it: names and places are where it slips.
 *
 * Usage: npm run captions -- <project> [--lang=en]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, fail, loadProject } from "./lib.mjs";

const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith("--"));
if (!name) fail("Say which project: npm run captions -- <project>");
const lang = (args.find((a) => a.startsWith("--lang=")) ?? "--lang=en").slice(7);
const proj = loadProject(name);
let words;
try {
  words = JSON.parse(readFileSync(join(proj.dir, "transcript.json"), "utf8")).words ?? [];
} catch {
  fail(`No transcript yet. Run: npm run transcribe -- ${proj.folder}`);
}
if (!words.length) fail("The transcript has no words.");
const offset = proj.json.titleCardSeconds ?? 0;

// ---- group the words into captions: a sentence (or a pause) ends one; a long sentence is split into near-equal parts,
// at a comma when there is one close to where the split should fall
const MAX_CHARS = 74;      // two lines of about 37 characters
const MAX_SECONDS = 6;
const PAUSE = 0.9;
const textOf = (ws) => ws.map((w) => w.word.trim()).join(" ");
const sentences = [];
let run = [];
words.forEach((w, i) => {
  run.push(w);
  const next = words[i + 1];
  if (!next || /[.?!]["”’)]?$/.test(w.word.trim()) || next.start - w.end > PAUSE) { sentences.push(run); run = []; }
});
const cues = [];
const split = (ws) => {
  const total = textOf(ws).length, dur = ws[ws.length - 1].end - ws[0].start;
  if (total <= MAX_CHARS && dur <= MAX_SECONDS) { cues.push(ws); return; }
  const parts = Math.max(2, Math.ceil(total / 60), Math.ceil(dur / MAX_SECONDS));
  let start = 0;
  for (let part = 1; part < parts; part++) {
    const ideal = (total * part) / parts;
    let best = -1, bestScore = Infinity, len = 0;
    for (let k = 0; k < ws.length - 1; k++) {
      len += ws[k].word.trim().length + 1;
      if (k < start) continue;
      const score = Math.abs(len - ideal) - (/[,;:]$/.test(ws[k].word.trim()) ? 8 : 0);
      if (score < bestScore) { bestScore = score; best = k; }
    }
    if (best < start) break;
    cues.push(ws.slice(start, best + 1)); start = best + 1;
  }
  cues.push(ws.slice(start));
};
sentences.forEach(split);

// ---- two balanced lines
const wrap = (text) => {
  if (text.length <= 42) return text;
  const mid = text.length / 2;
  let best = -1;
  for (let k = 0; k < text.length; k++) if (text[k] === " " && (best < 0 || Math.abs(k - mid) < Math.abs(best - mid))) best = k;
  return best < 0 ? text : text.slice(0, best) + "\n" + text.slice(best + 1);
};

// ---- times: a caption starts with its first word and stays up at least a second, never into the next one
const MIN = 1.0;
const items = cues.map((ws) => ({ start: ws[0].start + offset, end: ws[ws.length - 1].end + offset + 0.12, text: wrap(textOf(ws)) }));
items.forEach((c, i) => {
  const limit = items[i + 1] ? items[i + 1].start - 0.04 : Infinity;
  c.end = Math.min(limit, Math.max(c.end, c.start + MIN));
});

const stamp = (t, comma) => {
  const ms = Math.round(t * 1000);
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)}${comma ? "," : "."}${p(ms % 1000, 3)}`;
};
const vtt = "WEBVTT\n\n" + items.map((c) => `${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`).join("\n");
const srt = items.map((c, i) => `${i + 1}\n${stamp(c.start, true)} --> ${stamp(c.end, true)}\n${c.text}\n`).join("\n");
mkdirSync(join(ROOT, "out"), { recursive: true });
const base = join(ROOT, "out", `${proj.json.id}.${lang}`);
writeFileSync(`${base}.vtt`, vtt, "utf8");
writeFileSync(`${base}.srt`, srt, "utf8");
console.log(`✓ ${items.length} captions\n  ${base}.vtt  (Vimeo, YouTube)\n  ${base}.srt  (Facebook, LinkedIn, editors)\n  Read them once against your script before uploading.`);
