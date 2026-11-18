---
name: description
description: Write the YouTube or Vimeo description for a finished ministry video, with chapters, a short "in this video" block kept apart from the person's general ministry block, their links, and photo credits last. Use after the final video, or when asked for a video description, chapters, a YouTube description, or "what do I put under the video". Covers where the chapter times come from, how to get the person's own links and ministry text (ask, or find them on their website and offer them), and wording rules.
---

# Video description

A description has **two parts that must never blur together**:

1. **About this video:** changes with every video. The one-line summary, a few quick bullets, the chapters.
2. **About our ministry:** the same on every video. Who they are, the invitation, their links.

Photo credits come **last**, after the invitation, behind their own rule line.

Write it in the person's voice, in plain text (YouTube and Vimeo show no bold or headings). Use the person's own
words from the script wherever you can. Give them the draft to change; don't ask them about each line first.

## The layout

```
In this video

<one line: who this is from, and what the video covers>

• <short bullet>
• <short bullet>
(four to six bullets, one per section of the video)

Chapters
0:00 <first chapter>
0:20 <next chapter>
...

―――――――――――
About our <ministry or organization name>

<two or three sentences: what each person does>

<one sentence of thanks, then one specific invitation>

<their links, one per line, each with a plain label>

―――――――――――
Photo credits: <place or subject>: <credit>. <place or subject>: <credit>.
Music: <track> by <artist> (<source and licence, as the licence asks>)
```

Add the music line when the music's licence asks for a credit (a Creative Commons track, or ElevenLabs on a free plan:
"Music: Eleven Music"). Leave out the credits block when nothing needs one: no photo needs one (every credited photo already shows its credit on screen,
or the photos are the person's own).

## Chapters

- Take them from the storyboard's sections, one chapter per section, named the way the storyboard names them
  (rename any that read oddly to a viewer: "Opening" becomes "Welcome").
- **Times:** the first word of each section's first spoken line, in `transcript.json`, **plus the title card's length**
  (`titleCardSeconds` in `project.json`): the transcript is in footage time, the video is not. Round to the nearest
  second. Check each one against the rendered video if it is cheap to do.
- **YouTube needs the first chapter at 0:00**, at least three chapters, and each at least ten seconds long. So the
  first chapter starts at 0:00 even though the speaking starts a few seconds later.
- Sections with a person's role (a speaker, a worker) can carry it: "Christina: Communications Specialist". Use only
  titles the person has given you or used themselves.
- Use a colon or a plain space inside a chapter title, never a dash.

## Bullets: plain, not "written"

Each bullet names the thing and stops. Do not tack on a second clause.

| Don't write | Write |
|---|---|
| A family update, and thank you for your prayers | Family update |
| The 800th language to receive a complete Bible, and what that means for 6.2 billion people | The 800th language to receive a complete Bible |
| Why 2033 matters, and how you can be part of it | Every language with some Scripture by 2033 |

Numbers, places and names come from the script, never from memory. If a bullet needs "and what that means" or
"and how you can", it is a sentence, not a bullet: cut it down.

## The ministry block: ask once, then reuse

This block, and the links in it, belong to the person, not to the toolkit. **Never use another person's.**

**First video:**
1. Ask for their web address and, if they have them, the pages for: giving or partnering, learning about the
   ministry, a prayer-update or newsletter sign-up, and their organization's own site.
2. If they only know their main address, look at that site yourself and **offer what you find** ("I found these
   three pages: giving, about, and sign up. Are these the ones you want under the video?"). Offer; don't just use
   them. Check that each link opens before you offer it.
3. Ask for, or take from their own newsletter or website, two or three sentences about what they each do. Offer
   what you find; they approve it.
4. Save the finished block as `description.md` in the project folder (it stays on their machine, like the rest of
   the project).

**Later videos:** start from the previous project's `description.md` (the same way a second video's end screen
starts from the previous project) and ask only "Is this block still right?"

## Wording rules

- **Invitation:** one thank you, then one specific ask that names what they are asking for ("prayerfully consider
  becoming a monthly partner"), with an easy out. Follow the person's own terms: for Wycliffe missionaries it is
  *partner with our Wycliffe ministry*, never "partner with us". Don't repeat the ministry's name in two sentences
  in a row.
- **No dashes** in the person's writing; use a colon. If the person asks for dashes, use them.
- No emoji or exclamation marks the person didn't use themselves. No bold.
- **Credits:** only photos that need one, in the order they appear: `<place or subject>: <credit>.` Use the credits
  from the storyboard export (`photo-credits.txt`), never guess a name. If a photo's permission is still open
  (`rights: ask`), stop and ask before it goes into a public description.
- Don't invent a title, number or claim. A role or title the person hasn't given you stays out until they do.

## After you write it

Give the person the whole description in one block they can copy, and say in one line what you took from where
(chapters from the storyboard, links from their site). Then offer the rest of the set in one short question:
a thumbnail (`thumbnail`), captions (`npm run captions -- <project>`), or a newsletter paragraph.

Don't put it on YouTube or Vimeo for them without asking.
