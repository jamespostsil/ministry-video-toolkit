# Setup

This gets you from nothing to a rendered example video. Follow the steps in
order; each one ends with a check, so you know it worked before you move on.

**You will need:** about an hour (mostly waiting), **10 GB of free disk space**
(rendering needs most of it, temporarily), and permission to install software
on your computer.

---

## 1. Install the tools

| Tool | Why | Check it with |
|---|---|---|
| **Node.js 20 LTS** (18 or newer) | Runs the toolkit | `node --version` |
| **ffmpeg** with libx264 | Cuts footage and encodes the video | `ffmpeg -version` |
| **Git** | Downloads the toolkit | `git --version` |
| **Claude Code** (optional, recommended) | Uses the skills to do the editing with you | `claude --version` |

### Windows

In PowerShell:

```powershell
winget install OpenJS.NodeJS.LTS
winget install Gyan.FFmpeg
winget install Git.Git
```

**Close and reopen PowerShell afterwards**, so it picks up the new programs.

> **Smart App Control.** If Windows Security has Smart App Control turned on, it
> blocks some programs that come with the toolkit's packages. The toolkit is set
> up to work around that, so **you do not need to turn it off**. Leave it on:
> once turned off, it cannot be turned back on without reinstalling Windows.

### macOS

With [Homebrew](https://brew.sh):

```bash
brew install node@20 ffmpeg git
```

### Linux (Debian / Ubuntu)

```bash
sudo apt update && sudo apt install -y ffmpeg git
# Node: the version in apt is often too old. Use NodeSource or nvm, e.g.
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
```

### Claude Code

See [the Claude Code docs](https://code.claude.com/docs/en/overview)
for installing it. It is optional: everything also works with the npm commands
alone.

**Check:** `node --version` prints v18 or higher, and `ffmpeg -version` prints
a version number rather than "not found".

---

## 2. Download the toolkit

```bash
git clone https://github.com/jamespostsil/ministry-video-toolkit.git
cd ministry-video-toolkit/remotion
npm ci
```

On Windows, clone into a short folder such as `Documents`. Windows can't start
a program more than 260 characters deep, and a deeply nested clone makes every
render fail with `chrome-headless-shell.exe ENOENT`. `npm run doctor` checks this.

`npm ci` installs the exact package versions the toolkit was tested with
(about 350 MB). Use it rather than `npm install`, which may update versions.
The first time you preview or render, Remotion also downloads its own copy of
Chrome (about 110 MB), which it uses to draw each frame.

**Check:** `npm run doctor`. It should pass every check under **This machine**.
Under **Project _example** it will say the footage is not built yet. That is
expected; step 3 builds it.

---

## 3. Download the example

The example is a real, published ministry update video. This downloads its
footage and photos (about 80 MB):

```bash
npm run example:media
```

The footage and photos are shared for learning only; see
[examples/MEDIA-NOTICE.md](examples/MEDIA-NOTICE.md).

**The music is one extra step.** It's a Pixabay track, and its licence lets
anyone use it in their videos but not pass the file on, so it can't be part of
the download. Until you add it, a quiet stand-in chord plays. To get the real
music:

1. Download the track (free) from
   [pixabay.com/music/ambient-ambient-ambient-music-574003](https://pixabay.com/music/ambient-ambient-ambient-music-574003/).
2. Run, with the path to the file you downloaded:

   ```bash
   npm run example:media -- --music "C:/Users/you/Downloads/ambient-ambient-ambient-music-574003.mp3"
   ```

   This builds the same music bed the published video uses, at the same level.

For music for your own videos, see [docs/finding-music.md](docs/finding-music.md).

**Check:** `npm run doctor` now ends with **✓ Everything is ready.**

---

## 4. Preview it

```bash
npm run studio
```

This opens Remotion Studio in your browser. Choose **Example** in the left-hand
list, press play, and drag along the timeline to see each beat. `Example-Thumbnail`
and `Example-EndFrame` are the thumbnail and closing frame on their own.

The Studio is for watching and inspecting. Changes are made in the project
files, and the Studio updates as soon as you save.

Press **Ctrl+C** in the terminal to stop it.

---

## 5. Render it

```bash
npm run render -- _example
```

This draws every frame, mixes the audio and encodes the video. The example is
3 minutes 37 seconds long and takes roughly 20 to 45 minutes to render,
depending on your computer. Rendering takes about 5 to 10 times as long as the
video itself.

Rendering keeps every frame as an image in `out/frames-Example/` (about 8 GB),
so a small change can be re-encoded quickly. Add `--clean` to delete them when
the render finishes, or delete that folder yourself when you're done.

**Check:** `out/Example.mp4` exists and plays: the title card, then James and
Christina talking, with photos, headings and lists appearing on their words,
and the closing frame with the QR code.

To render single frames instead, which is quicker for checking a change:

```bash
npm run still -- _example thumbnail     # out/Example-Thumbnail.png
npm run still -- _example endframe      # out/Example-EndFrame.png
npm run still -- _example 20            # the frame 20 seconds in
```

---

## 6. Use it with Claude Code

Open Claude Code in the `ministry-video-toolkit` folder (not `remotion/`), so it picks up
the skills in `.claude/skills/`:

```bash
cd ..        # back to ministry-video-toolkit/
claude
```

Then describe the video you want to make, for example:

> I've recorded a ministry update. The video is at `C:\Videos\update.mp4` and the
> script is in Notion at [link]. Make the video.

Claude will start a project, trim the footage, plan the graphics with you, and
render and check it.

---

## Optional: a transcription key

Graphics are timed to the words you say, which needs a word-by-word transcript.
`npm run transcribe -- <project>` makes one using a Whisper speech-to-text
service. Get a key from **one** of:

- **Groq** (recommended: fast and inexpensive): [console.groq.com/keys](https://console.groq.com/keys)
- **OpenAI**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

Then create a file called `.env` in the `remotion/` folder containing one line:

```
GROQ_API_KEY=your-key-here
```

(or `OPENAI_API_KEY=...`). The `.env` file is git-ignored, so your key is never
committed.

> **Privacy:** transcribing sends your video's audio to that service. Don't use
> it for recordings you aren't comfortable sending.

The example's transcript is already in the repository, at
`remotion/src/projects/_example/transcript.txt`: open it beside `beats.ts` to see
how each beat's time comes from the words.

---

## Optional: Python, for some checks

The `review` and `partner-frame` skills include small Python snippets that
Claude runs to measure a render, for example to confirm a QR code still scans.
If you want those checks, install Python 3 and:

```bash
pip install pillow numpy opencv-python
```

---

## If something goes wrong

Run `npm run doctor` first. It checks the usual causes and says what to do.

| Problem | Fix |
|---|---|
| `ffmpeg` not found, right after installing it | Close and reopen your terminal |
| `npm run render` fails at "rendering image sequence" | Run `npm run doctor`: it checks for missing image files, the usual cause. Otherwise run `npm run studio` and open the composition, which shows the error on screen |
| A render comes out in the wrong typeface | See [docs/gotchas.md](docs/gotchas.md), section 1 |
| `npx remotion render` fails on Windows | Use `npm run render -- <project>` instead. See [docs/gotchas.md](docs/gotchas.md), section 3 |
| The doctor says the footage length doesn't match | Re-run `npm run footage -- <project>` |
