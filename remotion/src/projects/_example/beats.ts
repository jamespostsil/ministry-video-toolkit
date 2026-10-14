import type { Beat, BeatPhoto } from "../../lib/beatTypes";
import type { GalleryPhoto } from "../../components/PhotoGallery";
import json from "./project.json";
import { PARTNER } from "./partner";

// The beat plan for a real, published video: James and Christina Post's
// September 2026 ministry update with Wycliffe Bible Translators. Its script is
// examples/example-script.md, so you can compare what was written with what
// the plan does with it.
//
// One change from the published video: a large family group photo was replaced
// with a photo from the celebration of life service.
//
// TIMING: every beat except `opening` is in seconds into the FOOTAGE — the
// same clock as transcript.txt next to this file — not into the finished
// video. The engine adds the title card's length for you. The comments quote
// the words each beat is timed to; look them up in transcript.txt to see how
// each time was chosen.

const media = (p: string) => `_example/media/${p}`;

// Scripture dedication photos, with their credits. A caption names what the
// picture can't: which Scripture, which language, which country.
const DEDICATIONS: Record<string, GalleryPhoto> = {
  "dinka-cam": { src: media("dedications/dinka-cam.jpg"), caption: "Bible - Dinka Cam, South Sudan", credit: "Photo: Wycliffe", width: 1129, height: 753 },
  fur: { src: media("dedications/fur.jpg"), caption: "New Testament - Fur, South Sudan", credit: "Photo: Wycliffe", width: 905, height: 588 },
  nobonob: { src: media("dedications/nobonob.jpg"), caption: "Bible - Nobonob, Papua New Guinea", credit: "Photo: SIL PNG", width: 1426, height: 951 },
  waata: { src: media("dedications/waata.jpg"), caption: "New Testament - Waata, Kenya", credit: "Photo: Wycliffe", width: 1268, height: 846 },
  zanaki: { src: media("dedications/zanaki.jpg"), caption: "New Testament - Zanaki, Tanzania", credit: "Photo: Wycliffe", width: 1100, height: 749 },
  mankon: { src: media("dedications/mankon.jpg"), caption: "New Testament - Mankon, Cameroon", credit: "Photo: Wycliffe", width: 1000, height: 667 },
  ikizu: { src: media("dedications/ikizu.jpg"), caption: "New Testament - Ikizu, Tanzania", credit: "Photo: Peris Kiriko", width: 1186, height: 791 },
  kwaya: { src: media("dedications/kwaya.jpg"), caption: "New Testament - Kwaya, Tanzania", credit: "Photo: Wycliffe", width: 950, height: 713 },
  saliba: { src: media("dedications/saliba.jpg"), caption: "New Testament - Saliba, Papua New Guinea", credit: "Photo: SIL PNG", width: 2048, height: 1152 },
  zinza: { src: media("dedications/zinza.jpg"), caption: "New Testament - Zinza, Tanzania", credit: "Photo: Chris Gilmore", width: 477, height: 510 },
  "upper-pokomo": { src: media("dedications/upper-pokomo.jpg"), caption: "Bible - Upper Pokomo, Kenya", credit: "Photo: BTL", width: 2048, height: 1365 },
};
const ded = (...names: string[]) => names.map((n) => DEDICATIONS[n]);

const work = (file: string, caption: string, width: number, height: number): BeatPhoto => ({
  src: media(`work/${file}`),
  caption,
  width,
  height,
});

export const BEATS: Beat[] = [
  // Title card: music only, holding on the footage's first frame. Because the
  // still IS that frame, the handover reads as the photo coming to life — only
  // the type fades; the picture never jumps.
  { kind: "opening", start: 0, end: json.titleCardSeconds, src: json.titleStill },

  // Name plate: "it's James and Christina, your missionaries with Wycliffe
  // Bible Translators" (0.76-5.7).
  { kind: "heading", start: 1.5, end: 6.4, title: "James & Christina Post", subtitle: "Wycliffe Bible Translators" },

  // "First, a family update:" (17.22-18.8). Held to 20.6 so it can be read.
  { kind: "heading", start: 16.6, end: 20.6, title: "Family Update" },

  // --- family update ---
  // A memorial card: portrait, with typeset name and dates at the bottom, so it
  // must never be cropped -> shown whole over a blurred copy of itself. Lands on
  // "in-home hospice care", so her face is on screen as the hard sentence starts.
  { kind: "blur", start: 20.65, end: 25.4, src: media("photos/peggy-ann-farnell.jpg") },
  // "We had a really beautiful celebration of life service..." Abuts the card
  // before it, so the presenters never flash on screen between the two.
  { kind: "blur", start: 25.4, end: 32.2, src: media("photos/charlie-farnell.jpg"), caption: "Celebration of life service" },
  // "We're grateful for the time that we were able to spend with her..." Two
  // photos of different shapes, each shown at its own aspect ratio.
  {
    kind: "row",
    start: 32.2,
    end: 40.8,
    maxHeight: 640,
    photos: [
      { src: media("photos/charlie-peggy-family.jpg"), caption: "", width: 3287, height: 1848 },
      { src: media("photos/post-family-charlie.jpg"), caption: "", width: 2048, height: 1536 },
    ],
  },

  // "There is lots to update you on in our Wycliffe ministry." (46.42-49.7)
  { kind: "heading", start: 46.2, end: 52.6, title: "Ministry Update", subtitle: "Bible Translation Progress!" },

  // --- Bible translation worldwide ---
  // "Through partnerships around the world... the complete Word of God."
  { kind: "slider", start: 55.668, end: 77.568, title: "Scripture Dedications", photos: ded("dinka-cam", "fur", "nobonob", "waata", "zanaki") },

  // "As I continue to support the technology that helps make Bible translation
  // and linguistic work possible" (78.48-83.6).
  { kind: "heading", start: 78.6, end: 84.0, title: "James Post", subtitle: "Language Technology Consultant" },

  // "What used to take weeks or months, or I couldn't even do, can now be done
  // in days or weeks, with better results." The left column lands on each term
  // as it is said; the right pays each one off in the second half. Offsets are
  // from this beat's own start. Held to 100.8 so "Possible!", the last to
  // land (at 95.62), stays readable for ~4s.
  {
    kind: "compare",
    start: 90.0,
    end: 100.8,
    title: "Acceleration through AI!",
    rows: [
      { from: "Weeks", to: "Days!", fromAt: 0.44, toAt: 3.94 },
      { from: "Months", to: "Weeks!", fromAt: 1.04, toAt: 4.66 },
      { from: "Impossible?!", to: "Possible!", fromAt: 1.94, toAt: 5.62 },
    ],
  },

  // --- AI and technology ---
  // "Whether it's instantly translating a global website into dozens of
  // languages". Phone screenshots, sized to land near their native width.
  {
    kind: "row",
    start: 104.668,
    end: 109.968,
    maxHeight: 840,
    photos: [
      { src: media("photos/web-punjabi.png"), caption: "Punjabi", width: 393, height: 852 },
      { src: media("photos/web-russian.png"), caption: "Russian", width: 393, height: 852 },
      { src: media("photos/web-vietnamese.png"), caption: "Vietnamese", width: 393, height: 852 },
    ],
  },
  // "or giving people 24/7 access to AI chatbots in almost 100 different languages,"
  {
    kind: "row",
    start: 109.968,
    end: 115.568,
    maxHeight: 720,
    photos: [
      { src: media("photos/chatbot-language-technology.png"), caption: "Language Technology", width: 400, height: 597 },
      { src: media("photos/chatbot-ptxprint.png"), caption: "PTXprint", width: 398, height: 597 },
      { src: media("photos/chatbot-fieldworks.png"), caption: "FieldWorks", width: 398, height: 597 },
    ],
  },
  // "using AI is like having superpowers." Lands just before the line, so the
  // joke is already on screen when it is said.
  { kind: "blur", start: 115.568, end: 119.268, src: media("photos/james-superpowered.jpg") },

  // Christina takes over: "In April, I started a new assignment with Wycliffe,
  // working as a Communications Specialist."
  { kind: "heading", start: 126.6, end: 132.2, title: "Christina Post", subtitle: "Communications Specialist" },

  // --- communications ---
  // The script says "[Insert images at appropriate times with script]", so each
  // card lands on its own words rather than on a metronome:
  //   "travel reports" 138.88 · "internal communications" 141.34
  //   "social media posts" 143.62 · "designing brochures" 146.62
  // Every gap is at least 2.3s, so each caption can be read before the next
  // card lands. Ends on "flyers", handing back to her face for the summary.
  {
    kind: "scatter",
    start: 138.169,
    end: 149.169,
    title: "Communications Specialist",
    photos: [
      work("travel-report.png", "Travel reports", 800, 1046),
      work("blog-post.png", "Blog posts", 2030, 1060),
      work("social-media-post.png", "Social media posts", 1107, 1430),
      work("brochure-flyer.png", "Brochures & flyers", 906, 1165),
    ],
    revealAt: [0.71, 3.17, 5.45, 8.45],
  },

  // --- translation accelerating ---
  // "By 2033... What a pivotal time to be involved in Bible translation!"
  { kind: "scatter", start: 158.169, end: 171.2, title: "Scripture Dedications", photos: ded("mankon", "ikizu", "kwaya", "saliba", "zinza", "upper-pokomo") },

  // "You are helping make this happen through your prayers and financial
  // partnership." Over the live shot, now that the photos have handed back.
  {
    kind: "heading",
    start: 171.5,
    end: 177.0,
    title: "You are helping through your:",
    emphasizeFirstWord: true,
    bullets: ["Prayers", "Financial Partnership"],
  },

  // Lands on "thank you!" at 182.14; clears before "If you'd like to become
  // more involved" gets going at 183.6. Spoken to camera, so beside her face.
  { kind: "thankyou", start: 181.7, end: 184.5, title: "Thank You!" },

  // One continuous overlay for the whole ask. "Get Involved" opens it on "If
  // you'd like to become more involved..." (183.6); the ask lands 9s later on
  // "making an eternal impact by becoming a monthly partner?" and holds
  // through the pause before "May God bless you".
  {
    kind: "quote",
    start: 184.9,
    end: 198.3,
    heading: "Get Involved",
    linesAt: 9.0,
    lines: ["Make an eternal impact:", "Become a monthly partner!"],
  },

  // The closing frame, after the footage ends, per the script's "[keep video
  // through the end, then show the QR code page]".
  {
    kind: "ending",
    start: json.footage.durationSeconds,
    end: json.footage.durationSeconds + json.endingSeconds,
    partner: PARTNER,
  },
];
