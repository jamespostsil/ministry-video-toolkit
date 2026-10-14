import type { PartnerFrameProps } from "../../components/PartnerFrame";

// The closing frame, from the script's "[End frame]" block: name, web address,
// photo, QR code, and a background image. See the partner-frame skill.
//
// Two things the script couldn't supply, which had to be checked by hand:
//
// 1. The photo crop. The photo arrived as a 489x1058 phone portrait with a lot
//    of shoulder and foliage below the faces. The crop below is in the SOURCE
//    image's own pixels, matched to the card's shape (about 3:4, 454x588), and
//    was confirmed by diffing the rendered card against the source.
// 2. The web address. The script typed it with a one-letter difference from
//    the address its own QR code pointed to, and only the QR's spelling
//    resolved. The QR won.
export const PARTNER: PartnerFrameProps = {
  photo: "_example/media/endframe/photo.png",
  photoSize: { width: 489, height: 1058 },
  photoCrop: { x: 21, y: 107, width: 456, height: 591 },
  name: "James & Christina Post",
  web: "ThePostsOnMission.com",
  qr: "_example/media/endframe/qr.png",
  headline: "Learn more about our Wycliffe ministry",
  logo: "_example/media/endframe/wycliffe-logo-white.png",
  background: "_example/media/endframe/background.png",
};
