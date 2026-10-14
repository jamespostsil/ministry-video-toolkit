import React, { createContext, useContext } from "react";
import { Beat, BeatKind, DEFAULT_OVERLAY_KINDS, MusicEnvelope, blurWindowsFor } from "./beatTypes";
import type { PartnerFrameProps } from "../components/PartnerFrame";

// Everything that belongs to ONE video lives in that video's folder under
// src/projects/<name>/ and is gathered into a Project. Nothing in lib/ or
// components/ should know which video it is rendering.
//
// The plain-data half (media paths, timings, title text) lives in the
// project's project.json, because the Node scripts in scripts/ need to read it
// too and they cannot import TypeScript. The beat plan and end frame stay in
// TypeScript so the editor type-checks them.

/** The JSON half of a project: what scripts/*.mjs and the compositions share. */
export type ProjectJson = {
  /** Composition id prefix. Also what you pass to the render script. */
  id: string;
  fps: number;
  width: number;
  height: number;
  /** Seconds of title card before the footage starts. Music only, no speech. */
  titleCardSeconds: number;
  /** Seconds the closing partner frame holds after the footage ends. Leave
   *  long enough to notice a QR code and point a phone at it: 7s minimum. */
  endingSeconds: number;
  footage: {
    /** Path under public/ to the cleaned footage that build-footage writes. */
    src: string;
    /** Native pixel size and length of that file. build-footage fills these
     *  in by measuring the file, so they cannot drift out of sync with it. */
    width: number;
    height: number;
    durationSeconds: number;
  };
  /** Path under public/ to a still of the footage's first frame, also written
   *  by build-footage. The title card and thumbnail are built on it, so the
   *  cut from title card to live footage changes nothing but the type. */
  titleStill: string;
  music?: { src: string };
  /** Input to scripts/build-footage.mjs. */
  footagePrep?: {
    /** The camera original. Relative paths resolve from the remotion/ folder.
     *  null when the footage arrives already cut, as the example's does. */
    source: string | null;
    /** [in, out] in SOURCE seconds. The gaps between rows are what gets cut.
     *  Omit to use the whole source untouched. */
    segments?: [number, number][];
    crossfadeSeconds?: number;
    /** What each removed gap was. JSON has no comments; the script ignores this. */
    notes?: string[];
  };
  titleCard: { eyebrow?: string; title: string; byline: string; date?: string };
  thumbnail: {
    eyebrow?: string;
    /** Each entry is one line of the big title. Two short lines read best. */
    titleLines: string[];
    byline: string;
    date?: string;
    /** CSS object-position for cropping the still into 16:9. Anchor it so the
     *  people end up on the side away from the type. */
    objectPosition?: string;
  };
  /** The part of the frame where upper-left overlays may draw without
   *  darkening anyone. MEASURE THIS on your own footage — see the beat-library
   *  skill. `right` caps how wide overlay panels grow. `bottom` is for checking
   *  only: the overlay layouts sit in the top ~410px, so a measured bottom
   *  smaller than that means overlays will reach someone. Default 960 / 410. */
  overlaySafeArea?: { right: number; bottom: number };
};

export type Project = ProjectJson & {
  beats: Beat[];
  partner: PartnerFrameProps;
  musicEnvelope?: MusicEnvelope;
  overlayKinds?: ReadonlySet<BeatKind>;
};

export const DEFAULT_SAFE_AREA = { right: 960, bottom: 410 };

export const durationInSeconds = (p: ProjectJson) => p.titleCardSeconds + p.footage.durationSeconds + p.endingSeconds;

/** Where the footage ends, in footage-relative seconds: the ending beat's start. */
export const footageEnd = (p: ProjectJson) => p.footage.durationSeconds;

/** Explicit "object-fit: cover" geometry for the footage layers.
 *  @remotion/media's <Video> ignores objectFit (docs/gotchas.md section 2). */
export const footageCover = (p: ProjectJson) => {
  const scale = Math.max(p.width / p.footage.width, p.height / p.footage.height);
  const width = p.footage.width * scale;
  const height = p.footage.height * scale;
  return {
    position: "absolute" as const,
    width,
    height,
    left: (p.width - width) / 2,
    top: (p.height - height) / 2,
    // A cover crop is deliberately larger than the frame — Tailwind's preflight
    // would clamp it (docs/gotchas.md section 4).
    maxWidth: "none",
    maxHeight: "none",
  };
};

export const blurWindows = (p: Project) => blurWindowsFor(p.beats, p.overlayKinds ?? DEFAULT_OVERLAY_KINDS);

const ProjectContext = createContext<Project | null>(null);

export const ProjectProvider: React.FC<{ project: Project; children: React.ReactNode }> = ({ project, children }) =>
  React.createElement(ProjectContext.Provider, { value: project }, children);

/** The project being rendered. Components that need per-video values (title
 *  text, safe area) read them here instead of importing a project. */
export const useProject = (): Project => {
  const p = useContext(ProjectContext);
  if (!p) throw new Error("useProject() used outside a <ProjectProvider>. Register the project in src/projects/index.ts.");
  return p;
};
