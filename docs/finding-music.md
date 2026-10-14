# Finding music you're allowed to use

A music bed lifts a ministry update a long way, but it has to be music you have
the right to use. Here are free ways to get some, and what each one's licence
lets you do. Licences change, so **read the current terms on the site** before
you rely on any of this.

**A rule of thumb for ministry videos:** if your video asks people to give, for
example "would you consider becoming a monthly partner?", treat it as
fundraising rather than "non-commercial". Many free licences that say
"non-commercial only" may not cover it. Licences with no commercial restriction
avoid the question.

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
- **NC** in the licence (e.g. CC BY-NC): **non-commercial only**. See the rule
  of thumb above.
- **ND** (no derivatives): you can't change the track. Trimming and looping it
  for a music bed can count as changing it, so avoid ND tracks.

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
