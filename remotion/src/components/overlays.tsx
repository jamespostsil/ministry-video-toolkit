import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { Beat } from "../lib/beatTypes";
import { BRAND, COLORS, FONTS } from "../lib/theme";
import { DEFAULT_SAFE_AREA, useProject } from "../lib/project";

const EASE_OUT = Easing.out(Easing.cubic);
// A tight dark ring around every glyph PLUS the soft glow. The glow alone was
// not enough: a long line runs past the point where the scrim panel is still
// solid, so its last characters ended up on bare foliage. The ring makes each
// letter legible independent of whatever is behind it, which turns the panel
// into a nicety rather than a dependency.
const SHADOW = "0 0 2px rgba(0,0,0,0.98), 2px 2px 0 rgba(0,0,0,0.85), -2px 2px 0 rgba(0,0,0,0.85), 2px -2px 0 rgba(0,0,0,0.85), -2px -2px 0 rgba(0,0,0,0.85), 0 2px 18px rgba(0,0,0,0.9)";

// Overlays that sit ON the live shot — the presenters stay sharp underneath.
//
// They all live in the upper-left, inside the project's overlaySafeArea: the
// part of the frame where nobody is standing. That area has to be MEASURED on
// each video's own footage (see the beat-library skill) — with a locked-off
// camera, one measurement holds for the whole video.

// A soft dark panel sized to the TYPE BOX, not centred on it. An earlier
// version used a radial ellipse centred on the block, which put the text out at
// the gradient's edge where it had faded to ~14% — so the words sat on bare
// foliage with no backing at all. A blurred rounded rectangle covers exactly
// what it needs to and stops well short of anyone's face.
export const SCRIM_BLUR = 26;

// How much SOLID backing sits between the scrim's visible edge and the type.
// The scrim is blurred, so its edge is a ramp rather than a line: a rectangle
// drawn to X is only fully opaque from about X + SCRIM_BLUR inwards. Padding
// therefore has to be specified as "solid padding I want" plus the blur, or the
// type ends up sitting on the fade.
//
// These were 46px horizontal and 40px vertical NOMINAL, which after the blur
// left roughly 20px and 14px of real backing — the first letter of every
// heading sat right on the edge of the shadow. PAD_X is now about one
// title-size (58px), which is the usual padding for a type panel.
const PAD_X = 60 + SCRIM_BLUR;
const PAD_Y = 48 + SCRIM_BLUR;

// Real rendered row heights. A flat "64 per row" estimate was 21px short on a
// three-row heading — bullets carry an 18px marginTop on top of 42px type — and
// the shortfall came straight out of the bottom padding, leaving about 3px of
// solid backing under the last line while the sides had 80. Descenders make it
// worse: the ink of "Financial Partnership" drops below its line box.
const TITLE_LH = 58 * 1.16;
const SUBTITLE_LH = 8 + 40 * 1.2;
const BULLET_LH = 18 + 42 * 1.2;
const DESCENDER = (fontSize: number) => fontSize * 0.22;

// The type block's own origin. Everything else is derived from it: the scrim is
// this box grown by the padding, rather than a second rectangle kept in sync by
// hand. x=116 also puts the type inside the 5% title-safe area (96px), which
// the old 76px did not.
const TEXT_X = 116;
const TEXT_Y = 120;


// Average glyph advance as a fraction of the font size, measured off renders of
// these families. Used only to size the scrim to the longest line, so a short
// heading gets a short panel instead of a fixed 880px slab.
const ADV = { display: 0.44, secondary: 0.61 } as const;
const lineW = (text: string, size: number, family: keyof typeof ADV) => text.length * ADV[family] * size;

// Before/after columns. The left term is right-aligned to FROM_RIGHT so every
// arrow lines up; the payoff starts at TO_X.
const FROM_RIGHT = 376;
const ARROW_X = 400;
const TO_X = 462;
const COMPARE_CONTAINER_W = 980;

const TypeScrim: React.FC<{ left: number; top: number; width: number; height: number }> = ({ left, top, width, height }) => (
  <div
    style={{
      position: "absolute",
      left,
      top,
      width,
      height,
      borderRadius: 48,
      backgroundColor: "rgba(0,0,0,0.60)",
      filter: `blur(${SCRIM_BLUR}px)`,
    }}
  />
);

// ---------- upper-left heading: name plate, role, or a short bullet list ----------
export const Heading: React.FC<{ beat: Extract<Beat, { kind: "heading" }>; durFrames: number }> = ({ beat, durFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const project = useProject();
  if (beat.size || beat.align === "right" || beat.bulletsAt || beat.logo || beat.titleSize || beat.top || beat.bulletSize) return <HeadingPlus beat={beat} durFrames={durFrames} />;
  const bullets = beat.bullets ?? [];

  const inOut = Math.min(
    interpolate(frame, [0, 0.5 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT }),
    interpolate(frame, [durFrames - 0.5 * fps, durFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT })
  );
  const step = (i: number) => {
    const a = 0.12 + i * 0.22;
    return {
      opacity: interpolate(frame, [a * fps, (a + 0.5) * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT }),
      transform: `translateY(${interpolate(frame, [a * fps, (a + 0.5) * fps], [18, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: EASE_OUT,
      })}px)`,
    };
  };

  // Size the panel to the longest line rather than to a fixed slab. The 1.06 is
  // slack against the estimate running short — a panel a little too wide costs
  // nothing, one too narrow puts the last word back on bare foliage.
  const firstWord = beat.title.split(" ")[0];
  const restOfTitle = beat.title.slice(firstWord.length);
  const textW = Math.max(
    beat.emphasizeFirstWord
      ? lineW(firstWord, 72, "display") + lineW(restOfTitle, 58, "display")
      : lineW(beat.title, 58, "display"),
    beat.subtitle ? lineW(beat.subtitle, 40, "secondary") : 0,
    ...bullets.map((b) => 32 + lineW(b, 42, "secondary"))
  );
  const lastFont = bullets.length ? 42 : beat.subtitle ? 40 : 58;
  const blockH =
    TITLE_LH + (beat.subtitle ? SUBTITLE_LH : 0) + bullets.length * BULLET_LH + DESCENDER(lastFont);
  const safeRight = (project.overlaySafeArea ?? DEFAULT_SAFE_AREA).right;
  const scrimW = Math.min(safeRight - (TEXT_X - PAD_X), textW * 1.06 + 2 * PAD_X);
  return (
    <AbsoluteFill style={{ opacity: inOut }}>
      <TypeScrim left={TEXT_X - PAD_X} top={TEXT_Y - PAD_Y} width={scrimW} height={blockH + 2 * PAD_Y} />
      <div style={{ position: "absolute", left: TEXT_X, top: TEXT_Y, width: 880 }}>
        <div style={{ ...step(0), fontFamily: FONTS.display, fontWeight: 700, fontSize: 58, lineHeight: 1.16, color: "#ffffff", textShadow: SHADOW }}>
          {beat.emphasizeFirstWord ? (
            <>
              <span style={{ color: BRAND.accent, fontSize: 72 }}>{beat.title.split(" ")[0]}</span>
              {" " + beat.title.split(" ").slice(1).join(" ")}
            </>
          ) : (
            beat.title
          )}
        </div>
        {beat.subtitle ? (
          <div
            style={{
              ...step(1),
              marginTop: 8,
              fontFamily: FONTS.secondary,
              fontWeight: 600,
              fontSize: 40,
              color: BRAND.accent,
              textShadow: SHADOW,
            }}
          >
            {beat.subtitle}
          </div>
        ) : null}
        {bullets.map((b, i) => (
          <div key={b} style={{ ...step(1 + (beat.subtitle ? 1 : 0) + i), display: "flex", alignItems: "center", marginTop: 18 }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: BRAND.accent, marginRight: 18, flexShrink: 0 }} />
            <div style={{ fontFamily: FONTS.secondary, fontWeight: 600, fontSize: 42, color: "#ffffff", textShadow: SHADOW }}>{b}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ---------- heading with the newer options ----------
// Upper right (align), one size for every word (size: words over a photo, no
// bullet dots), each bullet on its own word (bulletsAt), a logo under the plate.
// The panel grows as each line arrives, so it never sits half empty waiting for
// words that are still seconds away.
const LOGO_W = 300;
const INLINE_LOGO_H = 58;
export const HeadingPlus: React.FC<{ beat: Extract<Beat, { kind: "heading" }>; durFrames: number }> = ({ beat, durFrames }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const project = useProject();
  const bullets = beat.bullets ?? [];
  const words = !!beat.size;
  const right = beat.align === "right";
  const tSize = beat.size ?? beat.titleSize ?? 72;
  const bSize = beat.size ?? beat.bulletSize ?? 42;
  const textY = beat.top ?? TEXT_Y;
  const inlineLogo = !!(beat.logo && beat.logoInline && beat.subtitle);
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT } as const;
  const inOut = Math.min(
    interpolate(frame, [0, 0.5 * fps], [0, 1], clamp),
    interpolate(frame, [durFrames - 0.5 * fps, durFrames], [1, 0], clamp)
  );
  const shown = (a: number) => interpolate(frame, [a * fps, (a + 0.5) * fps], [0, 1], clamp);
  const look = (a: number) => ({ opacity: shown(a), transform: `translateY(${(1 - shown(a)) * 18}px)` });

  // When each piece arrives, in seconds from the beat's start.
  let next = 0.12;
  const titleAt = next;
  const subAt = beat.subtitle ? (next += 0.22) : next;
  const bulletAt = bullets.map((_, i) => beat.bulletsAt?.[i] ?? (next += 0.22));
  const logoAt = beat.logo ? beat.logoAt ?? next + 0.22 : 0;

  const logoH = beat.logo && !inlineLogo ? 22 + (LOGO_W * 179) / 556 : 0;   // the logo's own aspect; the Wycliffe wordmark is 556x179
  const bulletLH = words ? bSize * 1.12 : 18 + bSize * 1.2;
  const titleLH = tSize * 1.16;
  const textW = Math.max(
    lineW(beat.title, tSize, "display"),
    beat.subtitle ? lineW(beat.subtitle, 40, "secondary") + (inlineLogo ? 16 + (INLINE_LOGO_H * 556) / 179 : 0) : 0,
    ...bullets.map((b) => (words ? lineW(b, bSize, "display") : 32 + lineW(b, bSize, "secondary"))),
    beat.logo && !inlineLogo ? LOGO_W : 0
  );
  const lastFont = beat.logo ? 0 : bullets.length ? bSize : beat.subtitle ? 40 : tSize;
  const h =
    titleLH +
    (beat.subtitle ? SUBTITLE_LH * shown(subAt) : 0) +
    bulletAt.reduce((sum, a) => sum + bulletLH * shown(a), 0) +
    logoH * (beat.logo ? shown(logoAt) : 0) +
    DESCENDER(lastFont || 40);
  const safeRight = (project.overlaySafeArea ?? DEFAULT_SAFE_AREA).right;
  const scrimW = right ? textW * 1.06 + 2 * PAD_X : Math.min(safeRight - (TEXT_X - PAD_X), textW * 1.06 + 2 * PAD_X);
  const scrimLeft = right ? width - (TEXT_X - PAD_X) - scrimW : TEXT_X - PAD_X;
  const side = right ? { right: TEXT_X, textAlign: "right" as const } : { left: TEXT_X };

  return (
    <AbsoluteFill style={{ opacity: inOut }}>
      <TypeScrim left={scrimLeft} top={textY - PAD_Y} width={scrimW} height={h + 2 * PAD_Y} />
      <div style={{ position: "absolute", top: textY, maxWidth: 1300, ...side }}>
        <div style={{ ...look(titleAt), fontFamily: FONTS.display, fontWeight: 700, fontSize: tSize, lineHeight: 1.16, color: "#ffffff", textShadow: SHADOW }}>
          {beat.title}
        </div>
        {beat.subtitle ? (
          <div style={{ ...look(subAt), marginTop: 8, fontFamily: FONTS.secondary, fontWeight: 600, fontSize: 40, color: BRAND.accent, textShadow: SHADOW, display: "flex", alignItems: "center", gap: 16, justifyContent: right ? "flex-end" : "flex-start" }}>
            <span>{beat.subtitle}</span>
            {inlineLogo ? <Img src={staticFile(beat.logo!)} style={{ ...look(logoAt), height: INLINE_LOGO_H, width: "auto", filter: "drop-shadow(0 0 6px rgba(0,0,0,0.8))" }} /> : null}
          </div>
        ) : null}
        {bullets.map((b, i) =>
          words ? (
            <div key={b} style={{ ...look(bulletAt[i]), fontFamily: FONTS.display, fontWeight: 700, fontSize: bSize, lineHeight: 1.12, color: "#ffffff", textShadow: SHADOW }}>
              {b}
            </div>
          ) : (
            <div key={b} style={{ ...look(bulletAt[i]), display: "flex", alignItems: "center", justifyContent: right ? "flex-end" : "flex-start", marginTop: 18 }}>
              <div style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: BRAND.accent, marginRight: 18, flexShrink: 0 }} />
              <div style={{ fontFamily: FONTS.secondary, fontWeight: 600, fontSize: bSize, color: "#ffffff", textShadow: SHADOW }}>{b}</div>
            </div>
          )
        )}
        {beat.logo && !inlineLogo ? <Img src={staticFile(beat.logo)} style={{ ...look(logoAt), display: "block", width: LOGO_W, marginTop: 22, marginLeft: right ? "auto" : 0 }} /> : null}
      </div>
    </AbsoluteFill>
  );
};

// ---------- before / after comparison ----------
// Each left-hand term lands as it is spoken; the right-hand payoff phases in
// after it, so the graphic tracks the sentence rather than pre-empting it.
export const Compare: React.FC<{ beat: Extract<Beat, { kind: "compare" }>; durFrames: number }> = ({ beat, durFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inOut = Math.min(
    interpolate(frame, [0, 0.45 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT }),
    interpolate(frame, [durFrames - 0.5 * fps, durFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT })
  );
  const at = (t: number) =>
    interpolate(frame, [t * fps, (t + 0.45) * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });
  const slide = (t: number) =>
    interpolate(frame, [t * fps, (t + 0.45) * fps], [-24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });

  // Laid out from the same TEXT_X as the section headings, so the two overlays
  // sit on one left margin rather than 80px apart. Vertically it starts higher
  // than TEXT_Y because it is a much taller block: padded at TEXT_Y it would run
  // past the default safe area's bottom edge and over whoever is below it.
  const TITLE_Y = 86;
  const ROW_Y = beat.title ? [152, 220, 288] : [96, 164, 232];
  const blockTop = beat.title ? TITLE_Y : ROW_Y[0];
  const blockBottom = ROW_Y[beat.rows.length - 1] + 56;
  // Where the payoff column ends. Estimated with a deliberately generous
  // advance, not the average one: these are single short words of wide glyphs
  // ("Possible!" measured 0.645em/char against an average of 0.44), and a flat
  // 190px allowance left the panel ending 5px past the last letter.
  const PAYOFF_ADV = 0.68;
  const contentRight = TO_X + Math.max(...beat.rows.map((r) => r.to.length)) * PAYOFF_ADV * 46;
  return (
    <AbsoluteFill style={{ opacity: inOut }}>
      <TypeScrim
        left={TEXT_X - PAD_X}
        top={blockTop - PAD_Y}
        width={contentRight - TEXT_X + 2 * PAD_X}
        height={blockBottom - blockTop + 2 * PAD_Y}
      />
      {beat.title ? (
        <div
          style={{
            position: "absolute",
            // Centred over the two columns, unlike the left-aligned section
            // headings: this title labels a block that is itself centred, so
            // left-aligning it read as misaligned.
            left: TEXT_X,
            width: contentRight - TEXT_X,
            textAlign: "center",
            top: TITLE_Y,
            opacity: at(0),
            fontFamily: FONTS.display,
            fontWeight: 700,
            fontSize: 46,
            color: "#ffffff",
            textShadow: SHADOW,
          }}
        >
          {beat.title}
        </div>
      ) : null}
      {beat.rows.map((row, i) => (
        <div key={row.from} style={{ position: "absolute", left: 0, top: ROW_Y[i], width: COMPARE_CONTAINER_W, height: 72 }}>
          <div
            style={{
              position: "absolute",
              right: COMPARE_CONTAINER_W - FROM_RIGHT,
              top: 0,
              opacity: at(row.fromAt),
              transform: `translateX(${slide(row.fromAt)}px)`,
              fontFamily: FONTS.display,
              fontWeight: 700,
              fontSize: 46,
              color: "#ffffff",
              textShadow: SHADOW,
              whiteSpace: "nowrap",
            }}
          >
            {row.from}
          </div>
          <div
            style={{
              position: "absolute",
              left: ARROW_X,
              top: 4,
              opacity: at(row.toAt),
              fontFamily: FONTS.secondary,
              fontWeight: 700,
              fontSize: 42,
              color: "rgba(255,255,255,0.72)",
              textShadow: SHADOW,
            }}
          >
            {"→"}
          </div>
          <div
            style={{
              position: "absolute",
              left: TO_X,
              top: 0,
              opacity: at(row.toAt),
              transform: `translateX(${-slide(row.toAt)}px)`,
              fontFamily: FONTS.display,
              fontWeight: 700,
              fontSize: 46,
              color: BRAND.accent,
              textShadow: SHADOW,
              whiteSpace: "nowrap",
            }}
          >
            {row.to}
          </div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

// ---------- colourful thank-you card ----------
// "Colourful" means the brand hues — purple through teal — never a rainbow
// gradient or confetti. Sits left of the presenters and above centre so it has
// its own register rather than competing with a face.
export const ThankYou: React.FC<{ beat: Extract<Beat, { kind: "thankyou" }>; durFrames: number }> = ({ beat, durFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 15, mass: 0.7, stiffness: 120 } });
  const out = interpolate(frame, [durFrames - 0.5 * fps, durFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  if (beat.style === "bubble") {
    // Big rounded letters filled with the panel's own gradient, a thick white outline and a soft shadow.
    // Two layers: the outline and shadow behind, the gradient fill on top (a stroke on the filled text
    // would eat into the letters).
    const word: React.CSSProperties = { fontFamily: FONTS.bubble, fontWeight: 700, fontSize: 118, lineHeight: 1.1, whiteSpace: "nowrap", letterSpacing: 1, display: "inline-block", padding: "0 6px" };
    return (
      <AbsoluteFill style={{ opacity: Math.min(1, pop * 1.5) * out }}>
        <div style={{ position: "absolute", left: 300, top: 150, width: 640, textAlign: "center", transform: `scale(${0.7 + 0.3 * pop}) rotate(${-4 * pop}deg)`, transformOrigin: "50% 60%" }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <div aria-hidden style={{ ...word, position: "absolute", left: 0, top: 0, color: "#fff", WebkitTextStroke: "26px #fff", filter: "drop-shadow(0 14px 22px rgba(0,0,0,0.45))" }}>
              {beat.title}
            </div>
            <div
              style={{
                ...word,
                position: "relative",
                backgroundImage: `linear-gradient(160deg, ${COLORS.accentSoft} 10%, ${COLORS.accent} 55%, ${COLORS.ink} 95%)`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {beat.title}
            </div>
          </div>
          {beat.subtitle ? (
            <div style={{ marginTop: 26, fontFamily: FONTS.secondary, fontWeight: 600, fontSize: 36, color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>{beat.subtitle}</div>
          ) : null}
        </div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ opacity: Math.min(1, pop * 1.5) * out }}>
      <div
        style={{
          position: "absolute",
          left: 92,
          top: 132,
          width: 596,
          padding: "44px 48px",
          transform: `scale(${0.88 + 0.12 * Math.min(1, pop)})`,
          borderRadius: 30,
          overflow: "hidden",
          textAlign: "center",
          background: `linear-gradient(150deg, ${COLORS.accentSoft} 0%, ${COLORS.accent} 52%, ${COLORS.ink} 100%)`,
          boxShadow: "0 30px 70px rgba(0,0,0,0.5), 0 4px 14px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -90,
            left: -70,
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${COLORS.bg}55 0%, transparent 70%)`,
          }}
        />
        <div
          style={{
            position: "relative",
            fontFamily: FONTS.display,
            fontWeight: 700,
            fontSize: 76,
            color: "#fff",
            lineHeight: 1.05,
            textShadow: "0 2px 10px rgba(0,0,0,0.35)",
          }}
        >
          {beat.title}
        </div>
        {beat.subtitle ? (
          <>
            <div style={{ width: 70, height: 4, backgroundColor: "rgba(255,255,255,0.6)", margin: "20px auto", borderRadius: 2 }} />
            <div
              style={{
                position: "relative",
                fontFamily: FONTS.secondary,
                fontWeight: 600,
                fontSize: 34,
                color: "rgba(255,255,255,0.96)",
                lineHeight: 1.35,
              }}
            >
              {beat.subtitle}
            </div>
          </>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
