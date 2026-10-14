import { loadFont } from "@remotion/fonts";
import { staticFile, delayRender, continueRender, cancelRender } from "remotion";

// Local brand fonts (SIL OFL) shipped in public/fonts — renders can't rely on
// system fonts. Block rendering until every face is ready.
const handle = delayRender("load-brand-fonts");

Promise.all([
  loadFont({ family: "Alegreya", url: staticFile("fonts/Alegreya-Regular.woff2"), weight: "400", style: "normal" }),
  loadFont({ family: "Alegreya", url: staticFile("fonts/Alegreya-Medium.woff2"), weight: "500", style: "normal" }),
  loadFont({ family: "Alegreya", url: staticFile("fonts/Alegreya-Bold.woff2"), weight: "700", style: "normal" }),
  loadFont({ family: "Alegreya", url: staticFile("fonts/Alegreya-Italic.woff2"), weight: "500", style: "italic" }),
  loadFont({ family: "Poppins", url: staticFile("fonts/Poppins-Regular.woff2"), weight: "400", style: "normal" }),
  loadFont({ family: "Poppins", url: staticFile("fonts/Poppins-Medium.woff2"), weight: "500", style: "normal" }),
  loadFont({ family: "Poppins", url: staticFile("fonts/Poppins-SemiBold.woff2"), weight: "600", style: "normal" }),
  loadFont({ family: "Poppins", url: staticFile("fonts/Poppins-Bold.woff2"), weight: "700", style: "normal" }),
])
  .then(() => continueRender(handle))
  .catch((err) => cancelRender(err));
