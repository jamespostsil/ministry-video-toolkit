---
name: footage-prep
description: Turn a raw talking-head recording into the base footage for a video — removing camera fumbling, bad takes, and teleprompter dead air, joined with short cross-dissolves. Use before any graphics work, whenever given raw footage, a "rough cut", or asked to clean up / tighten / trim a recording, fix long pauses, or cut the awkward opening.
---

# Footage prep

The first stage. Everything downstream is timed against the footage this
produces, so get it right before building a single graphic — **re-cutting the
footage later invalidates every beat timestamp**.

Two passes, in order: remove what is unusable, then tighten what is merely slow.

---

## Pass 1 — remove what is unusable

**Cut at full sentence boundaries only.** Never excise a stumbled or repeated
word from inside a sentence. If a sentence has an internal stutter and there is
no clean retake of that whole sentence, keep it as spoken. A few seconds of a
person audibly hesitating reads as normal human delivery; surgery on their words
reads as an edit, and the speaker will hear it.

**Cut every frame of camera handling.** Anyone reaching toward the lens,
adjusting a phone, or walking into or out of position is never usable, no matter
how well it fits the pacing. Check this explicitly: pull frames at ~0.3s steps
through any pause longer than 1–2s before deciding to keep it. A pause that
looks like a thoughtful beat in the waveform is often someone fixing the camera.

**Start on the good state, not merely after the bad one.** Trimming to "before
they start talking" is not enough — find where they actually settle and smile,
and start there. Pull frames every ~0.3s through the candidate window. Beginning
on a neutral pre-smile hold still looks like dead air.

**Know when to stop rescuing a take.** If a fragment needs more than about two
rounds of increasingly fine-grained cutting to sound clean, drop the fragment
instead. And if a "silent" gap inside speech is over ~1s, don't trust
`silencedetect` alone — pull frames through the whole span and look for mouth
movement. Quiet mumbled re-attempts register as silence but are a stammer.

---

## Pass 2 — tighten the dead air

Recordings made off a teleprompter have silent stretches where the speaker is
waiting for the script to scroll. Those are accidents, not intent. Trim them.

**How much to leave — this is the part people get wrong:**

| Situation | Leave |
|---|---|
| Speaker hands over to a different person | **1.0–1.4s** |
| Same speaker, just waiting for the prompter | **0.7–1.0s** |
| A deliberate ask or an emotional pivot | **1.5–1.8s** — let it land |
| Opening, before the first word | **~0.8s of live footage**, plus the title card |

Cutting a handover to nothing reads as *too fast*, even when both sides are
clean. Two people need a breath between them.

**Join with a short cross-dissolve, not a hard cut** — about **0.4s**. On a
locked-off shot of people standing still, a hard cut is a visible jump; a short
dissolve reads as a settle. Both sides of the dissolve must be silent, so the
blend never lands on a word.

**To find who hands over to whom, measure pitch — don't guess from the script.**
Median fundamental frequency over a few seconds separates speakers reliably
(adult male ≈ 85–155 Hz, adult female ≈ 165–255 Hz). A script line can be
ambiguous about who says it, and the same phrase can appear twice.

---

## Verify every cut point before committing

This is the step that gets skipped, and it is the one that produces the
complaint *"I start breathing, then you clip it, then I start talking."*

Run `silencedetect` at a **ladder** of thresholds across the exact span you plan
to cut in — `-30dB`, `-40dB`, `-45dB`, `-50dB`, shrinking the minimum duration
each time. Stop when two consecutive thresholds agree the span is clean. A
single pass at the default threshold reports a window as silent when it
contains brief breath or mouth-noise blips, and the start of a quiet-looking
window is exactly where a cut instinctively lands.

If a blip sits inside a planned dissolve, move the boundary so the blip falls
early in the fade (quiet) rather than late (loud), or past it entirely.

**Keep the speaker's intake breath before their first word.** That breath is the
audible onset of them starting to talk. Cutting from silence straight into
fluent speech, with no visible or audible attack, reads as a jump cut — worse
than the pause you removed.

---

## Build it

Assemble with ffmpeg `xfade` (video) and `acrossfade` (audio) over a list of
keep-segments. Output length = sum of segments − 0.4s per join.

Keep the segment list in the project's `project.json`, under `footagePrep`, not
in a shell command typed once: the boundaries encode real decisions and will need
revisiting. Then run, from `remotion/`:

```bash
npm run footage -- <project>
```

It writes the cut footage and its first frame (the title-card still), and records
the footage's real size and length back into `project.json`, so those can never
drift from the file. JSON has no comments, so record what each removed gap was
in `footagePrep.notes` (a list of strings the script ignores): the next person
to touch the cut will need to know why each boundary is where it is.

**After rebuilding, re-transcribe.** Every downstream timestamp moves. Word-level
timings from the new file are the only safe source — do not shift old numbers by
hand and hope.
