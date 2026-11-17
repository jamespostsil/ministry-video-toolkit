---
name: find-footage
description: Find free stock video clips (B-roll) the person is allowed to use, from Coverr, Mixkit, Pexels and Pixabay, keeping only clips whose licence allows use in a fundraising video with no credit. Claude looks at every candidate, puts the best on a picker page with looping previews, reads back the person's choices, downloads the full-size files with a licence record, and shows them in the video as a full-screen clip while the speaker keeps talking. Use when a video needs moving pictures for a moment with no photos (the whole world, Scripture, travel, an opening or closing shot), when the person asks for B-roll, stock footage or video clips, or instead of the drawn globe.
---

# Find footage

Stock clips cover moments the script talks about but has no pictures for: "every language in the world",
"translating the Bible", "travelling", a sunrise to open on. Offer this; never add stock clips unasked.

[docs/finding-video.md](../../../docs/finding-video.md) explains the sources and their licences for the person.

## 1. Decide where clips would help

From the script, list the moments that would benefit, and for each one two or three plain search words: concrete
things a camera can film ("globe", "world map", "bible", "typing", "handwriting", "market", "airplane window",
"sunrise"). Abstract words ("hope", "mission") return random clips. Usually 1 to 4 moments in a video; a clip
holds the screen for one sentence or two, like a photo.

## 2. Search

```
python -I find_footage.py search <work folder> globe "world map" bible --sources coverr,mixkit,pexels,pixabay
```

Use a work folder outside the repo (the project's `local/footage/`, say). Each clip gets a key (`k007`). Only clips
anyone may use in a video that asks for support, with no credit, are kept:

- **Coverr:** free clips; Premium, AI-made and vertical clips are left out.
- **Mixkit:** only the Mixkit Free License. Its Restricted License is for personal use only. Mixkit blocks quick
  bursts of searching; the script goes slowly and says so when it is blocked. Try that source again later.
- **Pexels, Pixabay:** need a free API key each (`PEXELS_API_KEY`, `PIXABAY_API_KEY`, as environment variables or
  in the toolkit's `.env`). Without them they are skipped. Ask the person whether they want to make the keys; it
  takes a free account and a minute each.

Coverr's topic pages also list unrelated popular clips, so many candidates won't fit.

## 3. Look at every candidate

Open every contact sheet in `sheets/` and look at each picture; never pick by title. Choose 3 to 6 per moment. Leave
out:

- **Brands and names:** logos (laptops, airlines, phones), a named organisation or agency (NASA, a mission
  agency), screen recordings of a branded app (Google Earth), readable book or shop titles.
- **Anything the audience may misread:** another faith's rituals, worship practices of a different tradition
  (rosaries, votive candles, unless that fits), politics and flags of causes, smoking, drinking, swimwear,
  pandemic masks, people mid-argument.
- **Anything that pretends:** stock people are not the people the ministry serves. Never caption a stock clip of
  people as a language community, a translator or a partner, and never put one where the narration names real
  people or places ("the Kwanga translation team"). Generic moments only ("people reading", "a market").

The preview frames come from the middle of each clip, which can show what the thumbnail didn't. Look at the picker's
frames too before publishing it.

## 4. Let the person choose

```
python -I find_footage.py picker <work folder> k010 k014 k022 --title "Clips for Scott and Jen's update" --note k010="A lit globe turning, for “every language”"
```

Write a short `--note` per clip saying the moment it is for, in plain words. The search word groups the page. Publish
`picker/picker.html` as an artifact with the capabilities `{db: {}}` and every file in `picker/v/` as a published
file (the page can't load videos from other sites). Read the choices back with ArtifactData `list` of the
collection `picks` (`{choice: "use" | "maybe"}`, the doc id is the key).

## 5. Fetch and use them

```
python -I find_footage.py fetch <work folder> k010 k022 --to ../../../remotion/public/clips
```

This saves `<key>.mp4` (full size, usually 1920x1080), a poster frame `<key>.jpg`, and a line per clip in
`clip-licenses.csv`: the source, the clip's page and its licence. Keep that file; it is the record that the person
may use the clip. `remotion/public/clips/` is git-ignored.

- **Storyboard:** show the clip's poster frame as that shot's picture, with layout `cover`, and add a `questions`
  entry for it ("A stock video clip here: a globe turning. OK?"), with `at` set to the shot.
- **Video:** a `clip` beat (`beat-library`): `{ kind: "clip", start, end, src: "clips/k010.mp4", from?: 2,
  caption?: "..." }`. It fills the screen, muted, while the speaker keeps talking. `from` skips a slow start.
  Choose a clip at least as long as the beat (it loops otherwise). Check it in a still from the middle of the beat.
- **Credits:** none are required, so stock clips stay out of the "Photos by ..." line.
