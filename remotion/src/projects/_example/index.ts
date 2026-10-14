import type { Project, ProjectJson } from "../../lib/project";
import json from "./project.json";
import envelope from "./musicEnvelope.json";
import { BEATS } from "./beats";
import { PARTNER } from "./partner";

// Gathers this folder into one Project. src/projects/index.ts finds it
// automatically.
export const project: Project = {
  ...(json as ProjectJson),
  beats: BEATS,
  partner: PARTNER,
  musicEnvelope: envelope,
};
