export declare const MUSIC_DEFAULTS: {
  titleGain: number;
  speechGain: number;
  endingGain: number;
  duckStartBefore: number;
  duckEndAfter: number;
  liftStartBefore: number;
  liftEndAfter: number;
  fadeOutSeconds: number;
};

export type MusicEnvelope = { points?: number[][] } & Partial<typeof MUSIC_DEFAULTS>;

export declare function musicCurve(
  project: { titleCardSeconds: number; endingSeconds: number; footage: { durationSeconds: number } },
  envelope?: MusicEnvelope
): number[][];
