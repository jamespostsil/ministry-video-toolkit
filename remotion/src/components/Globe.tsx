import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import land110 from "world-atlas/land-110m.json";
import { Beat } from "../lib/beatTypes";
import { BRAND, COLORS, FONTS } from "../lib/theme";

// ---------- a turning globe, then a Bible fades in front of it ----------
// "Every language of the world receiving Scripture": the world turns, then the
// Bible arrives. Drawn from Natural Earth's land outlines (world-atlas, public
// domain) in an orthographic projection, so it is a real globe, not a texture.
// Brand hues only: teal oceans, pale land, a purple-bound Bible.
const LAND = feature(land110 as unknown as Topology, (land110 as unknown as Topology).objects.land as GeometryCollection);
const R = 330;
const CX = 960;
const CY = 520;

export const Globe: React.FC<{ beat: Extract<Beat, { kind: "globe" }>; durFrames: number }> = ({ beat, durFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // A steady 24 degrees a second, starting with Africa and Europe facing us.
  const lon = -20 - 24 * (frame / fps);
  const projection = useMemo(() => geoOrthographic().scale(R).translate([CX, CY]).clipAngle(90), []);
  projection.rotate([lon, -12, 0]);
  const path = geoPath(projection);
  const land = path(LAND) ?? "";
  const grid = path(geoGraticule10()) ?? "";

  const bibleAt = beat.bibleAt ?? Math.max(1, durFrames / fps / 2);
  const b = interpolate(frame, [bibleAt * fps, (bibleAt + 0.9) * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const globeIn = interpolate(frame, [0, 0.6 * fps], [0.92, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const labelIn = interpolate(frame, [(bibleAt + 0.5) * fps, (bibleAt + 1.1) * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: "#0a1216" }} />
      <AbsoluteFill style={{ background: `radial-gradient(60% 60% at 50% 48%, ${COLORS.ink}66 0%, #0a1216 75%)` }} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, transform: `scale(${globeIn})`, transformOrigin: `${CX}px ${CY}px` }}>
        <defs>
          <radialGradient id="ocean" cx="38%" cy="32%" r="75%">
            <stop offset="0%" stopColor={BRAND.teal} />
            <stop offset="70%" stopColor={BRAND.tealDeep} />
            <stop offset="100%" stopColor="#022a2d" />
          </radialGradient>
          <radialGradient id="shade" cx="38%" cy="32%" r="80%">
            <stop offset="55%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.45)" />
          </radialGradient>
          <radialGradient id="halo" cx="50%" cy="50%" r="50%">
            <stop offset="80%" stopColor={`${BRAND.tealLight}33`} />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>
        <circle cx={CX} cy={CY} r={R * 1.12} fill="url(#halo)" />
        <circle cx={CX} cy={CY} r={R} fill="url(#ocean)" />
        <path d={grid} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={1.2} />
        <path d={land} fill={COLORS.bg} fillOpacity={0.92} stroke="rgba(255,255,255,0.5)" strokeWidth={0.8} />
        <circle cx={CX} cy={CY} r={R} fill="url(#shade)" />
      </svg>
      {/* The Bible: a closed book seen a little from above, purple binding, gold cross and page edges. */}
      <div
        style={{
          position: "absolute",
          left: CX - 150,
          top: CY - 150,
          width: 300,
          height: 380,
          opacity: b,
          transform: `translateY(${(1 - b) * 40}px) scale(${0.9 + 0.1 * b}) rotate(-6deg)`,
          filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.6))",
        }}
      >
        <svg viewBox="0 0 300 380" width={300} height={380}>
          <rect x={26} y={18} width={262} height={350} rx={14} fill="#f4f0e8" />
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={i} x1={36} x2={282} y1={358 - i * 3} y2={358 - i * 3} stroke="#d8cfc2" strokeWidth={1} />
          ))}
          <rect x={10} y={8} width={262} height={350} rx={14} fill={COLORS.accent} />
          <rect x={10} y={8} width={30} height={350} rx={10} fill="#4a3b5a" />
          <rect x={22} y={20} width={238} height={326} rx={10} fill="none" stroke="#d9b45a" strokeWidth={3} />
          <rect x={146} y={86} width={14} height={150} rx={2} fill="#d9b45a" />
          <rect x={108} y={126} width={90} height={14} rx={2} fill="#d9b45a" />
          <text x={153} y={300} textAnchor="middle" fontFamily={FONTS.display} fontWeight={700} fontSize={34} fill="#d9b45a" letterSpacing={4}>
            BIBLE
          </text>
        </svg>
      </div>
      {beat.label ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 70,
            textAlign: "center",
            opacity: labelIn,
            fontFamily: FONTS.secondary,
            fontWeight: 600,
            fontSize: 54,
            color: "#fff",
          }}
        >
          {beat.label}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
