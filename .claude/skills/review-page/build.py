"""Build a video review page from a data file.

  python build.py <data.json> <out.html> [--photos DIR --crops FILE --out-pics DIR]

data.json:
  {
    "title": "My video: v2",
    "video": "my-video-v2-web.mp4",              # published next to the page
    "version": 2,                                    # db collections are sentences-v2, pins-v2, notes-v2, ...
    "accent": "#3a4720",                             # optional, the page's main colour
    "sentences": [{"id": "1.1", "text": "...", "t": 3.5}, ...],   # t: when it starts in the video (s); one card each
        # optional per card, as on the storyboard: "section" (a thin divider where it changes; a section can be marked
        # good at once), "group" (cards of one moment share their photos and words), "layout" ("cover" | "blur" | "row" | "slider" | "scatter" | "grid" | "onebyone" | "stack" | "feature" | "beforeafter" | "map" | "beside" | "corner": how the video shows this moment's photos now;
        # the card's "Layout" button lets the reviewer ask for another, saved as layout-v<N>/<group>), "screen": [{"label", "text",
        # "id"?}] (the words on screen), "pictures": [{"id", "file", "caption", "credit", "rights"}] (the photos, in
        # order; their thumbnails pics/<id>.t.jpg and pics/<id>.jpg are published next to the page: --photos/--crops/
        # --out-pics make them from the script's photos)
    "changes": {"1.1": "What changed here since the last version"},  # optional
    "general": "A one-line note shown above the video",               # optional
    "questions": [{"id", "title", "points": ["..."], "img"?: "file next to the page", "at"?: "<sentence id>"}],
        # optional: what Claude needs the reviewer's OK on, answered on the page (OK / Change it). Never a separate
        # status page. "at" adds a "Show the scene" link.
    "good": ["1.1", ...],    # optional: cards marked good in the last version and unchanged since; they start folded
    "preview": "Preview copy: 720p, not HD",         # optional: the label on the video (default "Preview copy: not HD")
    "audio": {"voice": "x-voice.m4a", "music": "x-music.m4a"},   # optional: two audio files (render-final.mjs --stems) kept in step with a video that has no sound; adds Voice + music / Voice only / Music only buttons at the top
    "mode": "detailed"       # optional: open in Detailed (every scene card, words on screen, photos) instead of
                             # Simple (the video and notes only); default "simple". A link ending #simple or #detailed opens that mode.
  }
With --photos, every photo in that folder is offered under "+ Add a photo" (data "library", made here).
"""
import argparse, json, os, re, sys
here = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser(); ap.add_argument("data"); ap.add_argument("out")
ap.add_argument("--photos"); ap.add_argument("--crops"); ap.add_argument("--out-pics")
ap.add_argument("--library", action="append", default=[], help="a shared photo folder offered under + Add a photo (repeatable)")
ap.add_argument("--library-link", help="web link to the shared photo folder, shown in the Shared photos tab")
ap.add_argument("--no-library", action="store_true", help="leave the shared People with Bibles photos out (found on this computer by default)")
a = ap.parse_args(); data_path, out = a.data, a.out
if not a.library and not a.no_library:   # the shared "People with Bibles" photos, when they are on this computer
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../storyboard"))
    import shared_photos
    _shared = shared_photos.find()
    if _shared: a.library = [_shared]; a.library_link = a.library_link or shared_photos.LINK; print("shared photos:", _shared)
    else: a.library_link = a.library_link or shared_photos.LINK; print("NOTE:", shared_photos.MISSING)
if a.no_library and not a.library_link:   # no photos offered, but the Shared photos tab still says how to get them
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../storyboard")); import shared_photos; a.library_link = shared_photos.LINK
d = json.load(open(data_path, encoding="utf-8"))
for k in ("title", "video", "version", "sentences"):
    if k not in d: raise SystemExit(f"data.json needs {k!r}")
ids = {s["id"] for s in d["sentences"]}
bad = [k for k in d.get("changes", {}) if k not in ids] + [q.get("at") for q in d.get("questions", []) if q.get("at") not in (None, *ids)]
if bad: raise SystemExit(f"changes or questions for unknown sentences: {bad}")
pid_of = lambda f: re.sub(r"[^A-Za-z0-9]+", "-", os.path.splitext(f)[0]).strip("-").lower()
library, made = [], {}
if a.photos and a.out_pics:   # the photo thumbnails and larger copies the cards show, cropped as on screen
    from PIL import Image, ImageOps
    crops = json.load(open(a.crops, encoding="utf-8")) if a.crops else {}
    os.makedirs(a.out_pics, exist_ok=True)
    used = {p["file"] for s in d["sentences"] for p in s.get("pictures", [])}
    _order = {}   # the script's own order: each photo's first appearance down the scenes
    for _s in d["sentences"]:
        for _p in _s.get("pictures", []): _order.setdefault(_p["file"], len(_order))
    files = sorted(set(used) | {f for f in os.listdir(a.photos) if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))}, key=lambda f: (0, _order[f], "") if f in _order else (1, 0, f.lower()))
    _lic = {}   # stock photos fetched by find-footage: their on-screen credit, filled in when one is added
    _lp = os.path.join(a.photos, "photo-licenses.csv")
    if os.path.isfile(_lp):
        import csv
        _lic = {r["file"]: r.get("on-screen credit", "") for r in csv.DictReader(open(_lp, encoding="utf-8-sig"))}
    for f in files:
        pid = pid_of(f)
        im = ImageOps.exif_transpose(Image.open(os.path.join(a.photos, f))).convert("RGB")
        c = crops.get(f)
        if c: im = im.crop((c["x"], c["y"], c["x"] + c["w"], c["y"] + c["h"]))
        for suffix, size in ((".jpg", 1600), (".t.jpg", 240)):
            q = im.copy(); q.thumbnail((size, size)); q.save(os.path.join(a.out_pics, pid + suffix), quality=86)
        library.append({"id": pid, "file": f, "w": im.width, "h": im.height, "inScript": f in _order, **({"credit": _lic[f]} if _lic.get(f) else {})})
if a.library and a.out_pics:   # shared photos (people with Bibles...), with their caption and credit filled in
    import csv
    from PIL import Image, ImageOps
    os.makedirs(a.out_pics, exist_ok=True)
    for folder in a.library:
        sheet = os.path.join(folder, "photo-credits.csv")
        rows = ([{"file": r["file"], "caption": r.get("caption", ""), "credit": r.get("on-screen credit") or r.get("credit", "")}
                 for r in csv.DictReader(open(sheet, encoding="utf-8-sig"))] if os.path.isfile(sheet) else
                [{"file": f} for f in sorted(os.listdir(folder)) if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))])
        for r in rows:
            src = os.path.join(folder, r["file"])
            if not os.path.isfile(src): continue
            pid = pid_of(r["file"]); im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
            for suffix, size in ((".jpg", 1600), (".t.jpg", 240)):
                q = im.copy(); q.thumbnail((size, size)); q.save(os.path.join(a.out_pics, pid + suffix), quality=86)
            library.append({"id": pid, "file": r["file"], "w": im.width, "h": im.height, "caption": r.get("caption", ""), "credit": r.get("credit", ""), "shared": True})
page = open(os.path.join(here, "template.html"), encoding="utf-8").read()
esc = lambda s: s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")
payload = {k: d.get(k) for k in ("version", "sentences", "changes", "general", "questions", "good", "preview", "mode", "audio")}
payload["library"] = library
_lay = os.path.join(here, "..", "storyboard", "layouts")   # the layout chooser's example clips and stills
if os.path.isdir(_lay):
    import shutil; shutil.copytree(_lay, os.path.join(os.path.dirname(os.path.abspath(out)), "layouts"), dirs_exist_ok=True)
if a.library_link: payload["libraryLink"] = a.library_link
page = (page.replace("__TITLE__", esc(d["title"])).replace("__VIDEO__", esc(d["video"])).replace("__ACCENT__", d.get("accent", "#3a4720"))
        .replace("__DATA__", json.dumps(payload, ensure_ascii=False).replace("</", "<\\/")))
open(out, "w", encoding="utf-8").write(page)
print("wrote", out, "-", len(d["sentences"]), "sentences,", len(d.get("changes", {})), "changes,", len(d.get("questions", [])), "questions,", len(library), "photos")
