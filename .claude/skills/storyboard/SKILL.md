---
name: storyboard
description: Make the storyboard page a reviewer approves before anything is filmed, voiced or rendered: one card per script line, a real picture of what will be on screen beside what is said, the wording editable in place, Script and On-screen notes per line, and an Approve button for the whole draft. Published as a claude.ai artifact whose edits and approval Claude can read back. Use when a script is ready for review, when asked for a storyboard, or before the first recording or render of a new video.
---

# Storyboard

The script is approved on a storyboard, not as plain text: a reviewer can only judge a line next to a picture
of what the viewer will see while hearing it. Nothing is recorded, voiced (with a paid voice) or rendered from
a script until its storyboard is approved; "go ahead and record" is not script approval.

## Build it

1. For each line, get a real picture of what will be on screen: a frame of the footage at that moment, the
   graphic or photo the script calls for (see `script-to-beats`), or a screenshot of the app. Name what isn't
   there yet in `screen` and leave `image` out rather than inventing a picture.
2. Write `data.json` (format in [build.py](build.py)): the title, the draft number, and one entry per line
   with what is said, its section, the picture and a few words on what is on screen. For a line whose wording
   changed since the last draft, put the old wording in `was`.
3. `python build.py data.json storyboard.html`
4. Publish `storyboard.html` as an artifact with the `db` capability, with the pictures as published files at
   the paths in `data.json`. A new draft is a new draft number (its own db collections) on the same URL.

## Read it back

ArtifactData, collections `lines-<draft>` (doc id = the line number: `{text, original, script, screen}`, where
`text` is the reviewer's own wording when they edited it, otherwise empty) and `draft-<draft>` (`approval`:
`{approved, at}`; `general`: `{text}`). Apply every edit and note, then make the next draft, with `was` on the
lines you changed. Record only once `approval.approved` is true for the newest draft.
