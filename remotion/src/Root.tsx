import "./index.css";
import React from "react";
import { Composition } from "remotion";
import { BeatEngine } from "./lib/BeatEngine";
import { ProjectProvider, durationInSeconds } from "./lib/project";
import { YouTubeThumbnail } from "./components/Thumbnail";
import { PartnerFrame } from "./components/PartnerFrame";
import { PROJECTS, projectById } from "./projects";

// Three compositions per project, all generated from src/projects/index.ts —
// there is nothing to edit here when you add a video.
//
// Props are just the project id (Remotion requires JSON-serialisable props);
// each component looks the project up again.
type Props = { projectId: string };

const VideoComp: React.FC<Props> = ({ projectId }) => <BeatEngine project={projectById(projectId)} />;

// Still only, never part of the video.
const ThumbnailComp: React.FC<Props> = ({ projectId }) => (
  <ProjectProvider project={projectById(projectId)}>
    <YouTubeThumbnail />
  </ProjectProvider>
);

// The closing frame on its own, so it can be proofed — and its QR code
// test-scanned — without rendering the whole video.
const EndFrameComp: React.FC<Props> = ({ projectId }) => <PartnerFrame {...projectById(projectId).partner} />;

export const RemotionRoot: React.FC = () => (
  <>
    {PROJECTS.map((p) => (
      <React.Fragment key={p.id}>
        <Composition
          id={p.id}
          component={VideoComp}
          defaultProps={{ projectId: p.id }}
          durationInFrames={Math.round(durationInSeconds(p) * p.fps)}
          fps={p.fps}
          width={p.width}
          height={p.height}
        />
        <Composition
          id={`${p.id}-Thumbnail`}
          component={ThumbnailComp}
          defaultProps={{ projectId: p.id }}
          durationInFrames={1}
          fps={p.fps}
          width={1280}
          height={720}
        />
        <Composition
          id={`${p.id}-EndFrame`}
          component={EndFrameComp}
          defaultProps={{ projectId: p.id }}
          durationInFrames={1}
          fps={p.fps}
          width={p.width}
          height={p.height}
        />
      </React.Fragment>
    ))}
  </>
);
