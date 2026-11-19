# Working in the Ministry Video Toolkit

The person using this is usually a missionary or ministry staff member, not a video editor or a programmer.
Write to them in short, plain sentences, and never make them learn the toolkit's words (beat, kind, render).

## You run the commands

They never type a command. Install, check and render for them: setting up is `npm ci` in `remotion/` (it opens
`welcome.html`, the page of next steps, once), then `npm run doctor` and fix what it reports; `npm run welcome`
opens that page again when they ask for it. Keys go in `remotion/.env`: walk them through getting one (SETUP.md has
each), then add the line yourself. Mention a command only if they must run it themselves, which is rare.

**Transcription is close to required:** without it, nothing can be timed to their words. If no key is set up when
they start a video, help them get one (a Groq key is free and takes a few moments) before the storyboard.

## The usual path

1. **Get the script and its pictures:** a Notion page or a Google Doc (`script-to-beats`).
2. **Prepare the recording:** cut camera fumbling and long pauses (`footage-prep`), then transcribe it.
3. **Storyboard:** one page showing every scene, for the person to change and approve (`storyboard`). Nothing is
   rendered from a script until its storyboard is approved.
4. **Plan and render the video** (`beat-library`, `render`), then check the render yourself (`review`).
5. **Review page:** the person watches it and leaves notes (`review-page`). Repeat until they're happy.
6. **Finish:** the final video, its thumbnail (`thumbnail`) and the photo credits line.

## The end screen on a second video

For someone who has made a video before, build the storyboard with `--end-from <their previous project folder>`
(`storyboard` skill) so the closing screen starts with their photo, QR code, logo and web address already in place.
Only a first video starts with empty fillers.

## When the script doesn't say how to show the pictures

Most scripts won't. Choose for them, from what the pictures are, with the table in the `beat-library` skill
(one landscape photo: fill the screen; a portrait or anything with words on it: whole photo; two or three to
compare: side by side; a set with captions: one after another; a list read aloud: scattered cards). Put each
choice on the storyboard and tell the person once, in a sentence, that they can change any of them with the
**Layout** button on that scene. Don't ask about each one before the storyboard exists.

## Offer the next step

At the end of each stage, say what's done and offer what usually comes next, in one or two short questions.
Offer only what applies. If they say no to something, don't keep asking at every stage; it's fine to mention it
once more as a light suggestion where it fits better (music when they watch the finished video, say). Useful ones:

- **Music:** "Would you like music under the video?" With their own ElevenLabs key, Claude can make music timed to
  the video's big moments (`music`); without one, Claude can find free music they're allowed to use and give them a
  page to listen and choose on (`find-music`, [docs/finding-music.md](docs/finding-music.md)).
- **Photos:** for scenes that have none, ask whether they have photos of their own ministry or from related work
  (a Bible dedication, a colleague's photos, with the owner's OK and a credit). Then offer free stock photos: "Would you like me to find photos for
  these parts?" Either way is fine; they choose. Claude searches Pixabay (`find-footage --photos`, with the free Pixabay key)
  and gives them a page to choose on. Only if the shared "People with Bibles" folder is on their computer (they are
  SIL or Wycliffe staff, or were given access), also suggest from it (`storyboard`, "Suggesting shared photos");
  never point anyone else to it. If photos look washed out, offer to touch them up (`photo-touchup`),
  always with a before / after for them to choose from.
- **Video clips:** where the script talks about something it has no pictures for (the whole world, Scripture,
  travel, an opening shot), offer free stock video: "Would you like me to find a short video clip for this part?"
  Claude finds clips the person is allowed to use and gives them a page of previews to choose from
  (`find-footage`, [docs/finding-video.md](docs/finding-video.md)). A free Pixabay key gives many more clips; offer
  it if Coverr and Mixkit don't have what's needed (Pexels has stopped giving out new keys).
- **Headings and words on screen:** names and roles as people speak, section headings, a list over the live shot,
  a call to action for the ask (`beat-library`).
- **The end frame:** their photo, web address and a QR code that scans (`partner-frame`).
- **The thumbnail:** a separate picture for YouTube, readable when small (`thumbnail`).
- **Captions:** a captions file for the finished video (`npm run captions -- <project>`, from the transcript): a `.vtt` for
  Vimeo and YouTube and an `.srt` for Facebook and editors. Offer it with the final video and run the command yourself (they never type it), then ask them to read it once
  against their script, since names and places are where the transcription slips.
- **After the final video:** the video's description with chapters (`description`: it asks once for their links, or
  finds them on their website and offers them, and saves them for the next video), then a newsletter paragraph to
  go with it if they want one.

## Before anything leaves their computer

Ask before using photos of people outside their own family, before spending credits on a paid service, and before
publishing or sharing anything for them.
