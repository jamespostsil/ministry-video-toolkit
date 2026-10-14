# Gotchas

Four failures that produce a **wrong video with no error message**. All four
were found the hard way. Read once; check them whenever something looks subtly
off.

**The meta-lesson, which cost the most:** when an element looks wrong, measure
the render against what you intended *before* redesigning it. Three of the four
below present as a design problem — bad crop, wrong typeface, sloppy framing —
and every attempt to fix them as a design problem makes things worse, because
the design was never the thing that was broken. See §4.

---

## 1. Fonts silently do not load

**Symptom:** every render comes out in Times New Roman. The Studio preview looks
correct, so it is easy to miss for a long time.

**Cause:** `package.json` declaring

```json
"sideEffects": ["*.css"]
```

tells the bundler that only CSS files have side effects, so a side-effect-only
`import "./fonts"` — which exports nothing — is tree-shaken away entirely. The
font-loading code never runs. Nothing errors, because nothing ran.

**Fix:** widen it.

```json
"sideEffects": ["*.css", "**/fonts.ts"]
```

**How to detect it:** render one throwaway frame comparing each real family
against a **deliberately fake** family name. Identical output means nothing is
loading. Never judge a typeface by eye in a screenshot.

---

## 2. Video letterboxes instead of filling the frame

**Symptom:** black bars, usually top and bottom, on every frame of footage.

**Cause:** `@remotion/media`'s `<Video>` **ignores `objectFit`**. It behaves as
`contain` regardless. A 2336x1080 source in a 1920x1080 composition renders at
1920x888 with 96px bars.

This stays invisible while your footage happens to match the composition's
aspect ratio exactly, then appears the first time it does not.

**Fix:** compute the cover geometry explicitly and set width/height/left/top on
the video element:

```ts
const scale = Math.max(comp.width / src.width, comp.height / src.height);
const width = src.width * scale, height = src.height * scale;
// left: (comp.width - width) / 2, top: (comp.height - height) / 2
```

**Related:** on `<Img>`, `objectFit` *does* work — but an over-constrained
absolute box (a negative `inset` **plus** `width`/`height` percentages) can
still leave a strip of background down one edge. Put the zoom on a
frame-sized wrapper and let the image fill it at 100%/100%.

---

## 3. Remotion's own FFmpeg will not run on some Windows machines

**Symptom:** every frame renders fine, then the stitch step dies:

```
Error: FFmpeg quit with code 3236495362   The FFmpeg output was
```

with no FFmpeg output at all. Running the binary by hand gives exit 127 and
prints nothing.

**Cause:** **Smart App Control**, in enforce mode, blocking the unsigned
binaries shipped inside `@remotion/compositor-*`. Every binary in that package
fails identically — `ffmpeg.exe`, `ffprobe.exe`, `remotion.exe`.

Confirm with:

```powershell
(Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\CI\Policy' -Name VerifiedAndReputablePolicyState).VerifiedAndReputablePolicyState
# 1 = enforcing
```

It is **not** Controlled Folder Access, and **not** Mark-of-the-Web, so
`Unblock-File` does nothing.

**Do not tell the user to turn Smart App Control off.** It has no per-app
allowlist, and disabling it is permanent — it cannot be re-enabled without
reinstalling Windows. That is a large, one-way security downgrade to fix one npm
package.

**Fix:** avoid Remotion's FFmpeg entirely. Frame rendering runs in headless
Chrome and is unaffected, so:

1. `remotion render <comp> <dir> --sequence --image-format=jpeg` — frames only
2. build the audio with the **system** FFmpeg
3. mux the two with the system FFmpeg

`npm run render -- <project>` (scripts/render-final.mjs) does this. **`npx
remotion render out.mp4` will keep failing; use the script.** It works the same
on every platform, so it is the one supported path even where Remotion's own
FFmpeg would run.

**Gotcha inside the gotcha:** Remotion zero-pads sequence filenames to the width
of the highest frame number — `element-0.jpeg` for a 4-frame test, but
`element-0000.jpeg` for a 6000-frame render. Read the padding off disk; a short
test will not reveal it.

---

## 4. Tailwind's reset silently shrinks any deliberately oversized image

**Symptom:** a cropped photo looks badly cropped — subject off-centre, faces
slightly too narrow, and a thin strip of background showing along one edge of
the card. It reads as a judgement call gone wrong, not as a bug.

**Cause:** Tailwind's preflight sets

```css
img, video { max-width: 100%; height: auto; }
```

Cropping by overflow works by sizing the image **larger** than its container and
sliding it — so `max-width: 100%` clamps exactly the thing the technique
depends on. The inline `width` loses to `max-width`; the inline `height` still
wins over `height: auto`. The image therefore comes out **squashed
horizontally** and **short of the container's far edge**.

Nothing errors. The image is still there, still roughly right, just wrong.

**Fix:** on any image you size beyond its container, opt out explicitly:

```ts
const style = { maxWidth: "none", maxHeight: "none", width: w * scale, height: h * scale, left, top };
```

**Only affects images sized in absolute pixels beyond their box.** Percentage
widths with `objectFit`, and `transform: scale()` zooms, are untouched —
transforms happen after layout. `@remotion/media`'s `<Video>` was also
unaffected when this was checked; verify rather than assume.

**How to detect it — do this before touching the design.** Crop the element's
rectangle out of the render and diff it against the source region you meant to
show:

```python
rendered = Image.open(render).crop(card_rect)
expected = Image.open(source).crop(crop_rect).resize(rendered.size, Image.LANCZOS)
print(np.abs(np.array(rendered,float) - np.array(expected,float)).mean())
```

**~2–4 is a match** (resampling and JPEG noise). **~50 means it is not rendering
what you asked for.** This check takes two minutes. Skipping it cost two full
rounds of re-cropping a photo that was correct all along, plus the user having
to report the same defect three times.

For a whole-frame element like footage, multi-scale template-match a patch of
the render back onto the source and read off the scale: 1.00 means 1:1, anything
else means it is being resized behind your back.
