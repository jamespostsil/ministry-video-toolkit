---
name: beat-library
description: Choose which on-screen treatment a piece of content should get — takeover, whole-photo, row, slider, scatter, call-to-action — and size the cards so images are as large as they fit. Use when deciding how to show photos or screenshots in a video, when a beat looks cramped or sparse, or when asked to make images bigger.
---

# Beat library

One decision per group of images: **which treatment, and how big.**

---

## Pick the treatment

Start from the *shape of the content*, not from what looks nice.

| The content is… | Use | Why |
|---|---|---|
| One landscape photo worth the whole frame | **Takeover** | Full-bleed, slow push |
| One portrait photo, or anything with text on it | **Whole-photo** | A 16:9 crop would cut off faces or typeset words. Shows it complete over a blurred copy of itself |
| 2–4 items meant to be compared | **Row** | Each at its own aspect ratio, shared height — nothing cropped |
| 5–10 photos of the same kind, with captions | **Slider** | Cards drift across; reads as a set |
| A list the narrator reads aloud | **Scatter** | Each photo lands on its own phrase and stays, building a pile |
| An ask, while the speaker keeps talking | **Call-to-action** | Words beside them over the live shot |

**Never force mixed aspect ratios into one fixed card shape.** A 16:9 family
photo and a 4:3 one in identical cards means one of them gets cropped. Row sizes
each card to its own aspect at a shared height; that is the whole point of it.

---

## Size the cards to the photo count

**Fewer photos means more room — use it.** A size tuned for a 10-photo run makes
a 4-photo run look timid, and the images are the content.

Compute the card size from the count and the available area rather than
hardcoding a number:

- **Slider** — for 5–6 photos, cards can be ~40% larger than a 10-photo setting.
  Bigger cards do pan faster, but with few photos every card is still on screen
  for most of the beat, so legibility does not suffer. With 10+ photos, smaller
  cards keep more of them visible at once and each caption on screen longer.
- **Scatter** — the layout collapses to fewer grid columns as the count drops.
  Watch the tallest card: a portrait card at a large setting can run past the
  title. Cap the long edge so the tallest possible card still clears it.
- **Row** — cards share a height derived from the total width available divided
  by the sum of their aspect ratios. Two landscape photos will always be about
  half frame height; that is geometry, not a bug.

Ceiling as well as floor: two photos should not become billboards.

**Never upscale a screenshot much past its native size.** A 400px-wide UI grab
blown up to 900 goes soft and looks like a mistake. Size that beat so the grab
lands near 1:1, and let the caption carry the meaning.

---

## Captions

- Caption what the viewer cannot work out from the picture — a place, a
  language, a person's role. Not a description of what is visible.
- Credits go under the caption, smaller. Take them from wherever the source
  script records them; do not invent them, and do not guess an organisation's
  name from a filename.
- **A caption belongs to its own card and is covered by whatever lands on top
  of it.** That is correct — it is part of the photo underneath. Do **not**
  lift captions into a layer above all the cards: it stops them being buried,
  but produces something worse, a caption floating on top of a photo that
  arrived *after* it, which reads as a mislabel. This was tried and reverted.
- **Guarantee read-time with spacing, not z-order.** The real requirement is
  that a caption is fully visible long enough to read *before* the next card
  covers it. Captioned sets should therefore build no faster than ~1.8s per
  card, duration permitting. Uncaptioned sets can go quicker.
- **Pick the caption corner, don't assume it.** Every card position is known
  before rendering, so choose the corner the later-drawn cards cover *partly*
  least. Fully buried is fine; half-covered (words sliced through) looks broken.
  Hardcoding bottom-left failed as soon as a wide landscape card sat beside a
  portrait one. Use rotated card bounds — the unrotated box misjudges overlap.
- Don't over-solve it. A caption covered after it has had time to be read is
  acceptable: it belongs to the photo underneath, and a pile reads as a pile. Fix the sliced case; leave the pile alone.
- **Card borders, in EVERY layout** (scatter, slider, PhotoGallery, row, blur,
  thumbnails, end cards): put the border on a wrapper whose background matches
  the border, never on the `<Img>` and never over a dark card colour; when the
  photo fills its box, overfill it 1px. Any card that is rotated or scales in
  lands on fractional pixels and leaves a hairline of whatever is behind the
  photo: invisible on dark photos, glaring on light covers and documents. The
  overfill needs `maxWidth: "none"` or Tailwind clamps it back (gotchas §4).
  (Was fixed in scatter/slider only at first; row, blur and PhotoGallery kept
  the old style until a thumbnail with a light cover image showed the line.)
- Secondary text below ~28–30px is suspect. Check at real size.

---

## Pacing

- A beat should cover the sentence it illustrates, and hand back to the speaker
  for anything said **straight to the viewer** — a thank you, a direct ask.
  Those lines want a face, not photos.
- When a beat is a list, time each image to its own phrase rather than to a
  metronome.
- Avoid long static holds. If the build finishes with 10s of a frozen pile left,
  end the beat earlier and return to the speaker.
- Beats that abut should abut exactly — the engine then holds the outgoing beat
  underneath while the next fades in, so the presenter never flashes between two
  graphics.

---

## Headings — label every main section

A viewer who joins late, or whose attention drifts, needs to know where they
are. **Put a short heading in the upper-left as the speaker introduces each main
section**, timed to the words that announce it.

One per section, not per paragraph. For a personal update that is typically:

| Section | Heading | Subtitle |
|---|---|---|
| Opening | the presenters' names | their organisation |
| Each life/work section | the section name | an optional detail |
| A person taking over a section | that person's name | their role |
| A named capability or theme | the theme, with the energy of the script | — |
| The ask | "Get Involved" or similar | — |

**Give each speaker a name plate when they take over.** If two people trade
sections, the handover is invisible to a viewer who does not know them. A name
plate on each — same treatment, same position — makes the structure obvious.

**Write headings in the script's own voice.** If the narration is enthusiastic
("this is a very exciting time!"), the heading can carry an exclamation mark.
Do not flatten it into a filing label.

### Other overlay text worth adding

Beyond headings, add text when **a spoken idea has a shape the ear misses**:

- **A before/after** — "used to take weeks, now days" is far stronger seen than
  heard. Land each left-hand term as it is spoken, then pay off the right column
  on the answering phrase.
- **A short list the speaker rattles off** — two or three bullets, so the list
  registers as a list.
- **A direct ask** — the words on screen while they say them.
- **A number or milestone** worth dwelling on.
- **A thank-you or blessing** — a moment, not information. Keep it to the words
  themselves and drop any explanatory subtext; it is punctuation.

Do not caption what the speaker is already saying plainly. Overlay text is for
structure and emphasis, not subtitles.

## Read-time — check it, do not assume

**Every element must be at full opacity long enough to read**, and staged
elements are where this goes wrong: the last item to appear inherits whatever
time is left, which is often almost none.

Work it out explicitly for the *last* element in any staged beat:

```
full-opacity time = (beat end - fade-out) - (element delay + fade-in)
```

Rough minimums: **1.5s** for two or three words, **3s** for a short line, **4s+**
for a line plus sub-items. If the last element falls short, extend the beat —
an overlay may hold past the sentence it illustrates, since the speaker stays
on screen underneath.

Two overlays must never share the screen. Check every pair of overlay beats for
overlapping time ranges; they occupy the same corner and will collide.

## Words over the live shot

Sometimes the speaker should stay on camera while words appear beside them — a
name plate, a role, a short list, a before/after, an ask. These are **overlays**,
not beats that cover the frame, and they need different handling:

- The presenter must stay **sharp**. Exclude overlays from whatever "blur the
  footage while a graphic covers it" rule the engine applies.
- They must not take part in the abut-and-hold crossfade logic, which only works
  between two beats that both fill the frame.
- **Derive the scrim from the type box.** A panel rectangle and a text box kept
  in sync by hand drift apart, and nothing warns you. Author the type's origin,
  then grow the panel out of it by the padding.
- **A blurred panel's edge is a ramp, not a line.** A rectangle drawn to X is
  only fully opaque from about X + blur-radius inwards, so padding has to be
  written as *the solid padding you want, plus the blur radius*. Headings here
  had 46px nominal padding against a 26px blur — about 20px of real backing, so
  the first letter of every heading sat on the fade. Aim for roughly one
  title-size of **solid** padding (60px for 58px type).
- **Keep overlay type inside the 5% title-safe area** (96px at 1920). It is easy
  to end up at 3–4% by measuring the panel's margin instead of the type's.
- **Size the panel to the longest line**, not to a fixed slab — but estimate
  generously. An average glyph advance underestimates a short word of wide
  letters badly: "Possible!" measured 0.645em per character against an average
  of 0.44, and a panel sized on the average ended 5px past its last letter.
- **Size the scrim to the type box, not centred on it.** A radial gradient
  centred on a block of text puts the text out at its own edge, where it has
  faded to almost nothing — the words end up on bare background with no backing
  at all. A soft-edged rectangle covering the text box plus padding is both
  more legible and easier to keep off a face. Verify by measuring: the scrim
  area should be clearly darker than the same height elsewhere in frame, and
  each face should measure within a couple of points of a control frame taken
  just after the overlay ends.
- **Measure padding by differencing against a control frame**, not by colour
  tests on the overlay frame alone. Bright sky and pale foliage pass any "is
  this white?" test and will report type extending to the edge of your search
  box. Against a control of the same locked-off shot, the type is what got much
  *brighter* and the scrim is what got much *darker* — which separates them
  cleanly. Keep the sampled region clear of anyone who moves between the two
  frames, or their motion contaminates the result.
- Time sub-elements to the words. A before/after should land its left column as
  each term is spoken and pay off the right column on the answering phrase,
  rather than appearing all at once.

## Anything placed near a person — measure

Position graphics against a **rendered frame**, by measuring real pixel
boundaries, never by eyeballing coordinates or assuming where someone stands.
Find where the nearest face actually begins and set the element — and any scrim
behind it — to stop short of it. A gradient that reaches a face dulls and tints
it, and that reads as a bad edit rather than a design choice.

Check compositional problems unprompted: an element dead-centred against a face,
a caption tangent to someone's head, a scrim crushing dark clothing to black.

### Setting `overlaySafeArea`

Headings, before/after rows and the call to action all draw in the upper left,
inside the project's `overlaySafeArea` (`right`, `bottom` in frame pixels). The
default — x < 960, y < 410 — suits two people standing right of centre with
space above them. **It is not right for every shot, so measure it once per
video:**

1. `npm run still -- <project> <seconds>` at two or three points across the
   video, including the moment people are highest or furthest left in frame.
2. Find the leftmost x and topmost y where any person begins (hair counts).
3. Set `right` and `bottom` 20–40px short of those, so the scrim's soft edge
   stops before it reaches anyone. `right` caps how wide a panel can grow.
   `bottom` is a check, not a limit: the overlay layouts are fixed to the top
   ~410px, so **if your measured `bottom` is smaller than 410, the overlays will
   reach someone** — use full-frame beats for that video instead.
4. Render a frame with each overlay type and check it, as in the review skill.

With a locked-off camera one measurement holds for the whole video. If the
shot leaves no clear upper-left area at all — someone framed top-left — the
overlay beats are the wrong choice for that video; use full-frame beats there
instead.

---

## People other than the speakers

If an image shows identifiable people who are not the presenters or their
immediate family, **ask whether there is permission before using it** — do not
use it and mention it afterwards. Screenshots of internal meetings or team calls
are the clearest case. An organisation's own published field photos, credited,
are fine.
