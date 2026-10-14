import React, { useMemo } from "react";
import { AbsoluteFill, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "../lib/theme";
import { GalleryPhoto } from "./PhotoGallery";

type CaptionCorner = "bottom-left" | "bottom-right" | "top-left" | "top-right";

const TITLE_FADE = 20; // frames
const TITLE_ZONE = 210; // px reserved at the top for the title bar
const BOTTOM_MARGIN = 40;
const SIDE_MARGIN = 30;

export type GalleryScatterProps = {
  title: string;
  photos: GalleryPhoto[];
  durFrames: number;
  // Long edge of every card. The 620 default was matched to a card size picked
  // out by eye; a beat with fewer photos has room for noticeably bigger
  // cards, which is the point when the photos carry detail worth seeing.
  cardLongEdge?: number;
  // Per-photo reveal times, in seconds from the start of the beat. Without it
  // the cards build at a fixed energetic interval; with it each card can land
  // exactly on the words it illustrates (the script's "[Insert images at
  // appropriate times with script]"). Must have one entry per photo.
  revealAt?: number[];
  // Fade each caption out just before a later card would clip it. Off by
  // default: a caption being covered once it has been seen is acceptable — it
  // belongs to the card underneath. The corner choice below already prevents the bad case on small
  // sets; this is only for dense piles where no clean corner exists.
  retireCaptions?: boolean;
};

// Caption chips are children of their own card ON PURPOSE. Lifting them into a
// pass above every card was tried and rejected: it stopped later cards burying a
// caption, but produced something worse — a caption floating on top of a photo
// that arrived AFTER it, which reads as a mislabel. A caption being partly
// covered once a newer card lands over it is correct; it belongs to the card
// underneath. What must be guaranteed instead is that each caption is fully
// visible for long enough to read BEFORE the next card covers it — that is a
// property of the reveal spacing, not the z-order. See the reveal-gap guard in
// the beat plan.
//
// Deterministic PRNG (mulberry32) — Remotion re-renders/seeks the same frame
// many times (scrubbing, parallel render workers) and must produce identical
// pixels every time, so Math.random() is off the table. A seeded generator
// gives "random-looking" placement that's actually fixed per photo.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Farthest-first traversal: each next cell is the one whose closest already-
// chosen neighbor is as far away as possible. A plain shuffle was tried
// first and looked wrong in practice — a random permutation of cells has no
// idea where earlier picks landed, so it's entirely possible (and it did
// happen) for the first several photos to land in adjacent/nearby cells by
// chance, reading as "bunched up" rather than scattered. Farthest-first
// guarantees every prefix of the reveal order is well spread across the
// board, not just the full set eventually. Starts fixed at cell 0 (the
// grid's own top-left, since cell i has row = floor(i/cols), col = i%cols)
// so the board starts upper-left and scatters out
// from there, rather than from a random/unpredictable first spot.
function farthestFirstOrder(centers: { x: number; y: number }[]): number[] {
  const remaining = centers.map((_, i) => i);
  const order: number[] = [];
  const firstPick = 0; // top-left cell
  order.push(remaining[firstPick]);
  remaining.splice(firstPick, 1);

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = -1;
    for (let r = 0; r < remaining.length; r++) {
      const c = centers[remaining[r]];
      let minDistToChosen = Infinity;
      for (const chosen of order) {
        const dx = c.x - centers[chosen].x;
        const dy = c.y - centers[chosen].y;
        minDistToChosen = Math.min(minDistToChosen, dx * dx + dy * dy);
      }
      if (minDistToChosen > bestDist) {
        bestDist = minDistToChosen;
        bestIdx = r;
      }
    }
    order.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
  }
  return order;
}

const FALLBACK_ASPECT = 1.5;
// Every card in a set shares one long edge — no per-card random scale (see the
// placements loop below).
// Default long edge, derived from photo count: a small set has room to be seen,
// a large one has to pack in. Linear through the settings validated in use
// (11 -> 620, 6 -> 750, 3 -> ~790). Capped separately below when any photo is
// portrait, since a portrait card's long edge IS its height and must still
// clear the title bar.
const autoLongEdge = (n: number, anyPortrait: boolean) =>
  Math.round(Math.min(anyPortrait ? 790 : 860, Math.max(560, 900 - 25 * n)));

// A new photo every ~1.3s (1.5x the original 0.85s pace, chosen by eye) —
// a quick, energetic build, not one spread thin across the whole beat.
// Falls back to a faster/slower interval only if the given duration
// genuinely can't fit every photo at this pace with a little hold left at
// the end.
const TARGET_INTERVAL_SEC = 0.85 * 1.5;
const HOLD_TAIL_SEC = 2;
// A caption has to be readable BEFORE a later card lands on top of it — that is
// the guard that keeps the pile honest, since the chips deliberately sit under
// later cards (see the note above). Captioned sets therefore build no faster
// than this, duration permitting; uncaptioned sets keep the quicker pace.
const CAPTION_READ_SEC = 1.8;


// Axis-aligned bounds of a rotated rectangle. The cards are rotated by up to
// +/-7 degrees, and an earlier version of the caption logic used each card's
// UNROTATED box — close enough to look right on paper, wrong enough that a
// caption which was visibly being clipped scored as untouched.
type Rect = { x0: number; x1: number; y0: number; y1: number };

const rotatedBounds = (cx: number, cy: number, w: number, h: number, deg: number): Rect => {
  const r = (deg * Math.PI) / 180;
  const c = Math.abs(Math.cos(r));
  const s = Math.abs(Math.sin(r));
  const hw = (w * c + h * s) / 2;
  const hh = (w * s + h * c) / 2;
  return { x0: cx - hw, x1: cx + hw, y0: cy - hh, y1: cy + hh };
};

// Where a chip pinned to one corner of a card actually lands once the card is
// rotated about its own centre.
const chipBounds = (
  pl: { centerX: number; centerY: number; rotation: number; cardW: number; cardH: number },
  corner: CaptionCorner,
  chipW: number,
  chipH: number
): Rect => {
  const INSET = 12;
  const lx = corner.endsWith("left")
    ? -pl.cardW / 2 + INSET + chipW / 2
    : pl.cardW / 2 - INSET - chipW / 2;
  const ly = corner.startsWith("bottom")
    ? pl.cardH / 2 - INSET - chipH / 2
    : -pl.cardH / 2 + INSET + chipH / 2;
  const r = (pl.rotation * Math.PI) / 180;
  const cx = pl.centerX + lx * Math.cos(r) - ly * Math.sin(r);
  const cy = pl.centerY + lx * Math.sin(r) + ly * Math.cos(r);
  return rotatedBounds(cx, cy, chipW, chipH, pl.rotation);
};

const rectOverlap = (a: Rect, b: Rect) =>
  Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) *
  Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));

const CORNERS: CaptionCorner[] = ["bottom-left", "bottom-right", "top-left", "top-right"];

export const GalleryScatter: React.FC<GalleryScatterProps> = ({
  title,
  photos,
  durFrames,
  cardLongEdge,
  revealAt,
  retireCaptions = false,
}) => {
  const { fps } = useVideoConfig();
  const BASE_LONG_EDGE =
    cardLongEdge ?? autoLongEdge(photos.length, photos.some((p) => (p.width ?? 3) / (p.height ?? 2) < 1));
  const n = photos.length;
  const maxIntervalFrames = Math.max(1, (durFrames - HOLD_TAIL_SEC * fps) / Math.max(1, n - 1));
  const targetSec = photos.some((p) => p.caption) ? Math.max(TARGET_INTERVAL_SEC, CAPTION_READ_SEC) : TARGET_INTERVAL_SEC;
  const intervalFrames = Math.min(targetSec * fps, maxIntervalFrames);

  const contentW = 1920 - SIDE_MARGIN * 2;
  const contentH = 1080 - TITLE_ZONE - BOTTOM_MARGIN;

  // Grid sized to roughly match the frame's own proportions so cells are
  // never absurdly tall/narrow, however many photos there are.
  const cols = Math.max(1, Math.ceil(Math.sqrt((n * contentW) / contentH)));
  const rows = Math.max(1, Math.ceil(n / cols));
  const cellW = contentW / cols;
  const cellH = contentH / rows;

  const placements = useMemo(() => {
    const cellCenters = Array.from({ length: cols * rows }, (_, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      return { x: SIDE_MARGIN + c * cellW + cellW / 2, y: TITLE_ZONE + r * cellH + cellH / 2 };
    });
    const cellOrder = farthestFirstOrder(cellCenters);
    return photos.map((photo, i) => {
      const cell = cellOrder[i % cellOrder.length];
      const cellRow = Math.floor(cell / cols);
      const cellCol = cell % cols;
      const cellCenterX = SIDE_MARGIN + cellCol * cellW + cellW / 2;
      const cellCenterY = TITLE_ZONE + cellRow * cellH + cellH / 2;

      const rand = mulberry32(i * 7919 + 13);
      // Tighter than before (was 0.35) — keeps each card closer to its own
      // cell so it overlaps its neighbors less, while still reading as
      // organic rather than snapped to a grid.
      const jitterX = (rand() - 0.5) * cellW * 0.18;
      const jitterY = (rand() - 0.5) * cellH * 0.18;
      const rotation = (rand() - 0.5) * 14; // deg

      // Every card gets the same long edge — a random per-card size
      // multiplier used to live here, but it made some photos (several
      // of them) land noticeably smaller than others by sheer
      // chance. "Sizes may differ" meant orientation (landscape/portrait/
      // square, from each photo's real aspect ratio below), not an
      // additional random scale on top of that — this fixes it back to one
      // consistent size, at the value that read best.
      const aspect = photo.width && photo.height ? photo.width / photo.height : FALLBACK_ASPECT;
      const longEdge = BASE_LONG_EDGE;
      const cardW = aspect >= 1 ? longEdge : longEdge * aspect;
      const cardH = aspect >= 1 ? longEdge / aspect : longEdge;

      // Clamp so a worst-case jitter (large offset landing on an edge/corner
      // cell, paired with a large card) can never push part of the card off
      // the visible frame — didn't happen with this particular photo set and
      // seed, but nothing here guaranteed it wouldn't with a different one.
      const rawCenterX = cellCenterX + jitterX;
      const rawCenterY = cellCenterY + jitterY;
      const centerX = Math.min(Math.max(rawCenterX, cardW / 2 + 10), 1920 - cardW / 2 - 10);
      const centerY = Math.min(Math.max(rawCenterY, TITLE_ZONE + cardH / 2), 1080 - BOTTOM_MARGIN - cardH / 2);

      return {
        centerX,
        centerY,
        rotation,
        cardW,
        cardH,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, cols, rows, cellW, cellH, BASE_LONG_EDGE]);

  // Which corner each caption sits in.
  //
  // This used to be hardcoded to bottom-left, on the reasoning that it is "the
  // least-visited corner across a scattered layout in practice". That held
  // until a wide landscape card landed next to a portrait one: the later card
  // covered exactly the earlier card's bottom-left, leaving the caption sliced
  // in half — visibly broken for the rest of the beat, and worse than being
  // covered outright.
  //
  // Nothing about this is actually unpredictable: every placement is known up
  // front, so pick the corner that the cards drawn ON TOP of this one cover
  // least. Ties keep the original bottom-left preference.
  const captionPlacement = useMemo(() => {
    return placements.map((pl, i) => {
      const caption = photos[i].caption;
      if (!caption) return { corner: "bottom-left" as CaptionCorner, chip: null as Rect | null };
      // Roughly the chip's footprint: the real one is text-sized, and erring
      // large only makes the choice more conservative.
      const chipW = Math.min(pl.cardW - 40, caption.length * 16 + 40);
      const chipH = 56;
      const area = chipW * chipH;
      const later = placements
        .slice(i + 1)
        .map((o) => rotatedBounds(o.centerX, o.centerY, o.cardW, o.cardH, o.rotation));

      // What matters is not how MUCH a later card covers the chip, but whether
      // it covers it PARTLY. Fully hidden is fine — the caption had its time on
      // screen and something landed on top, which reads as a pile of photos.
      // Half-covered is the broken-looking case: a chip with its words sliced
      // through. So score on partial overlaps first, total area only as a
      // tie-break. (Scoring on area alone kept a chip that one card sliced in
      // half, because the alternative corner was more fully buried by another.)
      let best: CaptionCorner = CORNERS[0];
      let bestChip = chipBounds(pl, CORNERS[0], chipW, chipH);
      let bestScore: [number, number] = [Infinity, Infinity];
      for (const corner of CORNERS) {
        const chip = chipBounds(pl, corner, chipW, chipH);
        let partials = 0;
        let total = 0;
        for (const o of later) {
          const f = rectOverlap(chip, o) / area;
          if (f > 0.08 && f < 0.92) partials += 1;
          total += f;
        }
        if (partials < bestScore[0] || (partials === bestScore[0] && total < bestScore[1] - 0.02)) {
          bestScore = [partials, total];
          best = corner;
          bestChip = chip;
        }
      }
      return { corner: best, chip: bestChip };
    });
  }, [placements, photos]);

  const revealFrame = (i: number) =>
    revealAt && revealAt[i] !== undefined
      ? Math.max(0, Math.min(durFrames - 1, Math.round(revealAt[i] * fps)))
      : Math.round(i * intervalFrames);

  // When a caption must get out of the way.
  //
  // Choosing the least-covered corner is not always enough: with six large
  // cards there may be no corner that some later card does not clip. So the
  // caption also retires. For each card, find the first later card whose
  // arrival would only PARTLY cover this chip, and fade the chip out just
  // before it lands. The caption is therefore fully readable for its whole life
  // and then gone — never sliced through. A card that fully buries this one
  // needs no help; being hidden under a photo reads as a pile, which is the
  // intended effect.
  const captionHideFrame = useMemo(() => {
    return captionPlacement.map((info, i) => {
      if (!retireCaptions || !info.chip) return Infinity;
      const area = (info.chip.x1 - info.chip.x0) * (info.chip.y1 - info.chip.y0);
      if (area <= 0) return Infinity;
      let earliest = Infinity;
      for (let j = i + 1; j < placements.length; j++) {
        const o = placements[j];
        const f = rectOverlap(info.chip, rotatedBounds(o.centerX, o.centerY, o.cardW, o.cardH, o.rotation)) / area;
        // Any meaningful overlap retires the caption. An earlier version
        // exempted chips a later card covers ENTIRELY, on the grounds that they
        // need no help — but bounds overstate coverage, so a card that merely
        // clipped a caption could be scored as burying it. Retiring a chip that
        // was about to be hidden anyway costs nothing: it is invisible either way.
        if (f > 0.05) earliest = Math.min(earliest, revealFrame(j));
      }
      // Relative to this card's own Sequence, which starts at its reveal.
      return earliest === Infinity ? Infinity : earliest - revealFrame(i);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captionPlacement, placements, revealAt, intervalFrames, fps, durFrames, retireCaptions]);

  const fadeOpacity = interpolate(
    useCurrentFrame(),
    [0, TITLE_FADE, durFrames - TITLE_FADE, durFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a1216", opacity: fadeOpacity }}>
      <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 30%, ${COLORS.ink}66 0%, #0a1216 70%)` }} />

      <div style={{ position: "absolute", top: 64, left: 0, width: "100%", textAlign: "center" }}>
        <div style={{ width: 90, height: 3, backgroundColor: COLORS.accentSoft, margin: "0 auto 20px", borderRadius: 2 }} />
        <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: 58, color: "#fff" }}>{title}</div>
      </div>

      {photos.map((photo, i) => {
        const p = placements[i];
        return (
          // Each card gets its own Sequence starting at its reveal frame —
          // simplest possible way to say "exists from here to the end,
          // never before": Remotion just doesn't render it before `from`.
          <Sequence key={photo.src} from={revealFrame(i)} durationInFrames={durFrames - revealFrame(i)} layout="none">
            <ScatterCard photo={photo} placement={p} fps={fps} captionCorner={captionPlacement[i].corner} captionHideFrame={captionHideFrame[i]} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const ScatterCard: React.FC<{
  photo: GalleryPhoto;
  placement: { centerX: number; centerY: number; rotation: number; cardW: number; cardH: number };
  fps: number;
  captionCorner: CaptionCorner;
  captionHideFrame: number;
}> = ({ photo, placement, fps, captionCorner, captionHideFrame }) => {
  const frame = useCurrentFrame();
  const pop = spring({ frame, fps, config: { damping: 14, mass: 0.6, stiffness: 130 } });
  const scale = 0.6 + 0.4 * Math.min(1, pop);
  const opacity = Math.min(1, pop * 1.4);
  // Retire the caption just before a card lands that would clip it — see
  // captionHideFrame. Finishing 0.12s early means it is already gone as the
  // covering card arrives, rather than fading out underneath it.
  const CAPTION_FADE = 0.3 * fps;
  const captionOpacity =
    captionHideFrame === Infinity
      ? 1
      : interpolate(frame, [captionHideFrame - 0.12 * fps - CAPTION_FADE, captionHideFrame - 0.12 * fps], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

  return (
    <div
      style={{
        position: "absolute",
        left: placement.centerX,
        top: placement.centerY,
        width: placement.cardW,
        height: placement.cardH,
        transform: `translate(-50%, -50%) rotate(${placement.rotation}deg) scale(${scale})`,
        opacity,
        borderRadius: 14,
        overflow: "hidden",
        border: "4px solid rgba(255,255,255,0.92)",
        boxShadow: "0 24px 60px rgba(0,0,0,0.55), 0 4px 14px rgba(0,0,0,0.4)",
        backgroundColor: "rgba(255,255,255,0.92)",
      }}
    >
      {/* Overfilled by 1px on every side so no sliver of the card shows
          between the photo and its border. The card is rotated and
          scaled, so the image edge lands on fractional pixels and the
          rasteriser leaves a hairline of whatever is underneath — which
          was a near-black card colour, very visible against the white
          border on light images like document screenshots.
          maxWidth/maxHeight "none" are required: this image is
          deliberately larger than its box, and Tailwind's preflight
          would otherwise clamp it straight back (see docs/gotchas.md). */}
      <Img
        src={staticFile(photo.src)}
        style={{
          position: "absolute",
          left: -1,
          top: -1,
          width: "calc(100% + 2px)",
          height: "calc(100% + 2px)",
          maxWidth: "none",
          maxHeight: "none",
          objectFit: "cover",
        }}
      />
      {/* The corner is chosen per card by whichever the later-drawn cards
          cover least — see captionCorners above. Bottom-left is still the
          default and the tie-break; it is only moved when something would
          otherwise slice this caption in half. */}
      <div
        style={{
          position: "absolute",
          ...(captionCorner.endsWith("left") ? { left: 12 } : { right: 12 }),
          ...(captionCorner.startsWith("bottom") ? { bottom: 12 } : { top: 12 }),
          opacity: captionOpacity,
          maxWidth: placement.cardW - 40,
          padding: "8px 14px",
          borderRadius: 8,
          backgroundColor: "rgba(0,0,0,0.78)",
        }}
      >
        <div style={{ fontFamily: FONTS.secondary, fontWeight: 600, fontSize: 26, color: "#fff", lineHeight: 1.25 }}>{photo.caption}</div>
        {photo.credit ? (
          <div style={{ fontFamily: FONTS.secondary, fontWeight: 500, fontSize: 18, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>{photo.credit}</div>
        ) : null}
      </div>
    </div>
  );
};
