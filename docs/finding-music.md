# Finding music you're allowed to use

A music bed lifts a ministry update a long way, but it has to be music you have
the right to use. Here are free ways to get some, and what each one's licence
lets you do. Licences change, so **read the current terms on the site** before
you rely on any of this.

**Non-commercial is fine for ministry videos.** A non-profit ministry's update
video, including one that invites people to partner, can use music licensed
"non-commercial only" (CC BY-NC, for example). If your organisation has its own
rule about this, follow it.

**A credit line is fine too.** Many free licences ask you to credit the artist.
The `description` skill puts the music credit at the end of the video's
description, with the photo credits.

**Claude can search for you.** Ask "Can you find some music for this video?" and
Claude searches the sources it can reach (`find-music` skill), keeps only tracks
whose licence works for a ministry video, and gives you a page to listen, rate
and leave notes on.

---

## Pixabay (what the example video uses)

**[pixabay.com/music](https://pixabay.com/music/)**: free music under the
[Pixabay Content License](https://pixabay.com/service/license-summary/).

- **Free, including commercial use. No credit required** (it's appreciated).
- **You may use a track in your video.** You may **not** pass the file itself on
  to others, "on a standalone basis", which is why the example's music isn't in
  its download.
- **Keep the licence certificate.** Pixabay lets you download one for each
  track. If YouTube ever flags your video for its music, the certificate is your
  evidence that you're allowed to use it.

The example video uses
[*Ambient - Ambient Music* by paulyudin](https://pixabay.com/music/ambient-ambient-ambient-music-574003/).
`npm run example:media -- --music <file>` turns your download of it into the
example's music bed.

## ElevenLabs (AI-generated music)

**[elevenlabs.io/music](https://elevenlabs.io/music)** generates music from a
description, e.g. *"calm, hopeful ambient piano, no drums, for a background
under speech"*. A free account works, with conditions. Its
[help page on publishing](https://elevenlabs.io/docs/help-center/legal/can-i-publish-the-content-i-generate-on-the-platform)
and [terms](https://elevenlabs.io/terms-of-use) say:

- **Free plan: non-commercial use only**, and you must **credit "Eleven Music"**
  when you share the video, for example in its description.
- **Paid plans include commercial rights.** If your video asks for financial
  partnership, check with your organisation whether the free plan's
  "non-commercial" covers it, or use a paid plan.
- Ask for a track at least as long as your video, or ask for one that loops
  cleanly.
- **With an API key, the toolkit can make the music for you**, timed so it
  changes on your video's big moments (tender under sad news, upbeat
  elsewhere): `npm run music -- <project>`. See the `music` skill and
  `examples/musicPlan.example.json`. This is optional: it needs your own
  ElevenLabs key (SETUP.md), and your own music file always works instead.

## YouTube Audio Library

**[YouTube Studio → Audio Library](https://studio.youtube.com/)**: free music
for videos you publish on YouTube. Some tracks require you to credit the artist
in the description; the library shows which. Check the terms before using these
tracks in videos you'll publish elsewhere.

## Creative Commons music

Sites such as [ccMixter](https://ccmixter.org/) list each track's Creative
Commons licence:

- **CC0**: use freely, no credit needed.
- **CC BY**: use freely, **credit the artist**.
- **NC** in the licence (e.g. CC BY-NC): **non-commercial only**, which is fine
  for a ministry video (see above). Credit the artist.
- **ND** (no derivatives): avoid. Creative Commons counts putting music under
  a video as changing it, so an ND track can't be used as a music bed.
- **SA** (share alike): avoid. Your whole video would have to be shared under
  the same licence.

---

## Incompetech (Kevin MacLeod)

**[incompetech.com](https://incompetech.com/music/royalty-free/music.html)**:
about 1,400 tracks under **CC BY 4.0**: free, including YouTube videos that earn
money, as long as you **credit the music in the description**. Its suggested
credit:

```
<Track title> Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0
https://creativecommons.org/licenses/by/4.0/
```

Its tracks are registered with YouTube, so a Content ID notice can appear; the
credit in the description is what clears it.

## Openverse

**[openverse.org](https://openverse.org/audio)** searches Creative Commons
music from Jamendo, Freesound and Wikimedia in one place. Each track keeps its
own licence, so check it (see above).

---

## Whichever you use

- **Save the licence or certificate with the video's files**, and note the
  track's title, artist and source in your project.
- **Credit the music in the video's description** whenever the licence asks for
  it, and it's a kind thing to do even when it doesn't.
- **Keep it quiet under speech.** The toolkit ducks the music under narration
  automatically (see the `render` skill). Pick calm music without vocals or a
  strong beat: it's there to support the voices, not compete with them.
- **Check the track's loudness across its length.** Many ambient tracks have a
  near-silent stretch near the end. The example uses only the evenly loud first
  95 seconds of its track, looped, so a quiet passage never lands under the
  closing frame.
