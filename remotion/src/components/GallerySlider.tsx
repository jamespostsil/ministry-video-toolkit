import React, { useMemo } from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { COLORS, FONTS } from "../lib/theme";
import { GalleryPhoto } from "./PhotoGallery";

const EASE = Easing.inOut(Easing.ease);
const TITLE_FADE = 20; // frames
const TITLE_ZONE = 210; // px reserved at the top for the title bar
const BOTTOM_MARGIN = 90; // px reserved at the bottom

// This is a Remotion port of the HyperFrames "photo-cards" skill's `slide`
// layout (videos/video-editor/.claude/skills/photo-cards, see its
// cards-3-slide-pan.mp4 demo) — the "fanning deck" look: uniform,
// cover-cropped cards laid out in a filmstrip with a lo/hi/lo vertical
// stagger, each overlapping the one before it, that the WHOLE group pans
// slowly left as one continuous glide so every card gets its turn centered.
// Deliberately keeps that original's cover-crop + overlap identity rather
// than PhotoGallery's contain-fit/no-overlap rules — that's a different skill
// with different rules, not a bug to fix. Expanded here from the original's
// 2-4 photos to however many are given (tested with 11), and captions are
// still a child of their own card (bottom-left chip — the side that never
// gets covered by the next card sliding in over it) so they can never
// detach from the photo they belong to as the strip moves.
export type GallerySliderProps = {
  title: string;
  photos: GalleryPhoto[];
  durFrames: number;
  // Card size. Bigger cards do pan faster (see the note on the defaults below),
  // but that only costs readability when there are many photos to get through.
  // At 5-6 photos the strip is slow enough that every card is on screen for
  // most of the beat at either size, so the 11-photo tuning does not apply and
  // the cards can go up to show detail in the photos themselves.
  cardWidth?: number;
  cardHeight?: number;
  // How far along the strip the pan travels, 0-1. Below 1 the last card stops
  // short of centre, which slows the whole glide for the same duration and
  // photo count. Captions are read WHILE they move, so a slower strip is easier
  // than a faster one even though every card is on screen just as long.
  panFraction?: number;
};

// Card size drives readability more than it looks like it would: for a
// FIXED total duration and a FIXED photo count, the continuous pan's speed
// is proportional to card size (it travels STEP_X px per photo either way),
// so a SMALLER card crosses the same 1920px-wide frame more slowly in real
// time, and more cards are visible at once — both make a caption easier to
// actually read before it scrolls past. Captions were reported reading too
// fast at 900x560 with 11 photos; shrunk to fit ~3 cards on screen at once
// rather than ~2, at the same overlap ratio and duration. If a future use
// has far fewer photos (where each already gets a longer turn) or a longer
// duration, these can go back up — this is tuned for "many photos, one
// modest-length beat," not a universal constant.
const STAGGER_AMP = 50; // lo/hi/lo vertical offset
const CARD_ASPECT = 1.6;

// Default card size, derived from how many photos have to get through.
// Fewer photos means a slower strip and more room, so the cards can be bigger;
// a long run needs smaller cards so more are on screen at once and each caption
// stays readable for longer. Linear between the two settings actually validated
// in use: 11 photos -> 400 tall, 5 photos -> 562 tall.
const autoCardHeight = (n: number) => Math.round(Math.min(640, Math.max(380, 562 - 27 * (n - 5))));

export const GallerySlider: React.FC<GallerySliderProps> = ({
  title,
  photos,
  durFrames,
  cardWidth,
  cardHeight,
  panFraction = 0.82,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const n = photos.length;
  const frameCenterX = width / 2;
  const CARD_H = cardHeight ?? autoCardHeight(n);
  const CARD_W = cardWidth ?? Math.round(CARD_H * CARD_ASPECT);
  const STEP_X = Math.round(CARD_W * 0.85); // overlap: each card ~15% covered by the next

  const layout = useMemo(
    () =>
      photos.map((_, i) => ({
        left: i * STEP_X,
        top: i % 2 === 0 ? -STAGGER_AMP : STAGGER_AMP,
      })),
    [photos, STEP_X]
  );

  const groupXFor = (i: number) => frameCenterX - (layout[i].left + CARD_W / 2);

  const panStart = 0.3 * fps;
  const panEnd = Math.max(panStart + 1, durFrames - 0.3 * fps);
  const panTo = groupXFor(0) + (groupXFor(n - 1) - groupXFor(0)) * panFraction;
  const groupX = interpolate(frame, [panStart, panEnd], [groupXFor(0), panTo], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  const fadeOpacity = interpolate(
    frame,
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

      {/* Plain inset div, not AbsoluteFill — AbsoluteFill's own height:100%
          fights a top+bottom inset (see PhotoGallery's fix for the exact bug
          this avoids: the box silently extends past the visible frame and
          whatever's centered inside it, e.g. a caption, can end up off-screen). */}
      <div style={{ position: "absolute", top: TITLE_ZONE, bottom: BOTTOM_MARGIN, left: 0, right: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: 0, transform: `translate(${groupX}px, -50%)` }}>
          {photos.map((photo, i) => (
            <div
              key={photo.src}
              style={{
                position: "absolute",
                left: layout[i].left,
                top: layout[i].top - CARD_H / 2,
                width: CARD_W,
                height: CARD_H,
                borderRadius: 20,
                overflow: "hidden",
                border: "4px solid rgba(255,255,255,0.92)",
                boxShadow: "0 30px 80px rgba(0,0,0,0.55), 0 4px 14px rgba(0,0,0,0.4)",
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
              {/* Bottom-LEFT, not bottom-right: the next card (drawn after,
                  so on top) always overlaps THIS card from the right —
                  left[i+1] = left[i] + STEP_X < left[i] + CARD_W — so a
                  right-anchored caption sits exactly in the strip that gets
                  covered as the next photo slides in. The left edge is never
                  covered by anything (the previous card is behind, not on
                  top), so that's the only side a caption can safely live. */}
              <div
                style={{
                  position: "absolute",
                  left: 16,
                  bottom: 16,
                  maxWidth: CARD_W - 60,
                  padding: "10px 18px",
                  borderRadius: 10,
                  backgroundColor: "rgba(0,0,0,0.78)",
                  textAlign: "left",
                }}
              >
                <div style={{ fontFamily: FONTS.secondary, fontWeight: 600, fontSize: 26, color: "#fff", lineHeight: 1.25 }}>{photo.caption}</div>
                {photo.credit ? (
                  <div style={{ fontFamily: FONTS.secondary, fontWeight: 500, fontSize: 18, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
                    {photo.credit}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
