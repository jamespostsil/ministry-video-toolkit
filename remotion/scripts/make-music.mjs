/**
 * Make a music bed whose changes land exactly on the video's big moments,
 * with ElevenLabs Music. OPTIONAL: you can always use your own music instead
 * (see docs/finding-music.md); this script is only for people with a key.
 *
 *   npm run music -- <project>                  make any missing sections, then join them
 *   npm run music -- <project> --redo=<name>    make one section again (others untouched)
 *   npm run music -- <project> --join-only      re-join after changing levels or fades (no API calls)
 *   npm run music -- <project> --dry-run        show what would be requested, call nothing
 *   npm run music -- <project> --sample[=a,b]   20 s taste of the plan's style, or of named
 *                                               presets from examples/musicStyles.json, so the
 *                                               user picks a style by ear before anything long
 *
 * The plan lives in the project folder as musicPlan.json (copy
 * examples/musicPlan.example.json). Each section is generated SEPARATELY, a few
 * seconds longer than it needs to be, then cut to length and joined here:
 *
 *   - One generation with many sections drifts 2 to 6 s from the requested
 *     boundaries, so a change never lands on the scene change. Separate
 *     generations, cut in the edit, land to the frame.
 *   - Joins: the outgoing section plays at full level right up to the change, then
 *     fades out UNDER the next one over 1 s (a fast-dropping curve); the next
 *     section enters at full level on its own first beat AT the change. Tried
 *     and rejected: a 1.5 s crossfade centred on the change (two grooves on top
 *     of each other sounded odd), and any fade that dips the music before the
 *     change (even a short one sounds like the video is ending).
 *   - The opening eases in (no full-level drum hit under the title card) and
 *     the last section is generated long and entered part way in, on a bar line,
 *     so its final chord rings out as the video ends.
 *
 * Key: ELEVENLABS_API_KEY in remotion/.env (git-ignored) or the environment.
 * Files: public/audio/<project>-music/ (each section + its exact request),
 * joined bed: public/audio/<project>-music.wav. Point project.json's
 * "music.src" at it, and render as usual.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, fail, loadProject, publicPath, probe, requireFfmpeg } from "./lib.mjs";

requireFfmpeg();
const args = process.argv.slice(2);
const proj = loadProject(args.find((a) => !a.startsWith("--")));
const flag = (n) => args.find((a) => a === `--${n}` || a.startsWith(`--${n}=`));
const redo = flag("redo")?.split("=")[1];
const joinOnly = !!flag("join-only");
const dryRun = !!flag("dry-run");

const planPath = join(proj.dir, "musicPlan.json");
if (!existsSync(planPath))
  fail(`No musicPlan.json in ${proj.dir}.\n  Copy examples/musicPlan.example.json there and edit it (see the music skill).`);
const plan = JSON.parse(readFileSync(planPath, "utf8"));

// Named styles: "preset": "<name>" in the plan, or --sample=<name>,<name>.
const stylesFile = join(ROOT, "../examples/musicStyles.json");
const styles = existsSync(stylesFile) ? JSON.parse(readFileSync(stylesFile, "utf8")) : { presets: {}, noVocals: [] };
const presetStyle = (name) => {
  const p = styles.presets[name];
  if (!p) fail(`No style preset "${name}". Presets: ${Object.keys(styles.presets).join(", ")}`);
  return { bpm: p.bpm, style: { positive: p.positive, negative: [...styles.noVocals, ...p.negative] } };
};
if (!plan.style && !(flag("sample") ?? "").includes("=")) {
  if (!plan.preset) fail(`musicPlan.json needs "preset" (one of: ${Object.keys(styles.presets).join(", ")}) or its own "style".`);
  Object.assign(plan, { ...presetStyle(plan.preset), ...(plan.bpm ? { bpm: plan.bpm } : {}) });
}

/** 83.5, "83.5" or "1:23.5" -> seconds. */
const secs = (v) => {
  if (typeof v === "number") return v;
  const parts = String(v).split(":").map(Number);
  if (parts.some(Number.isNaN)) fail(`Can't read the time "${v}". Use seconds (83.5) or minutes:seconds ("1:23.5").`);
  return parts.reduce((t, p) => t * 60 + p, 0);
};

// Video length = title card + footage + ending, the same sum the render uses.
const j = proj.json;
const videoEnd = plan.videoEnd != null
  ? secs(plan.videoEnd)
  : (j.titleCardSeconds ?? 0) + j.footage.durationSeconds + (j.endingSeconds ?? 0);

const T = { fadeOutBefore: 0, fadeOutAfter: 1.0, fadeIn: 0.05, joinCurve: "exp", openingFadeIn: 2.5, endingFadeOut: 0.6, ...plan.transitions };
const EXTRA = 6; // generated past each slot, cut off here
const sections = plan.sections.map((s, i, all) => ({
  ...s,
  index: i,
  file: `${String(i + 1).padStart(2, "0")}-${s.name}`,
  start: i === 0 ? 0 : secs(s.start ?? all[i - 1].end),
  end: i === all.length - 1 ? secs(s.end ?? videoEnd) : secs(s.end),
  last: i === all.length - 1,
}));
for (const s of sections) {
  if (!(s.end > s.start)) fail(`Section "${s.name}" ends before it starts (${s.start} to ${s.end}).`);
  const next = sections[s.index + 1];
  if (next && Math.abs(next.start - s.end) > 0.001) fail(`Gap or overlap between "${s.name}" and "${next.name}".`);
}

const outDir = publicPath(`audio/${proj.folder}-music`);
mkdirSync(outDir, { recursive: true });

const sampleFlag = flag("sample");

// ---------- 1. Generate (one at a time: parallel calls get HTTP 429) ----------
const request = (s) => {
  const slot = s.end - s.start;
  const extras = [];
  if (s.index === 0) extras.push("starts immediately, no long intro");
  else extras.push("starts immediately on the first beat");
  if (s.last) extras.push("keeps playing at full warmth until the last three seconds, then resolves to a final sustained chord that rings out");
  return {
    model_id: plan.model ?? "music_v1",
    respect_sections_durations: true,
    composition_plan: {
      positive_global_styles: [...plan.style.positive, ...(plan.bpm ? [`${plan.bpm} bpm`] : [])],
      negative_global_styles: plan.style.negative,
      sections: [{
        section_name: s.name,
        positive_local_styles: [...(s.styles ?? []), ...extras],
        negative_local_styles: s.avoid ?? [],
        duration_ms: Math.round((slot + EXTRA) * 1000),
        lines: [],
      }],
    },
  };
};

const envFile = join(ROOT, ".env");
const fileEnv = existsSync(envFile)
  ? Object.fromEntries(readFileSync(envFile, "utf8").split(/\r?\n/)
      .map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean)
      .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]))
  : {};
const KEY = process.env.ELEVENLABS_API_KEY || fileEnv.ELEVENLABS_API_KEY;

const callMusic = async (body) => {
  let res;
  for (let attempt = 1; ; attempt++) {
    res = await fetch(`https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192`, {
      method: "POST",
      headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status !== 429 || attempt === 5) break;
    console.log("  ElevenLabs is busy (429), waiting 15 s…");
    await new Promise((r) => setTimeout(r, 15000));
  }
  if (!res.ok) fail(`ElevenLabs said ${res.status}: ${(await res.text()).slice(0, 400)}`);
  return Buffer.from(await res.arrayBuffer());
};

if (sampleFlag) {
  // A short taste of each style, from the same style lists the real sections
  // use, so the user can pick by ear before paying for full-length sections.
  const names = sampleFlag.includes("=") ? sampleFlag.split("=")[1].split(",").filter(Boolean) : [null];
  if (!dryRun && !KEY) fail("No ELEVENLABS_API_KEY. Put ELEVENLABS_API_KEY=... in remotion/.env (see SETUP.md).");
  const dir = join(outDir, "samples");
  mkdirSync(dir, { recursive: true });
  for (const name of names) {
    const st = name ? presetStyle(name) : { bpm: plan.bpm, style: plan.style };
    const body = {
      model_id: plan.model ?? "music_v1",
      prompt: `${[...st.style.positive, ...(st.bpm ? [`${st.bpm} bpm`] : [])].join(", ")}. Instrumental. Avoid: ${st.style.negative.join(", ")}.`,
      music_length_ms: 20000,
      force_instrumental: true,
    };
    if (dryRun) { console.log(`
${name ?? "plan style"}:`, JSON.stringify(body, null, 1)); continue; }
    const file = join(dir, `${name ?? plan.preset ?? "plan-style"}.mp3`);
    console.log(`Sample: ${name ?? "the plan's style"}…`);
    writeFileSync(file, await callMusic(body));
    console.log(`  ✓ ${file}`);
  }
  process.exit(0);
}

const todo = joinOnly ? [] : sections.filter((s) =>
  redo ? s.name === redo || s.file === redo : !existsSync(join(outDir, `${s.file}.mp3`)));
if (redo && !todo.length) fail(`No section named "${redo}". Names: ${sections.map((s) => s.name).join(", ")}`);
if (todo.length && !dryRun && !KEY)
  fail("No ELEVENLABS_API_KEY. Put ELEVENLABS_API_KEY=... in remotion/.env (see SETUP.md), or use your own music instead.");

for (const s of todo) {
  const body = request(s);
  if (dryRun) { console.log(`\n${s.file}:`, JSON.stringify(body, null, 1)); continue; }
  console.log(`Making "${s.name}" (${(s.end - s.start + EXTRA).toFixed(1)} s)…`);
  const audio = await callMusic(body);
  // Keep the earlier take of a redone section next to it, never overwrite it.
  const mp3 = join(outDir, `${s.file}.mp3`);
  if (existsSync(mp3)) {
    let n = 1;
    while (existsSync(join(outDir, `${s.file}.take${n}.mp3`))) n++;
    writeFileSync(join(outDir, `${s.file}.take${n}.mp3`), readFileSync(mp3));
  }
  writeFileSync(mp3, audio);
  writeFileSync(join(outDir, `${s.file}.request.json`), JSON.stringify(body, null, 1));
}
if (dryRun) process.exit(0);

// ---------- 2. Measure each section ----------
const ff = (input, filter) =>
  spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", input, "-af", filter, "-f", "null", "-"], { encoding: "utf8" }).stderr ?? "";
const lufs = (f) => Number([...ff(f, "ebur128").matchAll(/I:\s+(-?[\d.]+) LUFS/g)].pop()?.[1]);
/** First sound (after any leading silence) and where the music ends (start of trailing silence). */
const edges = (f) => {
  const dur = probe(f).duration;
  const quiet = [...ff(f, "silencedetect=noise=-45dB:d=0.05").matchAll(/silence_(start|end): ([\d.]+)/g)]
    .map((m) => [m[1], Number(m[2])]);
  const onset = quiet[0]?.[0] === "start" && quiet[0][1] < 0.01 ? (quiet[1]?.[1] ?? 0) : 0;
  // ffmpeg closes a trailing silence with an "end" at the end of the file.
  const starts = quiet.filter(([k]) => k === "start").map(([, t]) => t);
  const ends = quiet.filter(([k]) => k === "end").map(([, t]) => t);
  const lastStart = starts.at(-1);
  const trailing = lastStart != null && lastStart > dur - 8 && (ends.length < starts.length || ends.at(-1) > dur - 0.1);
  const musicEnd = trailing ? lastStart : dur;
  return { onset, musicEnd, dur };
};

const bar = plan.bpm ? (60 / plan.bpm) * 4 : null;
const parts = sections.map((s) => {
  const f = join(outDir, `${s.file}.mp3`);
  if (!existsSync(f)) fail(`Missing ${f}. Run without --join-only first.`);
  const e = edges(f);
  const slot = s.end - s.start;
  let offset = e.onset;
  if (s.last) {
    // Enter part way in so the music's own ending lands on the video's end,
    // rounded back to a whole bar so the entry is on a beat.
    const want = e.musicEnd - slot - 0.15;
    offset = want <= e.onset ? e.onset : bar ? e.onset + Math.floor((want - e.onset) / bar) * bar : want;
  }
  const length = slot + (s.last ? 0 : T.fadeOutAfter);
  if (offset + length > e.dur + 0.01) console.warn(`! "${s.name}" is ${(offset + length - e.dur).toFixed(1)} s short; the end will be silent. Try --redo=${s.name}.`);
  else if (!s.last && offset + slot > e.musicEnd - 1) console.warn(`! "${s.name}" winds down before its change. Try --redo=${s.name}.`);
  return { s, f, offset, length, gain: (s.loudness ?? plan.loudness ?? -18) - lufs(f) };
});

// ---------- 3. Join ----------
const chains = parts.map(({ s, offset, length, gain }, i) => {
  const slot = s.end - s.start;
  const fin = i === 0 ? T.openingFadeIn : T.fadeIn;
  const [st, d] = s.last ? [length - T.endingFadeOut, T.endingFadeOut] : [slot - T.fadeOutBefore, T.fadeOutBefore + T.fadeOutAfter];
  const ms = Math.round(s.start * 1000);
  return `[${i}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${gain.toFixed(2)}dB,apad,` +
    `atrim=${offset.toFixed(4)}:${(offset + length).toFixed(4)},asetpts=PTS-STARTPTS,afade=t=in:d=${fin},` +
    `afade=t=out:st=${st.toFixed(4)}:d=${d}:curve=${s.last ? "qsin" : T.joinCurve},adelay=${ms}|${ms}[s${i}]`;
});
chains.push(parts.map((_, i) => `[s${i}]`).join("") +
  `amix=inputs=${parts.length}:duration=longest:normalize=0,atrim=0:${videoEnd.toFixed(4)}[out]`);
const out = publicPath(`audio/${proj.folder}-music.wav`);
execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...parts.flatMap((p) => ["-i", p.f]),
  "-filter_complex", chains.join(";"), "-map", "[out]", out], { stdio: "inherit" });

const mmss = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;
console.log(`\n✓ ${out}  (${probe(out).duration.toFixed(2)} s, ${lufs(out).toFixed(1)} LUFS)`);
console.log(`  Set project.json → "music": { "src": "audio/${proj.folder}-music.wav" }, then render.`);
console.log("\n  Changes to listen to (start a few seconds early):");
for (const s of sections.slice(1)) console.log(`  ${mmss(s.start)}  ${sections[s.index - 1].name} → ${s.name}`);
