"""Build a video review page from a data file.

  python build.py <data.json> <out.html>

data.json:
  {
    "title": "Ministry update, October: v2",
    "video": "ministry-update-v2-web.mp4",          # published next to the page
    "version": 2,                                    # db collections are sentences-v2, pins-v2, notes-v2
    "accent": "#5f4d72",                             # optional, the page's main colour
    "sentences": [{"id": "1.1", "text": "...", "t": 3.5}, ...],   # t: when it starts in the video (s)
    "changes": {"1.1": "What changed here since the last version"},  # optional
    "general": "A one-line note shown above the video"                # optional
  }
"""
import json, os, sys
here = os.path.dirname(os.path.abspath(__file__))
data_path, out = sys.argv[1:3]
d = json.load(open(data_path, encoding="utf-8"))
for k in ("title", "video", "version", "sentences"):
    if k not in d: raise SystemExit(f"data.json needs {k!r}")
ids = {s["id"] for s in d["sentences"]}
bad = [k for k in d.get("changes", {}) if k not in ids]
if bad: raise SystemExit(f"changes for unknown sentences: {bad}")
page = open(os.path.join(here, "template.html"), encoding="utf-8").read()
esc = lambda s: s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")
page = (page.replace("__TITLE__", esc(d["title"])).replace("__VIDEO__", esc(d["video"])).replace("__ACCENT__", d.get("accent", "#3a4720"))
        .replace("__DATA__", json.dumps({k: d.get(k) for k in ("version", "sentences", "changes", "general")}, ensure_ascii=False).replace("</", "<\\/")))
open(out, "w", encoding="utf-8").write(page)
print("wrote", out, "-", len(d["sentences"]), "sentences,", len(d.get("changes", {})), "changes")
