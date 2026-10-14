---
name: thumbnail
description: Make a YouTube thumbnail for a finished ministry-update video — a separate still image, never a frame of the video itself. Use when asked for a thumbnail, a video cover image, a YouTube preview image, or "something to put on the video". Covers reframing so the subjects leave room for type, sizing type for a 210px-wide sidebar, keeping scrims off faces, and where to save the file.
---

# Video thumbnail

A YouTube thumbnail is **a separate image file, not part of the video**. It is
delivered next to the finished mp4 in the video's own folder. Never add it as a
beat, and never hand back a frame grab with nothing done to it.

## The photo is the point — type goes beside it, not over it

The thumbnail's job is to show **who this is**. A viewer scanning a list
recognises a face faster than they read a word, so the photo has to survive.

Two acceptable outcomes, in order of preference:

1. **Type sits in empty space the photo isn't using** — reframe until there is
   such a space (see below). This is almost always achievable and is the right
   answer.
2. **Type sits over the photo, but only over a part that carries no meaning** —
   sky, foliage, a wall — and the subjects stay completely clear and
   undarkened.

Never acceptable: type across a face, or a scrim heavy enough that the setting
turns into a grey slab. If the only way to fit the words is to bury the picture,
the words are too long or too big — cut them, don't dim the photo.

Before committing, look at the finished image and ask: *could I tell who this is
and where they are, if I had never seen the video?* If not, the type has won and
the photo has lost.

## The one constraint that drives every decision

YouTube shows thumbnails at roughly **210px wide** in a sidebar or search list —
about a sixth of 1280px. Type that looks generous at full size is unreadable
there. So:

- The headline should be **2-4 words**, set at roughly **9-16% of the frame
  height** (at 1280x720 that is ~85-115px). If it fits on one line at that size,
  it is probably too small — break it onto two lines and go bigger.
- At most **three** text elements total. A label, a headline, and a line of
  who/when is plenty.
- Do not reuse the in-video title card's type sizes. The title card is read at
  full screen for 3 seconds; a thumbnail is read at a glance, tiny. The video's
  own title card is the right *starting point* for the image, but its type must
  be set far larger.

## Reframe — don't crop centre

Talking-head footage is usually framed with the subjects centred, which leaves
nowhere for type. If the footage is wider than 16:9 — phones often record
ultrawide, e.g. 2336x1080 — the video is a centred crop of it, and there is
spare width either side that the video never uses. With plain 16:9 footage
there is no spare width, so this moves nothing: frame the shot with room on one
side, or set the type over the darker half of the frame instead.

**Anchor the crop to one edge instead of the centre.** In Remotion that is one
property on the image: `objectFit: "cover"` with `objectPosition: "0% 50%"`
pushes the subjects to the right and frees the left ~40% of the frame. Mirror it
(`100% 50%`) if their eyeline suits text on the right.

Check the result — the subjects should land in the outer 55%, with a clean
column for type.

## Scrim rules — measure, never eyeball

Type needs a dark field behind it or it dissolves into foliage. That field must
**stop before it touches a face**.

1. Render the thumbnail once with the scrim on.
2. Measure where the nearest subject actually begins, in pixels, in that render.
3. Set the gradient so it reaches **zero opacity before that x** (or y).
4. Re-render and confirm the face is its natural colour.

A gradient that runs past a face greens and dulls it, and on a photo of real
people that reads as a bad edit. On one video the first pass ran to 62%
and visibly darkened a presenter whose hair began at x=520/1280 (40.6%), so the
scrim was pulled back to reach zero at 41%.

Also confirm the widest headline line still sits inside the opaque part of the
scrim. Give every text element a `textShadow` regardless, so the tail end of a
line stays legible where the scrim has faded out.

## Content

Keep it to what someone scanning a list needs:

- a small label (the organisation)
- the headline — what this video *is*
- who and when

Use the brand accent for one element only (the rule, or the date) so there is a
single point of colour. Everything else white.

## How to build and deliver it

Every project already has a 1280x720 thumbnail composition (YouTube's minimum;
larger is fine, smaller is not), `<id>-Thumbnail`, built from the `thumbnail`
block of its `project.json`. Render it with:

```bash
npm run still -- <project> thumbnail "<video folder>/<Video Name> - YouTube Thumbnail.png"
```

It is a still, never part of the video.

Save it **in the same folder as the finished mp4**, named after the video with a
`- YouTube Thumbnail` suffix, so the pair travel together.

## Check before handing it over

- Shrink it to ~210px wide and look at it. Can you read the headline? If not,
  the type is too small — that is the whole test.
- Is any face tinted or darkened by the scrim?
- Is the headline clear of the subjects?
- Is it at least 1280x720, and under 2MB (YouTube's upload limit)?

## Reference implementation

`remotion/src/components/Thumbnail.tsx` — left-anchored crop, feathered
teal scrim stopping at 41%, the title at 116px on two lines, an accent-coloured
rule, byline and date beneath. All of the text comes from the `thumbnail` block
of the project's `project.json`.
