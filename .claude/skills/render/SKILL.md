---
name: render
description: Produce the finished mp4 and its audio mix, including the frames-plus-system-ffmpeg path needed when Remotion's own ffmpeg is blocked. Use when asked to render, export, re-render or produce the final video, or when a render fails.
---

# Render

## Use the script, not the CLI

Run from the `remotion/` folder:

```bash
npm run doctor                                  # check everything is in place first
npm run render -- <project>                     # frames + audio + mux → out/<id>.mp4
npm run render -- <project> --skip-frames       # re-encode from existing frames
npm run render -- <project> --audio-only        # build the mix and stop
npm run render -- <project> --frames=6270-6519  # patch a range into the existing frames
```

`npx remotion render <comp> out.mp4` fails on machines where Smart App Control
blocks Remotion's bundled FFmpeg — see [docs/gotchas.md](../../../docs/gotchas.md).
The script renders a JPEG sequence (headless Chrome, unaffected) and then uses
the **system** FFmpeg for audio and muxing. It reads everything it needs from the
project's `project.json`.

**Patching instead of re-rendering.** When a change only affects a short span —
the end frame, one overlay — render just that span with `--frames=A-B` and
re-encode. Remotion names sequence files by absolute frame number, so the new
frames drop straight into place. Start the range a second or so before the
change, so any crossfade into it is re-rendered too, then check the join for a
brightness jump.

`--skip-frames` is the one to reach for while iterating on audio or encoding
settings — frames are the slow part by an order of magnitude.

---

## The audio mix

Two sources: the footage's own audio, delayed by the length of the title card,
and a music bed under a gain envelope.

**The curve is computed, not written down.** `src/lib/musicCurve.mjs` builds it
from the project's title-card length, footage length and ending length, and both
the Studio preview and the final mix import that one function. Re-cutting the
footage therefore needs no music edits. Set the gains in the project's
`musicEnvelope.json`; add a `points` list there only for a hand-drawn curve.

(It used to be a list of absolute timestamps, and every re-cut left the music
ducking and lifting at the old times.)

The default shape:

| Moment | Gain |
|---|---|
| Title card | 1.0 — nothing is competing |
| Ramp down, finishing **before** the first word | → 0.065 |
| Under all narration | 0.065 |
| Closing card, nothing spoken | 0.45 |
| Final seconds | → 0 |

Finish the duck **clear** of the first word, not on top of it. With a short
pre-speech hold there may only be ~1s to do it in; start the ramp during the
title card.

**Only use music the video is allowed to use.** See `docs/finding-music.md`
for free sources and what their licences allow. A video that asks for financial
partnership is fundraising, which a "non-commercial only" licence may not
cover. Never copy a downloaded track into the repository or hand the file on:
most free licences allow use in a video but not redistribution.

**Check the bed for quiet stretches before using it.** Ambient tracks often have
a near-silent passage where they were meant to end. If the loop puts that
passage under your closing card, the lift there does nothing. Profile the track
in a few-second windows across its length, and build the loop from a
consistently-loud section rather than looping the whole file blindly.

---

## Encoding

- Frames as JPEG at maximum quality — this is what Remotion itself uses
  internally for video output, so it costs no extra generation loss.
- `libx264`, `-preset slow`, `-crf 17`, `yuv420p`, `+faststart`.
- AAC 192k.
- Keep `out/frames-<id>` after a render if more changes are likely; `--skip-frames`
  then turns a 20-minute cycle into 2 minutes. It is several GB — say so, and
  offer to clear it when the video is signed off.

---

## After every render

Run **`review`**. A render that completes is not a render that is correct.
