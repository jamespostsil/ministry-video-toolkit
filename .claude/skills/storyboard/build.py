"""Build the storyboard page (rule G15): every shot's real screenshot with its highlight boxes, the lines said
over it (editable in place), Script and On-screen notes per line, notes pinned (click) or arrows drawn (drag)
on the picture, what changed since the last draft marked
word by word, and an Approve button. Published as an artifact with the db capability.

  python -I build.py <storyboard.json> <out folder> [--pictures DIR] [--boxes FILE] [--drafts DIR]
                     [--subtitle TEXT] [--accent #hex] [--hero #hex]

storyboard.json: {"title", "draft": N, "shots": [{"id", "key"?, "section", "note"?, "lines": [...],
  "en"?: [...], "boxes"?: [{x, y, w, h}]}]}
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
notes/general {text}, notes/approval-draft-<N> {approved, at}, spots/<id> {shot (key), x, y, text, kind?: "arrow",
x2, y2} (a note pinned to a spot on the shot's picture, or an arrow from x, y to the tip x2, y2; fractions of the picture).
"""
import argparse, difflib, json, os, re, shutil
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("storyboard"); ap.add_argument("out")
ap.add_argument("--pictures"); ap.add_argument("--boxes"); ap.add_argument("--drafts")
ap.add_argument("--subtitle", default="Real screenshots. Nothing has been recorded yet.")
ap.add_argument("--accent", default="#b0561c"); ap.add_argument("--hero", default="#9a4a17")
a = ap.parse_args()
base = os.path.dirname(os.path.abspath(a.storyboard))
pictures = a.pictures or os.path.join(base, "local", "storyboard")
drafts = a.drafts or os.path.join(base, "local", "drafts")
tpl = os.path.join(os.path.dirname(os.path.abspath(__file__)), "template.html")
sb = json.load(open(a.storyboard, encoding="utf-8"))
boxes = {s["id"]: s["boxes"] for s in json.load(open(a.boxes, encoding="utf-8"))["shots"]} if a.boxes else {}
os.makedirs(os.path.join(a.out, "shots"), exist_ok=True)
os.makedirs(os.path.join(a.out, "thumbs"), exist_ok=True)

draft = sb.get("draft", 1)
os.makedirs(drafts, exist_ok=True)
shutil.copy(a.storyboard, os.path.join(drafts, f"storyboard-draft-{draft}.json"))
prev_path = os.path.join(drafts, f"storyboard-draft-{draft - 1}.json")
prev = None
if os.path.exists(prev_path):
    p = json.load(open(prev_path, encoding="utf-8"))
    prev = {s.get("key", s["id"]): s["lines"] for s in p["shots"]}


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
    diffs = []
    if prev is not None:
        old = prev.get(key)
        for k, line in enumerate(s["lines"]):
            if old is None: diffs.append("new")              # a new shot
            elif k >= len(old): diffs.append("new")          # a new line
            elif old[k] != line: diffs.append(word_diff(old[k], line))
            else: diffs.append(None)
    shots.append({"img": img, "key": key, "section": s["section"], "note": s.get("note", ""),
                  "lines": s["lines"], "en": s.get("en", []), "boxes": s.get("boxes", boxes.get(img, [])), "diffs": diffs,
                  "isNew": prev is not None and key not in prev})

esc = lambda t: t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
data = {"title": sb.get("title", ""), "draft": draft, "since": draft - 1 if prev is not None else None, "shots": shots}
html = open(tpl, encoding="utf-8").read()
html = html.replace("/*DATA*/", json.dumps(data, ensure_ascii=False).replace("</", "<\\/"))
html = (html.replace("{{TITLE}}", esc(sb.get("title", ""))).replace("{{DRAFT}}", str(draft)).replace("{{SUBTITLE}}", esc(a.subtitle))
        .replace("{{ACCENT}}", a.accent).replace("{{HERO}}", a.hero))
open(os.path.join(a.out, "storyboard.html"), "w", encoding="utf-8").write(html)
n_changed = sum(1 for s in shots for d in s["diffs"] if d)
print(len(shots), "shots,", sum(len(s["lines"]) for s in shots), "lines,", n_changed, "changed since the last draft" if prev else "")
