import React from "react";
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame, Easing } from "remotion";
import { COLORS, FONTS } from "../lib/theme";

const EASE_OUT = Easing.out(Easing.cubic);

export type GalleryPhoto = {
  src: string; // staticFile-relative path, e.g. "images/my-video/photo-1.jpg"
  caption: string; // fully-formed, e.g. "New Testament - Language, Country" — this
  // component just renders whatever string it's given. Deciding WHAT a caption
  // should say (scripture-dedication labels here, something else entirely for a
  // future video) is the caller's job, in that video's own data file — keeps this
  // component reusable across subject matter, not just this one use case.
  credit?: string; // small optional photo credit, e.g. "Photo by Chris Gilmore"
  // Real pixel dimensions — optional here (PhotoGallery/GallerySlider don't
  // need them), but GalleryScatter reads them to size each card to the
  // photo's own true aspect ratio rather than assuming one.
  width?: number;
  height?: number;
};

export type PhotoGalleryProps = {
  title: string;
  photos: GalleryPhoto[];
  durFrames: number; // total time budget for the whole gallery — set by whatever
  // portion of the script/timeline this is placed into. Photos are paced evenly
  // within it; there is no fixed per-photo duration baked into the component.
};

const TITLE_FADE = 20; // frames
const TITLE_ZONE = 210; // px reserved at the top for the title bar
const BOTTOM_MARGIN = 50; // px reserved at the bottom

// One photo, fully visible (never cropped — sizes vary, so it's fit inside a
// fixed "frame" rather than cover-cropped) for its own share of the total time.
// Deliberately NOT crossfaded with its neighbor: each slide's window fades
// fully in, holds, fades fully out, and only THEN does the next slide's window
// begin — so there is never a moment where two photos are both partially
// visible on screen at once (unlike the stacked/overlapping "cards" pattern
// this is meant to replace for a longer, one-at-a-time sequence).
const GallerySlide: React.FC<{ photo: GalleryPhoto; durationInFrames: number }> = ({ photo, durationInFrames }) => {
  const frame = useCurrentFrame();
  const cf = Math.min(15, Math.floor(durationInFrames / 4));
  const opacity = interpolate(
    frame,
    [0, cf, durationInFrames - cf, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT }
  );
  const scale = interpolate(frame, [0, cf], [0.96, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });

  return (
    // A plain positioned div, NOT <AbsoluteFill> — AbsoluteFill sets its own
    // height:100%/width:100%, which fought with a top+bottom inset (top took
    // effect, bottom didn't, so the box silently extended 210px past the
    // visible frame and the flex-centered content — including the caption —
    // was centered inside that oversized, partly-offscreen box). Confirmed by
    // pixel-sampling an actual render: the card ran to y=1040 with nothing
    // below it, no caption anywhere on screen. Plain inset positioning doesn't
    // have that conflict.
    <div style={{ position: "absolute", top: TITLE_ZONE, bottom: BOTTOM_MARGIN, left: 0, right: 0, opacity, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${scale})`, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Sized to each photo's own aspect ratio (capped by maxWidth/maxHeight)
            rather than forced into one fixed box — a fixed box either crops
            (against the "fully visible" requirement) or, for photos with a
            different aspect ratio than the box, leaves bare letterboxing bars
            inside the border. Letting the image itself size intrinsically
            means the border always hugs the actual photo.
            The border lives on a wrapper whose background matches it, never on
            the <Img> itself: while the slide scales in, the photo's edge lands on
            fractional pixels and a border on the image leaves a dark hairline
            between photo and border (same fix as GalleryScatter/GallerySlider). */}
        <div
          style={{
            borderRadius: 20,
            border: "4px solid rgba(255,255,255,0.92)",
            boxShadow: "0 30px 80px rgba(0,0,0,0.55), 0 4px 14px rgba(0,0,0,0.4)",
            backgroundColor: "rgba(255,255,255,0.92)",
            overflow: "hidden",
            lineHeight: 0,
          }}
        >
          <Img
            src={staticFile(photo.src)}
            style={{ maxWidth: 1492, maxHeight: 672, width: "auto", height: "auto", display: "block", borderRadius: 16 }}
          />
        </div>
        <div style={{ marginTop: 34, textAlign: "center" }}>
          <div style={{ fontFamily: FONTS.secondary, fontWeight: 600, fontSize: 42, color: "#ffffff", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
            {photo.caption}
          </div>
          {photo.credit ? (
            <div style={{ marginTop: 8, fontFamily: FONTS.secondary, fontWeight: 500, fontSize: 22, color: "rgba(255,255,255,0.6)" }}>{photo.credit}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ title, photos, durFrames }) => {
  const frame = useCurrentFrame();
  const n = photos.length;
  const perPhoto = Math.floor(durFrames / n);

  const titleOpacity = interpolate(
    frame,
    [0, TITLE_FADE, durFrames - TITLE_FADE, durFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a1216" }}>
      {/* subtle brand-tinted vignette instead of flat black — keeps it feeling
          like part of the same channel rather than a generic dark screen */}
      <AbsoluteFill
        style={{ background: `radial-gradient(120% 90% at 50% 30%, ${COLORS.ink}66 0%, #0a1216 70%)` }}
      />

      <div style={{ position: "absolute", top: 64, left: 0, width: "100%", textAlign: "center", opacity: titleOpacity }}>
        <div style={{ width: 90, height: 3, backgroundColor: COLORS.accentSoft, margin: "0 auto 20px", borderRadius: 2 }} />
        <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: 58, color: "#fff" }}>{title}</div>
      </div>

      {photos.map((photo, i) => (
        <Sequence key={photo.src} from={i * perPhoto} durationInFrames={i === n - 1 ? durFrames - i * perPhoto : perPhoto} layout="none">
          <GallerySlide photo={photo} durationInFrames={i === n - 1 ? durFrames - i * perPhoto : perPhoto} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
