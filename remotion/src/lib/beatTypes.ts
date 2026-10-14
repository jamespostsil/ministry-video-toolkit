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
  | { kind: "opening"; start: number; end: number; src: string }
  // one photo shown whole (never cropped) over a blurred copy of itself —
  // for portrait images that a 16:9 full-bleed crop would destroy
  | { kind: "blur"; start: number; end: number; src: string; caption?: string }
  // full-bleed landscape photo with a slow push
  | { kind: "cover"; start: number; end: number; src: string; caption?: string; objectPosition?: string }
  // N photos in a row, each sized to its OWN aspect ratio at a shared height
  | { kind: "row"; start: number; end: number; photos: BeatPhoto[]; maxHeight: number }
  | { kind: "slider"; start: number; end: number; title: string; photos: GalleryPhoto[]; cardWidth?: number; cardHeight?: number }
  | { kind: "scatter"; start: number; end: number; title: string; photos: GalleryPhoto[]; cardLongEdge?: number; revealAt?: number[] }
  // words over the live shot, with a scrim behind the words only
  | { kind: "quote"; start: number; end: number; lines: [string, string]; heading?: string; linesAt?: number }
  // upper-left name plate / role / short bullet list, over the live shot
  | { kind: "heading"; start: number; end: number; title: string; subtitle?: string; bullets?: string[]; emphasizeFirstWord?: boolean }
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
