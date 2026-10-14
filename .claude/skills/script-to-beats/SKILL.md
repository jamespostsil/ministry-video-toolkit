---
name: script-to-beats
description: Turn a written script with inline images (typically a Notion doc) into a timed beat plan against the footage transcript. Use when given a script document for a video, when the script is updated and the video needs to follow, or when asked where the graphics should go.
---

# Script to beats

The script says *what* appears. The transcript says *when*. This skill joins
them.

---

## 1. Get the images out of the script first

If the script lives in Notion, its images are served from signed S3 URLs that
**expire in 300 seconds**. Fetch → write a download script → run it, and they
are already dead.

Prepare the downloader *before* fetching. The object keys
(`<page>/<file>/<Original_Name.ext>`) are stable across fetches; only the
credential id, date, security token and per-file signature rotate — and within
one fetch the token is shared, so only a 64-character signature differs per
file. Bake the key→filename table into a script once and feed it just the
rotating values.

Also capture each image's **alt text**. That is where photo credits live.

---

## 2. Read the markers

Scripts mark up their own intent. Typical conventions:

| Marker | Means |
|---|---|
| `[Title card: ...]` | The opening title card's text. Goes into `titleCard` in `project.json` |
| `[video]` | Presenter on camera for this passage — no graphic |
| `[Slider: Title]` | The images that follow are one slider beat |
| `[Scatter: Title]` | Same, as a scatter |
| `[End frame]` | The closing partner frame — name, web address, photo, QR. Hand to `partner-frame` |
| `[Side by side]` | The images that follow are one `row` beat |
| A bracketed note | An instruction — read it literally, e.g. `[Show each one as I name it]` |

**Pairing rule: an image accompanies the paragraph that FOLLOWS it.**

Bracketed notes are directions, not decoration. "Insert images at appropriate
times with script" means time each image to its own phrase rather than spacing
them evenly. "Keep video through the end, then show the QR page" means exactly
that.

When the script is revised, **diff it** — a marker changing from `Slider` to
`Scatter`, or a new `[video]` appearing mid-passage, changes the edit.

---

## 3. Time against a word-level transcript

Transcribe the **prepared footage** (after `footage-prep`, not before) with
word-level timestamps. Then, for each beat:

- **Start** ~0.3–0.5s before the first word of the passage it illustrates, so
  the graphic is established as the line begins.
- **End** where the passage ends — or exactly where the next beat starts, if
  they should abut.
- Author every timestamp **relative to the footage**, not to the composition.
  The engine offsets them by the title-card length. This keeps the numbers
  matched 1:1 to the transcript no matter how long the opening runs.

Sanity-check the plan by printing the narration each beat actually covers. It
takes seconds and catches an off-by-one immediately.

---

## 4. Where to hand back to the presenter

Leave a gap — do not cover — for anything spoken **straight to the viewer**: a
thank you, a direct ask, a blessing. Those lines want a face.

A long pause between sections is usually a speaker handover; the presenter
should be on screen for it, not a graphic.

---

## When timings shift

Any change to the footage moves every number after it. Do not adjust by hand:
re-cut, re-transcribe, re-derive. If you must map old to new, compute the offset
per segment from the cut list and **verify against the new transcript** before
trusting it.
