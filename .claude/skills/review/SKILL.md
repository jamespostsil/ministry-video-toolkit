---
name: review
description: Check a rendered video for the defects that renders actually produce — one-frame flashes at cuts, audio clicks at joins, letterboxing, fonts silently failing, drifting sync, unreadable captions, QR codes that stop scanning. Use after any render, before handing a video to anyone, or when asked to check / verify / QA a video or find what is wrong with it.
---

# Review a render

Watching a video back is not enough — the defects that matter most are one or
two frames long, or are silent substitutions you cannot see without a control to
compare against. Measure them.

Work top-down: whole-timeline sweep, then the specific seams, then the details.

---

## 0. When something looks wrong, check it is being rendered as authored

**Do this first, before adjusting anything.** A surprising share of "design"
defects are the pipeline quietly not honouring the numbers in the source, and
every attempt to fix those by redesigning makes them worse.

For any placed image, diff the rendered rectangle against what it should be:

```python
rendered = Image.open(render).crop(element_rect)
expected  = Image.open(source).crop(source_rect).resize(rendered.size, Image.LANCZOS)
print(np.abs(np.array(rendered, float) - np.array(expected, float)).mean())
```

**~2–4 is a match.** **~50 means it is rendering something else.**

For footage or any full-frame layer, multi-scale template-match a patch of the
render back onto the source and read off the scale — 1.00 is 1:1; anything else
means it is being resized behind your back, and a non-uniform result means it is
being stretched.

Known causes of exactly this, all silent: Tailwind's `img { max-width: 100% }`
clamping a deliberately oversized image (`docs/gotchas.md` §4), `<Video>`
ignoring `objectFit` (§2), and over-constrained absolute boxes leaving a strip
of background down one edge.

**If a user reports the same visual defect twice, stop adjusting and start
measuring.** Being told twice is the signal that the diagnosis is wrong, not
that the correction was too small.

---

## 1. Sweep the whole timeline

Build contact sheets rather than reading dozens of individual frames — one
image, one frame every few seconds, laid out as a grid:

```bash
ffmpeg -i out.mp4 -vf "fps=1/4,scale=400:-1,tile=6x5" -frames:v 2 sheet_%d.png
```

You are looking for beats landing in the wrong place, a beat missing entirely,
black frames, or a section that looks nothing like its neighbours. **Tile
timestamps are approximate** — never conclude a beat is mistimed from a contact
sheet alone; confirm by pulling that exact second.

## 2. Check every seam where two graphics meet

A beat ending exactly where the next begins is where a single frame of the
presenter can leak through. Sample densely across each boundary (~0.1s steps)
and measure mean frame brightness. A leak shows up as a **spike** in an
otherwise monotonic ramp, because live footage is far brighter than a dark
graphic panel.

Smooth ramp = clean. Spike = flash. This catches in seconds what is nearly
invisible at full speed.

## 3. Listen to the joins — with a control

Audio clicks are easy to imagine and hard to eyeball. Measure the maximum
sample-to-sample step in a window around each join, **and measure the same thing
at several untouched stretches of the same video.** Judge the joins against that
baseline, not against an absolute number: normal speech with music under it
produces steps that look alarming until you see the control.

## 4. Confirm the picture fills the frame

Scan the outer rows and columns for near-black. Any consistent band means
letterboxing or an over-constrained layout, and it is easy to miss on a dark
beat. This catches both a source whose aspect ratio does not match the
composition, and CSS that silently failed to cover.

## 5. Confirm the fonts actually loaded

Renders can fall back to a default serif without erroring. Do not eyeball it —
render a throwaway frame comparing each real family against a **deliberately
fake** family name. If they look identical, nothing is loading. Check this once
per project and any time type "looks a bit off".

## 6. Confirm audio and picture still line up

Re-transcribe the **finished file** and check that the first and last spoken
words land where the timeline says. If the footage starts N seconds in, the
first word should appear at N + its offset in the source. Whisper jitters by
~0.1s; anything beyond that is a real drift.

Expect a hallucinated word or two over a music-only tail — verify against the
audio levels before believing it.

## 7. Read every piece of on-screen text at real size

Shrink a frame and look. Every caption, credit and title must read at a glance.
Watch for captions **partly covered** by a later element — a chip reading
"...al media posts" is a defect, not a quirk.

## 8. If there is a QR code, decode it from the render

Not from the source image — from a frame of the compressed video. Compression
can degrade a QR past scanning, and a donor-facing code that does not scan
defeats the ending.

```python
import cv2; print(cv2.QRCodeDetector().detectAndDecode(cv2.imread("frame.png"))[0])
```

Decode it twice — at full resolution, and from a 1280×720 downscale, which is
closer to what a phone camera gets off a compressed upload played on a laptop.

Then **compare what it decodes to against the web address printed beside it.**
They are two different artefacts and they drift apart: a script once typed
an address next to a QR code that pointed at a spelling one letter different, and
only the spelling in the QR had a DNS record. Check the printed spelling
resolves before shipping.

---

## Reporting

Lead every finding with what a viewer would notice, in plain language, and put
the measurement second. "Your footage had black bars top and bottom" before
"objectFit is ignored by this component". The person reading needs to decide
whether they care before they need to know why.

Fix every defect you find before presenting the result. The person you are
handing it to should never be the one who spots a bug.
