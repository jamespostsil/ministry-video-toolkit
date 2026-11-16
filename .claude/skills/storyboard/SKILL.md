---
name: storyboard
description: Make the storyboard page a reviewer approves before anything is filmed, voiced or rendered: each shot's real picture (with highlight boxes if wanted) beside the lines said over it, the wording editable in place, Script and On-screen notes per line, notes pinned or arrows drawn on the picture, what changed since the last draft marked word by word, and an Approve button. Published as a claude.ai artifact whose edits and approval Claude can read back. Use when a script is ready for review, when asked for a storyboard, or before the first recording or render of a new video.
---

# Storyboard

The script is approved on a storyboard, not as plain text: a reviewer can only judge a line next to a picture
of what the viewer will see while hearing it. Nothing is recorded, voiced (with a paid voice) or rendered from
a script until its storyboard is approved; "go ahead and record" is not script approval.

`build.py` and `template.html` belong to this toolkit; it depends on no other repository.

## Build it

1. For each shot, a frame of the footage at that moment, saved as `<id>.png` in one folder (from the uncut
   recording is fine before `footage-prep`; crop it to the 16:9 the video shows). For a graphic the toolkit
   can't make yet (a new beat), draw a plain sketch, mark it "Sketch" and set `"sketch": true`. Name anything
   else that isn't there yet in the shot's `note` rather than inventing a picture.
2. **One shot per piece of the script that has its own pictures**, so each card shows the words together
   with the photos on screen while they are said. List them in `pictures`, in the order they appear, with
   each photo's caption, credit (from the script's image names and credits line; never guessed) and
   permission: `ok`, or `ask` with a `rightsNote` saying why (people who aren't the presenters or their
   family, or no known source). Crop photos that are far out or the wrong shape for their beat in a
   `crops.json` (`--crops`), with a `why`; the reviewer can still see the whole photo. Put every word
   that appears on screen (title card, headings, labels, the end frame's lines) in `screen`, and say how
   the shot is shown in `beat`, in plain words.
3. Write `storyboard.json`: `{"title", "draft": N, "shots": [{"id", "section", "note"?, "lines": [...]}]}`,
   one shot per picture, with the lines said over it. The full format (boxes, keys, English lines) is at
   the top of [build.py](build.py).
4. `python -I build.py storyboard.json <out folder> --pictures <picture folder> --photos <script's image folder> --crops crops.json --subtitle "Frames from the
   footage. Nothing has been rendered yet." --accent "#5f4d72" --hero "#5f4d72"`
   Each build saves a copy of the draft (`local/drafts/` beside the json, or `--drafts`); when the previous
   draft's copy is there, the lines that changed are marked word by word.
5. Publish `<out folder>/storyboard.html` as an artifact with the capabilities `{db: {}, assets: {}}`, with
   `shots/`, `thumbs/`, `pics/` and `logo.png` as published files. A new draft goes to the same URL.

## Simple and Detailed

A switch in the header picks how much the page shows. Both save to the same db documents.

- **Simple:** each scene's picture, what is said (not editable there), its Note box, and notes pinned or arrows drawn
  on the picture. Photos, words on screen, Looks good, questions and "+ Add a scene here" are hidden, and Next
  scene goes through every scene. Use it for anyone who only needs to leave notes.
- **Detailed:** everything this skill describes.

It opens in Simple unless `storyboard.json` has `"mode": "detailed"`; anyone can switch with the Simple / Detailed buttons at the top. A link ending `#simple` or `#detailed` opens
that mode (send `<url>#detailed` to someone who will edit the details); otherwise each viewer's last choice is kept.

## What every ministry storyboard shows

These came from review and are standing rules:

- **One card per screen.** When something new appears partway through a line (a row's second photo, a heading over
  a photo, a second line beside the speakers), split the line there into cards with the same `group`, and give each
  card what is on screen by then (`show`, `screen`). A card never describes a change it can't show.
- **The picture is the screen, not a description of it.** Give every photo shot its `layout` (cover, blur, row,
  slider) so the page draws a mock-up of the real beat. Give it every word that appears on screen (title card, name
  plate, headings, captions, the Thank you card), so the page draws them where the video puts them. Pass `--logo`
  when the words include the organisation's logo. The thumbnails show the same screen, and clicking one opens it large.
- **Footage frames flatter the speakers.** Pick each on-camera frame by looking at candidates from the time the line
  is said (a sheet of 16, cropped to both faces): both smiling if any frame has that, otherwise both relaxed, eyes
  open, mouths closed or mid-smile. Never a blink, a grimace or a mid-word mouth. Never take the first frame you pull.
- **A set of photos is captioned all or none.** When the script captions some photos in a row, slider or scatter,
  write the rest from what is said ("Florida trip", "Family visit"). One caption alone looks like a mistake.
- **Lines said in the recording but not in the script go on the storyboard** as their own cards, noted "Not in
  the script: added from the recording." The storyboard follows what was said.
- **Who says each line comes from the recording.** Measure each line's voice pitch (`footage-prep`) and label the
  card with whoever actually says it; note where that differs from the script.
- **No descriptions of what the screen shows**: the drawn screen is the description. Notes only for what needs the
  reviewer (a decision, a sketch of a graphic not built yet, a change from the script).
- **Card order:** the screen and the card's title (who is speaking), then the words said, then the words on screen (a title sits above
  its photos), then the photos (order, caption, credit, permission), then one Note box for the whole card (no placeholder text, no "edit this in the previous card" lines: later cards of a moment just don't repeat its words and photos).
- The page says "Claude can read it", never "I can read it".
- **Questions go on the page, never on a separate status page.** Whatever needs the reviewer's OK (a new
  library, captions you wrote, a crop, a layout choice) is a `questions` entry, all at the top; `at` (a shot key)
  adds a "Show the scene" link. Keep each one short: a title and two or three short points. The reviewer answers OK
  or "Change it"; drop answered questions from the next draft.
- **The reviewer can take photos out and add them** (✕ / Put back, "+ Add a photo" from the script's folder or an
  upload), and fold anything they have checked with "Looks good": one per card (filled in on the current card and
  the one pointed at); ✎ Edit, shown when a folded card is pointed at, opens it again. No section-wide button.
  "+ Add a photo" sits at the right of the Note label on every card that can take one. One photo: no drag handle.
  No "Words on screen" heading: the fields' labels and their box say it. Carry the cards marked good, and not changed since, into the next draft's `good`.

## After approval

The video uses the photos exactly as the reviewer left them on the page. Three steps:

1. Read the page's saved photo changes: ArtifactData `list` of the collections `order` and `pics`, each with the
   same `out_dir` (for example `local/edits`), so the folder holds `order/<group>.json` and `pics/<id>.json`.
2. If any `order` document lists an `added` photo with an `asset` (uploaded from the reviewer's computer), save it
   with the Artifact tool (`action: "read"`, the page's `url`, `path` = the asset id) into one folder.
3. `python -I export_photos.py storyboard.json <script's image folder> remotion/public/images/<project>
   --crops crops.json --edits local/edits [--uploads <folder>]`

The export applies the reviewer's captions, credits and permissions, and each moment's photo order, removed photos
and added photos. It stops instead of guessing when the edits folder is missing (`--no-edits` only for a page never
published), when an upload hasn't been saved, or when a photo is still "Ask first" or "Don't use" (settle it on the
page, or pass `--skip-unapproved` to leave it out). It writes each photo cropped as shown, `photos.json` (sizes,
captions, credits, permissions for `beats.ts`), `photo-order.json` (each moment's photos in the reviewer's order:
build the beats from it) and `photo-credits.txt` (the end screen's "Photos by ..." line, from the photos used).
Then build the beats from the cards: one card is one screen.

## Read it back

ArtifactData: `lines/<shot key>.<line number>` (`{text, original, note, shot}`; pages before 2026-10-27 also had `screen`: `text` is the
reviewer's own wording when they edited it, otherwise empty), `notes/general` (`{text}`) and
`notes/approval-draft-<N>` (`{approved, at}`), and `spots/<id>` (`{shot, x, y, text}`, plus `kind: "arrow", x2, y2`
for an arrow: a note the reviewer pinned or an arrow drawn on that shot's picture; look at the picture there),
`order/<group>` (`{pics, removed, added}`: the reviewer's order of that shot's photos, the ones taken out, and
the ones added, `{id, file, w, h, asset?}`; an `asset` is an upload: fetch it with the Artifact tool's read,
path = the asset id), `good/card-<shot key>` (`{good}`), `answers/<question id>` (`{title,
answer: "ok" | "change", note}`), `pics/<picture id>`
(`{caption, credit, rights, file, original}`: their caption, credit and permission for a photo, wherever it is
used; a photo marked `no` comes out, one marked `ask` needs an answer before the render), `screen/<shot key>.<n>`
(`{label, text, original}`: their wording of a piece of on-screen text), and `scenes/<id>` (`{after, say, screen, createdAt}`: a new scene the reviewer added after shot `after`, with
what is said and what is shown; make its picture and put it in the next draft). Apply every edit and note, then build the next draft. Record or
render only once the newest draft is approved.

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
- **One way to move between scenes, the same in both modes:** Previous / Next under the picture (with the count
  and thumbnails), and "Next scene" at the lower right of each card, which goes to the scene after that card. There
  is no bar at the top of the list.
- **"+ Add a scene here"** shows when the gap between two cards is pointed at.
- **Simple** keeps a one-line legend for the yellow marks when a draft has changes, without the filter button.

## Shared photos in "+ Add a photo"

`--library <folder>` (repeatable) offers a shared photo folder under "+ Add a photo", below the script's own photos,
headed "Shared photos, cleared to use". If the folder has a `photo-credits.csv` (columns `file`, `caption`,
`on-screen credit`), only the photos it lists are offered, each with its caption and credit filled in; otherwise
every photo in the folder is offered. A shared photo the reviewer adds is saved with its caption and credit at once.
The photos are copied into the page when it is built, so reviewers need nothing but the page link: no Google
sign-in. Whoever builds the page needs the folder on their computer (Google Drive for desktop, or a download).
The people-with-Bibles set: the SIL Drive folder "People with Bibles: photos for partnership videos".

After approval, pass the same folder to `export_photos.py --library <folder>` so it finds photos added from it.
