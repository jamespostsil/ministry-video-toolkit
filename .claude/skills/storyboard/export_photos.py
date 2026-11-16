"""Export the storyboard's photos for the video: each one turned upright and cropped exactly as the storyboard
shows it, as public/images/<project>/<picture id>.jpg, plus a photos.json of each one's size, caption, credit and
permission (the reviewer's edits from the storyboard's db applied on top, when a pics export is given).

  python -I export_photos.py <storyboard.json> <photos folder> <out folder> [--crops FILE] [--edits pics.json]
                             [--long-edge 2400]

--edits: a JSON list of the storyboard db's pics/ documents ({id, data: {caption, credit, rights}}), e.g. saved
from ArtifactData list. Picture ids are made the same way as build.py makes them.
"""
import argparse, json, os, re
from PIL import Image, ImageOps

ap = argparse.ArgumentParser()
ap.add_argument("storyboard"); ap.add_argument("photos"); ap.add_argument("out")
ap.add_argument("--crops"); ap.add_argument("--edits"); ap.add_argument("--long-edge", type=int, default=2400)
a = ap.parse_args()
sb = json.load(open(a.storyboard, encoding="utf-8"))
crops = json.load(open(a.crops, encoding="utf-8")) if a.crops else {}
edits = {}
if a.edits:
    for d in json.load(open(a.edits, encoding="utf-8")):
        edits[d["id"]] = d.get("data", d)
os.makedirs(a.out, exist_ok=True)
pid_of = lambda f: re.sub(r"[^A-Za-z0-9]+", "-", os.path.splitext(f)[0]).strip("-").lower()

out = {}
for s in sb["shots"]:
    for p in s.get("pictures", []):
        pid = pid_of(p["file"])
        if pid in out: continue
        im = ImageOps.exif_transpose(Image.open(os.path.join(a.photos, p["file"]))).convert("RGB")
        c = crops.get(p["file"])
        if c: im = im.crop((c["x"], c["y"], c["x"] + c["w"], c["y"] + c["h"]))
        if max(im.size) > a.long_edge: im.thumbnail((a.long_edge, a.long_edge), Image.LANCZOS)
        im.save(os.path.join(a.out, pid + ".jpg"), quality=92)
        e = edits.get(pid, {})
        out[pid] = {"file": p["file"], "width": im.width, "height": im.height,
                    "caption": e.get("caption", p.get("caption", "")), "credit": e.get("credit", p.get("credit", "")),
                    "rights": e.get("rights", p.get("rights", "ok"))}
json.dump(out, open(os.path.join(a.out, "photos.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(out), "photos ->", a.out)
