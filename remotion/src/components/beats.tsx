import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { Beat } from "../lib/beatTypes";
import { BRAND, COLORS, FONTS } from "../lib/theme";
import { useProject } from "../lib/project";
import { GallerySlider } from "./GallerySlider";
import { GalleryScatter } from "./GalleryScatter";
import { Heading, Compare, ThankYou } from "./overlays";
import { PartnerFrame } from "./PartnerFrame";
const EASE_OUT = Easing.out(Easing.cubic);

const kenBurns = (frame: number, durFrames: number, from: number, to: number) =>
  interpolate(frame, [0, durFrames], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// The dark, brand-tinted field the photo beats sit on, shared with
// GallerySlider/GalleryScatter so every graphic beat reads as one set.
const Field: React.FC = () => (
  <>
    <AbsoluteFill style={{ backgroundColor: "#0a1216" }} />
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 30%, ${COLORS.ink}66 0%, #0a1216 70%)` }} />
  </>
);

// ---------- opening title card ----------
// Deliberately NOT Ken-Burnsed: this still is the footage's own first frame, so
// holding it dead steady means the cut to live footage changes nothing but the
// scrim and type fading away — the picture appears to simply start moving.
// Type sits in the lower third because both faces live in the upper-middle of
// this framing; a centred title would land straight across them.
const Opening: React.FC<{ beat: Extract<Beat, { kind: "opening" }>; durFrames: number }> = ({ beat, durFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { titleCard } = useProject();

  // Only the scrim and the type fade out — the still itself holds at full
  // opacity right up to the cut. Because this still IS the footage's own first
  // frame, the handover then changes nothing but the text disappearing, and the
  // picture appears to simply start moving. Letting the whole layer fade out
  // (the default) dipped to black for 0.6s first, since the footage layer has
  // not started yet underneath — which broke exactly that effect.
  const OUT = 0.7 * fps;
  const furniture = interpolate(frame, [durFrames - OUT, durFrames - 0.08 * fps], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });

  const rise = (delay: number) => ({
    opacity: interpolate(frame, [delay * fps, (delay + 0.55) * fps], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: EASE_OUT,
    }),
    transform: `translateY(${interpolate(frame, [delay * fps, (delay + 0.55) * fps], [16, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: EASE_OUT,
    })}px)`,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <Img src={staticFile(beat.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      {/* Teal-tinted bottom scrim — picks up the closing frame's brand colour
          so the two bookends belong to each other. Kept low and light: an
          earlier, heavier version reached up past the presenters' shoulders
          and crushed dark clothing to black, which read as gloomy, not dim. */}
      <AbsoluteFill
        style={{
          opacity: furniture,
          background: `linear-gradient(180deg, rgba(0,0,0,0) 50%, ${BRAND.tealDeep}3d 64%, rgba(3,24,26,0.78) 84%, rgba(2,18,20,0.92) 100%)`,
        }}
      />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 84, textAlign: "center", opacity: furniture }}>
        <div
          style={{
            ...rise(0.2),
            fontFamily: FONTS.secondary,
            fontWeight: 600,
            fontSize: 27,
            letterSpacing: "0.26em",
            color: "#c6eaea", // a step brighter than tealLight — at this size, over foliage, the darker tint went faint
            textShadow: "0 0 2px rgba(0,0,0,0.98), 2px 2px 0 rgba(0,0,0,0.85), -2px 2px 0 rgba(0,0,0,0.85), 2px -2px 0 rgba(0,0,0,0.85), -2px -2px 0 rgba(0,0,0,0.85), 0 2px 18px rgba(0,0,0,0.9)",
          }}
        >
          {titleCard.eyebrow ?? ""}
        </div>
        <div
          style={{
            ...rise(0.42),
            fontFamily: FONTS.display,
            fontWeight: 700,
            fontSize: 96,
            lineHeight: 1.12,
            color: "#ffffff",
            marginTop: 14,
            textShadow: "0 0 2px rgba(0,0,0,0.98), 2px 2px 0 rgba(0,0,0,0.85), -2px 2px 0 rgba(0,0,0,0.85), 2px -2px 0 rgba(0,0,0,0.85), -2px -2px 0 rgba(0,0,0,0.85), 0 2px 18px rgba(0,0,0,0.9)",
          }}
        >
          {titleCard.title}
        </div>
        <div style={{ ...rise(0.62), width: 110, height: 3, backgroundColor: BRAND.accent, margin: "22px auto 0", borderRadius: 2 }} />
        <div
          style={{
            ...rise(0.78),
            fontFamily: FONTS.secondary,
            fontWeight: 600,
            fontSize: 38,
            color: "#ffffff",
            marginTop: 22,
            textShadow: "0 0 2px rgba(0,0,0,0.98), 2px 2px 0 rgba(0,0,0,0.85), -2px 2px 0 rgba(0,0,0,0.85), 2px -2px 0 rgba(0,0,0,0.85), -2px -2px 0 rgba(0,0,0,0.85), 0 2px 18px rgba(0,0,0,0.9)",
          }}
        >
          {titleCard.byline}
          {titleCard.date ? <span style={{ color: BRAND.tealLight, fontWeight: 500 }}>{`   ·   ${titleCard.date}`}</span> : null}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- full-bleed landscape photo ----------
const Cover: React.FC<{ beat: Extract<Beat, { kind: "cover" }>; durFrames: number }> = ({ beat, durFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = kenBurns(frame, durFrames, 1.02, 1.07);
  const capOpacity = interpolate(frame, [0.5 * fps, 1.1 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {/* The zoom lives on a wrapper that is exactly frame-sized, with the image
          filling it at 100%/100%. An earlier version put a negative inset and
          106% size on the <Img> itself and left a 32px black strip down the
          right edge of every frame — over-constrained absolute positioning.
          Starting the scale just above 1 also guarantees no subpixel seam. */}
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        <Img
          src={staticFile(beat.src)}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: beat.objectPosition ?? "50% 50%",
          }}
        />
      </AbsoluteFill>
      {beat.caption ? (
        <>
          <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 72%, rgba(0,0,0,0.72) 100%)" }} />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 44,
              textAlign: "center",
              opacity: capOpacity,
              fontFamily: FONTS.secondary,
              fontWeight: 600,
              fontSize: 40,
              color: "#fff",
              textShadow: "0 0 2px rgba(0,0,0,0.98), 2px 2px 0 rgba(0,0,0,0.85), -2px 2px 0 rgba(0,0,0,0.85), 2px -2px 0 rgba(0,0,0,0.85), -2px -2px 0 rgba(0,0,0,0.85), 0 2px 18px rgba(0,0,0,0.9)",
            }}
          >
            {beat.caption}
          </div>
        </>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------- one photo shown whole over a blurred copy of itself ----------
// For portraits and typeset cards (the memorial tribute) where a 16:9
// full-bleed crop would cut off faces or text.
const BlurBackdrop: React.FC<{ beat: Extract<Beat, { kind: "blur" }>; durFrames: number }> = ({ beat, durFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bdScale = kenBurns(frame, durFrames, 1.15, 1.22);
  const fgIn = interpolate(frame, [0.12 * fps, 0.7 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });
  const fgScaleIn = interpolate(frame, [0.12 * fps, 0.7 * fps], [0.94, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });
  const fgScaleHold = kenBurns(frame - 0.7 * fps, durFrames - 0.7 * fps, 1.0, 1.05);
  const capOpacity = interpolate(frame, [0.5 * fps, 1.1 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });
  const src = staticFile(beat.src);
  // With a caption, the photo is set a little smaller and higher, so the
  // caption fits beneath it even at the end of the slow push-in (1.05x).
  const photoH = beat.caption ? "78%" : "86%";
  const photoTop = beat.caption ? "45%" : "50%";
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <Img src={src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: `scale(${bdScale})`, filter: "blur(40px) brightness(0.5)" }} />
      <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.18)" }} />
      {beat.caption ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 40,
            textAlign: "center",
            opacity: capOpacity * fgIn,
            fontFamily: FONTS.secondary,
            fontWeight: 600,
            fontSize: 40,
            color: "#fff",
            textShadow:
              "0 0 2px rgba(0,0,0,0.98), 2px 2px 0 rgba(0,0,0,0.85), -2px 2px 0 rgba(0,0,0,0.85), 2px -2px 0 rgba(0,0,0,0.85), -2px -2px 0 rgba(0,0,0,0.85), 0 2px 18px rgba(0,0,0,0.9)",
          }}
        >
          {beat.caption}
        </div>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: photoTop,
          height: photoH,
          transform: `translate(-50%, -50%) scale(${fgIn < 1 ? fgScaleIn : fgScaleHold})`,
          opacity: fgIn,
          borderRadius: 18,
          overflow: "hidden",
          border: "3px solid rgba(255,255,255,0.9)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.55), 0 4px 14px rgba(0,0,0,0.4)",
          // Card colour = border colour, and the photo overfills by 1px: while the
          // card scales in, its edge lands on fractional pixels and the rasteriser
          // leaves a hairline of whatever is behind the photo (same fix as
          // GalleryScatter/GallerySlider; see beat-library "Card borders").
          backgroundColor: "rgba(255,255,255,0.9)",
        }}
      >
        <Img src={src} style={{ display: "block", height: "calc(100% + 2px)", width: "auto", margin: -1, maxWidth: "none", maxHeight: "none" }} />
      </div>
    </AbsoluteFill>
  );
};

// ---------- a row of photos, each at its own true aspect ratio ----------
// An earlier "cards" row forced every photo into one fixed 2:3 card and
// cover-cropped it, which is fine when the whole set is portrait but wrecks a
// mixed set (a 16:9 family photo next to a 4:3 one) and would chop the phone
// screenshots used here. Instead every card shares a HEIGHT and takes whatever
// width its own aspect asks for, so nothing is ever cropped.
const Row: React.FC<{ beat: Extract<Beat, { kind: "row" }>; durFrames: number }> = ({ beat, durFrames }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const photos = beat.photos;
  const n = photos.length;
  const GAP = 60;
  const MAX_W = 1800;

  const hasCaption = photos.some((p) => p.caption);
  const captionSpace = hasCaption ? 62 : 0;

  const sumAspect = photos.reduce((s, p) => s + p.width / p.height, 0);
  const h = Math.min(beat.maxHeight, (MAX_W - GAP * (n - 1)) / sumAspect);
  const widths = photos.map((p) => (p.width / p.height) * h);
  const totalW = widths.reduce((a, b) => a + b, 0) + GAP * (n - 1);

  let x = (width - totalW) / 2;
  const lefts = widths.map((wd) => {
    const at = x;
    x += wd + GAP;
    return at;
  });

  const interval = Math.min(0.42, Math.max(0.16, (durFrames / fps - 1.4) / n));

  return (
    <AbsoluteFill>
      <Field />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: h + captionSpace,
          transform: `translateY(-${(h + captionSpace) / 2}px)`,
        }}
      >
        {photos.map((p, i) => {
          const t0 = (0.15 + i * interval) * fps;
          const op = interpolate(frame, [t0, t0 + 0.5 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });
          const y = interpolate(frame, [t0, t0 + 0.5 * fps], [26, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });
          const sc = interpolate(frame, [t0, t0 + 0.5 * fps], [0.93, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });
          return (
            <div key={p.src} style={{ position: "absolute", left: lefts[i], top: 0, width: widths[i], opacity: op, transform: `translateY(${y}px) scale(${sc})` }}>
              <div
                style={{
                  width: widths[i],
                  height: h,
                  borderRadius: 18,
                  overflow: "hidden",
                  border: "4px solid rgba(255,255,255,0.92)",
                  boxShadow: "0 30px 80px rgba(0,0,0,0.55), 0 4px 14px rgba(0,0,0,0.4)",
                  // Card colour = border colour (was #0d1a20) and a 1px overfill, so the
                  // scale-in never shows a dark hairline inside the white border
                  // (same fix as GalleryScatter/GallerySlider).
                  backgroundColor: "rgba(255,255,255,0.92)",
                  position: "relative",
                }}
              >
                <Img
                  src={staticFile(p.src)}
                  style={{ position: "absolute", left: -1, top: -1, width: "calc(100% + 2px)", height: "calc(100% + 2px)", maxWidth: "none", maxHeight: "none", objectFit: "cover" }}
                />
              </div>
              {p.caption ? (
                <div
                  style={{
                    marginTop: 18,
                    textAlign: "center",
                    fontFamily: FONTS.secondary,
                    fontWeight: 600,
                    fontSize: 34,
                    color: "#fff",
                    textShadow: "0 2px 8px rgba(0,0,0,0.6)",
                  }}
                >
                  {p.caption}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- call-to-action over the live shot ----------
// Words in the upper-left, with the shadow behind THEM only — the presenters
// stay untouched and sharp, as long as the project's overlaySafeArea was
// measured on its own footage.
// The call-to-action is an upper-left overlay like the section headings, so it
// uses the same left margin and the same padding rule (see overlays.tsx): the
// scrim is blurred, so the padding you want in SOLID backing has to have the
// blur radius added to it. It starts higher up the frame than a heading because
// it is a three-line block, and padded at the headings' TEXT_Y it would run its
// panel past the default safe area's bottom edge and over whoever is below.
const CTA_PAD_X = 60 + 26;
const CTA_PAD_Y = 44 + 26;
const CTA_TEXT_X = 116;
// Real line boxes, plus the last line's descender — the same shortfall that hit
// the headings in overlays.tsx. "Become a monthly partner!" has a 'y' and a 'p'
// whose ink drops below the box the panel was sized from.
const CTA_HEADING_H = 58 * 1.2 + 26;
const CTA_BLOCK_H = CTA_HEADING_H + 50 * 1.2 + 14 + 66 * 1.15 + 66 * 0.22;
const CTA_TEXT_Y = 96;

const CallToAction: React.FC<{ beat: Extract<Beat, { kind: "quote" }>; durFrames: number }> = ({ beat, durFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inOut = Math.min(
    interpolate(frame, [0, 0.55 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT }),
    interpolate(frame, [durFrames - 0.5 * fps, durFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT })
  );
  const rise = (delay: number) =>
    interpolate(frame, [delay * fps, (delay + 0.5) * fps], [22, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: EASE_OUT,
    });
  const lineIn = (delay: number) =>
    interpolate(frame, [delay * fps, (delay + 0.5) * fps], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: EASE_OUT,
    });
  // When this beat carries a heading, it opens as the section label and the ask
  // lands underneath it later, so the two never blink out and back in.
  const lead = beat.heading ? beat.linesAt ?? 0 : 0;

  return (
    <AbsoluteFill style={{ opacity: inOut }}>
      <div
        style={{
          // Sized to the type box (see overlays.tsx TypeScrim for why a
          // centred ellipse fails), and taller when a heading sits above the ask.
          position: "absolute",
          // Same left margin and padding as the section headings in
          // overlays.tsx: CTA_TEXT_X - CTA_PAD_X. The type is inset far enough
          // that no glyph sits on the blurred edge of the panel.
          left: CTA_TEXT_X - CTA_PAD_X,
          top: CTA_TEXT_Y - CTA_PAD_Y,
          width: 930,
          // Grows as the ask arrives, so the heading does not sit alone under a
          // panel sized for text that is still nine seconds away.
          height: beat.heading
            ? interpolate(frame, [lead * fps, (lead + 0.5) * fps], [CTA_HEADING_H + 2 * CTA_PAD_Y, CTA_BLOCK_H + 2 * CTA_PAD_Y], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: EASE_OUT,
              })
            : CTA_BLOCK_H - CTA_HEADING_H + 2 * CTA_PAD_Y,
          borderRadius: 48,
          backgroundColor: "rgba(0,0,0,0.60)",
          filter: "blur(26px)",
        }}
      />
      <div style={{ position: "absolute", left: CTA_TEXT_X, top: CTA_TEXT_Y, width: 800 }}>
        {beat.heading ? (
          <div
            style={{
              opacity: lineIn(0),
              transform: `translateY(${rise(0)}px)`,
              marginBottom: 26,
              fontFamily: FONTS.display,
              fontWeight: 700,
              fontSize: 58,
              color: "#ffffff",
              textShadow: "0 0 2px rgba(0,0,0,0.98), 2px 2px 0 rgba(0,0,0,0.85), -2px 2px 0 rgba(0,0,0,0.85), 2px -2px 0 rgba(0,0,0,0.85), -2px -2px 0 rgba(0,0,0,0.85), 0 2px 18px rgba(0,0,0,0.9)",
            }}
          >
            {beat.heading}
          </div>
        ) : null}
        <div
          style={{
            opacity: lineIn(lead),
            transform: `translateY(${rise(lead)}px)`,
            fontFamily: FONTS.display,
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: 50,
            color: "#ffffff",
            textShadow: "0 0 2px rgba(0,0,0,0.98), 2px 2px 0 rgba(0,0,0,0.85), -2px 2px 0 rgba(0,0,0,0.85), 2px -2px 0 rgba(0,0,0,0.85), -2px -2px 0 rgba(0,0,0,0.85), 0 2px 18px rgba(0,0,0,0.9)",
          }}
        >
          {beat.lines[0]}
        </div>
        <div
          style={{
            opacity: lineIn(lead + 0.28),
            transform: `translateY(${rise(lead + 0.28)}px)`,
            marginTop: 14,
            fontFamily: FONTS.display,
            fontWeight: 700,
            fontSize: 66,
            lineHeight: 1.15,
            color: BRAND.accent,
            textShadow: "0 0 2px rgba(0,0,0,0.98), 2px 2px 0 rgba(0,0,0,0.85), -2px 2px 0 rgba(0,0,0,0.85), 2px -2px 0 rgba(0,0,0,0.85), -2px -2px 0 rgba(0,0,0,0.85), 0 2px 18px rgba(0,0,0,0.9)",
          }}
        >
          {beat.lines[1]}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- closing slide (finished PNG, shown as-is) ----------
const Ending: React.FC<{ beat: Extract<Beat, { kind: "ending" }> }> = ({ beat }) => <PartnerFrame {...beat.partner} />;

export const BeatContent: React.FC<{ beat: Beat; durFrames: number }> = ({ beat, durFrames }) => {
  switch (beat.kind) {
    case "opening":
      return <Opening beat={beat} durFrames={durFrames} />;
    case "cover":
      return <Cover beat={beat} durFrames={durFrames} />;
    case "blur":
      return <BlurBackdrop beat={beat} durFrames={durFrames} />;
    case "row":
      return <Row beat={beat} durFrames={durFrames} />;
    case "slider":
      return (
        <GallerySlider
          title={beat.title}
          photos={beat.photos}
          durFrames={durFrames}
          cardWidth={beat.cardWidth}
          cardHeight={beat.cardHeight}
        />
      );
    case "scatter":
      return <GalleryScatter title={beat.title} photos={beat.photos} durFrames={durFrames} cardLongEdge={beat.cardLongEdge} revealAt={beat.revealAt} />;
    case "quote":
      return <CallToAction beat={beat} durFrames={durFrames} />;
    case "heading":
      return <Heading beat={beat} durFrames={durFrames} />;
    case "compare":
      return <Compare beat={beat} durFrames={durFrames} />;
    case "thankyou":
      return <ThankYou beat={beat} durFrames={durFrames} />;
    case "ending":
      return <Ending beat={beat} />;
  }
};
