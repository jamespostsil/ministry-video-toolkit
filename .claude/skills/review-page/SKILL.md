---
name: review-page
description: Make the page a reviewer uses to watch a video version and leave notes: the video, one card per scene with one Note box, a note pinned to any spot on the picture (pause, click, type), yellow boxes on what changed since the last version with a "Looks good" tick, and Previous / Next change buttons. Published as a claude.ai artifact whose notes Claude can read back. Use after every render that someone should look at, or when asked for a review page, a feedback page, or a way to comment on a video.
---

# Review page

One page per version of a video. The reviewer watches, pauses, and writes notes where they belong; you read
the notes back from the page's database and make the changes. Pair it with the `review` skill (your own checks
come first: a reviewer should never be the one who finds a defect).

`build.py` and `template.html` belong to this toolkit; it depends on no other repository.

## Build it

1. Make a small web copy of the render (it must stay under the artifact size limit):
   `ffmpeg -i final.mp4 -vf scale=1280:-2 -c:v libx264 -b:v 420k -maxrate 700k -bufsize 1400k -preset slow -c:a aac -b:a 96k -movflags +faststart web.mp4`
   (each published file must be under 15 MB: this gives about 13 MB for a 3:40 video; for a longer one, lower `-b:v` in proportion. A fixed `-crf` gave 22 MB.)
2. Write `data.json` (format in [build.py](build.py)): the title, the video's file name, the version number,
   one entry per scene (the storyboard's cards, in order) with the time it starts in the video, its words, its
   `group`, `screen` (the words on screen) and `pictures`, and a short note for each scene that changed since
   the last version ("changes"), its `section`. Times come from the transcript of the cut footage plus the title
   card's length. Anything Claude needs the reviewer's OK on goes in `questions` (never a separate status page:
   the reviewer won't go looking for it); `at` puts a question in the scene it is about. `good`: the cards marked
   good on the last version that you didn't change, so they start folded. `preview`: the label on the video
   ("Preview copy: 720p, not HD").
3. `python -I build.py data.json <out>/review.html --photos <script's image folder> --crops crops.json --out-pics <out>/pics`
4. Publish `review.html` as an artifact with the capabilities `{db: {}, assets: {}}` (assets: photos the reviewer uploads), the video and `pics/` as published files
   (`files: {"web.mp4": "<path>", ...}`). Publish from a folder inside the working directory. Keep only the
   newest video on the page: on a new version, publish to the same URL and remove the old video file.

## Simple and Detailed

A switch at the top right picks how much the page shows. Both save notes to the same db documents, so reading
them back is the same.

- **Simple:** the video, "Anything else about the video", and the reviewer's own notes listed in time order. A click on
  the video (playing or paused) pauses it and opens a note at that spot; a drag draws an arrow. Use it for anyone
  who only needs to say "change this here".
- **Detailed:** everything below (scene cards, words on screen, photos, Looks good, changes, questions).

The page opens in Simple unless `data.json` has `"mode": "detailed"`; anyone can switch with the Simple / Detailed buttons at the top. A link ending `#simple` or `#detailed` opens
that mode (send `<url>#detailed` to someone who will edit the details); otherwise the page remembers each
viewer's last choice.

## What the reviewer can do (Detailed)

- **Play and pause:** Space or K, wherever the focus is except a text box: one handler, caught before the video's
  own controls, so a clicked video doesn't toggle twice. F, a double-click or the player's own full-screen button
  puts the video's frame (not the bare video) full screen, so the "not HD" label stays on it.
- **The pin instructions sit above the video**, where the reviewer looks first, not below it.
- **The pin layer stops 84 px above the bottom of the video**, so a click on the play button or the time bar
  works the player instead of adding a note.
- **Pin a note to a spot:** pause, before the first play, a click plays, click the picture (or drag to draw an arrow to the spot), type. The note opens right there on the video (no mode
  button, no separate tab), its number shows on the picture around that moment, and it is listed in that
  moment's sentence row. Clicking the number jumps back to it. "Delete pin" removes it.
- **Each scene is a card**, as on the storyboard: what is said, then the words on screen (edit in place), the
  photos (drag ⠿ to reorder, caption, credit, permission; click one to see it larger), then one Note box. A
  ministry video's script is recorded, not generated, so split Script / On screen notes don't help; no
  placeholder text in the boxes. Cards of one moment share their words and photos (shown on the first card
  only). One box at the top is for anything else.
- **Remove and add photos:** ✕ takes a photo out (a "Put back" chip undoes it); "+ Add a photo" picks from every
  photo in the script's folder or uploads one (editors only). Any card that starts a moment can get one. The link
  sits in the same place on every card, at the right of the Note label, and shows on the current card or the one
  pointed at. A card with one photo shows no drag handle or "Drag to reorder".
- **No "Words on screen" heading:** each field has its own label (Heading, Subtitle...); a thin rule sets the
  words apart from what is said.
- **Looks good:** one per card (not per words or photos block): the card folds to one line (✎ Edit opens it
  again; ✎ Edit shows only when the folded card is pointed at). The button fills in on the current card and the
  one pointed at, so it is easy to find. Section dividers are just the section's name: no "mark the section good"
  button. Next scene skips folded cards, and the count shows how
  many are left to check. Marking a card good also passes its change box.
- **Questions from Claude** all sit at the top; one about a scene has a "Show the scene" link. OK folds one;
  "Change it" opens a box for what to change. Keep each question short: a title and two or three short points.
  Drop questions already answered from the next page.
- Esc closes an enlarged photo. The current card scrolls into view below the sticky scene bar, never under it.
  The list stops following the video for 4 seconds after the reviewer scrolls, points or clicks in it, so a
  button never moves away from the pointer.
- **Previous / Next scene** (or Alt + ↓ / Alt + ↑, even while typing) moves the video and the list together.
- The instructions are a bulleted list that folds away (the page remembers).
- **One sticky bar at the top:** Previous / Next scene with the count, and under it, only while changes are left
  to check, a small change row (◀ ▶, "2 changes to check", Auto-play). It goes away once every change looks good.
- **Changes:** each change note is a yellow box on its sentence. ◀ ▶ jump to them and, with Auto-play on, play
  from there. Ticking "Looks good" folds the box to one line and takes it out of Previous / Next; unticking
  brings it back. Changes not ticked yet carry over to the next version's page.

## Read the notes back

Every write goes to the artifact's db (read it with the ArtifactData tool):
- `sentences-v<N>/<sentence id with dots as dashes>`: `{id, text, note, ok}` (pages before 2026-10-27: `script`, `screen`)
- `pins-v<N>/<pin id>`: `{t, x, y, text, sentence}`, plus `kind: "arrow", x2, y2` (the tip) for an arrow (x, y: 0 to 1 across the picture; `sentence`: the one
  playing at `t`). To see what a pin points at, take the frame at `t` and look at (x, y).
- `notes-v<N>/overall`: `{text}`
- `order-v<N>/<group>`: `{pics, removed, added}` (the reviewer's photo order, the ids taken out, and the photos
  added: `{id, file, w, h, asset?}`; an `asset` is an upload: fetch it with the Artifact tool's read, path = the
  asset id), `pics-v<N>/<picture id>`: `{caption, credit, rights, file, asset?, original}`,
- `good-v<N>/card-<id>`: `{good}`; `answers-v<N>/<question id>`: `{title, answer:
  "ok" | "change", note}`, `screen-v<N>/<group.label>`: `{label, text, original}` (their wording of words on screen)

Do the notes, then build the next version's page with a short change note on each sentence you changed. Don't
send back a list of planned edits.

## Rules

- No sentence ids or "checks passed" lists on the page: only what needs the reviewer. Sections show only as a thin
  divider with "Mark the section good".
- Short, plain change notes, one per sentence. Say when something needs a decision.
- Every choice can be undone (untick, delete pin, clear the text).

## Design rules for this page (2026-11 tidy-up)

The page should explain itself. Keep these when changing the template:

- **No "How to use" list.** One short hint by the picture, placeholders in the note boxes ("What should change in
  this scene?"), and tooltips on small controls. Detailed has a closed "Tips" with a few lines for what can't be
  seen (keys, drag for an arrow). Simple has none. Before adding an instruction, try to make the control obvious.
- **One status line** beside Simple / Detailed: "Notes save as you type. Claude reads them." It turns into the
  warning when notes can't be saved. "Saved" flashes in a corner and never takes a row of its own.
- **Fields read as plain text** until pointed at or typed in (words on screen, captions, credits). No box around
  every value.
- **A photo is two lines:** caption over credit, with permission as a small coloured tag. Caption, Credit and
  Permission are placeholders and tooltips, not visible labels. The drag handle has a tooltip, not a hint line.
- **Words on screen show the short label** ("Date", not "Title card: date"); the full label is the tooltip and
  stays in the saved data.
- **No empty rows:** a line that has nothing to show (undo links, crop notes, change tags) takes no space.
- **The version's own message** (`general` in data.json) is optional and shows as a quiet line over the video. Don't
  use it to say that notes save: the page says that itself.
- **The hint over the video** is one short sentence that follows the state (not started, playing, paused).

## Shared photos in "+ Add a photo"

Same as the storyboard (see its SKILL.md, "Shared photos"): `--library <folder>` (with `--out-pics`) adds the
**Shared photos** tab, and `--library-link <url>` links the whole folder from it. Reviewers need only the page link.
The people-with-Bibles set: https://drive.google.com/drive/folders/1-H_TnNHrNl6CV8D1xkK8dZi33O7p4Fyq
