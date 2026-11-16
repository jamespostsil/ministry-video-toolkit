import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { Beat } from "../lib/beatTypes";
import { BRAND, COLORS, FONTS } from "../lib/theme";

// ---------- a number counting up, with a label ----------
// A milestone worth dwelling on ("600 Bible translation projects started").
// Celebratory in the brand's own hues: the number counts up fast and settles
// (ease-out), then gives one small pop and a soft glow as it lands. No
// confetti: "colourful" here means the brand purples and teals.
export const Counter: React.FC<{ beat: Extract<Beat, { kind: "counter" }>; durFrames: number }> = ({ beat }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const from = beat.from ?? 0;
  const countEnd = (0.35 + (beat.countSeconds ?? 2.6)) * fps;
  const p = interpolate(frame, [0.35 * fps, countEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const value = Math.round(from + (beat.to - from) * p);
  const pop = spring({ frame: frame - countEnd, fps, config: { damping: 9, stiffness: 160, mass: 0.6 } });
  const scale = 1 + 0.08 * Math.sin(Math.min(1, pop) * Math.PI);
  const glow = interpolate(frame, [countEnd - 0.2 * fps, countEnd + 0.4 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelIn = interpolate(frame, [0.6 * fps, 1.2 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  // Width of the widest number, so the digits never shift sideways as they count.
  const digits = String(Math.max(Math.abs(beat.to), Math.abs(from))).length;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: "#0a1216" }} />
      <AbsoluteFill style={{ background: `radial-gradient(70% 70% at 50% 45%, ${BRAND.accent}55 0%, ${COLORS.ink}40 45%, #0a1216 80%)` }} />
      <AbsoluteFill
        style={{ opacity: glow * 0.9, background: `radial-gradient(34% 34% at 50% 42%, ${BRAND.tealLight}55 0%, transparent 70%)` }}
      />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
        <div
          style={{
            fontFamily: FONTS.display,
            fontWeight: 700,
            fontSize: 300,
            lineHeight: 1,
            color: "#fff",
            minWidth: `${digits * 0.6}em`,
            textAlign: "center",
            fontVariantNumeric: "tabular-nums",
            transform: `scale(${scale})`,
            textShadow: "0 6px 40px rgba(0,0,0,0.55)",
          }}
        >
          {value.toLocaleString("en-US")}
        </div>
        <div style={{ width: 160, height: 5, borderRadius: 3, backgroundColor: BRAND.accent, margin: "34px 0 30px", opacity: labelIn }} />
        <div
          style={{
            opacity: labelIn,
            transform: `translateY(${(1 - labelIn) * 16}px)`,
            fontFamily: FONTS.secondary,
            fontWeight: 600,
            fontSize: 60,
            color: "#fff",
            textAlign: "center",
            maxWidth: 1500,
          }}
        >
          {beat.label}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
