import type { GalleryPhoto } from "../components/PhotoGallery";
import type { PartnerFrameProps } from "../components/PartnerFrame";

// The beat vocabulary, shared by every project.
//
// This module holds TYPES ONLY. The actual beat ARRAY is per-video data and
// lives in that video's own folder under projects/<name>/beats.ts; it is handed
// to <BeatEngine> as a prop. Components import the union from here so that a
// second video never has to be wired into a component's import graph — which is
// exactly what the old `import { Beat } from "../projects/beats"` forced.
//
// Timing convention: every beat except `opening` is authored in seconds
// relative to the FOOTAGE's own transcript. BeatEngine offsets those by
// the project's titleCardSeconds, so the numbers stay matched to the transcript no
// matter how long the title card runs. `opening` is the one beat timed in
// absolute composition seconds, because it plays before the footage exists.

/** A gallery photo that also carries its real pixel size, so a `row` beat can
 *  lay each photo out at its own true aspect ratio. */
export type BeatPhoto = GalleryPhoto & { width: number; height: number };

export type Beat =
  // title card, the only beat timed in absolute composition seconds
  // style "thumbnail": open on the YouTube thumbnail's design (project.json "thumbnail"), its type rising in, then
  // dissolve to `src` (the footage's first frame) and hold it a moment before the footage moves. Default "still":
  // the title type over the frozen first frame.
  | { kind: "opening"; start: number; end: number; src: string; style?: "still" | "thumbnail" }
  // one photo shown whole (never cropped) over a blurred copy of itself —
  // for portrait images that a 16:9 full-bleed crop would destroy
  | { kind: "blur"; start: number; end: number; src: string; caption?: string }
  // full-bleed landscape photo with a slow push
  | { kind: "cover"; start: number; end: number; src: string; caption?: string; objectPosition?: string }
  // N photos in a row, each sized to its OWN aspect ratio at a shared height.
  // title: a heading above the row (a person's name, a place). revealAt: when
  // each photo comes in, in seconds from the beat's start, so each lands on its
  // own words; without it they come in one after another at the start.
  | { kind: "row"; start: number; end: number; photos: BeatPhoto[]; maxHeight: number; title?: string; revealAt?: number[] }
  // a number counting up, with a label under it ("600 / Bible translation
  // projects started"). Counts for countSeconds (default 2.6), then holds.
  | { kind: "counter"; start: number; end: number; to: number; from?: number; label: string; countSeconds?: number }
  // WORK IN PROGRESS: a turning globe; at bibleAt (seconds from the beat's start) a Bible fades in
  // in front of it. label: optional words under it.
  | { kind: "globe"; start: number; end: number; bibleAt?: number; label?: string }
  | { kind: "slider"; start: number; end: number; title: string; photos: GalleryPhoto[]; cardWidth?: number; cardHeight?: number }
  | { kind: "scatter"; start: number; end: number; title: string; photos: GalleryPhoto[]; cardLongEdge?: number; revealAt?: number[] }
  // words over the live shot, with a scrim behind the words only
  | { kind: "quote"; start: number; end: number; lines: [string, string]; heading?: string; linesAt?: number }
  // upper-left name plate / role / short bullet list, over the live shot (or over
  // a photo beat, when listed after it).
  //   align: "right" puts it in the upper right instead.
  //   titleSize: the title's px size (default 72).
  //   size: set it to show the title and every bullet as words of one size, with
  //     no bullet dots ("Support / Training / Partnership").
  //   bulletsAt: when each bullet comes in, in seconds from the beat's start, so
  //     each lands on its own words.
  //   logo, logoAt: an organisation's logo (path under public/) under the plate;
  //     logoInline puts it at the end of the subtitle line instead ("Missionaries
  //     with [logo]"), which costs no height.
  //   top: the type's top edge in px (default 120). Lower it for footage with
  //     little headroom, so the panel stays above everyone's head.
  //   bulletSize: the bullets' px size (default 42).
  | {
      kind: "heading";
      start: number;
      end: number;
      title: string;
      subtitle?: string;
      bullets?: string[];
      emphasizeFirstWord?: boolean;
      align?: "left" | "right";
      titleSize?: number;
      size?: number;
      bulletsAt?: number[];
      logo?: string;
      logoAt?: number;
      logoInline?: boolean;
      top?: number;
      bulletSize?: number;
    }
  // before -> after rows; each side times to its own word
  | {
      kind: "compare";
      start: number;
      end: number;
      title?: string;
      rows: { from: string; to: string; fromAt: number; toAt: number }[];
    }
  | { kind: "thankyou"; start: number; end: number; title: string; subtitle?: string }
  // The closing partner frame. It is composed at render time rather than
  // supplied as a flat image, so the name, web address, photo and QR can come
  // straight from the script's "[End frame]" block.
  | { kind: "ending"; start: number; end: number; partner: PartnerFrameProps };

export type BeatKind = Beat["kind"];

/** Beats that sit ON the live shot rather than covering it. They must not blur
 *  the presenters, and they never participate in the abutting-crossfade logic.
 *  Projects pass their own set to <BeatEngine>; this is the default. */
export const DEFAULT_OVERLAY_KINDS = new Set<BeatKind>(["quote", "heading", "compare", "thankyou"]);

/** Footage-relative windows where a graphic is covering the presenter, so the
 *  live layer can recede to a blurred, darkened version of itself instead of
 *  staying sharp underneath. Derived from a beat plan rather than hand-kept in
 *  sync with it. */
export const blurWindowsFor = (
  beats: Beat[],
  overlayKinds: ReadonlySet<BeatKind> = DEFAULT_OVERLAY_KINDS
): [number, number][] => {
  // Overlay kinds are excluded on purpose: they sit ON the live shot, so the
  // presenters must stay sharp underneath them, unlike every other beat which
  // covers them entirely.
  const windows = beats
    .filter((b) => b.kind !== "opening" && b.kind !== "ending" && !overlayKinds.has(b.kind))
    .map((b) => [b.start, b.end] as [number, number]);
  const merged: [number, number][] = [];
  for (const [on, off] of windows.sort((a, b) => a[0] - b[0])) {
    const last = merged[merged.length - 1];
    if (last && on - last[1] < 0.05) last[1] = Math.max(last[1], off);
    else merged.push([on, off]);
  }
  return merged;
};

/** The shape of a project's musicEnvelope.json. See lib/musicCurve.mjs. */
export type { MusicEnvelope } from "./musicCurve.mjs";
