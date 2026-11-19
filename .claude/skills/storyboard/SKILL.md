---
name: storyboard
description: Make the storyboard page a reviewer approves before anything is filmed, voiced or rendered: each shot's real picture (with highlight boxes if wanted) beside the lines said over it, the wording editable in place, Script and On-screen notes per line, notes pinned or arrows drawn on the picture, what changed since the last draft marked word by word. Published as a claude.ai artifact whose edits and notes Claude can read back. Use when a script is ready for review, when asked for a storyboard, or before the first recording or render of a new video.
---

# Storyboard

The script is approved on a storyboard, not as plain text: a reviewer can only judge a line next to a picture
of what the viewer will see while hearing it. Nothing is recorded, voiced (with a paid voice) or rendered from
a script until its storyboard is approved; "go ahead and record" is not script approval. The page has no Approve
button: the reviewer leaves notes and changes, then tells Claude they're done. Apply them, and ask "Is this draft
approved, or would you like another look?" when a new draft has changes they haven't seen.

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
Every layout shows each photo's credit under or on it, so when every credited photo is on screen with its credit,
leave the end screen's credits line out (`credits` in the partner frame); use it only for photos shown without one.
Then build the beats from the cards: one card is one screen.

## Read it back

ArtifactData: `lines/<shot key>.<line number>` (`{text, original, note, shot}`; pages before 2026-10-27 also had `screen`: `text` is the
reviewer's own wording when they edited it, otherwise empty), `notes/general` (`{text}`), and `spots/<id>` (`{shot, x, y, text}`, plus `kind: "arrow", x2, y2`
for an arrow: a note the reviewer pinned or an arrow drawn on that shot's picture; look at the picture there),
`order/<group>` (`{pics, removed, added}`: the reviewer's order of that shot's photos, the ones taken out, and
the ones added, `{id, file, w, h, asset?}`; an `asset` is an upload: fetch it with the Artifact tool's read,
path = the asset id), `good/card-<shot key>` (`{good}`), `answers/<question id>` (`{title,
answer: "ok" | "change", note}`), `pics/<picture id>`
(`{caption, credit, rights, file, original}`: their caption, credit and permission for a photo, wherever it is
used; a photo marked `no` comes out, one marked `ask` needs an answer before the render), `screen/<shot key>.<n>`
(`{label, text, original}`: their wording of a piece of on-screen text), and `scenes/<id>` (`{after, say, screen, createdAt}`: a new scene the reviewer added after shot `after`, with
what is said and what is shown; make its picture and put it in the next draft). Apply every edit and note, then build the next draft. Record or
render only once the person has said the newest draft is approved.

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

## Choosing a layout

Every card that shows photos has a teal **Layout** pill above what is said (in Simple and Detailed; cards of one
moment share the choice). It opens a chooser showing only the layouts that suit that number of photos, each with a
still of the finished layout (`layouts/<id>.jpg`) that plays its short example (`<id>.mp4`) only while pointed at or
focused, then goes back to the still (all of them moving at once was too busy). `<id>.0.jpg` is the example's
first frame. `build.py` copies them to the out folder, so publish them too.

The chooser lists them under four headings (`LAY_GROUPS` in both templates; keep the two the same), each in the
accent colour with a bar and a rule so the groups stand apart: **One photo**, **Photos together**, **Photos one
after another**, **Speaker on screen**. A new layout goes into one of these lists, or it shows under "Other".

| Layout | Photos |
|---|---|
| Fill the screen (`cover`), Whole photo (`blur`) | 1 |
| Side by side (`row`) | 2 or 3 |
| One after another (`slider`), Scattered cards (`scatter`) | 2 or more |
| Grid (`grid`) | 4 to 9 |
| One at a time, full screen (`onebyone`) | 2 to 12 |
| Stack (`stack`) | 2 to 8 |
| Feature and thumbnails (`feature`) | 3 to 6 |
| Before and after (`beforeafter`) | 2 |
| On a map (`map`) | 2 to 8 |
| Beside the speaker (`beside`) | 1 to 6 |
| Speaker in the corner (`corner`) | 1 to 12 |

- **On a map** joins each photo to its place: give those `pictures` a `"lat"` and `"lon"` (degrees; south and west
  are negative) when you write storyboard.json, from the place in each caption. If the reviewer chooses it for
  photos that have none, look the places up when you change the beat.
- **Beside the speaker** and **Speaker in the corner** crop the speaker out of the shot's own picture, so that
  picture should be the footage frame from that moment. Copy project.json's `"speaker"` box to the top of
  storyboard.json (`"speaker": {x, y, w, h}`), or the picture will crop to the middle of the frame.

- The page starts on the shot's `layout` from storyboard.json, so most reviewers never touch it; the picture
  redraws as soon as one is chosen.
- A choice is saved as `layout/<group>` `{layout, original, photos}`. `export_photos.py` reads it with the other
  edits and writes `photo-layouts.json`, listing every moment whose layout changed: change those beats' `kind`
  in `beats.ts` to match (a `slider` or `scatter` needs a `title`; a `row` and every newer layout needs each
  photo's width and height; `map` needs each photo's `lat` and `lon`; `beside` and `corner` need a gap of live
  footage before and after: see the `beat-library` skill).
- If photos are added or removed so the chosen layout no longer suits, the page and the export fall back to the
  usual one for that many photos.
- Timing, card sizes and headings are not on the chooser: those stay as notes.
- To refresh the examples after the beats change: cut 4 to 8 seconds of each beat from the example render
  (`ffmpeg -ss <t> -t <n> -i out/Example.mp4 -an -vf fps=12,scale=320:-2 -crf 30`), 15 to 65 KB each. Start each
  clip after the layout has fully arrived and end it before the beat ends, so the loop never shows the scene before
  or after. Keep each example simple: one calm photo, nothing that distracts from the layout itself. "Whole photo",
  "Fill the screen" and the eight newer layouts are not in the example video; they were rendered from temporary
  beats in the example project. Start the two speaker layouts on the full speaker shot just before
  they move aside, so the example shows the move (and end it before they move back). Start a layout that builds
  from nothing (Grid, Stack, Map) as its first photo lands, so no example opens on an empty screen, and the
  one-photo-at-a-time layouts (Before and after, One at a time, Stack, Scattered cards) about halfway through the
  first photo's time, so the first change comes within a second or two.

## Shared photos in "+ Add a photo"

"+ Add a photo" shows **This video's photos**, and a **Shared photos** tab only when the shared folder is on this
computer. That tab says the photos are cleared for SIL/Wycliffe partnership videos only and links to the whole folder.
Without the folder there is no Shared tab, since the photos are only for SIL/Wycliffe staff. For a staff member who
wants them, `--library-link <url>` adds the tab with three short steps for getting them.

- **On by default.** `build.py` (and the review page's, and `export_photos.py`) look for the people-with-Bibles
  folder on this computer (`shared_photos.py`: Google Drive for desktop's My Drive or Shared drives, Downloads,
  Documents, or `SHARED_PHOTOS` in `remotion/.env`) and add it, with its link. `--no-library` leaves it out.
- **Not on this computer:** the build prints a NOTE. That is the usual case: the folder is for SIL/Wycliffe staff and others
  given access, and its photos are cleared for SIL/Wycliffe partnership videos only. Mention it only to someone you know is
  SIL/Wycliffe staff ("SIL/Wycliffe staff can use the People with Bibles photos; would you like them in + Add a photo?"). Never offer
  it to anyone else. For everyone, stock photos come from `find-footage --photos`.
- `--library <folder>` (repeatable) adds a shared photo folder by hand. If it has a `photo-credits.csv` (columns `file`,
  `caption`, `on-screen credit`), only the photos it lists are offered, each with its caption and credit, and adding
  one saves both at once. Otherwise every photo in the folder is offered.
- `--library-link <url>` adds the folder's web link to the Shared tab.
- Reviewers need only the page link: the photos are copied into the page when it is built. No Google sign-in.
- Whoever builds the page needs the folder on their computer. Get it once from the link below (signed in with an
  SIL account): **Download** gives a zip; with Google Drive for desktop, **Organize > Add shortcut** to My Drive keeps
  it up to date. People outside SIL get Google's **Request access** button, which asks the folder's owner.

The people-with-Bibles set ("People with Bibles: photos for partnership videos", SIL Drive): https://drive.google.com/drive/folders/1-H_TnNHrNl6CV8D1xkK8dZi33O7p4Fyq

After approval, pass the same folder to `export_photos.py --library <folder>` so it finds photos added from it.

## Suggesting shared photos

When the person says yes to suggestions (CLAUDE.md, "Offer the next step") and the shared folder is on their
computer, fill scenes that have no photos, or a long stretch of the speaker alone, from the shared library. Without
it, use stock photos instead (`find-footage --photos`):

- **Look at every photo** in the library folder, with its caption from `photo-credits.csv`; never pick by file
  name. Without the folder on this computer, the Google Drive connector can list the shared folder and fetch
  thumbnails to look at, but the page can only be built once the folder has been downloaded.
- **Suggest only what fits what is said:** people reading Scripture where the script talks about Bibles reaching
  people, a dedication where it talks about a finished translation. One to three photos for a scene, no more.
- **Never a stand-in:** don't put library photos where the script names a particular people, place or person.
  The photos show other communities, and their captions say which.
- Add each suggestion to its card like any photo, with its caption and credit, and list them all in one
  `questions` entry ("Photos suggested from the shared library", with `at` on the first): the reviewer keeps a
  photo by leaving it and takes one out with ✕.
- A video clip may fit better than a photo for a scene about the whole world or travel; that is `find-footage`.


## Unapproved photos: "Add credit" (2026-11)

Permission has four choices: **OK to use**, **Add credit**, **Ask first**, **Don't use**. A photo that is not yet
approved and has no credit goes on the page set to **Add credit**, pre-selected (`"rights": "credit"` in `pictures`,
with a `rightsNote` such as "No credit yet. Add one, then mark it OK to use."). The reviewer types the credit and
switches it to OK to use. `export_photos.py` stops on these like it does on "Ask first".

## The end screen (`"layout": "ending"`)

The closing screen is drawn from three pictures, each in its own slot, so one can be changed without losing the others:
give `pictures` a `"role"` of `photo` (left, in its card; crop it in `crops.json`), `qr` (right, on white) and `logo`
(low right; a transparent PNG is laid on black and blended away). Its words come from the `screen` labels `Heading`
(the headline between them), `Line 1` (name under the photo) and `Line 2` (web address under the QR code). A photo
added later with "+ Add a photo" takes the first empty slot. Don't also give the shot a frame that already has the
words on it: they would show twice.

### First video and later videos

- **First video:** leave the end shot's `pictures` empty. The card shows dashed fillers ("YOUR PHOTO HERE", "SAMPLE QR",
  "YOUR LOGO") and the person adds each with "+ Add a photo", in that order. There is no Layout button on this card.
- **Later videos:** pass `--end-from <the previous project's folder>` to `build.py`. The end screen then starts filled
  in from that project's `partner.ts`: its photo (with its crop), QR code and logo, and its headline, name and web
  address (when the end shot has no `screen` of its own). The person only checks it.
- **The Wycliffe logo** the toolkit carries (`remotion/public/brand/`) is offered under "+ Add a photo" and goes into the
  logo box; its note says to use it only as Wycliffe's brand guidelines allow (`--no-logos` leaves it out).
- On the end card, "Put back" and "Undo photo changes" only show for changes made in the current visit. After a reload the
  card keeps its photos and the two links are gone.

- **The main area follows the card being worked in.** Typing in a card, pressing a button in it or clicking anywhere in it shows that scene in the big picture, without scrolling the list.
