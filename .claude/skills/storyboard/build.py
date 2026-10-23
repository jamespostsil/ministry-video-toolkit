"""Build a storyboard page from a data file.

  python build.py <data.json> <out.html>

data.json:
  {
    "title": "Ministry update, October: storyboard, draft 2",
    "draft": 2,                                   # db collections are lines-2 and draft-2
    "accent": "#5f4d72",                          # optional
    "intro": "...",                               # optional line under the title
    "lines": [
      {"n": 1, "section": "Opening", "text": "What is said", "was": "the wording before (only if it changed)",
       "image": "pics/01.jpg", "screen": "what is on screen, in words"},
      ...
    ]
  }
Pictures are published next to the page (Artifact `files`), at the paths given in "image".
"""
import json, os, sys
here = os.path.dirname(os.path.abspath(__file__))
data_path, out = sys.argv[1:3]
d = json.load(open(data_path, encoding="utf-8"))
for k in ("title", "draft", "lines"):
    if k not in d: raise SystemExit(f"data.json needs {k!r}")
base = os.path.dirname(os.path.abspath(data_path))
missing = [l["image"] for l in d["lines"] if l.get("image") and not os.path.isfile(os.path.join(base, l["image"]))]
if missing: print("warning: pictures not found next to data.json:", missing)
page = open(os.path.join(here, "template.html"), encoding="utf-8").read()
esc = lambda s: s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")
page = (page.replace("__TITLE__", esc(d["title"])).replace("__ACCENT__", d.get("accent", "#3a4720"))
        .replace("__DATA__", json.dumps({k: d.get(k) for k in ("draft", "intro", "lines")}, ensure_ascii=False).replace("</", "<\\/")))
open(out, "w", encoding="utf-8").write(page)
print("wrote", out, "-", len(d["lines"]), "lines")
