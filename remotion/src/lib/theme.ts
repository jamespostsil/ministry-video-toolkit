// Brand tokens shared by every video. Nothing per-video belongs here: footage,
// timings and title text live in each project's own project.json.
//
// To reskin for a different organisation, change these values once. Check the
// accent's contrast when you do — see the note on `accent`.
export const BRAND = {
  teal: "#00676c",
  tealDeep: "#036064",
  // The one colour that carries emphasis: a heading's subtitle, the payoff
  // column of a before/after, the web address on the end frame. Relative
  // luminance 0.376 here, which gives 4.68:1 over the standard overlay panel —
  // above the 3:1 floor for large text. A new accent should clear that too.
  accent: "#08B8B3",
  tealLight: "#8ccfcf",
} as const;

// Secondary palette, used by the thank-you card's gradient and photo fields.
export const COLORS = {
  bg: "#f4f0e8",
  rule: "#ab988d",
  accent: "#5f4d72",
  accentSoft: "#9d85b8",
  ink: "#3c6b79",
  muted: "#789fad",
} as const;

// Both families are SIL Open Font License; the files and licence texts are in
// public/fonts/. Rendering never relies on system fonts.
export const FONTS = {
  display: "Alegreya", // titles, headings (serif)
  secondary: "Poppins", // labels, captions, web addresses (sans)
} as const;
