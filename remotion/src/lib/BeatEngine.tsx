import React from "react";
import { AbsoluteFill, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { Video, Audio } from "@remotion/media";
import "./fonts";
import { Beat, BeatKind, DEFAULT_OVERLAY_KINDS } from "./beatTypes";
import { BeatContent } from "../components/beats";
import { Project, ProjectProvider, blurWindows, footageCover } from "./project";
import { musicCurve } from "./musicCurve.mjs";

// Everything project-specific arrives in `project`: the beat plan, footage,
// music and its gain envelope, and the timings. The engine never imports a
// particular video. See lib/project.ts.
export type BeatEngineProps = { project: Project };

const EASE = Easing.inOut(Easing.ease);

// GallerySlider and GalleryScatter already fade their own full-frame panel in
// and out (20 frames each way). Wrapping those in a second opacity ramp would
// multiply the two curves into a longer, mushier dissolve, so those beats get
// an instant window and do their own fading.
// These beats handle their own fade-out internally, so BeatLayer must not add
// a second one. The title card is here because it must NOT dissolve to black:
// nothing is underneath it until the footage starts.
const SELF_FADING = new Set<Beat["kind"]>(["opening", "slider", "scatter"]);
const cfOf = (beat: Beat, fps: number) => (SELF_FADING.has(beat.kind) ? 20 / fps : 0.6);

const trapezoid = (frame: number, on: number, off: number, cf: number) =>
  interpolate(frame, [on, on + cf, off - cf, off], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

const FINAL_FADE_DUR = 0.6;

const SharpBase: React.FC<{ footageSrc: string; cover: React.CSSProperties }> = ({ footageSrc, cover }) => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    <Video src={staticFile(footageSrc)} style={cover} />
  </AbsoluteFill>
);

// Blurred, darkened duplicate that crossfades on whenever a graphic is covering
// the presenter, so they recede to atmosphere during a beat's fade rather than
// sitting sharp and distracting behind it.
const BlurredBase: React.FC<{ footageSrc: string; cover: React.CSSProperties; blurOn: [number, number][] }> = ({
  footageSrc,
  cover,
  blurOn,
}) => {
  const frame = useCurrentFrame(); // local to this Sequence: 0 = footage start
  const { fps } = useVideoConfig();
  const cf = 0.5 * fps;
  let opacity = 0;
  for (const [on, off] of blurOn) {
    opacity = Math.max(opacity, trapezoid(frame, on * fps, off * fps, cf));
  }
  return (
    <AbsoluteFill style={{ overflow: "hidden", opacity }}>
      <Video
        src={staticFile(footageSrc)}
        muted
        style={{ ...cover, transform: "scale(1.1)", filter: "blur(32px) brightness(0.5)" }}
      />
    </AbsoluteFill>
  );
};

// One shared full-frame black cover that fades in right at the end, above every
// layer but below the closing slide — so the fade-out is guaranteed to be in
// lockstep instead of asking N layers to each reach black at the same instant.
const FinalScrim: React.FC<{ endingStart: number }> = ({ endingStart }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [(endingStart - FINAL_FADE_DUR) * fps, endingStart * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  return <AbsoluteFill style={{ backgroundColor: "#000", opacity }} />;
};

// Adjacency is derived, not hand-kept: when a beat abuts the next one, its
// window is extended by that beat's fade-in and it simply holds opaque
// underneath while the next dissolves in on top — so a one-frame flash back to
// the presenter between two graphics is impossible by construction. Every beat
// in this video covers the full frame, so this applies uniformly.
const OverlayBeat: React.FC<{
  beat: Beat;
  prev?: Beat;
  next?: Beat;
  isLast: boolean;
  overlayKinds: ReadonlySet<BeatKind>;
  footageStart: number;
}> = ({ beat, next, isLast, overlayKinds, footageStart }) => {
  const { fps } = useVideoConfig();
  // Every beat except the title card is authored against the footage's own
  // transcript; this is where that gets offset into composition time.
  const place = (b: Beat, t: number) => (b.kind === "opening" ? t : t + footageStart);
  const EPS = 0.05;
  // Compare PLACED times: the title card is authored in absolute seconds while
  // every other beat is footage-relative, so comparing raw values would measure
  // two different clocks against each other.
  // An overlay sits ON the live shot rather than covering it, so the
  // "hold opaque underneath while the next fades in" trick does not apply to
  // either side of it — that only works between two full-frame beats.
  const abutsNext =
    !!next &&
    Math.abs(place(next, next.start) - place(beat, beat.end)) < EPS &&
    !overlayKinds.has(beat.kind) &&
    !overlayKinds.has(next.kind);

  const cf = cfOf(beat, fps);
  const nextCfIn = next ? cfOf(next, fps) : 0;
  const instantIn = beat.kind === "opening" || SELF_FADING.has(beat.kind);

  const contentDurFrames = Math.round((beat.end - beat.start) * fps);
  const windowEnd = abutsNext ? beat.end + nextCfIn : beat.end;
  const windowLenFrames = Math.round((windowEnd - beat.start) * fps);
  const startFrame = Math.round(place(beat, beat.start) * fps);

  return (
    <Sequence from={startFrame} durationInFrames={windowLenFrames} layout="none" name={`${beat.kind}@${place(beat, beat.start).toFixed(1)}s`}>
      <BeatLayer
        instantIn={instantIn}
        cfInFrames={cf * fps}
        cfOutFrames={cf * fps}
        contentDurFrames={contentDurFrames}
        fadeOut={!abutsNext && !isLast && !SELF_FADING.has(beat.kind)}
      >
        <BeatContent beat={beat} durFrames={contentDurFrames} />
      </BeatLayer>
    </Sequence>
  );
};

const BeatLayer: React.FC<{
  instantIn: boolean;
  cfInFrames: number;
  cfOutFrames: number;
  contentDurFrames: number;
  fadeOut: boolean;
  children: React.ReactNode;
}> = ({ instantIn, cfInFrames, cfOutFrames, contentDurFrames, fadeOut, children }) => {
  const frame = useCurrentFrame();
  const inFactor = instantIn
    ? 1
    : interpolate(frame, [0, cfInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const outFactor = fadeOut
    ? interpolate(frame, [contentDurFrames - cfOutFrames, contentDurFrames], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: EASE,
      })
    : 1;
  return <AbsoluteFill style={{ opacity: inFactor * outFactor }}>{children}</AbsoluteFill>;
};

export const BeatEngine: React.FC<BeatEngineProps> = ({ project }) => {
  const { fps } = useVideoConfig();
  const footageStart = project.titleCardSeconds;
  const footageFrames = Math.round(project.footage.durationSeconds * fps);
  const footageStartFrame = Math.round(footageStart * fps);
  const endingStart = footageStart + project.footage.durationSeconds;
  const cover = footageCover(project);
  const blurOn = blurWindows(project);
  const overlayKinds = project.overlayKinds ?? DEFAULT_OVERLAY_KINDS;
  const beats = project.beats;

  // Music bed under a gain curve: full under the silent title card, ducked
  // clear of the first word, quiet under the narration, lifted again for the
  // closing frame. lib/musicCurve.mjs computes it from the project's timings;
  // scripts/render-final.mjs uses the same function for the delivered mix.
  const points = musicCurve(project, project.musicEnvelope);
  const musicVolume = (f: number) =>
    interpolate(
      f,
      points.map(([t]) => t * fps),
      points.map(([, gain]) => gain),
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

  const endingBeat = beats.find((b) => b.kind === "ending");
  const nonEndingBeats = beats.filter((b) => b.kind !== "ending");
  const lastNonEnding = nonEndingBeats[nonEndingBeats.length - 1];

  return (
    <ProjectProvider project={project}>
      <AbsoluteFill style={{ backgroundColor: "#000" }}>
        <Sequence from={footageStartFrame} durationInFrames={footageFrames} layout="none">
          <SharpBase footageSrc={project.footage.src} cover={cover} />
        </Sequence>
        <Sequence from={footageStartFrame} durationInFrames={footageFrames} layout="none">
          <BlurredBase footageSrc={project.footage.src} cover={cover} blurOn={blurOn} />
        </Sequence>

        {nonEndingBeats.map((beat, i) => (
          <OverlayBeat
            key={i}
            beat={beat}
            prev={nonEndingBeats[i - 1]}
            next={i + 1 < nonEndingBeats.length ? nonEndingBeats[i + 1] : undefined}
            isLast={false}
            overlayKinds={overlayKinds}
            footageStart={footageStart}
          />
        ))}

        <Sequence from={0} layout="none">
          <FinalScrim endingStart={endingStart} />
        </Sequence>

        {endingBeat ? (
          <OverlayBeat
            beat={endingBeat}
            prev={lastNonEnding}
            next={undefined}
            isLast={true}
            overlayKinds={overlayKinds}
            footageStart={footageStart}
          />
        ) : null}

        {project.music && points.length > 1 ? <Audio src={staticFile(project.music.src)} volume={musicVolume} /> : null}
      </AbsoluteFill>
    </ProjectProvider>
  );
};
