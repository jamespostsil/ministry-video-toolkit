---
name: music
description: Make a music bed with ElevenLabs Music whose style changes land exactly on the video's big moments (tender under sad news, upbeat elsewhere), with smooth joins, an eased-in opening and a final chord that ends with the video. Optional: needs the user's own ElevenLabs API key; without one, find free music with the `find-music` skill, or use the user's own (docs/finding-music.md). Use when asked to make, generate or compose music for a video, to time music to scene changes, or to fix how generated music starts, ends or changes.
---

# Music with ElevenLabs (optional)

**This is optional.** It needs the user's own ElevenLabs API key. Anyone without
one supplies their own music file instead (`docs/finding-music.md`) and skips
this skill. Never use someone else's key.

Setup: `ELEVENLABS_API_KEY=...` in `remotion/.env` (git-ignored; see SETUP.md).
Check the licence for their plan in `docs/finding-music.md` before publishing.

## How it works

```bash
cp ../examples/musicPlan.example.json src/projects/<project>/musicPlan.json   # then edit it
npm run music -- <project> --sample=upbeat-acoustic,calm-piano   # 20 s taste of each style
npm run music -- <project> --dry-run       # show the requests, spend nothing
npm run music -- <project>                 # make missing sections, join them
npm run music -- <project> --redo=<name>   # remake one section; the old take is kept as .takeN.mp3
npm run music -- <project> --join-only     # re-join after changing loudness or fades (free)
```

Then set `project.json` → `"music": { "src": "audio/<project>-music.wav" }` and
render as usual (the `render` skill). The script prints the change times as
m:ss for listening.

**Why separate sections:** one generation with several timed sections drifts
2 to 6 s from the requested boundaries, adds dips nobody asked for, and fades out
early. So each section is its own generation, made 6 s longer than its slot,
then cut and joined at the exact times.

## Ask about style first: taste differs

Don't assume a style. Before making anything long, ask the user, one question
at a time:

1. **What should it feel like?** Offer the presets in
   `examples/musicStyles.json` by their `about` line (upbeat acoustic, calm
   piano, cinematic, worship, African guitar, Latin acoustic), or their own words
   ("like the music on our church's videos", a region, an instrument).
2. **Make 20 s samples of two or three candidates** (`--sample=a,b,c`) and let
   them choose by ear. Short samples are cheap; full sections aren't.
3. **Are there parts that need a different mood?** Sad news, a prayer request,
   a celebration. Those become their own sections.

Then put `"preset": "<name>"` in `musicPlan.json`, or write their own
`"style": { "positive": [...], "negative": [...] }` plus `"bpm"` (start from the
closest preset and change words). Save what they liked in the project notes so
the next video starts from it.

## Planning the sections

- **Change music at the major shifts only, not every scene**: greeting, family
  news, ministry update, a new topic, the ask, the blessing. Usually 5 or 6.
- **Put each boundary in a speech pause** between topics (use the transcript),
  in VIDEO time: title card included.
- **Keep one key and one tempo** in every section (the presets do), so the
  joins sound like one piece. In the first real use, slow gentle "underscore"
  music came out boring for a whole video; a little upbeat (the
  `upbeat-acoustic` preset) was liked much better. That was one person's
  taste: ask.
- **Sad or tender news** (an illness, a death) gets its own section: soft piano
  and strings, no percussion, same key and tempo, half-time feel, about 3 dB
  quieter.
- **No words.** Put vocals, singing, choir, humming, whistling and spoken word in
  `style.negative`.
- **Tender sections end early.** Soft piano takes often play about 10 s and then fade, whatever length was
  asked for. If one winds down before its change, give it `"extraSeconds": 18` in its plan entry (the default is
  6) and `--redo` it: only the start of the longer take is used.
- **Levels** (`loudness`, LUFS, before the render's ducking): -17.5 for most
  sections, about -20.5 for tender ones, about -21.5 for the opening (an upbeat
  first section with percussion is too loud under the title card otherwise),
  about -20.5 for the closing.

## Joins, opening and ending (built into the script)

- **Joins:** the outgoing section plays at full level right up to the change,
  then fades out under the new one over 1 s on a fast-dropping curve; the new
  one enters at full level on its own first beat at the change. Tried and
  rejected, in order: a 1.5 s crossfade centred on the change (two grooves on
  top of each other sounded odd); fading out completely before the change (too
  drastic); a shorter fade starting 0.8 s before (still a dip, which "almost
  seems like the video is ending"). **Never let the music dip before a change.**
  Adjust in `musicPlan.json` → `"transitions": { "fadeOutBefore", "fadeOutAfter",
  "fadeIn", "joinCurve" }`.
- **Where a take really starts and stops** is measured by level, not by silence: the first and last moments
  within 10 dB of the take's typical level. So a soft swell at the start is skipped (the section enters at full
  level on its change) and a fade before the change is caught and reported as winding down.
- **Opening:** the music starts at its first sound (generations often begin with
  0.1 to 0.6 s of silence) and eases in over 2.5 s.
- **Ending:** the last section is made long and entered part way in, on a bar
  line (needs `bpm`), so its own final chord rings out as the video ends. A
  section that simply fits its slot winds down 2 to 3 s early and leaves the
  end card nearly silent.

## Checking

- **Listen at each change** (the m:ss list) and at the first and last 7 s. The
  script warns when a section is too short or winds down before its change;
  fix those with `--redo`.
- **One section sounds wrong?** Redo just that one; the others stay as they are.
- **Checking for singing with Whisper** (`npm run transcribe` style tools):
  on instrumental music it invents scattered words ("Thank you.", odd names,
  other scripts). That is a hallucination, not vocals. Real singing comes back
  as whole, sensible lines in order.
- **Don't run requests in parallel:** ElevenLabs answers HTTP 429. The script
  goes one at a time and waits on 429.
- **Cost:** music doesn't show up in the account's character count (it's
  billed separately). Check the account's usage page.
