---
name: storyboard
description: Make the storyboard page a reviewer approves before anything is filmed, voiced or rendered: each shot's real picture (with highlight boxes if wanted) beside the lines said over it, the wording editable in place, Script and On-screen notes per line, what changed since the last draft marked word by word, and an Approve button. Published as a claude.ai artifact whose edits and approval Claude can read back. Use when a script is ready for review, when asked for a storyboard, or before the first recording or render of a new video.
---

# Storyboard

The script is approved on a storyboard, not as plain text: a reviewer can only judge a line next to a picture
of what the viewer will see while hearing it. Nothing is recorded, voiced (with a paid voice) or rendered from
a script until its storyboard is approved; "go ahead and record" is not script approval.

`build.py` and `template.html` here are a copy of a shared page (also used for software training videos);
don't change them here, or the next update overwrites the change. This file, and how you use the page for
ministry videos, are this toolkit's own.

## Build it

1. For each shot, a real picture of what will be on screen: a frame of the footage at that moment, or the
   graphic or photo the script calls for (see `script-to-beats`). Save them as `<id>.png` in one folder.
   Name what isn't there yet in the shot's `note` rather than inventing a picture.
2. Write `storyboard.json`: `{"title", "draft": N, "shots": [{"id", "section", "note"?, "lines": [...]}]}`,
   one shot per picture, with the lines said over it. The full format (boxes, keys, English lines) is at
   the top of [build.py](build.py).
3. `python -I build.py storyboard.json <out folder> --pictures <picture folder> --subtitle "Frames from the
   footage. Nothing has been rendered yet." --accent "#5f4d72" --hero "#5f4d72"`
   Each build saves a copy of the draft (`local/drafts/` beside the json, or `--drafts`); when the previous
   draft's copy is there, the lines that changed are marked word by word.
4. Publish `<out folder>/storyboard.html` as an artifact with the `db` capability, with `shots/` and
   `thumbs/` as published files. A new draft goes to the same URL.

## Read it back

ArtifactData: `lines/<shot key>.<line number>` (`{text, original, note, screen, shot}`: `text` is the
reviewer's own wording when they edited it, otherwise empty), `notes/general` (`{text}`) and
`notes/approval-draft-<N>` (`{approved, at}`). Apply every edit and note, then build the next draft. Record or
render only once the newest draft is approved.
