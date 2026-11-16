import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import "../lib/fonts";
import { BRAND, FONTS } from "../lib/theme";
import { useProject } from "../lib/project";

// A standalone 1280x720 YouTube thumbnail — NOT part of the video. Render it
// as a still (see the thumbnail skill) and save it next to the finished mp4.
//
// It is built on the same still as the title card but crops it differently.
// The video crop is centred, which puts the presenters in the middle with no
// room for type. Anchoring the crop to one side (thumbnail.objectPosition,
// "0% 50%" = left edge) slides them across and frees the other side, so the
// type can be set far larger than the in-video title card allows. That matters
// because a thumbnail is often read at ~210px wide in a sidebar.
//
// The scrim fades out by 41% of the width. Check that against your own still:
// it must reach zero before the nearest face, or it tints that face.

const RING =
  "0 0 2px rgba(0,0,0,0.98), 2px 2px 0 rgba(0,0,0,0.85), -2px 2px 0 rgba(0,0,0,0.85), 2px -2px 0 rgba(0,0,0,0.85), -2px -2px 0 rgba(0,0,0,0.85), 0 2px 18px rgba(0,0,0,0.9)";

// `reveal(i)` styles the i-th piece of type (eyebrow, title, bar, byline, date) when the thumbnail opens the video
// (the opening beat's "thumbnail" style); the still leaves it out.
export const YouTubeThumbnail: React.FC<{ reveal?: (i: number) => React.CSSProperties }> = ({ reveal = () => ({}) }) => {
  const { titleStill, thumbnail } = useProject();
  return (
    <AbsoluteFill style={{ backgroundColor: "#04181a", overflow: "hidden" }}>
      {thumbnail.src ? (
        // A photo on the right, fading into a brand field on the left where the type sits.
        <>
          <AbsoluteFill style={{ background: "linear-gradient(118deg, #0b3a40 0%, #062a2e 45%, #02181b 100%)"   /* dark enough for the accent date to read */ }} />
          <Img
            src={staticFile(thumbnail.src)}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              right: 0,
              left: `${(thumbnail.photoFrom ?? 0.42) * 100}%`,
              width: `${(1 - (thumbnail.photoFrom ?? 0.42)) * 100}%`,
              height: "100%",
              maxWidth: "none",
              objectFit: "cover",
              objectPosition: thumbnail.objectPosition ?? "50% 30%",
            }}
          />
        </>
      ) : (
        <Img
          src={staticFile(titleStill)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: thumbnail.objectPosition ?? "0% 50%",
          }}
        />
      )}

      {/* Left-side scrim for type contrast, feathered to zero by 41%. */}
      <AbsoluteFill
        style={{
          background: thumbnail.src
            ? `linear-gradient(90deg, rgba(2,20,22,0) ${(thumbnail.photoFrom ?? 0.42) * 100}%, rgba(2,20,22,0.55) ${(thumbnail.photoFrom ?? 0.42) * 100 + 0.5}%, rgba(2,20,22,0) ${(thumbnail.photoFrom ?? 0.42) * 100 + 6}%)`
            : `linear-gradient(90deg, rgba(2,20,22,0.97) 0%, rgba(2,20,22,0.95) 26%, rgba(2,20,22,0.82) 33%, ${BRAND.tealDeep}80 37%, rgba(2,20,22,0) 41%)`,
        }}
      />

      <div style={{ position: "absolute", left: 46, top: 96, width: 520 }}>
        {thumbnail.eyebrow ? (
          <div
            style={{
              fontFamily: FONTS.secondary,
              fontWeight: 700,
              fontSize: 21,
              letterSpacing: "0.15em",
              textShadow: "0 0 2px rgba(0,0,0,0.98), 1px 1px 0 rgba(0,0,0,0.85), -1px 1px 0 rgba(0,0,0,0.85)",
              whiteSpace: "nowrap",
              color: "#8fdcdc",
              marginBottom: 10,
              ...reveal(0),
            }}
          >
            {thumbnail.eyebrow}
          </div>
        ) : null}

        <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: 116, lineHeight: 0.98, color: "#ffffff", textShadow: RING, ...reveal(1) }}>
          {thumbnail.titleLines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>

        <div style={{ width: 132, height: 7, backgroundColor: BRAND.accent, margin: "26px 0 20px", borderRadius: 4, ...reveal(2) }} />

        <div style={{ fontFamily: FONTS.secondary, fontWeight: 700, fontSize: 38, lineHeight: 1.25, color: "#ffffff", textShadow: RING, ...reveal(3) }}>
          {thumbnail.byline}
        </div>
        {thumbnail.date ? (
          <div
            style={{
              fontFamily: FONTS.secondary,
              fontWeight: 600,
              fontSize: 32,
              color: BRAND.accent,
              marginTop: 4,
              textShadow: "0 0 2px rgba(0,0,0,0.98), 1.5px 1.5px 0 rgba(0,0,0,0.85), -1.5px 1.5px 0 rgba(0,0,0,0.85)",
              ...reveal(4),
            }}
          >
            {thumbnail.date}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
