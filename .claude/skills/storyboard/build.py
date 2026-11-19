"""Build the storyboard page: every shot's real picture with its highlight boxes, the lines said over it (editable
in place), the photos shown with those lines (drag to reorder, each with its caption, credit and permission), the
words that appear on screen (editable), one Note box per card, notes pinned (click) or arrows drawn
(drag) on the picture, what changed since the last draft marked word by word, Published as
an artifact with the db capability.

  python -I build.py <storyboard.json> <out folder> [--pictures DIR] [--photos DIR] [--crops FILE] [--boxes FILE]
                     [--drafts DIR] [--logo PNG] [--subtitle TEXT] [--accent #hex] [--hero #hex]

storyboard.json: {"title", "draft": N, "shots": [{"id", "key"?, "section", "beat"?, "note"?, "lines": [...],
  "en"?: [...], "boxes"?: [{x, y, w, h}], "pictures"?: [...], "screen"?: [...], "sketch"?: true}]}
  - beat: how the shot is shown, in plain words ("Row of 2 photos, each on its own words").
  - group, show: one card per screen. When something appears partway through (a row's second photo, a heading
    over a photo), split the lines there into cards with the same "group": the first card lists the photos and words,
    later ones repeat the photos (shared order) and list the words still showing plus any new ones (same label = same
    words, edited once). "show": how many of the row's photos are up by that card.
  - layout: how the page draws the screen for a shot with photos, the way the video's beat lays them out:
    "cover" (one photo, full screen), "blur" (one photo whole, over a blurred copy), "row" (side by side at a
    shared height, captions under; "maxHeight" in video pixels, default 760), "slider" (cards drifting across) or
    "scatter" (tilted cards under a title); or one of the newer ones: "grid" (4 to 9 photos in neat rows), "onebyone"
    (each fills the screen in turn), "stack" (large photos on one pile), "feature" (one large, the rest small beside
    it), "beforeafter" (2 photos, a line wiping across), "map" (each photo joined to its place: give those pictures
    "lat" and "lon"), "beside" (the speaker in a panel on one side, the photo on the other; "side": "right" swaps
    them) and "corner" (the photo on the whole screen, the speaker in a small window). For the last two the page
    crops the speaker out of the shot's own picture with the top-level "speaker" box ({x, y, w, h} as fractions of
    the frame: copy it from project.json), or the shot's own "speaker". It follows the reviewer's order, captions and permissions as they
    change them. The reviewer can change it with the card's "Layout" button, which shows a small example of each
    layout that suits the number of photos (layouts/*.mp4 and *.jpg, copied to the out folder).
  - pictures: the photos on screen with these lines, in order: [{"file", "caption"?, "credit"?, "rights"?: "ok" |
    "ask" | "credit" | "no", "rightsNote"?, "role"?, "lat"?, "lon"?}]. file is read from --photos, turned upright and cropped with its rectangle in
    --crops ({"<file>": {x, y, w, h, why?}}, in the upright photo's pixels); the page shows the crop and lets the
    reviewer see the whole photo. A shot with pictures shows them on the stage instead of its <id>.png, unless
    "sketch" is true: then <id>.png is a sketch of the planned graphic and is shown first.
  - screen: the words that appear on screen: [{"label", "text"}]. The page draws them on the picture where the video
    puts them, chosen by label: "Title card: top line" / "Title card: title" / "Title card: names" / "Title card: date";
    "Heading", "Subtitle", "Line N", "Word N", "Logo" (the --logo image) in the upper-left name plate; "Card" (the
    Thank you card); "Title" across the top (a row's or slider's title). Any other label is listed only.
    Photo captions and credits are drawn on their photo.
  - id: the picture's name: <pictures>/<id>.png (default pictures folder: local/storyboard beside the json).
  - key: what identifies the shot across drafts when its picture changes (default: id).
  - lines: the narration over the shot ([] for none). "[check]" in a line shows "to check in the app".
  - en: one English line per narration line, for videos narrated in another language (shown under each
    line and as a subtitle under the picture).
  - boxes: highlight boxes as fractions of the picture (0..1). Or pass --boxes, a file of
    {"shots": [{"id", "boxes"}]} (what a product's screenshot script measured).
Each build keeps a copy of the draft in <drafts>/storyboard-draft-<N>.json (default local/drafts beside the
json); when the copy of draft N-1 is there, changed and new lines are marked.
The out folder gets storyboard.html, shots/*.png and thumbs/*.jpg: publish them together (files).
db: lines/<shot key>.<line n> {text (the reviewer's wording, or ""), note, screen, original, shot},
order/<shot key> {pics: [picture ids in the reviewer's order]}, pics/<picture id> {caption, credit, rights, file,
original: {caption, credit, rights}} (the reviewer's version of a picture's on-screen words and permission; the
picture id is the file name made safe, shared by every shot that uses that file), screen/<shot key>.<n> {label,
text, original} (the reviewer's wording of an on-screen text),
notes/general {text}, spots/<id> {shot (key), x, y, text, kind?: "arrow",
x2, y2} (a note pinned to a spot on the shot's picture, or an arrow from x, y to the tip x2, y2; fractions of the picture),
scenes/<id> {after (shot key), say, screen, createdAt} (a new scene the reviewer added after that shot: make its picture
and add it to the next draft), good/<doc> {good} (the reviewer's "Looks good": card-<key>),
layout/<group> {layout, original, photos} (the layout the reviewer chose for that moment's photos),
answers/<question id> {title, answer: "ok" | "change", note}. order/<group> also holds {removed: [picture ids],
added: [{id, file, w, h, asset?}]}: photos the reviewer took out or added (an "asset" is an upload in the page's
asset store, read it with the Artifact tool's read and path=<asset id>).
Optional in storyboard.json: "questions": [{"id", "title", "points": [...], "img"?, "at"?: shot key}] (what Claude
needs the reviewer's OK on, answered on the page: never a separate status page), "good": [shot keys] (cards marked
good in the last draft and unchanged since: they start folded), "mode": "detailed" (open in Detailed instead of Simple; Simple is each scene's picture,
what is said and a Note; default "simple"; a link ending #simple or
#detailed opens that mode).
With --photos, every photo in that folder is offered under "+ Add a photo".
Publish with capabilities {db: {}, assets: {}} so uploads work.
"""
import argparse, difflib, json, os, re, shutil, sys
from PIL import Image, ImageOps

for _s in (sys.stdout, sys.stderr):   # Windows pipes are cp1252: names in other scripts must not crash a run
    try: _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception: pass

ap = argparse.ArgumentParser()
ap.add_argument("storyboard"); ap.add_argument("out")
ap.add_argument("--pictures"); ap.add_argument("--boxes"); ap.add_argument("--drafts")
ap.add_argument("--photos"); ap.add_argument("--crops"); ap.add_argument("--logo")
ap.add_argument("--end-from", help="a previous video's project folder (with its partner.ts): the end screen starts filled in from its photo, QR code, logo, name and web address")
ap.add_argument("--no-logos", action="store_true", help="do not offer the Wycliffe logo under + Add a photo")
ap.add_argument("--library", action="append", default=[], help="a shared photo folder offered under + Add a photo (repeatable)")
ap.add_argument("--library-link", help="web link to the shared photo folder, shown in the Shared photos tab")
ap.add_argument("--no-library", action="store_true", help="leave the shared People with Bibles photos out (found on this computer by default)")
ap.add_argument("--subtitle", default="Real screenshots. Nothing has been recorded yet.")
ap.add_argument("--accent", default="#b0561c"); ap.add_argument("--hero", default="#9a4a17")
a = ap.parse_args()
if not a.library and not a.no_library:   # the shared "People with Bibles" photos, when they are on this computer
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "."))
    import shared_photos
    _shared = shared_photos.find()
    if _shared: a.library = [_shared]; a.library_link = a.library_link or shared_photos.LINK; print("shared photos:", _shared)
    else: print("NOTE:", shared_photos.MISSING)   # no Shared photos tab: it is only for SIL/Wycliffe staff (--library-link adds its help)
base = os.path.dirname(os.path.abspath(a.storyboard))
pictures = a.pictures or os.path.join(base, "local", "storyboard")
drafts = a.drafts or os.path.join(base, "local", "drafts")
tpl = os.path.join(os.path.dirname(os.path.abspath(__file__)), "template.html")
sb = json.load(open(a.storyboard, encoding="utf-8"))
boxes = {s["id"]: s["boxes"] for s in json.load(open(a.boxes, encoding="utf-8"))["shots"]} if a.boxes else {}
os.makedirs(os.path.join(a.out, "shots"), exist_ok=True)
os.makedirs(os.path.join(a.out, "thumbs"), exist_ok=True)
os.makedirs(os.path.join(a.out, "pics"), exist_ok=True)
_lay = os.path.join(os.path.dirname(os.path.abspath(__file__)), "layouts")   # the layout chooser's example clips and stills
if os.path.isdir(_lay): shutil.copytree(_lay, os.path.join(a.out, "layouts"), dirs_exist_ok=True)
crops = json.load(open(a.crops, encoding="utf-8")) if a.crops else {}
REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
PUBLIC = os.path.join(REPO, "remotion", "public")
if a.end_from:   # a later video: the end screen starts as the last one ended (photo, QR code, logo, words)
    _t = open(os.path.join(a.end_from, "partner.ts"), encoding="utf-8").read()
    _g = lambda k: (re.search(k + r'\s*:\s*"([^"]*)"', _t) or [None, None])[1]
    _crop = re.search(r"photoCrop\s*:\s*\{([^}]*)\}", _t)
    for _sh in sb["shots"]:
        if _sh.get("layout") != "ending" or _sh.get("pictures"): continue
        _pics = []
        for _role, _key in (("photo", "photo"), ("qr", "qr"), ("logo", "logo")):
            _f = _g(_key)
            if _f and os.path.isfile(os.path.join(PUBLIC, _f)):
                _pics.append({"file": os.path.basename(_f), "dir": os.path.dirname(os.path.join(PUBLIC, _f)), "rights": "ok", "role": _role})
                if _role == "photo" and _crop and os.path.basename(_f) not in crops:
                    _n = {k: int(v) for k, v in re.findall(r"(\w+)\s*:\s*(\d+)", _crop.group(1))}
                    if {"x", "y", "width", "height"} <= set(_n): crops[os.path.basename(_f)] = {"x": _n["x"], "y": _n["y"], "w": _n["width"], "h": _n["height"], "why": "Cropped to the card's shape, as in the last video"}
        if _pics: _sh["pictures"] = _pics
        if not _sh.get("screen"):
            _sh["screen"] = [{"label": l, "text": _g(k)} for l, k in (("Heading", "headline"), ("Line 1", "name"), ("Line 2", "web")) if _g(k)]

draft = sb.get("draft", 1)
os.makedirs(drafts, exist_ok=True)
shutil.copy(a.storyboard, os.path.join(drafts, f"storyboard-draft-{draft}.json"))
prev_path = os.path.join(drafts, f"storyboard-draft-{draft - 1}.json")
prev = prev_screen = None
if os.path.exists(prev_path):
    p = json.load(open(prev_path, encoding="utf-8"))
    prev = {s.get("key", s["id"]): s["lines"] for s in p["shots"]}
    prev_screen = {s.get("key", s["id"]): [x["text"] for x in s.get("screen", [])] for s in p["shots"]}


def word_diff(old, new):
    """[[op, text]] with op "=", "+" or "-", by words (spaces stay with the words around them)."""
    x, y = re.findall(r"\S+\s*", old), re.findall(r"\S+\s*", new)
    out = []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, x, y, autojunk=False).get_opcodes():
        if op == "equal":
            out.append(["=", "".join(x[i1:i2])])
        else:
            if i2 > i1: out.append(["-", "".join(x[i1:i2])])
            if j2 > j1: out.append(["+", "".join(y[j1:j2])])
    return out


def line_diffs(old, new):
    """Per line: None (same), "new", or a word diff against the last draft ([] when there is no last draft)."""
    if prev is None: return []
    return ["new" if old is None or k >= len(old) else word_diff(old[k], t) if old[k] != t else None for k, t in enumerate(new)]


def shared_library(folder):
    """A shared photo folder for "+ Add a photo": the photos listed in its photo-credits.csv (file, caption,
    on-screen credit), or every photo in it when there is no sheet. These are cleared to use (permission "ok")."""
    import csv
    sheet = os.path.join(folder, "photo-credits.csv")
    if os.path.isfile(sheet):
        rows = list(csv.DictReader(open(sheet, encoding="utf-8-sig")))
        return [{"file": r["file"], "caption": r.get("caption", ""), "credit": r.get("on-screen credit") or r.get("credit", "")}
                for r in rows if os.path.isfile(os.path.join(folder, r["file"]))]
    return [{"file": f} for f in sorted(os.listdir(folder)) if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))]


pics_done = {}
def picture(p):
    """Copy one photo in, upright and cropped; return what the page needs to know about it."""
    pid = re.sub(r"[^A-Za-z0-9]+", "-", os.path.splitext(p["file"])[0]).strip("-").lower()
    if pid not in pics_done:
        if not a.photos and not p.get("dir"): raise SystemExit("shots have pictures: pass --photos <folder>")
        src = os.path.join(p.get("dir") or a.photos, p["file"])
        if not os.path.isfile(src): raise SystemExit(f"no photo {src}")
        raw = ImageOps.exif_transpose(Image.open(src)).convert("RGBA")
        # transparent pictures (a logo, a QR code) are laid on the colour they sit on in the video: black (the page screen-blends it away) for a "logo", white otherwise
        # end screen for a "logo", white otherwise, since the page's pictures are JPEG
        flat = Image.new("RGB", raw.size, (0, 0, 0) if p.get("role") == "logo" else (255, 255, 255)); flat.paste(raw, mask=raw.split()[3])
        whole = flat
        c = crops.get(p["file"])
        im = whole.crop((c["x"], c["y"], c["x"] + c["w"], c["y"] + c["h"])) if c else whole
        for name, pic, size in [(pid, im, 1600), (pid + ".t", im, 240)] + ([(pid + ".whole", whole, 1600)] if c else []):
            pic = pic.copy(); pic.thumbnail((size, size)); pic.save(os.path.join(a.out, "pics", name + ".jpg"), quality=86)
        pics_done[pid] = {"w": im.width, "h": im.height, "cropped": bool(c), "cropWhy": (c or {}).get("why", "")}
    place = {k: p[k] for k in ("lat", "lon") if isinstance(p.get(k), (int, float))}   # where it was taken, for "On a map"
    return {"id": pid, "file": p["file"], "caption": p.get("caption", ""), "credit": p.get("credit", ""),
            "rights": p.get("rights", "ok"), "rightsNote": p.get("rightsNote", ""), **({"role": p["role"]} if p.get("role") else {}), **place, **pics_done[pid]}


shots = []
for s in sb["shots"]:
    img = s["id"]
    key = s.get("key", img)
    src = os.path.join(pictures, img + ".png")
    if not os.path.isfile(src): raise SystemExit(f"no picture for shot {img}: {src}")
    shutil.copy(src, os.path.join(a.out, "shots", img + ".png"))
    im = Image.open(src).convert("RGB")
    im.thumbnail((360, 203))
    im.save(os.path.join(a.out, "thumbs", img + ".jpg"), quality=82)
    diffs = line_diffs(prev.get(key) if prev is not None else None, s["lines"])
    screen = s.get("screen", [])
    sdiffs = line_diffs(prev_screen.get(key) if prev is not None else None, [x["text"] for x in screen])
    pics = [picture(p) for p in s.get("pictures", [])]
    shots.append({"img": img, "key": key, "section": s["section"], "beat": s.get("beat", ""), "layout": s.get("layout", ""), "maxHeight": s.get("maxHeight"), "group": s.get("group"), "show": s.get("show"), "side": s.get("side"), "speaker": s.get("speaker"), "note": s.get("note", ""),
                  "lines": s["lines"], "en": s.get("en", []), "boxes": s.get("boxes", boxes.get(img, [])), "diffs": diffs,
                  "pictures": pics, "sketch": bool(s.get("sketch")), "screen": screen, "sdiffs": sdiffs,
                  "isNew": prev is not None and key not in prev})

library = []
if a.photos:   # every photo in the script's folder, for "+ Add a photo"
    _lic = {}   # stock photos fetched by find-footage: their on-screen credit, filled in when one is added
    _lp = os.path.join(a.photos, "photo-licenses.csv")
    if os.path.isfile(_lp):
        import csv
        _lic = {r["file"]: r.get("on-screen credit", "") for r in csv.DictReader(open(_lp, encoding="utf-8-sig"))}
    for f in sorted(os.listdir(a.photos)):
        if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
            p = picture({"file": f}); library.append({**{k: p[k] for k in ("id", "file", "w", "h", "cropped")}, **({"credit": _lic[f]} if _lic.get(f) else {})})
_seen = {}   # the script's own order: each photo's first appearance across the shots
for _s in sb["shots"]:
    for _p in _s.get("pictures", []): _seen.setdefault(_p["file"], len(_seen))
library.sort(key=lambda q: (0, _seen[q["file"]], "") if q["file"] in _seen else (1, 0, q["file"].lower()))   # in the script (script order), then the rest A to Z
for q in library: q["inScript"] = q["file"] in _seen
for folder in a.library:   # shared photos (people with Bibles...), with their caption and credit filled in
    for q in shared_library(folder):
        p = picture({**q, "dir": folder}); library.append({**{k: p[k] for k in ("id", "file", "w", "h", "cropped", "caption", "credit")}, "shared": True})
if not a.no_logos:   # the Wycliffe logo the toolkit carries, offered for the end screen's logo box
    _bd = os.path.join(PUBLIC, "brand")
    for _f in (sorted(os.listdir(_bd)) if os.path.isdir(_bd) else []):
        if _f.lower().endswith(".png") and "logo" in _f.lower():
            _p = picture({"file": _f, "dir": _bd, "role": "logo", "caption": "Wycliffe logo (white)", "rightsNote": "Use only as Wycliffe's brand guidelines allow."})
            if not any(q["id"] == _p["id"] for q in library): library.append({**{k: _p[k] for k in ("id", "file", "w", "h", "cropped")}, "role": "logo", "caption": "Wycliffe logo (white)", "brand": True, "inScript": False})
keys = {s["key"] for s in shots}
bad = [q.get("at") for q in sb.get("questions", []) if q.get("at") not in (None, *keys)]
if bad: raise SystemExit(f"questions for unknown shots: {bad}")

esc = lambda t: t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
data = {"title": sb.get("title", ""), "draft": draft, "since": draft - 1 if prev is not None else None, "shots": shots,
        "library": library, "questions": sb.get("questions", []), "good": sb.get("good", []), "mode": sb.get("mode", "simple")}
if a.library_link: data["libraryLink"] = a.library_link
if sb.get("speaker"): data["speaker"] = sb["speaker"]   # where the speaker is in the footage (project.json "speaker")
if a.logo:   # drawn under a name plate whose words include a "Logo" item
    dst = os.path.join(a.out, "logo.png")
    if not os.path.exists(dst) or not os.path.samefile(a.logo, dst): shutil.copy(a.logo, dst)
    data["logo"] = "logo.png"
html = open(tpl, encoding="utf-8").read()
html = html.replace("/*DATA*/", json.dumps(data, ensure_ascii=False).replace("</", "<\\/"))
html = (html.replace("{{TITLE}}", esc(sb.get("title", ""))).replace("{{DRAFT}}", str(draft)).replace("{{SUBTITLE}}", esc(a.subtitle))
        .replace("{{ACCENT}}", a.accent).replace("{{HERO}}", a.hero))
open(os.path.join(a.out, "storyboard.html"), "w", encoding="utf-8").write(html)
n_changed = sum(1 for s in shots for d in s["diffs"] + s["sdiffs"] if d)
print(len(shots), "shots,", sum(len(s["lines"]) for s in shots), "lines,", len(pics_done), "photos,", n_changed, "changed since the last draft" if prev else "")
