---
name: find-music
description: Find free music a ministry video is allowed to use (Mixkit, Incompetech, ccMixter; Openverse on request), keeping only licences that work for a non-profit ministry's video posted online, and give the person a page to listen to each track, alone or quietly under their own voice, mark Use, Maybe or Remove and leave notes. Then fetch the chosen tracks with a licence record and the credit lines the description needs. Use when someone wants music but has no ElevenLabs key, asks for free or royalty-free music, background music, a music bed, or "can you find some music".
---

# Find music

The person shouldn't have to search music sites. Claude searches, keeps only what they may use, and gives them one
page to listen on. Making music with their own ElevenLabs key (`music` skill) is still the better fit when they have
one, because it is timed to the video; this is for everyone else, or when they want to compare.

## 1. Search

```bash
python -I .claude/skills/find-music/find_music.py search <work folder> calm hopeful piano uplifting
```

Use a work folder outside the repo (the project's `local/music/`, say). Use **one or two words per search**
(Mixkit matches its moods and genres, ccMixter its tags). Good words for an update video: calm, hopeful, inspiring,
uplifting, piano, ambient, acoustic. For a sad stretch: tender, reflective.

What is kept, and why:

| Source | Licence | Credit |
|---|---|---|
| **Mixkit** | Mixkit Stock Music Free License: any online video, commercial or not (not DVDs or TV broadcast) | Not needed |
| **Incompetech** (Kevin MacLeod) | CC BY 4.0 | Needed, in the description |
| **ccMixter** | CC BY or CC BY-NC only | Needed |
| **Openverse** (`--sources ...,openverse`) | CC0, CC BY, CC BY-NC only | Needed, except CC0 |

- **Left out everywhere:** ND licences (Creative Commons counts music laid under a video as an adaptation, which ND
  forbids), SA licences (the whole video would have to take the same licence), and tracks under a minute.
- **Non-commercial (NC) is fine** for a non-profit ministry's video, including one that invites people to partner.
  If the person's organisation has its own rule, follow it.
- **Openverse** is off by default: most of its music is ND or SA, and it blocks anonymous searching after a few
  requests.
- A source that refuses a search is reported and skipped. Try it again later, or with another word.

Each track gets a key (`m007`) in `candidates.json`, with its licence and its credit line already written.

## 2. Choose 8 to 12 for the page

You can't hear the tracks, so choose from what the search prints: the mood and genre words, the length, and the
instruments. Say so to the person in one line. Prefer:

- **calm, without vocals or a strong beat**, so it stays behind the voice;
- **long enough for the video**, or easy to loop;
- **a mix**: some piano or acoustic, some light orchestral, one or two brighter ones, and from more than one source;
- names that sound like the video's mood (leave out "Horror", "Rap", "Trap", "Party" and the like).

## 3. The listening page

```bash
python -I .claude/skills/find-music/find_music.py picker <work folder> m003 m024 ... --title "Music for <video>" \
  --voice <the video's voice track> --note m003="Calm and hopeful, five minutes long, so no looping"
```

- **`--voice`** adds **Play under my voice**: the track plays quietly under the first 45 seconds of the person's own
  speech, the way it will sound in the video. Use the voice track from `npm run render -- <project> <out> --stems`
  (`<id>-voice.wav`), or the review page's voice mp3. Leave it out if there is no recording yet.
- Each preview is the track's first 45 seconds, faded out, with a waveform to click and jump around in. Each row
  shows the track's source, licence and whether it needs a credit, with a link to its page.
- **Filters:** mood (Calm, Hopeful, Uplifting, Reflective, Playful, Energetic), style (Piano, Orchestral, Ambient,
  Acoustic, Pop, Electronic), length, credit and the person's own choices. Ticking several in one group shows any of
  them; ticking in different groups narrows. The moods and styles come from each track's genre, instruments, title
  and your note; add what they miss with `--tags m003="calm,piano"`.
- **Search** narrows the list as they type, and offers **Ask Claude to find more**. Those requests are the db
  collection `requests` (`{text, done}`): when the person says so, run those searches, rebuild the page with the
  new tracks added, republish it to the same link, and set `done: true` on each request you ran.
- Publish `picker/picker.html` with `capabilities: {db: {}}` and every file in `picker/a/` as a published file.
  The person's choices and notes are the db collection `picks`: `{choice: "use" | "maybe" | "remove", note}` per key.

## 4. Fetch the chosen tracks

```bash
python -I .claude/skills/find-music/find_music.py fetch <work folder> m003 --to remotion/public/audio
```

This downloads the full track and appends its source, licence and **credit line** to `music-licenses.csv` there.
Keep that file. Then:

- set the project's music (`"music": { "src": "audio/m003.mp3" }` in `project.json`; see the `render` skill for
  levels under speech);
- put the credit line in the video's description, in the credits block at the end (`description` skill).

## Don't

- Don't put a track the person hasn't marked Use into their video.
- Don't share the downloaded files themselves (in a repo, a shared folder): most licences allow them in a video,
  not passed on as files.
