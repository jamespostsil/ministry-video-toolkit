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

export const YouTubeThumbnail: React.FC = () => {
  const { titleStill, thumbnail } = useProject();
  return (
    <AbsoluteFill style={{ backgroundColor: "#04181a", overflow: "hidden" }}>
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

      {/* Left-side scrim for type contrast, feathered to zero by 41%. */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(90deg, rgba(2,20,22,0.97) 0%, rgba(2,20,22,0.95) 26%, rgba(2,20,22,0.82) 33%, ${BRAND.tealDeep}80 37%, rgba(2,20,22,0) 41%)`,
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
            }}
          >
            {thumbnail.eyebrow}
          </div>
        ) : null}

        <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: 116, lineHeight: 0.98, color: "#ffffff", textShadow: RING }}>
          {thumbnail.titleLines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>

        <div style={{ width: 132, height: 7, backgroundColor: BRAND.accent, margin: "26px 0 20px", borderRadius: 4 }} />

        <div style={{ fontFamily: FONTS.secondary, fontWeight: 700, fontSize: 38, lineHeight: 1.25, color: "#ffffff", textShadow: RING }}>
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
            }}
          >
            {thumbnail.date}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
