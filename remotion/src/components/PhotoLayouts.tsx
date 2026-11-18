import React, { useMemo } from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature, mesh } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import countries110 from "world-atlas/countries-110m.json";
import { Beat, BeatPhoto } from "../lib/beatTypes";
import { BRAND, COLORS, FONTS } from "../lib/theme";

// Six more ways to show a set of photos: grid, one at a time, stack, feature and
// thumbnails, before and after, on a map. Each is a full-frame beat on the same
// dark brand field as the row, slider and scatter, with the same card (white
// border, card colour = border colour, photo overfilled by 1px: see the
// beat-library skill, "Card borders").

const EASE_OUT = Easing.out(Easing.cubic);
const EASE = Easing.inOut(Easing.cubic);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ramp = (frame: number, from: number, len: number, a = 0, b = 1, easing: (n: number) => number = EASE_OUT) =>
  interpolate(frame, [from, from + len], [a, b], { ...clamp, easing });

export const Field: React.FC = () => (
  <>
    <AbsoluteFill style={{ backgroundColor: "#0a1216" }} />
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 30%, ${COLORS.ink}66 0%, #0a1216 70%)` }} />
  </>
);

// The same title bar as the slider and scatter.
const TITLE_ZONE = 200;
const Title: React.FC<{ text?: string; left?: number; right?: number }> = ({ text, left = 0, right = 0 }) =>
  text ? (
    <div style={{ position: "absolute", top: 60, left, right, textAlign: "center" }}>
      <div style={{ width: 90, height: 3, backgroundColor: COLORS.accentSoft, margin: "0 auto 20px", borderRadius: 2 }} />
      <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: 58, lineHeight: 1.15, color: "#fff" }}>{text}</div>
    </div>
  ) : null;

const CARD: React.CSSProperties = {
  position: "absolute",
  borderRadius: 18,
  overflow: "hidden",
  border: "4px solid rgba(255,255,255,0.92)",
  backgroundColor: "rgba(255,255,255,0.92)",
  boxShadow: "0 30px 80px rgba(0,0,0,0.55), 0 4px 14px rgba(0,0,0,0.4)",
};
const Fill: React.FC<{ src: string; style?: React.CSSProperties }> = ({ src, style }) => (
  <Img
    src={staticFile(src)}
    style={{ position: "absolute", left: -1, top: -1, width: "calc(100% + 2px)", height: "calc(100% + 2px)", maxWidth: "none", maxHeight: "none", objectFit: "cover", ...style }}
  />
);
// Caption and credit in a dark chip in a card's bottom-left corner.
const Chip: React.FC<{ photo: BeatPhoto; size?: number; maxWidth?: number }> = ({ photo, size = 26, maxWidth }) =>
  photo.caption || photo.credit ? (
    <div style={{ position: "absolute", left: 14, bottom: 14, maxWidth, padding: `${Math.round(size * 0.36)}px ${Math.round(size * 0.66)}px`, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.78)", textAlign: "left" }}>
      {photo.caption ? <div style={{ fontFamily: FONTS.secondary, fontWeight: 600, fontSize: size, color: "#fff", lineHeight: 1.25 }}>{photo.caption}</div> : null}
      {photo.credit ? (
        <div style={{ fontFamily: FONTS.secondary, fontWeight: 500, fontSize: Math.round(size * 0.68), color: "rgba(255,255,255,0.72)", marginTop: 2 }}>{photo.credit}</div>
      ) : null}
    </div>
  ) : null;

const aspectOf = (p: BeatPhoto) => p.width / p.height;

/** When each photo arrives, in seconds from the beat's start: the beat's own
 *  times if it gives them, else an even build that leaves the last photo time
 *  to be seen. */
export const arriveTimes = (n: number, durSec: number, given?: number[], opts: { first?: number; tail?: number; max?: number } = {}) => {
  const { first = 0.2, tail = 2, max = 1.3 } = opts;
  const step = Math.min(max, Math.max(0.2, (durSec - first - tail) / Math.max(1, n)));
  return Array.from({ length: n }, (_, i) => given?.[i] ?? first + i * step);
};
/** When each photo takes its turn, for layouts that show one at a time: equal shares unless the beat says. */
export const turnTimes = (n: number, durSec: number, given?: number[]) => Array.from({ length: n }, (_, i) => (i === 0 ? 0 : given?.[i] ?? (i * durSec) / n));

// ---------- grid ----------
// Neat rows of one shared height, each photo at its own aspect ratio, so nothing
// is cropped. Rows are centred, like bricks, when they hold different numbers.
export const Grid: React.FC<{ beat: Extract<Beat, { kind: "grid" }>; durFrames: number }> = ({ beat, durFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const photos = beat.photos;
  const n = photos.length;
  const GAP = 26;
  const W = 1780;
  const top = beat.title ? TITLE_ZONE : 60;
  const H = 1080 - top - 60;
  // Try one, two and three rows (the photos stay in order) and keep whichever shows them largest. Within a row
  // count, the split that keeps the widest row narrowest wins, so four portraits make one row and six landscapes two.
  const { rows, h } = useMemo(() => {
    const heightOf = (rs: BeatPhoto[][]) => Math.min((H - GAP * (rs.length - 1)) / rs.length, ...rs.map((r) => (W - GAP * (r.length - 1)) / r.reduce((s, p) => s + aspectOf(p), 0)));
    let best = { rows: [photos], h: heightOf([photos]) };
    const consider = (rs: BeatPhoto[][]) => {
      const hh = heightOf(rs);
      if (hh > best.h * 1.02) best = { rows: rs, h: hh };
    };
    for (let a = 1; a < n; a++) {
      consider([photos.slice(0, a), photos.slice(a)]);
      for (let b = a + 1; b < n; b++) consider([photos.slice(0, a), photos.slice(a, b), photos.slice(b)]);
    }
    return best;
  }, [photos, n, H]);
  const rowCount = rows.length;
  const blockH = h * rowCount + GAP * (rowCount - 1);
  const y0 = top + (H - blockH) / 2;
  const times = arriveTimes(n, durFrames / fps, beat.revealAt, { max: 0.7 });
  const chip = h < 340 ? 20 : 24;
  let idx = 0;
  return (
    <AbsoluteFill>
      <Field />
      <Title text={beat.title} />
      {rows.map((row, r) => {
        const rowW = row.reduce((s, p) => s + aspectOf(p) * h, 0) + GAP * (row.length - 1);
        let x = (1920 - rowW) / 2;
        return row.map((p) => {
          const i = idx++;
          const w = aspectOf(p) * h;
          const left = x;
          x += w + GAP;
          const t0 = times[i] * fps;
          const k = ramp(frame, t0, 0.45 * fps);
          return (
            <div key={p.src + i} style={{ ...CARD, left, top: y0 + r * (h + GAP), width: w, height: h, opacity: k, transform: `translateY(${(1 - k) * 22}px) scale(${0.94 + 0.06 * k})` }}>
              <Fill src={p.src} />
              <Chip photo={p} size={chip} maxWidth={w - 36} />
            </div>
          );
        });
      })}
    </AbsoluteFill>
  );
};

// ---------- one photo filling the screen ----------
// A landscape photo (4:3 or wider) fills the frame; a portrait, a square or a very
// wide one is shown whole over a blurred copy of itself, so no face or word is cut
// off. Photos that take turns all get the same treatment (see PhotoTurns).
const fillsFrame = (p: BeatPhoto) => aspectOf(p) >= 1.25 && aspectOf(p) <= 2.3;
const SHADOW_TEXT = "0 0 2px rgba(0,0,0,0.98), 2px 2px 0 rgba(0,0,0,0.85), -2px 2px 0 rgba(0,0,0,0.85), 2px -2px 0 rgba(0,0,0,0.85), -2px -2px 0 rgba(0,0,0,0.85), 0 2px 18px rgba(0,0,0,0.9)";
export const FullPhoto: React.FC<{ photo: BeatPhoto; frame: number; durFrames: number; align?: "center" | "left" | "right"; whole?: boolean }> = ({ photo, frame, durFrames, align = "center", whole: wholeGiven }) => {
  const push = interpolate(frame, [0, Math.max(1, durFrames)], [1.02, 1.05], clamp);
  const whole = wholeGiven ?? !fillsFrame(photo);
  const hasWords = !!(photo.caption || photo.credit);
  const a = aspectOf(photo);
  const boxH = hasWords ? 850 : 940;
  const h = Math.min(boxH, 1760 / a);
  const w = h * a;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {whole ? (
        <>
          <Img src={staticFile(photo.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.15 + (push - 1.02)})`, filter: "blur(40px) brightness(0.5)" }} />
          <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.18)" }} />
          <div style={{ ...CARD, border: "3px solid rgba(255,255,255,0.9)", left: (1920 - w) / 2, top: (hasWords ? 50 : 70) + (boxH - h) / 2, width: w, height: h }}>
            <Fill src={photo.src} />
          </div>
        </>
      ) : (
        <AbsoluteFill style={{ transform: `scale(${push})` }}>
          <Img src={staticFile(photo.src)} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} />
        </AbsoluteFill>
      )}
      {hasWords ? (
        <>
          {whole ? null : <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 70%, rgba(0,0,0,0.74) 100%)" }} />}
          <div style={{ position: "absolute", left: 70, right: 70, bottom: 36, textAlign: align }}>
            {photo.caption ? <div style={{ fontFamily: FONTS.secondary, fontWeight: 600, fontSize: 40, color: "#fff", textShadow: SHADOW_TEXT }}>{photo.caption}</div> : null}
            {photo.credit ? <div style={{ fontFamily: FONTS.secondary, fontWeight: 500, fontSize: 24, color: "rgba(255,255,255,0.78)", marginTop: 2, textShadow: SHADOW_TEXT }}>{photo.credit}</div> : null}
          </div>
        </>
      ) : null}
    </AbsoluteFill>
  );
};

/** Photos one after another in the same place, each crossfading into the next. */
export const PhotoTurns: React.FC<{ photos: BeatPhoto[]; durFrames: number; showAt?: number[]; align?: "center" | "left" | "right" }> = ({ photos, durFrames, showAt, align }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const XF = 0.6 * fps;
  const times = turnTimes(photos.length, durFrames / fps, showAt).map((t) => t * fps);
  // one look for the whole set: if any photo can't fill the screen, every photo is shown whole
  const whole = photos.some((p) => !fillsFrame(p));
  return (
    <>
      {photos.map((p, i) => {
        const from = times[i];
        const until = i + 1 < photos.length ? times[i + 1] + XF : 1e9;
        if (frame < from || frame > until) return null;
        return (
          <AbsoluteFill key={p.src + i} style={{ opacity: i === 0 ? 1 : ramp(frame, from, XF, 0, 1, EASE) }}>
            <FullPhoto photo={p} frame={frame - from} durFrames={(i + 1 < photos.length ? times[i + 1] + XF : durFrames) - from} align={align} whole={whole} />
          </AbsoluteFill>
        );
      })}
    </>
  );
};

// ---------- one at a time ----------
export const OneAtATime: React.FC<{ beat: Extract<Beat, { kind: "onebyone" }>; durFrames: number }> = ({ beat, durFrames }) => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <PhotoTurns photos={beat.photos} durFrames={durFrames} showAt={beat.showAt} />
  </AbsoluteFill>
);

// ---------- stack ----------
// Large photos land on one pile, each covering most of the one before, so there
// is only ever one caption to read. Earlier photos dim a little once covered.
const PILE = [
  { dx: -44, dy: -12, rot: -3.2 },
  { dx: 40, dy: 16, rot: 2.4 },
  { dx: -16, dy: -20, rot: -1.4 },
  { dx: 52, dy: 8, rot: 3.6 },
  { dx: -36, dy: 18, rot: -2.4 },
  { dx: 20, dy: -8, rot: 1.6 },
];
export const Stack: React.FC<{ beat: Extract<Beat, { kind: "stack" }>; durFrames: number }> = ({ beat, durFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const photos = beat.photos;
  const n = photos.length;
  const top = beat.title ? TITLE_ZONE - 20 : 40;
  const availH = 1080 - top - 50;
  const times = arriveTimes(n, durFrames / fps, beat.revealAt, { max: 2.4, tail: 2.2 });
  return (
    <AbsoluteFill>
      <Field />
      <Title text={beat.title} />
      {photos.map((p, i) => {
        const a = aspectOf(p);
        const h = Math.min(availH - 50, 1380 / a);
        const w = h * a;
        const { dx, dy, rot } = PILE[i % PILE.length];
        const t0 = times[i] * fps;
        if (frame < t0) return null;
        const s = spring({ frame: frame - t0, fps, config: { damping: 16, stiffness: 110, mass: 0.9 } });
        const op = ramp(frame, t0, 0.2 * fps);
        const next = i + 1 < n ? times[i + 1] * fps : 1e9;
        const dim = i + 1 < n ? ramp(frame, next, 0.5 * fps, 1, 0.6, EASE) : 1;
        return (
          <div
            key={p.src + i}
            style={{
              ...CARD,
              left: 960 - w / 2 + dx,
              top: top + availH / 2 - h / 2 + dy,
              width: w,
              height: h,
              opacity: op,
              filter: dim < 1 ? `brightness(${dim})` : undefined,
              transform: `translateY(${(1 - s) * -46}px) rotate(${rot + (1 - s) * (i % 2 ? 5 : -5)}deg) scale(${1 + (1 - s) * 0.16})`,
            }}
          >
            <Fill src={p.src} />
            <Chip photo={p} size={28} maxWidth={w - 40} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- feature and thumbnails ----------
// One large photo, shown whole; the rest wait as small cards on the right. The
// large one changes on each photo's own words, and its small card lights up.
export const Feature: React.FC<{ beat: Extract<Beat, { kind: "feature" }>; durFrames: number }> = ({ beat, durFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const photos = beat.photos;
  const n = photos.length;
  const top = beat.title ? TITLE_ZONE : 60;
  const H = 1080 - top - 56;
  const GAP = 20;
  const TW = n > 5 ? 250 : 300;
  const th = Math.min(TW / 1.5, (H - GAP * (n - 1)) / n);
  const ty = top + (H - (th * n + GAP * (n - 1))) / 2;
  const hasWords = photos.some((p) => p.caption || p.credit);
  const capH = hasWords ? 96 : 0;
  const BH = H - capH;
  // the large photo and the small ones are centred together, so a narrow photo doesn't leave a hole between them
  const bigW = Math.max(...photos.map((p) => Math.min(1920 - 140 - 56 - TW, BH * aspectOf(p))));
  const BW = bigW;
  const x0 = (1920 - (bigW + 56 + TW)) / 2;
  const XF = 0.5 * fps;
  const times = turnTimes(n, durFrames / fps, beat.showAt).map((t) => t * fps);
  const current = times.reduce((c, t, i) => (frame >= t ? i : c), 0);
  return (
    <AbsoluteFill>
      <Field />
      <Title text={beat.title} />
      {photos.map((p, i) => {
        const from = times[i];
        const until = i + 1 < n ? times[i + 1] : 1e9;
        const op = Math.min(i === 0 ? 1 : ramp(frame, from, XF, 0, 1, EASE), ramp(frame, until, XF, 1, 0, EASE));
        if (op <= 0) return null;
        const a = aspectOf(p);
        const h = Math.min(BH, BW / a);
        const w = h * a;
        const x = x0 + (BW - w) / 2;
        const y = top + (BH - h) / 2;
        return (
          <React.Fragment key={p.src + i}>
            <div style={{ ...CARD, left: x, top: y, width: w, height: h, opacity: op, transform: `scale(${0.97 + 0.03 * op})` }}>
              <Fill src={p.src} />
            </div>
            {p.caption || p.credit ? (
              <div style={{ position: "absolute", left: x0, width: BW, top: y + h + 16, textAlign: "center", opacity: op }}>
                {p.caption ? <div style={{ fontFamily: FONTS.secondary, fontWeight: 600, fontSize: 36, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>{p.caption}</div> : null}
                {p.credit ? <div style={{ fontFamily: FONTS.secondary, fontWeight: 500, fontSize: 22, color: "rgba(255,255,255,0.7)" }}>{p.credit}</div> : null}
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
      {photos.map((p, i) => {
        const on = i === current ? ramp(frame, times[i], XF) : 1 - ramp(frame, times[i + 1] ?? 1e9, XF);
        const lit = i === current || (i + 1 === current && on > 0) ? on : 0;
        const k = i === current && i === 0 ? 1 : lit;
        return (
          <div
            key={"t" + p.src + i}
            style={{
              ...CARD,
              borderRadius: 12,
              left: x0 + bigW + 56,
              top: ty + i * (th + GAP),
              width: TW,
              height: th,
              border: `4px solid rgba(255,255,255,${0.3 + 0.62 * k})`,
              backgroundColor: "#0a1216",
              boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
              transform: `scale(${1 + 0.05 * k})`,
            }}
          >
            <Fill src={p.src} style={{ filter: `brightness(${0.5 + 0.5 * k})` }} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- before and after ----------
// Two photos in the same frame. A line wipes from the right edge to the left,
// uncovering the second photo; `split` (0-1) stops the line part way, so both
// stay on screen (the classic then-and-now, for two photos of the same view).
const Pill: React.FC<{ text: string; style: React.CSSProperties }> = ({ text, style }) => (
  <div style={{ position: "absolute", top: 36, padding: "10px 26px", borderRadius: 999, backgroundColor: "rgba(0,0,0,0.72)", fontFamily: FONTS.secondary, fontWeight: 600, fontSize: 34, color: "#fff", ...style }}>{text}</div>
);
export const BeforeAfter: React.FC<{ beat: Extract<Beat, { kind: "beforeafter" }>; durFrames: number }> = ({ beat, durFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [before, after] = beat.photos;
  const dur = durFrames / fps;
  const wipeAt = (beat.wipeAt ?? Math.max(1.2, dur * 0.4)) * fps;
  const SWEEP = 1.5 * fps;
  const stop = beat.split === undefined ? 1 : Math.min(0.9, Math.max(0.1, 1 - beat.split));
  const p = ramp(frame, wipeAt, SWEEP, 0, stop, EASE); // how far the second photo has come in, from the right
  const full = fillsFrame(before) && fillsFrame(after);
  const a = Math.min(1.9, Math.max(0.7, aspectOf(before)));
  const hasWords = !!(before.caption || after.caption || before.credit || after.credit);
  const boxH = hasWords ? 830 : 930;
  const h = full ? 1080 : Math.min(boxH, 1700 / a);
  const w = full ? 1920 : h * a;
  const x = (1920 - w) / 2;
  const y = full ? 0 : (hasWords ? 46 : 75) + (boxH - h) / 2;
  const lineX = w * (1 - p);
  const lineOn = Math.min(ramp(frame, wipeAt - 0.3 * fps, 0.3 * fps), beat.split === undefined ? ramp(frame, wipeAt + SWEEP - 0.15 * fps, 0.35 * fps, 1, 0) : 1);
  const labels = beat.labels ?? ["Before", "After"];
  const words = (ph: BeatPhoto, op: number, place: React.CSSProperties = {}) =>
    ph.caption || ph.credit ? (
      <div style={{ position: "absolute", left: 70, right: 70, bottom: 34, textAlign: "center", opacity: op, ...place }}>
        {ph.caption ? <div style={{ fontFamily: FONTS.secondary, fontWeight: 600, fontSize: beat.split === undefined ? 40 : 32, color: "#fff", textShadow: SHADOW_TEXT }}>{ph.caption}</div> : null}
        {ph.credit ? <div style={{ fontFamily: FONTS.secondary, fontWeight: 500, fontSize: 24, color: "rgba(255,255,255,0.78)", textShadow: SHADOW_TEXT }}>{ph.credit}</div> : null}
      </div>
    ) : null;
  const afterWords = ramp(frame, wipeAt + SWEEP * 0.45, 0.4 * fps);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {full ? null : <Field />}
      <div style={full ? { position: "absolute", inset: 0, overflow: "hidden" } : { ...CARD, left: x, top: y, width: w, height: h }}>
        <Fill src={before.src} />
        <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 0 ${(1 - p) * 100}%)` }}>
          <Fill src={after.src} />
        </div>
        {full && hasWords ? <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 70%, rgba(0,0,0,0.74) 100%)" }} /> : null}
        <Pill text={labels[0]} style={{ left: 36, opacity: interpolate(lineX, [140, 330], [0, 1], clamp) }} />
        <Pill text={labels[1]} style={{ right: 36, backgroundColor: BRAND.teal, opacity: interpolate(w - lineX, [140, 330], [0, 1], clamp) }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: lineX - 3, width: 6, backgroundColor: "#fff", boxShadow: "0 0 18px rgba(0,0,0,0.6)", opacity: lineOn }} />
        <div
          style={{ position: "absolute", top: "50%", left: lineX - 34, width: 68, height: 68, marginTop: -34, borderRadius: 34, backgroundColor: "#fff", boxShadow: "0 4px 18px rgba(0,0,0,0.5)", opacity: lineOn, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <svg width={36} height={24} viewBox="0 0 36 24">
            <path d="M13 3 L4 12 L13 21 M23 3 L32 12 L23 21" fill="none" stroke={BRAND.teal} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      {beat.split === undefined ? (
        <>
          {words(before, 1 - afterWords)}
          {words(after, afterWords)}
        </>
      ) : (
        <>
          {words(before, 1, { left: x, width: lineX - 20, right: undefined })}
          {words(after, afterWords, { left: x + lineX + 20, width: w - lineX - 20, right: undefined })}
        </>
      )}
    </AbsoluteFill>
  );
};

// ---------- on a map ----------
// Each photo pops up beside the map, joined by a line to its own place. The map
// is drawn from Natural Earth's country outlines (world-atlas, public domain)
// and frames itself around the places given, so three photos from East Africa
// get East Africa, and a set from three continents gets the world.
const TOPO = countries110 as unknown as Topology;
const LAND = feature(TOPO, TOPO.objects.land as GeometryCollection);
const BORDERS = mesh(TOPO, TOPO.objects.countries as GeometryCollection, (a, b) => a !== b);
const COL = [0, 900, 720, 560, 420]; // widest card by how many cards share a side

export const PhotoMap: React.FC<{ beat: Extract<Beat, { kind: "map" }>; durFrames: number }> = ({ beat, durFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const photos = beat.photos;
  const n = photos.length;
  // Each card goes on the side nearer its place (most often by longitude), at most four a side, so a line never
  // has to cross the whole map. The side with more cards sets the card size.
  const leftN = useMemo(() => {
    // Half the cards on each side (the leftmost places go left), so the cards stay large enough to read
    // even when most of the places are close together and far from one outlier.
    return Math.min(4, Math.max(n - 4, Math.ceil(n / 2), n > 1 ? 1 : 0));
  }, [photos, n]);
  const perSide = Math.max(1, leftN, n - leftN);
  const top = beat.title ? 170 : 70; // where the map starts; the cards go higher, since the title sits over the map
  const CARD_TOP = 46;
  const GAP = perSide >= 4 ? 26 : 34;
  // A caption wraps onto a second line (or a third) rather than being cut off, so the strip under each photo is
  // as tall as the longest caption needs; the photo gets what is left.
  const capFs = perSide >= 3 ? 27 : 31;
  const crFs = perSide >= 3 ? 19 : 21;
  const ASPECT = 2.2; // the photo part is wide, so the caption fits on two lines and the credit gets its own line
  const hasCap = photos.some((p) => p.caption);
  const hasCredit = photos.some((p) => p.credit);
  const capFor = (lines: number) => (hasCap || hasCredit ? Math.round((hasCap ? capFs * 1.2 * lines : 0) + (hasCredit ? crFs * 1.3 + 4 : 0) + 18) : 0);
  const avail = (1080 - CARD_TOP - 46 - (perSide - 1) * GAP) / perSide;
  const sizeFor = (capHeight: number) => {
    const w = Math.min(COL[perSide], (avail - capHeight) * ASPECT);
    return { ph: Math.round(w / ASPECT), cw: Math.round(w) };
  };
  const linesAt = (width: number) => Math.min(3, Math.max(1, ...photos.map((p) => (p.caption ? Math.ceil((0.72 * capFs * p.caption.length) / (width - 28)) : 1))));
  let size = sizeFor(capFor(1));
  for (let k = 0; k < 3; k++) size = sizeFor(capFor(linesAt(size.cw)));
  const capH = capFor(linesAt(size.cw));
  const { ph, cw } = size;
  // Credit shrinks to fit the card's width rather than being cut off (Poppins' average advance).
  const fit = (text: string, ideal: number, least: number, adv: number) => Math.max(least, Math.min(ideal, Math.floor((cw - 28) / (adv * text.length))));
  const ch = ph + capH;
  const mapBox: [[number, number], [number, number]] = [
    [70 + cw + 56, top + 20],
    [1920 - 70 - cw - 56, 1080 - 70],
  ];

  const geo = useMemo(() => {
    const lons = photos.map((p) => p.lon);
    const lats = photos.map((p) => p.lat);
    const cLon = (Math.min(...lons) + Math.max(...lons)) / 2;
    const cLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    // frame the places with room around them, and never closer than a continent
    const spanLon = Math.max(64, (Math.max(...lons) - Math.min(...lons)) * 1.25);
    const spanLat = Math.max(46, (Math.max(...lats) - Math.min(...lats)) * 1.5);
    const lat0 = Math.max(-80, cLat - spanLat / 2);
    const lat1 = Math.min(84, cLat + spanLat / 2);
    const ring: [number, number][] = [];
    for (let i = 0; i <= 8; i++) ring.push([cLon - spanLon / 2 + (spanLon * i) / 8, lat0], [cLon - spanLon / 2 + (spanLon * i) / 8, lat1]);
    const projection = geoNaturalEarth1().rotate([-cLon, 0]).fitExtent(mapBox, { type: "MultiPoint", coordinates: ring });
    const path = geoPath(projection);
    const pins = photos.map((p) => projection([p.lon, p.lat]) as [number, number]);
    return { land: path(LAND) ?? "", borders: path(BORDERS) ?? "", pins };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, cw, top]);

  // The leftmost places get cards on the left, the rest on the right; down each side in the order their
  // places run down the map, so the joining lines don't cross.
  const slots = useMemo(() => {
    const byX = photos.map((_, i) => i).sort((a, b) => geo.pins[a][0] - geo.pins[b][0]);
    const out: { x: number; y: number; side: "l" | "r" }[] = [];
    (["l", "r"] as const).forEach((side) => {
      const ids = (side === "l" ? byX.slice(0, leftN) : byX.slice(leftN)).sort((a, b) => geo.pins[a][1] - geo.pins[b][1]);
      const total = ids.length * ch + (ids.length - 1) * GAP;
      const y0 = CARD_TOP + (1080 - CARD_TOP - 46 - total) / 2;
      ids.forEach((id, k) => (out[id] = { x: side === "l" ? 70 : 1920 - 70 - cw, y: y0 + k * (ch + GAP), side }));
    });
    return out;
  }, [photos, geo, n, cw, ch, top, leftN, GAP]);

  const times = arriveTimes(n, durFrames / fps, beat.revealAt, { first: 0.7, max: 1.6 });
  const mapIn = ramp(frame, 0, 0.7 * fps);
  return (
    <AbsoluteFill>
      <Field />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: mapIn }}>
        <defs>
          <radialGradient id="mapfade" cx="50%" cy="52%" r="50%">
            <stop offset="62%" stopColor="#fff" />
            <stop offset="100%" stopColor="#000" />
          </radialGradient>
          <mask id="mapmask">
            <rect x={0} y={0} width={1920} height={1080} fill="url(#mapfade)" />
          </mask>
        </defs>
        <g mask="url(#mapmask)">
          <path d={geo.land} fill="#2b5560" stroke="rgba(255,255,255,0.42)" strokeWidth={1.4} strokeLinejoin="round" />
          <path d={geo.borders} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
        </g>
        {photos.map((p, i) => {
          const t0 = times[i] * fps;
          const [px, py] = geo.pins[i];
          const s = slots[i];
          const ex = s.side === "l" ? s.x + cw + 4 : s.x - 4;
          const ey = s.y + ch / 2;
          const len = Math.hypot(ex - px, ey - py);
          const draw = ramp(frame, t0 + 0.15 * fps, 0.45 * fps, 0, 1, EASE);
          const pin = spring({ frame: frame - t0, fps, config: { damping: 11, stiffness: 160 } });
          const ring = ramp(frame, t0, 0.9 * fps);
          if (frame < t0) return null;
          return (
            <g key={p.src + i}>
              <line x1={px} y1={py} x2={ex} y2={ey} stroke="rgba(255,255,255,0.7)" strokeWidth={2} strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
              <circle cx={px} cy={py} r={10 + 34 * ring} fill="none" stroke={BRAND.accent} strokeWidth={3} opacity={1 - ring} />
              <circle cx={px} cy={py} r={11 * pin} fill={BRAND.accent} stroke="#fff" strokeWidth={3} />
            </g>
          );
        })}
      </svg>
      <Title text={beat.title} left={70 + cw} right={70 + cw} />
      {photos.map((p, i) => {
        const t0 = times[i] * fps + 0.35 * fps;
        const k = ramp(frame, t0, 0.45 * fps);
        const s = slots[i];
        return (
          <div key={p.src + i} style={{ ...CARD, borderRadius: 14, left: s.x, top: s.y, width: cw, height: ch, opacity: k, transform: `scale(${0.9 + 0.1 * k})`, transformOrigin: s.side === "l" ? "100% 50%" : "0% 50%" }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: cw, height: ph, overflow: "hidden" }}>
              {/* A wide photo fills the card; a squarer or tall one is shown whole over a blurred copy of itself,
                  so heads and Bibles are never cut off. */}
              {aspectOf(p) >= 1.3 && p.fit !== "whole" ? (
                <Fill src={p.src} style={{ objectPosition: "50% 35%" }} />
              ) : (
                <>
                  <Fill src={p.src} style={{ filter: "blur(18px) brightness(0.6)", transform: "scale(1.15)" }} />
                  <Img src={staticFile(p.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
                </>
              )}
            </div>
            {capH ? (
              <div style={{ position: "absolute", left: 0, top: ph, width: cw, height: capH, boxSizing: "border-box", padding: "0 14px", display: "flex", flexDirection: "column", justifyContent: "center", backgroundColor: "rgba(12,20,24,0.92)", textAlign: "left" }}>
                {p.caption ? <div style={{ fontFamily: FONTS.secondary, fontWeight: 600, fontSize: capFs, color: "#fff", lineHeight: 1.2, whiteSpace: "normal" }}>{p.caption}</div> : null}
                {p.credit ? <div style={{ fontFamily: FONTS.secondary, fontWeight: 500, fontSize: fit(p.credit, crFs, 12, 0.56), color: "rgba(255,255,255,0.75)", marginTop: 2, whiteSpace: "nowrap" }}>{p.credit}</div> : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
