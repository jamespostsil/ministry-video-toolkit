import React from "react";
import { AbsoluteFill, Img, staticFile, interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { BRAND, FONTS } from "../lib/theme";

// A closing frame that says who the video is from and how to reach them:
// photo, name, web address, and (optionally) a QR code to the same address.
//
// Everything here is a prop. Nothing about any particular person lives in this
// file — a project supplies its own PARTNER config and gets its own end frame.

// ---------------------------------------------------------------- props

/** A crop taken in the SOURCE image's own pixels, the way you would measure it
 *  in an image viewer. Omit it to use the whole photo. */
export type PhotoCrop = { x: number; y: number; width: number; height: number };

export type PartnerFrameProps = {
  /** Path under public/, e.g. "ministry2026/endframe/image.png" */
  photo: string;
  /** Source pixel size of that photo — needed to turn the crop into a transform. */
  photoSize: { width: number; height: number };
  photoCrop?: PhotoCrop;
  name: string;
  web: string;
  /** Path under public/. Omit for a frame with no QR code. */
  qr?: string;
  /** The middle column. Keep it to three or four short words per line. */
  headline?: string;
  /** Path under public/ to a transparent-background wordmark. */
  logo?: string;
  /** Path under public/ to a full-bleed background image. Without one the
   *  frame draws its own gradient field. */
  background?: string;
  /** Seconds of fade-in. Defaults to 0: when this is the closing beat of a
   *  video the beat engine is already crossfading into it, and a second fade
   *  on top of that reads as a stutter. Set it only for standalone use. */
  fadeInSeconds?: number;
};

// ---------------------------------------------------------------- layout
//
// Geometry carried over from the slide this replaces, so the QR lands at the
// same on-screen size (564px, 29% of frame width) — it was already proven
// scannable from a compressed 1080p render at that size, and shrinking a QR is
// the fastest way to break a frame that used to work.
// The photo card's aspect matches the crop below it, so the crop is never
// re-cropped a second time by the cover fit. Its bottom lines up with the QR
// card's, which is what keeps the two caption lines on one baseline.
//
// Its outer margin matches the QR's, so the two columns sit symmetrically.
const PHOTO = { left: 150, top: 167, width: 454, height: 588 };
const QR = { left: 1206, top: 191, size: 564 };
// Air either side of the middle column. Matched to the slide this replaces,
// which gave its headline ~85px of margin on each side; a headline run out to
// the full width of the gap reads as cramped next to two framed cards.
const MID_GUTTER = 92;
const PAD = 22; // white quiet-zone padding around the QR image
const VIDEO_WIDTH = 1920;

// Average glyph advance as a fraction of the font size, MEASURED off a render
// of each family at weight 700 rather than estimated. Only used to shrink a
// line that would otherwise run past the frame edge: a 21-character web address
// at 66px did exactly that and was cropped mid-word, which is the worst thing
// that can happen to the one line a viewer may have to type by hand.
const ADVANCE = { display: 0.44, secondary: 0.61 } as const;

// Nothing gets closer than this to the frame edge.
const EDGE = 60;

const fitSize = (text: string, maxWidth: number, ideal: number, family: keyof typeof ADVANCE) =>
  Math.min(ideal, Math.floor(maxWidth / (ADVANCE[family] * Math.max(1, text.length))));

// A tight dark ring around every glyph, plus a soft glow. Over a photographic
// background nothing can be assumed about what is behind any one letter, so
// each letter carries its own contrast rather than relying on the backing.
const SHADOW =
  "0 0 2px rgba(0,0,0,0.98), 2px 2px 0 rgba(0,0,0,0.85), -2px 2px 0 rgba(0,0,0,0.85), 2px -2px 0 rgba(0,0,0,0.85), -2px -2px 0 rgba(0,0,0,0.85), 0 2px 18px rgba(0,0,0,0.9)";

export const PartnerFrame: React.FC<PartnerFrameProps> = ({
  photo,
  photoSize,
  photoCrop,
  name,
  web,
  qr,
  headline,
  logo,
  background,
  fadeInSeconds = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade =
    fadeInSeconds <= 0
      ? 1
      : interpolate(frame, [0, fadeInSeconds * fps], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        });

  // The name and the web address sit on one line across the frame, but they are
  // sized independently, each to its own column. Forcing one font size on both
  // would drag the name down to whatever a long web address allows — and it
  // would not even look more even, because the two families have different
  // cap-heights. Alegreya at 65 and Poppins at 58 measure within a pixel of
  // each other on the capitals, which is what the eye actually compares.
  const nameCentre = PHOTO.left + PHOTO.width / 2;
  const webCentre = QR.left + QR.size / 2;
  const IDEAL = 66;
  const nameSize = fitSize(name, 2 * (nameCentre - EDGE), IDEAL, "display");
  const webSize = fitSize(web, 2 * (VIDEO_WIDTH - webCentre - EDGE), IDEAL, "secondary");

  // Turn the source-pixel crop into a scale-and-offset on the <Img>. Using
  // "cover" arithmetic rather than an exact fit means a crop whose aspect does
  // not quite match the card still fills it instead of letterboxing.
  //
  // maxWidth/maxHeight "none" are LOAD-BEARING. Tailwind's preflight sets
  //   img, video { max-width: 100%; height: auto; }
  // which silently clamps any image deliberately sized larger than its
  // container — exactly what a crop-by-overflow does. The inline width loses to
  // max-width while the inline height still wins, so the photo came out
  // horizontally squashed AND short of the card's right edge, leaving a strip of
  // background showing. It looked like a bad crop, so it got "fixed" twice as a
  // crop before anyone measured it.
  const crop = photoCrop ?? { x: 0, y: 0, ...photoSize };
  const scale = Math.max(PHOTO.width / crop.width, PHOTO.height / crop.height);
  const photoStyle: React.CSSProperties = {
    position: "absolute",
    maxWidth: "none",
    maxHeight: "none",
    width: photoSize.width * scale,
    height: photoSize.height * scale,
    left: -crop.x * scale + (PHOTO.width - crop.width * scale) / 2,
    top: -crop.y * scale + (PHOTO.height - crop.height * scale) / 2,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#02181b" }}>
      {background ? <PhotoBackground src={background} /> : <GeneratedBackground />}
      <AbsoluteFill style={{ opacity: fade }}>
        {/* ---- photo, cropped to the faces ---- */}
        <div
          style={{
            position: "absolute",
            ...PHOTO,
            borderRadius: 26,
            overflow: "hidden",
            boxShadow: `0 26px 60px rgba(0,0,0,0.55), 0 0 0 5px ${BRAND.accent}, 0 0 0 5px rgba(255,255,255,0.05)`,
          }}
        >
          <Img src={staticFile(photo)} style={photoStyle} />
        </div>
        <div
          style={{
            position: "absolute",
            // Centred on the photo card, in a box wide enough that a long name
            // at this size still sits on one line.
            left: EDGE,
            top: PHOTO.top + PHOTO.height + 36,
            width: 2 * (nameCentre - EDGE),
            textAlign: "center",
            fontFamily: FONTS.display,
            fontWeight: 700,
            fontSize: nameSize,
            color: "#ffffff",
            textShadow: SHADOW,
          }}
        >
          {name}
        </div>

        {/* ---- middle column ---- */}
        {headline ? (
          <div
            style={{
              position: "absolute",
              // Set large, in a narrow measure, so it breaks into short lines
              // and reads as a statement rather than as a caption.
              left: PHOTO.left + PHOTO.width + MID_GUTTER,
              top: 258,
              width: QR.left - (PHOTO.left + PHOTO.width) - 2 * MID_GUTTER,
              textAlign: "center",
              fontFamily: FONTS.display,
              fontWeight: 700,
              fontSize: 84,
              lineHeight: 1.2,
              color: "#ffffff",
              textShadow: SHADOW,
            }}
          >
            {headline}
          </div>
        ) : null}

        {/* ---- QR ---- */}
        {qr ? (
          <div
            style={{
              position: "absolute",
              left: QR.left,
              top: QR.top,
              width: QR.size,
              height: QR.size,
              borderRadius: 22,
              backgroundColor: "#ffffff",
              padding: PAD,
              boxSizing: "border-box",
              boxShadow: "0 26px 60px rgba(0,0,0,0.5)",
            }}
          >
            <Img src={staticFile(qr)} style={{ width: "100%", height: "100%", display: "block" }} />
          </div>
        ) : null}
        <div
          style={{
            position: "absolute",
            // Same size as the name opposite it — the two sit on one line
            // across the frame, and different sizes there read as a mistake.
            left: 2 * webCentre - VIDEO_WIDTH + EDGE,
            top: QR.top + QR.size + 36,
            width: 2 * (VIDEO_WIDTH - webCentre - EDGE),
            textAlign: "center",
            fontFamily: FONTS.secondary,
            fontWeight: 700,
            fontSize: webSize,
            color: BRAND.accent,
            textShadow: SHADOW,
          }}
        >
          {web}
        </div>

        {logo ? (
          <Img
            src={staticFile(logo)}
            style={{ position: "absolute", right: 64, bottom: 48, width: 320, opacity: 0.95 }}
          />
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- background
//
// A supplied photograph, full-bleed, under a scrim.
//
// The scrim is not decoration, but it is deliberately light. Measured on the
// Bible background the script supplies, white type clears 6.3:1 against the
// brightest backing it touches — fine — but the accent teal only manages
// 2.55:1, because the accent and the image's own tint are nearly the same hue
// AND the same brightness. That is below the 3:1 floor for large text.
//
// 0.34 is the number that takes the accent to ~4.5:1 and no further. A first
// pass used 0.58 and, together with a heavy vignette, all but erased the
// photograph — which defeats the point of supplying one. The glyph ring above
// is what actually guarantees legibility; the scrim only has to stop the
// background and the accent colour sitting on top of each other.
const PhotoBackground: React.FC<{ src: string }> = ({ src }) => (
  <AbsoluteFill>
    <Img
      src={staticFile(src)}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
    />
    <AbsoluteFill style={{ backgroundColor: "rgba(2,22,25,0.34)" }} />
    <AbsoluteFill
      style={{ background: "radial-gradient(ellipse 1500px 1000px at 50% 48%, transparent 45%, rgba(0,0,0,0.30) 100%)" }}
    />
    <AccentRule />
  </AbsoluteFill>
);

// The fallback when no background image is supplied: deliberately quiet — a
// deep teal field, one soft off-centre glow, and a single accent rule. A
// background for a frame like this has one job: stay out of the way and keep
// contrast high everywhere text or a QR code might land.
const GeneratedBackground: React.FC = () => (
  <AbsoluteFill>
    <AbsoluteFill
      style={{
        background: `linear-gradient(118deg, #0a5f64 0%, ${BRAND.tealDeep} 34%, #04373c 68%, #02181b 100%)`,
      }}
    />
    {/* Glow behind the photo side, so the left column does not sink into the dark corner. */}
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 760px 620px at 20% 34%, ${BRAND.accent}22 0%, transparent 70%)`,
      }}
    />
    {/* Faint concentric arcs off the right edge — texture at a scale large enough
        that no single element sits on an edge of it. */}
    {[1180, 1500, 1820].map((r) => (
      <div
        key={r}
        style={{
          position: "absolute",
          left: 1920 - r / 2,
          top: 540 - r / 2,
          width: r,
          height: r,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.045)",
        }}
      />
    ))}
    {/* Vignette — pulls the corners down so the white QR card reads as lit. */}
    <AbsoluteFill
      style={{ background: "radial-gradient(ellipse 1400px 900px at 50% 48%, transparent 40%, rgba(0,0,0,0.42) 100%)" }}
    />
    <AccentRule />
  </AbsoluteFill>
);

// Always drawn ON TOP of the vignette. Underneath it, the corner darkening took
// the bright teal down to roughly the field colour and the rule vanished
// entirely — rendered, but invisible.
const AccentRule: React.FC = () => (
  <div
    style={{
      position: "absolute",
      left: 0,
      bottom: 0,
      width: "100%",
      height: 10,
      background: `linear-gradient(90deg, ${BRAND.accent} 0%, ${BRAND.teal} 55%, transparent 100%)`,
    }}
  />
);
