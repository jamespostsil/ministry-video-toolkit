import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { Video } from "@remotion/media";
import { Beat, BeatPhoto } from "../lib/beatTypes";
import { BRAND, FONTS } from "../lib/theme";
import { ProjectJson, SpeakerBox, DEFAULT_SPEAKER, footageCover, useProject } from "../lib/project";
import { PhotoTurns, turnTimes } from "./PhotoLayouts";

// Two layouts that keep the person talking on screen while something else is
// shown: `beside` (the speaker in a panel on one side, a photo or words on the
// other) and `corner` (a photo fills the screen, the speaker in a small window).
//
// Both start from the live shot itself: the panel begins as the whole frame,
// exactly over the footage underneath, then shrinks into place while cropping in
// on the speaker, and grows back at the end. So the speaker never blinks out;
// they move aside. That is why these two do their own in and out (BeatEngine's
// SELF_FADING) instead of dissolving on like the photo beats.
//
// Where the speaker is comes from project.json "speaker" (a box, as fractions of
// the footage frame, around the head and shoulders that must stay in view), or
// the beat's own `speaker` when a different person is talking.

const EASE = Easing.inOut(Easing.cubic);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const MOVE = 0.7; // seconds for the panel to move aside, and to come back
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

type Rect = { left: number; top: number; width: number; height: number };

/** Where the footage sits inside a panel of pw x ph so that `box` fills it. */
const cropFor = (p: ProjectJson, box: SpeakerBox, pw: number, ph: number): Rect => {
  const fw = p.footage.width;
  const fh = p.footage.height;
  const s = Math.max(pw / (box.w * fw), ph / (box.h * fh), pw / fw, ph / fh);
  const width = fw * s;
  const height = fh * s;
  const left = Math.min(0, Math.max(pw - width, pw / 2 - (box.x + box.w / 2) * width));
  const top = Math.min(0, Math.max(ph - height, ph / 2 - (box.y + box.h / 2) * height));
  return { left, top, width, height };
};

/** How far the panel has moved aside: 0 = the whole frame, 1 = in its place. */
const useMove = (durFrames: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const m = MOVE * fps;
  return Math.min(interpolate(frame, [0, m], [0, 1], { ...clamp, easing: EASE }), interpolate(frame, [durFrames - m, durFrames], [1, 0], { ...clamp, easing: EASE }));
};

// The live footage, cropped to the speaker, in a panel that moves from the whole frame (k = 0) to `target` (k = 1).
const SpeakerPanel: React.FC<{ beat: { start: number; speaker?: SpeakerBox }; target: Rect; radius: number; k: number }> = ({ beat, target, radius, k }) => {
  const project = useProject();
  const { fps } = useVideoConfig();
  const full = footageCover(project);
  const crop = cropFor(project, beat.speaker ?? project.speaker ?? DEFAULT_SPEAKER, target.width, target.height);
  const panel: Rect = { left: lerp(0, target.left, k), top: lerp(0, target.top, k), width: lerp(project.width, target.width, k), height: lerp(project.height, target.height, k) };
  // the video's place on the screen, then relative to the panel that clips it
  const vid: Rect = {
    left: lerp(full.left, target.left + crop.left, k) - panel.left,
    top: lerp(full.top, target.top + crop.top, k) - panel.top,
    width: lerp(full.width, crop.width, k),
    height: lerp(full.height, crop.height, k),
  };
  // the same footage frame as the layer underneath: this beat's own start, on the footage's clock
  const trimBefore = Math.round((beat.start + project.titleCardSeconds) * fps) - Math.round(project.titleCardSeconds * fps);
  return (
    <div
      style={{
        position: "absolute",
        ...panel,
        overflow: "hidden",
        borderRadius: Math.min(radius, panel.height / 2) * k,
        boxShadow: `0 0 0 ${4 * k}px rgba(255,255,255,0.92), 0 30px 80px rgba(0,0,0,${0.55 * k})`,
      }}
    >
      <Video src={staticFile(project.footage.src)} muted trimBefore={trimBefore} style={{ position: "absolute", ...vid, maxWidth: "none", maxHeight: "none" }} />
    </div>
  );
};

// The panel's shape follows the speaker box, within limits, so one person gets a tall panel and two people a wide one.
const panelSize = (p: ProjectJson, box: SpeakerBox, maxW: number, maxH: number, lo: number, hi: number) => {
  const a = Math.min(hi, Math.max(lo, (box.w * p.footage.width) / (box.h * p.footage.height)));
  const height = Math.min(maxH, maxW / a);
  return { width: height * a, height };
};

// ---------- beside the speaker ----------
export const Beside: React.FC<{ beat: Extract<Beat, { kind: "beside" }>; durFrames: number }> = ({ beat, durFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const project = useProject();
  const k = useMove(durFrames);
  const box = beat.speaker ?? project.speaker ?? DEFAULT_SPEAKER;
  const M = 60;
  const GAP = 50;
  // no wider than 5:4, so a wide two-person shot is cropped in at the sides and both halves stay large
  const size = panelSize(project, box, 820, 940, 0.62, 1.25);
  const onLeft = (beat.side ?? "left") === "left";
  const photos = beat.photos ?? [];
  const lines = beat.lines ?? [];
  const capH = photos.some((p) => p.caption || p.credit) ? 92 : 0;
  // With photos, the speaker and the photo are two cells of one grid: same top, same height, caption underneath.
  const target: Rect = { left: onLeft ? M : 1920 - M - size.width, top: (1080 - size.height - capH) / 2, ...size };
  // the other side
  const cx = onLeft ? M + size.width + GAP : M;
  const cwid = 1920 - 2 * M - size.width - GAP;
  const content = interpolate(k, [0.55, 1], [0, 1], clamp);
  const dur = durFrames / fps;
  const times = turnTimes(photos.length, dur, beat.showAt).map((t) => t * fps);
  const XF = 0.5 * fps;
  const big = photos.length === 0; // words alone can be larger
  const TS = big ? 74 : 60;
  const LS = big ? 54 : 44;
  const titleH = beat.title ? TS * 1.15 + 26 : 0;
  const linesH = lines.length * LS * 1.4 + (lines.length ? 14 : 0);
  const wordsH = titleH + linesH;
  // the photo cell fills whatever the words leave of the speaker panel's height
  const cellH = Math.max(200, size.height - (wordsH ? wordsH + 30 : 0));
  const sized = (p: BeatPhoto) => {
    const a = p.width / p.height;
    // landscape and square photos fill the cell (cropped a little); a portrait is shown whole at the cell's height
    return a >= 1 ? { w: cwid, h: cellH, cover: true } : { w: Math.min(cwid, cellH * a), h: cellH, cover: false };
  };
  const y0 = photos.length ? target.top : (1080 - wordsH) / 2;
  const lineAt = (i: number) => (beat.linesAt?.[i] ?? MOVE + 0.2 + i * 0.5) * fps;
  return (
    <AbsoluteFill>
      {/* the footage underneath is already blurred and darkened by the engine; this deepens it a little for the words */}
      <AbsoluteFill style={{ backgroundColor: `rgba(6,14,18,${0.5 * k})` }} />
      <div style={{ position: "absolute", left: cx, width: cwid, top: y0, opacity: content, transform: `translateX(${(1 - content) * (onLeft ? 40 : -40)}px)` }}>
        {beat.title ? (
          <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: TS, lineHeight: 1.15, color: "#fff", marginBottom: 26, textAlign: photos.length ? "center" : "left", textShadow: "0 2px 14px rgba(0,0,0,0.7)" }}>
            {beat.title}
          </div>
        ) : null}
        {lines.map((t, i) => {
          const on = interpolate(frame, [lineAt(i), lineAt(i) + 0.45 * fps], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
          return (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 22, opacity: on, transform: `translateY(${(1 - on) * 16}px)`, fontFamily: FONTS.secondary, fontWeight: 600, fontSize: LS, lineHeight: 1.4, color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>
              <span style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: BRAND.accent, flex: "none", transform: "translateY(-6px)" }} />
              <span>{t}</span>
            </div>
          );
        })}
        {photos.length ? (
          <div style={{ position: "relative", marginTop: wordsH ? 30 : 0, height: cellH + capH }}>
            {photos.map((p, i) => {
              const from = times[i];
              const until = i + 1 < photos.length ? times[i + 1] : 1e9;
              const op = Math.min(i === 0 ? 1 : interpolate(frame, [from, from + XF], [0, 1], { ...clamp, easing: EASE }), interpolate(frame, [until, until + XF], [1, 0], { ...clamp, easing: EASE }));
              if (op <= 0) return null;
              const { w, h, cover } = sized(p);
              return (
                <div key={p.src + i} style={{ position: "absolute", left: (cwid - w) / 2, top: 0, width: w, opacity: op }}>
                  <div style={{ position: "relative", width: w, height: h, borderRadius: 18, overflow: "hidden", border: "4px solid rgba(255,255,255,0.92)", backgroundColor: "rgba(255,255,255,0.92)", boxShadow: "0 30px 80px rgba(0,0,0,0.55), 0 4px 14px rgba(0,0,0,0.4)" }}>
                    <Img
                      src={staticFile(p.src)}
                      style={{ position: "absolute", left: -1, top: -1, width: "calc(100% + 2px)", height: "calc(100% + 2px)", maxWidth: "none", maxHeight: "none", objectFit: "cover", objectPosition: cover ? "50% 35%" : "50% 50%" }}
                    />
                  </div>
                  {p.caption ? <div style={{ marginTop: 16, textAlign: "center", fontFamily: FONTS.secondary, fontWeight: 600, fontSize: 34, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>{p.caption}</div> : null}
                  {p.credit ? <div style={{ textAlign: "center", fontFamily: FONTS.secondary, fontWeight: 500, fontSize: 22, color: "rgba(255,255,255,0.72)" }}>{p.credit}</div> : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
      <SpeakerPanel beat={beat} target={target} radius={28} k={k} />
    </AbsoluteFill>
  );
};

// ---------- the speaker in a corner ----------
export const Corner: React.FC<{ beat: Extract<Beat, { kind: "corner" }>; durFrames: number }> = ({ beat, durFrames }) => {
  const project = useProject();
  const k = useMove(durFrames);
  const box = beat.speaker ?? project.speaker ?? DEFAULT_SPEAKER;
  const circle = beat.shape === "circle";
  const width = beat.size ?? (circle ? 380 : 500);
  const size = circle ? { width, height: width } : panelSize(project, box, width, width, 0.8, 1.5);
  const M = 56;
  const corner = beat.corner ?? "bottom-right";
  const target: Rect = {
    left: corner.endsWith("left") ? M : 1920 - M - size.width,
    top: corner.startsWith("top") ? M : 1080 - M - size.height,
    ...size,
  };
  return (
    <AbsoluteFill>
      {/* the photo is there from the first frame, hidden by the panel until it moves aside */}
      <PhotoTurns photos={beat.photos} durFrames={durFrames} showAt={beat.showAt} align={corner === "bottom-left" ? "right" : corner === "bottom-right" ? "left" : "center"} />
      <SpeakerPanel beat={beat} target={target} radius={circle ? width / 2 : 26} k={k} />
    </AbsoluteFill>
  );
};
