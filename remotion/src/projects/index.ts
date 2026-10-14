import type { Project } from "../lib/project";

// Every video in this checkout, found automatically: each folder in
// src/projects/ with an index.ts is a project. There is nothing to register.
//
// Your own project folders are git-ignored (see the root .gitignore), so a
// video's beat plan, photo list and transcript stay on your machine and can
// never be pushed to the shared repository by accident. Only _example is
// tracked.
//
// import.meta.webpackContext is resolved by Remotion's bundler at build time;
// its type is declared in src/bundler.d.ts.
const found = import.meta.webpackContext("./", { recursive: true, regExp: /^\.\/[^/]+\/index\.ts$/ });

export const PROJECTS: Project[] = found
  .keys()
  .map((key) => (found(key) as { project: Project }).project)
  // A bundler can list one module under two keys; keep each project once.
  .filter((p, i, all) => all.findIndex((q) => q.id === p.id) === i)
  // The example first, then the rest alphabetically.
  .sort((a, b) => (a.id === "Example" ? -1 : b.id === "Example" ? 1 : a.id.localeCompare(b.id)));

export const projectById = (id: string): Project => {
  const p = PROJECTS.find((x) => x.id === id);
  if (!p) throw new Error(`No project with id "${id}". Known: ${PROJECTS.map((x) => x.id).join(", ")}`);
  return p;
};
