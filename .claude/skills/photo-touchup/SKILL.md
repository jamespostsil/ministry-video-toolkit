---
name: photo-touchup
description: Fix washed-out, hazy or flat photos for a ministry video, newsletter or the shared photo folder, and show a before / after page so a person chooses each one before anything is replaced. Measures which photos are hazy, makes gentle touched-up copies (deeper darks, a little more colour, faces kept bright, no cropping or retouching of people), publishes the comparison, then swaps in only the chosen ones, keeping the originals in a backups folder and copying the photos' credit and rights info across. Use when photos look washed out, faded, foggy, dull or low-contrast, or when asked to touch up, brighten, enhance or colour-correct photos.
---

# Photo touch-up

Hazy photos make a whole video look tired. This fixes the common problem (the darkest parts are gray, not black)
without changing what the photo shows. A person always sees a before / after first: nothing is replaced until they
choose.

`touchup.py` belongs to this toolkit. It needs Python with Pillow and NumPy, and ExifTool for the last step.

## Steps

1. **Find the hazy ones.** `python touchup.py measure <folder>`. Photos whose darkest parts are lighter than 0.07,
   or brightest parts darker than 0.92, are marked `<- hazy`. Look at each one yourself too: a dark night photo or a
   bright snow scene can be marked without needing a fix, and a photo can look dull without being marked.
2. **Make the copies and the comparison page.**
   `python touchup.py make <work-folder> <photo> [<photo> ...] --title "<short name>"`
   writes the full-size touched-up copies to `<work-folder>/full/` and a page to `<work-folder>/compare/`.
   The originals are not touched.
3. **Check it yourself before showing anyone.** Put the before and after side by side and look at the faces,
   especially darker skin: it must stay bright, with detail in it, never muddy. Look at strong reds and yellows too:
   they must not glow. If a photo got worse, leave it out of the page.
4. **Publish the page** (`compare/index.html` with its `img/` folder, capability `db`). Each photo has
   "Keep the original" / "Use the touched-up one" (in the same order as the pictures) and a note box, all saved
   where Claude can read them. A notes box at the top is for the whole set.
5. **Swap in the chosen ones.** Read the page's `choices` collection into a JSON file, then
   `python touchup.py accept <work-folder> --choices <file>` (or `--all` when the person says "all of them").
   Each original is kept in `<its folder>/backups/before-touchup-<date>/`, and its credit, rights, caption and
   other info are copied into the new file. Add `--also <folder>` for another copy of the same folder that must
   match, such as the Google Drive for desktop copy of the shared photos.

## What the fix does

The same change on every colour channel, so colours never shift: the darkest 0.5% of the picture becomes black and
the brightest 0.3% white, mid-tones are lifted a little so faces stay bright, a gentle curve adds contrast, and
colour is lifted 18% unless the photo is already colourful. No cropping, no smoothing, no changing people.

## Other people's photos

A light tone fix like this is normal for a photo you're allowed to use, and the credit stays the same. Anything more
(removing things, changing faces, combining photos) needs the owner's OK.
