---
name: partner-frame
description: Build the closing frame of a ministry video — photo, name, web address, optional QR code — reading the details out of the script's "[End frame]" block. Use when making an end card, end slide, closing slide or partner frame, when the QR code or web address needs changing, or when a supplied end-frame photo has to be cropped to fit.
---

# Partner frame

The last thing on screen. It answers one question — *who was that, and where do
I find them?* — and it has to answer it well enough that someone can point a
phone at it before it cuts.

Everything on it comes from the script. Nothing is typed in by hand.

---

## What the script has to say

Put a block at the end of the script, marked `[End frame]`, containing:

```
[End frame]
Your Name Here
YourWebsite.org
<photo>
<QR code image>                  ← optional
<image captioned "Background">   ← optional
```

Read it as: **first line is the name, second line is the web address**, the
first image is the photo, a second image is the QR code. An optional third line
before the images is the headline ("Learn more about our Wycliffe ministry"); if
there isn't one, use a sensible default or leave it out.

**Go by the image captions, not by position alone.** An image captioned
`Background` is the full-bleed background, wherever it appears in the block.
Without one, generate a plain brand-coloured field.

A person writing the script should not have to think about crops, sizes or
layout. Those are this skill's job.

---

## Check the two things the script usually gets wrong

**Do this before rendering anything.** Both have shipped in real videos.

1. **Decode the QR and compare it to the typed web address.** They should point
   at the same place. When they disagree, the QR wins — it is a generated
   artefact, the typed line is something someone retyped from memory. Confirm
   with a DNS lookup on both spellings and say which one you used.

   > This is not hypothetical. One script typed the web address with a
   > spelling one letter different from the one its own QR code pointed to,
   > and only the QR's spelling had a DNS record.

2. **Look at the photo's dimensions.** Phone portraits arrive tall and narrow —
   489×1058 is typical. Dropped into a frame unchanged they either letterbox or
   guillotine somebody. See cropping, below.

---

## Cropping the photo

> **Before you change a crop because it looks wrong, prove the crop is what is
> being rendered.** Crop the card's rectangle out of the render, resize the
> source crop to the same size, and diff them. ~2–4 mean absolute difference is
> a match; ~50 means something in the pipeline is not honouring your numbers.
>
> This is not hypothetical. A photo here was reported as badly cropped three
> times and re-cropped twice before anyone measured it. The crop was right every
> time; Tailwind's preflight (`img { max-width: 100% }`) was clamping the
> oversized image, which both squashed it horizontally and left a strip of
> background down one side. See `docs/gotchas.md` §4. Set
> `maxWidth: "none", maxHeight: "none"` on any image sized beyond its container.

**Crop to where the PEOPLE are, not to where the faces are.** Faces-in-the-box
is necessary and not sufficient: a crop built from the face bounding box left a
band of bare background down one fifth of the card, so the pair sat off-centre
with a slab of nothing beside them. Classify subject vs background by hue,
column by column, and cut where subject density falls off a cliff:

```python
foliage = (G > R + 8) & (G > B + 8)          # or whatever the background is
density = (~foliage)[crop_top:crop_bottom].mean(axis=0)
# density held above 0.65 out to x≈390, then dropped to ≈0.28 — cut at ~409
```

**Let the card's aspect follow the crop's**, not the other way round. Fixing the
card shape first and then hunting for a crop to fit it is what produces the dead
band in the first place.

If a previous end frame used this photo, its crop is a useful *starting point* —
template-match the old frame's photo card back onto the source at multiple
scales to recover the exact rectangle:

```python
card = old_slide[196:740, 196:616]          # inside the card's border
for cw in range(240, src.shape[1] + 1, 2):  # candidate crop widths
    tpl = cv2.resize(card, (cw, round(cw * card.shape[0] / card.shape[1])))
    score, _, _, loc = cv2.minMaxLoc(cv2.matchTemplate(src, tpl, cv2.TM_CCOEFF_NORMED))
```

A match above ~0.99 means you have the original rectangle, not an approximation.
**Then check it against the density test anyway** — an old frame can carry its
own flaw forward, and a faithful recovery of a bad crop is still a bad crop.

Either way, write the crop as a rectangle in the source image's own pixels. Do
not eyeball a percentage.

The target is the photo card's shape: **454×588, about 3:4 portrait**. From
the face bounding box:

- **Above** the topmost head: about a third of a head's height of room. A crop
  that grazes the scalp looks like an accident.
- **Below** the lowest chin: at least a chin-to-chin height, so the shoulders
  read as shoulders and the head isn't balanced on the frame edge.
- **Sideways**: centre on the midpoint between the faces, not on the centre of
  the original image — the subject is rarely in the middle of a phone photo.

Worked example, for a 489×1058 source with two faces spanning x 120–400,
y 145–560:

```
photoCrop: { x: 21, y: 107, width: 456, height: 591 }   // 0.772, the card's shape
```

**Render two or three candidates as a contact sheet and look at them side by
side.** This took three attempts to get right when judged one at a time; seen
together the right one is obvious in seconds. Check: nobody clipped at the top,
faces filling the card, the subject centred rather than pushed to one side, no
distracting background object growing out of a head.

If the photo is *already* close to the card's shape, leave the crop off
entirely.

---

## Layout rules

| Element | Rule |
|---|---|
| **QR code** | ~29% of frame width (564px at 1920). This size is proven scannable off a compressed 1080p upload. **Never shrink it to make room for something else** — drop the something else. |
| **Photo** | Left column, same top and bottom as the QR so the frame reads as two balanced columns. |
| **Name** | Under the photo, centred on it. |
| **Web address** | Under the QR, centred on it, in the accent colour. It is the fallback for anyone who can't scan. |
| **Headline** | Middle column, **set large in a narrow measure** — three or four short words per line, with ~90px of air each side. Optional. |
| **Logo** | Bottom-right. Use the organisation's real asset file. Optional. |

**Size the name and the web address independently**, each capped by its own
column's width, and keep everything at least ~60px from the frame edge. Do not
force one font size on both: a long web address would drag the name down with
it, and it would not even look more even, because two families at the same
font size have different cap-heights. Alegreya at 65 and Poppins at 58 match
optically, which is what the eye compares.

**Compute the cap rather than hardcoding a size.** Estimate the rendered width
from the character count and a measured average glyph advance, and shrink to
fit. A 21-character web address at 66px overflowed the frame and was cropped
mid-word — silently, because nothing errors. That is the worst thing that can
happen to the one line a viewer may have to type by hand. Measure the advance
constants off a real render; estimating them put the same line 11px from the
edge on the next attempt.

**Do not run the headline out to the full width of the gap.** It reads as
cramped between two framed cards, and a wide measure lets it set small. Giving
it generous side margins forces short lines, which is what lets it be big.

**Give the QR column a sane outer margin.** It is easy to inherit a lopsided one
from an older slide, and the tighter side is exactly where the web address runs
out of room. Equal margins are the default — but when the photo card ends up
much narrower than the QR, bring the lighter column in a little further than
the heavier one, or the frame looks like it is sliding left.

### Background

**Its only job is to stay out of the way.** If the script supplies one, use it.
If not, generate a deep brand-coloured gradient with one soft glow and a
vignette, and at most one very low-contrast texture at a scale larger than any
element sitting on it.

Do not invent an all-over pattern. A dense repeating motif looks good on an
empty slide and then fights every piece of type and the QR code's quiet zone
once they land on it.

#### Scrimming a supplied background

A photograph behind text needs darkening, but **the person supplied that image
because they want to see it** — so work out how much darkening is actually
needed rather than reaching for a safe-looking number.

Order of operations:

1. **Put a dark ring on every glyph** (a tight four-way hard shadow plus a soft
   glow). This is what actually guarantees legibility, because it makes each
   letter readable independent of whatever is behind it.
2. **Then** add the minimum scrim that fixes the *colour* problem. The usual
   failure is not brightness but hue: brand-toned stock images and a brand
   accent colour are frequently the same hue at the same brightness, so the
   accent text disappears into the picture while white text is perfectly fine.
3. Measure, adjust, measure again.

On a real example — a teal-toned Bible photo with a teal accent — white type
was already at 6.3:1 and needed nothing, while the accent web address sat at
2.55:1, under the 3:1 floor. A flat 34% scrim took it to 4.7:1. A first attempt
used 58% plus a heavy vignette and all but erased the photograph.

Two ordering traps:

- **Put the accent rule on top of the vignette.** Underneath it, corner
  darkening takes a bright accent down to roughly the field colour and the rule
  disappears — you will render it, not see it, and assume it didn't build.
- **Don't fade the frame in from inside the component** if the video's beat
  engine is already crossfading into it. Two fades read as a stutter, and a
  single-frame still render comes out blank because frame 0 is at zero opacity.

---

## Verify before you call it done

1. **Decode the QR from the rendered frame**, not from the source PNG — at full
   resolution *and* from a 1280×720 downscale, which is the worst case a phone
   sees off a compressed upload.
2. **Read every line at 100%**, and **measure where each one starts and ends**.
   Nothing should come within ~60px of a frame edge. Overflow does not throw;
   it just cuts a word in half.
3. **Contrast** of the accent-coloured text against the actual background behind
   it, not against the token it came from. 4.5:1 or better for the web address.

   **Do not measure this by sampling the rendered frame around the text.** The
   antialiased edges of the glyphs themselves land in the sample and read as
   bright backing — that produced a 2.02:1 "worst case" on a frame whose real
   worst case was 4.71:1, and it will send you chasing a problem that isn't
   there. Recompute the composited background from the source image and the
   scrim you applied, and measure that instead.
4. **Hold length.** The frame needs long enough to *notice* a QR code, get a
   phone out and point it: **7 seconds minimum**, more if the narration runs
   under it.

---

## Making one for someone else

The component takes every piece of content as a prop and hardcodes none of it.
A new video supplies its own config object and gets its own end frame:

```ts
export const PARTNER = {
  photo: "<project>/endframe/photo.jpg",
  photoSize: { width: 489, height: 1058 },   // the source's own pixels
  photoCrop: { x: 25, y: 82, width: 445, height: 556 },
  name: "Your Name Here",
  web: "YourWebsite.org",
  qr: "<project>/endframe/qr.png",           // omit for no QR
  headline: "Learn more about our Wycliffe ministry",
  logo: "<project>/endframe/wordmark.png",   // transparent PNG
  background: "<project>/endframe/bg.png",   // omit for a generated field
};
```

### The logo

**Ask for the real asset file before lifting one off an old slide.** Most
organisations have a transparent-background PNG of their logo and the person
you are making this for knows where it is.

Lifting one is a last resort, and it shows: an extraction from a previous end
slide came out with the "W" clipped at the left and the "y" descender cut,
because the crop box was set past the edge of the type to avoid a decorative
band. If you must do it — threshold the white type into an alpha matte, floor
the matte at ~30% to kill the background pattern's ghost, drop connected
components under ~40 pixels to remove specks, and check the ink actually stops
inside your crop on all four sides. Composite it on a dark swatch and look at
it: a transparent white PNG viewed on white looks identical to an empty file.
