// The music bed's gain curve, computed from the project's own timings.
//
// Plain JavaScript on purpose: the Studio preview (BeatEngine.tsx) and the
// final mix (scripts/render-final.mjs, which is Node and cannot import
// TypeScript) both import THIS file, so the two can never disagree.
//
// It used to be a list of absolute timestamps. That silently went wrong every
// time the footage was re-cut: the music kept ducking and lifting at the old
// times. Deriving the points from titleCardSeconds, footage length and
// endingSeconds means a re-cut needs no music edits at all.

export const MUSIC_DEFAULTS = {
  /** Under the silent title card: full. */
  titleGain: 1.0,
  /** Under the narration: low enough that speech always wins. */
  speechGain: 0.065,
  /** Under the closing frame, where nothing is spoken. */
  endingGain: 0.45,
  /** The duck begins this long BEFORE the footage starts... */
  duckStartBefore: 0.5,
  /** ...and is fully down this long AFTER it starts — before the first word. */
  duckEndAfter: 0.55,
  /** The lift for the closing frame begins this long before the footage ends... */
  liftStartBefore: 1.2,
  /** ...and is fully up this long after. */
  liftEndAfter: 0.8,
  /** Fade to silence over the last this-many seconds. */
  fadeOutSeconds: 2.3,
};

/**
 * @param {{ titleCardSeconds: number, endingSeconds: number, footage: { durationSeconds: number } }} project
 * @param {{ points?: number[][] } & Partial<typeof MUSIC_DEFAULTS>} [envelope]
 *   The project's musicEnvelope.json. Any MUSIC_DEFAULTS key overrides that
 *   default. An explicit `points` list ([absoluteSeconds, gain]) is used as-is,
 *   for the rare video that needs a hand-drawn curve.
 * @returns {number[][]} [absoluteSeconds, gain] pairs, strictly increasing in time.
 */
export function musicCurve(project, envelope = {}) {
  if (Array.isArray(envelope.points) && envelope.points.length > 1) return envelope.points;
  const e = { ...MUSIC_DEFAULTS, ...envelope };
  const start = project.titleCardSeconds;
  const end = start + project.footage.durationSeconds;
  const total = end + project.endingSeconds;

  const raw = [
    [0, e.titleGain],
    [start - e.duckStartBefore, e.titleGain],
    [start + e.duckEndAfter, e.speechGain],
    [end - e.liftStartBefore, e.speechGain],
    [end + e.liftEndAfter, e.endingGain],
    [total - e.fadeOutSeconds, e.endingGain],
    [total, 0],
  ];
  // Keep time strictly increasing even for a very short title card or ending,
  // where two anchors would otherwise collide or cross.
  const out = [];
  for (const [t, g] of raw) {
    const prev = out.length ? out[out.length - 1][0] : -Infinity;
    out.push([Math.min(total, Math.max(t, prev + 0.01, 0)), g]);
  }
  return out;
}
