// This is your entry file! Refer to it when you render:
// npx remotion render <entry-file> <composition-id> out/video.mp4
//
// Render finished videos with `npm run render -- <project>`, not
// `npx remotion render`: see docs/gotchas.md section 3.

import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
