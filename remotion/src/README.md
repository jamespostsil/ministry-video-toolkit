# Source layout

| Path | What it is |
|---|---|
| `index.ts`, `Root.tsx`, `index.css` | Entry point. `Root.tsx` turns every project into three compositions: `<id>`, `<id>-Thumbnail` and `<id>-EndFrame`. Nothing to edit when you add a video. |
| `projects/index.ts` | Finds every project folder automatically (`import.meta.webpackContext`). Project folders other than `_example` are git-ignored, so each person's videos stay on their own machine. |
| `projects/<name>/` | One video, created with `npm run new`: `project.json` (media, timings, titles, safe area), `beats.ts` (the beat plan), `partner.ts` (the end frame), `musicEnvelope.json` (music gains), and `index.ts`, which gathers them into a `Project`. |
| `lib/project.ts` | The `Project` type, the cover-crop geometry, and `useProject()` for components that need per-video values. |
| `lib/BeatEngine.tsx` | **The core.** Places every beat, derives the crossfades, runs the blurred understudy layer under full-frame graphics, the final fade and the music bed. Takes a `Project`. |
| `lib/beatTypes.ts` | The `Beat` union every component and project shares. Types only. |
| `lib/musicCurve.mjs` | The music gain curve, computed from the project's timings. Plain JS, so the render script uses the same function. |
| `lib/theme.ts` | Brand colours and font families. Nothing per-video. |
| `lib/fonts.ts` | Loads the bundled fonts and holds rendering until they are ready. |
| `components/` | One file per beat type, plus the thumbnail and end frame. |

## Timing convention

Every beat except `opening` is timed in seconds into the **footage**, the same
clock as the transcript. The engine adds the title card's length. That way the
numbers in `beats.ts` match the transcript exactly, however long the title card
is.

## Where per-video values come from

Components never import a project. Anything that varies by video (title text,
the overlay safe area, the title still) comes from `useProject()`, which the
engine and the thumbnail/end-frame compositions provide. If you write a new
component that needs a per-video value, add it to `ProjectJson` and read it the
same way.
