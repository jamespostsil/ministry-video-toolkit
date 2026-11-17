"""Export the approved storyboard's photos for the video, exactly as the reviewer left them.

  python -I export_photos.py <storyboard.json> <photos folder> <out folder> --edits <folder> [--crops FILE]
                             [--uploads FOLDER] [--library FOLDER] [--long-edge 2400]
                             [--skip-unapproved]
  python -I export_photos.py ... --no-edits     (only when the page was never published, so there is nothing to read)

--edits: the storyboard page's saved data, read with ArtifactData list (out_dir = this folder) for the collections
`order`, `pics` and `layout`, so the folder holds order/<group>.json, pics/<picture id>.json and layout/<group>.json. Every collection read is
applied: the reviewer's captions, credits and permissions (pics), and each moment's photo order, the photos they
removed and the photos they added (order). Without --edits (or --no-edits) the export stops, so the reviewer's
changes can't be skipped by accident.

--uploads: photos the reviewer uploaded from their computer are in the page's asset store. Save each with the
Artifact tool (action read, url, path = the asset id) into this folder; the file name starts with the asset id.
A missing upload stops the export and lists the asset ids to fetch.

Permission: a photo still marked "Ask first" or "Don't use" stops the export with a list of them. Settle each one
on the page (or with the owner), or pass --skip-unapproved to leave those photos out of the video.

Writes into <out folder>:
  <picture id>.jpg     each photo turned upright and cropped as the storyboard shows it (same ids as build.py)
  photos.json          {picture id: {file, width, height, caption, credit, rights}} for beats.ts (photos used only)
  photo-order.json     {group: [picture ids in the reviewer's order]}: the photos each moment shows, in order
  photo-layouts.json   {group: {layout, planned, photos}}: how each moment's photos are shown ("cover", "blur", "row",
                       "slider", "scatter"): the reviewer's choice from the page's Layout button, or the planned one
  photo-credits.txt    the end screen's line, e.g. "Photos by Wycliffe, SIL PNG, and Chris Gilmore"
"""
import argparse, glob, json, os, re, sys
from PIL import Image, ImageOps

ap = argparse.ArgumentParser()
ap.add_argument("storyboard"); ap.add_argument("photos"); ap.add_argument("out")
ap.add_argument("--crops"); ap.add_argument("--edits"); ap.add_argument("--no-edits", action="store_true")
ap.add_argument("--uploads"); ap.add_argument("--long-edge", type=int, default=2400)
ap.add_argument("--skip-unapproved", action="store_true")
ap.add_argument("--library", action="append", default=[], help="a shared photo folder the reviewer may have added photos from")
a = ap.parse_args()
if not a.edits and not a.no_edits:
    sys.exit("Stopped: pass --edits <folder> with the storyboard page's saved data (ArtifactData list of the "
             "collections order, pics and layout, out_dir = that folder). Use --no-edits only for a page that was never published.")
sb = json.load(open(a.storyboard, encoding="utf-8"))
crops = json.load(open(a.crops, encoding="utf-8")) if a.crops else {}
pid_of = lambda f: re.sub(r"[^A-Za-z0-9]+", "-", os.path.splitext(f)[0]).strip("-").lower()


def read_coll(name):
    """{doc id: data} from <edits>/<name>/*.json; a file may hold the data itself or {id, data}."""
    out = {}
    for f in sorted(glob.glob(os.path.join(a.edits or "", name, "*.json"))):
        d = json.load(open(f, encoding="utf-8"))
        out[d.get("id") or os.path.splitext(os.path.basename(f))[0]] = d.get("data", d) if isinstance(d.get("data"), dict) else d
    return out


edits = read_coll("pics") if a.edits else {}
orders = read_coll("order") if a.edits else {}
layouts = read_coll("layout") if a.edits else {}
if a.edits and not os.path.isdir(a.edits):
    sys.exit(f"Stopped: the --edits folder doesn't exist: {a.edits}")

# every photo the storyboard knows, by id: the script's photos, and the ones the reviewer added (library or upload)
known, moments = {}, {}   # moments: group -> the lead card's photo ids, in the script's order
for s in sb["shots"]:
    g = s.get("group") or s.get("key") or s["id"]
    pics = s.get("pictures", [])
    for p in pics:
        known.setdefault(pid_of(p["file"]), {**p})
    if pics and g not in moments:
        moments[g] = [pid_of(p["file"]) for p in pics]
for g, o in orders.items():
    for p in o.get("added") or []:
        if p and p.get("id"): known.setdefault(p["id"], {"file": p.get("file", ""), "asset": p.get("asset")})

# each moment's photos as the reviewer left them (the page's rule: the saved order, minus removed, then any
# photo new in this draft that the saved order doesn't name)
final = {}
for g, orig in moments.items():
    o = orders.get(g) or orders.get(re.sub(r"[^A-Za-z0-9_.~:@+-]+", "-", g)) or {}
    removed = set(o.get("removed") or [])
    order = [x for x in (o.get("pics") if isinstance(o.get("pics"), list) else orig) if x in known and x not in removed]
    order += [x for x in orig if x not in order and x not in removed]
    final[g] = order
for g in orders:
    if g not in moments and any(True for _ in (orders[g].get("pics") or [])):
        final[g] = [x for x in orders[g]["pics"] if x in known and x not in set(orders[g].get("removed") or [])]

used = list(dict.fromkeys(x for ids in final.values() for x in ids))


def info(pid):
    p, e = known[pid], edits.get(pid, {})
    return {"caption": e.get("caption", p.get("caption", "")), "credit": e.get("credit", p.get("credit", "")),
            "rights": e.get("rights", p.get("rights", "ok"))}


# permission: nothing marked "Ask first" or "Don't use" goes into a video by accident
blocked = [(pid, info(pid)["rights"]) for pid in used if info(pid)["rights"] != "ok"]
if blocked and not a.skip_unapproved:
    lines = "\n".join(f"  {'Ask first' if r == 'ask' else 'Do not use'}: {known[pid].get('file') or pid}" for pid, r in blocked)
    sys.exit("Stopped: these photos aren't cleared to use yet:\n" + lines +
             "\nSettle them on the storyboard page, or run again with --skip-unapproved to leave them out.")
if blocked:
    skip = {pid for pid, _ in blocked}
    final = {g: [x for x in ids if x not in skip] for g, ids in final.items()}
    used = [x for x in used if x not in skip]
    print("Left out (not cleared):", ", ".join(known[x].get("file") or x for x in skip))


# where each photo's file is: the photos folder, or an upload saved from the page's asset store
def source(pid):
    p = known[pid]
    if p.get("asset"):
        hits = glob.glob(os.path.join(a.uploads or "", p["asset"] + "*")) if a.uploads else []
        return hits[0] if hits else None
    for folder in [a.photos, *a.library]:
        f = os.path.join(folder, p["file"])
        if os.path.isfile(f): return f
    return None


missing = [pid for pid in used if not source(pid)]
if missing:
    up = [known[x]["asset"] for x in missing if known[x].get("asset")]
    other = [known[x].get("file") or x for x in missing if not known[x].get("asset")]
    msg = "Stopped: photos not found."
    if up: msg += "\n  Uploaded on the page (save each with the Artifact tool, action read, path = the id, into --uploads): " + ", ".join(up)
    if other: msg += "\n  Not in the photos folder: " + ", ".join(other)
    sys.exit(msg)

os.makedirs(a.out, exist_ok=True)
out = {}
for pid in used:
    p = known[pid]
    im = ImageOps.exif_transpose(Image.open(source(pid))).convert("RGB")
    c = crops.get(p.get("file", ""))
    if c: im = im.crop((c["x"], c["y"], c["x"] + c["w"], c["y"] + c["h"]))
    if max(im.size) > a.long_edge: im.thumbnail((a.long_edge, a.long_edge), Image.LANCZOS)
    im.save(os.path.join(a.out, pid + ".jpg"), quality=92)
    out[pid] = {"file": p.get("file", ""), "width": im.width, "height": im.height, **info(pid)}
json.dump(out, open(os.path.join(a.out, "photos.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(final, open(os.path.join(a.out, "photo-order.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# each moment's layout: the reviewer's choice (layout/<group>) while it suits the number of photos, else the storyboard's
FITS = {"cover": (1, 1), "blur": (1, 1), "row": (2, 3), "slider": (2, 99), "scatter": (2, 99)}
fits = lambda L, n: L in FITS and FITS[L][0] <= n <= FITS[L][1]
planned = {}
for s_ in sb["shots"]:
    if s_.get("layout"): planned.setdefault(s_.get("group") or s_.get("key") or s_["id"], s_["layout"])
lay_out, lay_changed = {}, []
for g, ids in final.items():
    n, was, want = len(ids), planned.get(g, ""), (layouts.get(g) or {}).get("layout", "")
    use = want if fits(want, n) else was if fits(was, n) else ("cover" if n == 1 else "row" if n <= 3 else "slider") if n else ""
    if not use or not (was or fits(want, n)): continue   # a moment with no layout of its own (the end frame) keeps none
    lay_out[g] = {"layout": use, "planned": was, "photos": n}
    if use != was: lay_changed.append(f"  {g}: {was or '(none)'} -> {use} ({n} photo{'s' if n != 1 else ''})")
json.dump(lay_out, open(os.path.join(a.out, "photo-layouts.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# the end screen's credit line, from the photos actually used ("Photo: X" -> X), in order of first appearance
names = list(dict.fromkeys(re.sub(r"^\s*photos?\s*(by)?\s*:?\s*", "", v["credit"], flags=re.I).strip() for v in out.values() if v["credit"].strip()))
line = ("Photos by " + (names[0] if len(names) == 1 else ", ".join(names[:-1]) + (", and " if len(names) > 2 else " and ") + names[-1])) if names else ""
open(os.path.join(a.out, "photo-credits.txt"), "w", encoding="utf-8").write(line + "\n")

changed = sum(1 for pid in used if pid in edits) + sum(1 for g in final if g in orders)
print(f"{len(out)} photos -> {a.out}  ({len(final)} moments; reviewer's changes applied to {changed} photos/moments)")
print("Credits:", line or "(none)")
if lay_changed: print("Layouts to change in beats.ts (photo-layouts.json):", *lay_changed, sep="\n")
