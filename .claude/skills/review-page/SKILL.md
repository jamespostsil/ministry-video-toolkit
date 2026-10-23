---
name: review-page
description: Make the page a reviewer uses to watch a video version and leave notes: the video, one row per narration sentence with Script and On-screen notes, a note pinned to any spot on the picture (pause, click, type), yellow boxes on what changed since the last version with a "Looks good" tick, and Previous / Next change buttons. Published as a claude.ai artifact whose notes Claude can read back. Use after every render that someone should look at, or when asked for a review page, a feedback page, or a way to comment on a video.
---

# Review page

One page per version of a video. The reviewer watches, pauses, and writes notes where they belong; you read
the notes back from the page's database and make the changes. Pair it with the `review` skill (your own checks
come first: a reviewer should never be the one who finds a defect).

`build.py` and `template.html` here are a copy of a shared page (also used for software training videos);
don't change them here, or the next update overwrites the change. This file, and how you use the page for
ministry videos, are this toolkit's own.

## Build it

1. Make a small web copy of the render (it must stay under the artifact size limit):
   `ffmpeg -i final.mp4 -vf scale=1280:-2 -c:v libx264 -crf 26 -preset slow -c:a aac -b:a 96k -movflags +faststart web.mp4`
2. Write `data.json` (format in [build.py](build.py)): the title, the video's file name, the version number,
   one entry per sentence with the time it starts in the video, and a short note for each sentence that
   changed since the last version ("changes"). Sentence times come from the edit plan or the transcript.
3. `python build.py data.json review.html`
4. Publish `review.html` as an artifact with the `db` capability and the video as a published file
   (`files: {"web.mp4": "<path>"}`). Publish from a folder inside the working directory. Keep only the
   newest video on the page: on a new version, publish to the same URL and remove the old video file.

## What the reviewer can do

- **Pin a note to a spot:** pause (Space plays and pauses; before the first play, a click plays), click the picture (or drag to draw an arrow to the spot), type. The note opens right there on the video (no mode
  button, no separate tab), its number shows on the picture around that moment, and it is listed in that
  moment's sentence row. Clicking the number jumps back to it. "Delete pin" removes it.
- **Script / On screen notes** on every sentence, and one box for anything else.
- **Changes:** each change note is a yellow box on its sentence. Previous / Next change jump to them and play
  from there. Ticking "Looks good" folds the box to one line and takes it out of Previous / Next; unticking
  brings it back. Changes not ticked yet carry over to the next version's page.

## Read the notes back

Every write goes to the artifact's db (read it with the ArtifactData tool):
- `sentences-v<N>/<sentence id with dots as dashes>`: `{id, text, script, screen, ok}`
- `pins-v<N>/<pin id>`: `{t, x, y, text, sentence}`, plus `kind: "arrow", x2, y2` (the tip) for an arrow (x, y: 0 to 1 across the picture; `sentence`: the one
  playing at `t`). To see what a pin points at, take the frame at `t` and look at (x, y).
- `notes-v<N>/overall`: `{text}`

Do the notes, then build the next version's page with a short change note on each sentence you changed. Don't
send back a list of planned edits.

## Rules

- No sentence ids, section headings or "checks passed" lists on the page: only what needs the reviewer.
- Short, plain change notes, one per sentence. Say when something needs a decision.
- Every choice can be undone (untick, delete pin, clear the text).
