"""Find open-licence stock video clips (B-roll), look at them, and fetch the chosen ones.

    python -I find_footage.py search  <work folder> <keyword> [<keyword> ...] [--sources coverr,mixkit,pexels,pixabay]
    python -I find_footage.py picker  <work folder> <key> [<key> ...] [--title "..."] [--note KEY="why it fits" ...]
    python -I find_footage.py fetch   <work folder> <key> [<key> ...] --to <remotion/public/clips>

search   Searches each source for each keyword and keeps only clips whose licence lets anyone use them in a
         ministry video, including one that asks for support, with no credit required:
           Coverr   free clips only (Premium, AI-generated and vertical clips are left out)
           Mixkit   "Mixkit Free License" clips only ("Restricted License" means personal use only)
           Pexels   needs PEXELS_API_KEY (free at pexels.com/api); every clip is under the Pexels License
           Pixabay  needs PIXABAY_API_KEY (free at pixabay.com/api/docs); every clip is under the Pixabay Content License
         (The two keys can be environment variables or lines in remotion/.env.)
         Adds them to <work folder>/candidates.json (each with a short key such as k007) and writes numbered contact
         sheets, sheets/<keyword>-<n>.jpg, for Claude to look at. Sources that block searching are reported, not retried.
picker   Makes a short looping preview of each chosen clip and picker/picker.html, a page where the person marks the
         clips they want (publish it with the capability {db: {}}; their choices are the db collection "picks").
fetch    Downloads the full-size files as <key>.mp4 into --to, with a poster frame <key>.jpg, and appends each clip's
         source, page and licence to clip-licenses.csv there. Keep that file: it is the record that you may use them.

Needs ffmpeg and ffprobe on the PATH, and Pillow (pip install pillow).
"""
import argparse, csv, html, io, json, os, re, shutil, subprocess, sys, time, urllib.error, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36"}
LICENCES = {
    "Coverr": ("Coverr licence: free for commercial use, no credit needed", "https://coverr.co/license"),
    "Mixkit": ("Mixkit Free License: free for commercial use, no credit needed", "https://mixkit.co/license/#videoFree"),
    "Pexels": ("Pexels License: free for commercial use, no credit needed", "https://www.pexels.com/license/"),
    "Pixabay": ("Pixabay Content License: free for commercial use, no credit needed", "https://pixabay.com/service/license-summary/"),
}


class Blocked(Exception):
    pass


def load_env():
    """PEXELS_API_KEY / PIXABAY_API_KEY may also sit in remotion/.env, beside the transcription and music keys
    (a .env at the toolkit's top level works too)."""
    for env in (os.path.join(HERE, "..", "..", "..", "remotion", ".env"), os.path.join(HERE, "..", "..", "..", ".env")):
        if not os.path.exists(env): continue
        for line in open(env, encoding="utf-8"):
            k, sep, v = line.strip().partition("=")
            if sep and k in ("PEXELS_API_KEY", "PIXABAY_API_KEY") and not os.environ.get(k):
                os.environ[k] = v.strip().strip('"').strip("'")


def get(url, headers=None, timeout=30):
    req = urllib.request.Request(url, headers={**UA, **(headers or {})})
    try:
        return urllib.request.urlopen(req, timeout=timeout).read()
    except urllib.error.HTTPError as e:
        if e.code in (403, 429):
            raise Blocked(f"{e.code} {e.reason}")
        raise


def text(url, **kw):
    return get(url, **kw).decode("utf-8", "replace")


# ---------- sources: each returns a list of {src, id, title, page, thumb, preview, full, duration} ----------

def coverr(kw):
    h = text(f"https://coverr.co/stock-video-footage/{urllib.parse.quote(kw)}")
    out = []
    # Each clip is a JSON record in the page; the topic page also lists unrelated popular clips, so Claude must look.
    for m in re.finditer(r'"title":"([^"]{3,160})"(?:(?!"title":).){0,3000}?"thumbnail":"([^"]+)"(?:(?!"title":).){0,200}?'
                         r'"duration":"([\d.]+)"(?:(?!"title":).){0,400}?"mp4":"([^"]+)","mp4Preview":"([^"]+)"'
                         r'(?:(?!"title":).){0,400}?"isPremium":(true|false),(?:(?!"title":).){0,80}?"isAiGenerated":(true|false),"slug":"([^"]+)"', h):
        title, thumb, dur, full, prev, prem, ai, slug = m.groups()
        if prem == "true" or ai == "true" or '"isVertical":true' in m.group(0):
            continue
        out.append(dict(src="Coverr", id=slug, title=html.unescape(title).strip(), page=f"https://coverr.co/videos/{slug}",
                        thumb=thumb.replace("width=640", "width=320"), preview=prev, full=full, duration=float(dur)))
    return out


def mixkit(kw):
    h = text(f"https://mixkit.co/free-stock-video/{urllib.parse.quote(kw)}/")
    out = []
    for slug, vid in dict.fromkeys(re.findall(r'href="/free-stock-video/([a-z0-9-]+)-(\d+)/"', h)):
        out.append(dict(src="Mixkit", id=vid, title=slug.replace("-", " ").capitalize(),
                        page=f"https://mixkit.co/free-stock-video/{slug}-{vid}/",
                        thumb=f"https://assets.mixkit.co/videos/{vid}/{vid}-thumb-360-0.jpg",
                        preview=f"https://assets.mixkit.co/videos/{vid}/{vid}-360.mp4",
                        full=f"https://assets.mixkit.co/videos/{vid}/{vid}-1080.mp4", duration=None))
    # Each clip's own page says which licence it is under. Mixkit blocks quick bursts, so go slowly.
    keep = []
    for c in out:
        time.sleep(2)
        lic = re.search(r'data-license="(video[A-Za-z]+)"', text(c["page"]))
        if lic and lic.group(1) == "videoFree":
            keep.append(c)
    return keep


def pexels(kw):
    key = os.environ.get("PEXELS_API_KEY")
    if not key:
        raise Blocked("no PEXELS_API_KEY")
    d = json.loads(text(f"https://api.pexels.com/videos/search?query={urllib.parse.quote(kw)}&per_page=40&orientation=landscape",
                        headers={"Authorization": key}))
    out = []
    for v in d.get("videos", []):
        files = sorted((f for f in v.get("video_files", []) if f.get("width") and f.get("link")), key=lambda f: f["width"])
        if not files:
            continue
        full = ([f for f in files if f["width"] <= 1920] or files)[-1]["link"]
        prev = ([f for f in files if f["width"] >= 480] or files)[0]["link"]
        slug = v.get("url", "").rstrip("/").split("/")[-1]
        out.append(dict(src="Pexels", id=str(v["id"]), title=slug.rsplit("-", 1)[0].replace("-", " ").capitalize() or f"Pexels {v['id']}",
                        page=v.get("url", ""), thumb=v.get("image", ""), preview=prev, full=full, duration=v.get("duration")))
    return out


CACHE = None   # <work folder>/cache, set by search: Pixabay asks that answers be kept for 24 hours, not asked again


def pixabay(kw):
    """Pixabay's rules (pixabay.com/api/docs): at most 100 requests a minute, answers cached for 24 hours, real
    searches only (no mass downloads), and say where the clips are from wherever results are shown (the picker
    labels each clip and links to its Pixabay page). One request per keyword here."""
    key = os.environ.get("PIXABAY_API_KEY")
    if not key:
        raise Blocked("no PIXABAY_API_KEY")
    kw = kw[:100]   # the API takes at most 100 characters
    cached = os.path.join(CACHE, "pixabay-" + re.sub(r"[^a-z0-9]+", "-", kw.lower()).strip("-") + ".json") if CACHE else None
    if cached and os.path.exists(cached) and time.time() - os.path.getmtime(cached) < 24 * 3600:
        d = json.load(open(cached, encoding="utf-8"))
    else:
        d = json.loads(text(f"https://pixabay.com/api/videos/?key={key}&q={urllib.parse.quote(kw)}&per_page=40&safesearch=true"))
        if cached:
            os.makedirs(CACHE, exist_ok=True)
            json.dump(d, open(cached, "w", encoding="utf-8"))
    out = []
    for v in d.get("hits", []):
        vs = v.get("videos", {})
        full = (vs.get("medium") or {}).get("url") or (vs.get("large") or {}).get("url")   # 1080p first; 4K is far bigger
        prev = (vs.get("small") or {}).get("url") or full
        thumb = next((s.get("thumbnail") for s in (vs.get("small"), vs.get("medium"), vs.get("tiny")) if s and s.get("thumbnail")), "")
        if not full:
            continue
        tags = (v.get("tags") or "").lower()
        if any(t in tags for t in ("green screen", "greenscreen", "chroma", "ai generated", "ai-generated")):
            continue   # green-screen clips are for compositing, not B-roll; AI-made clips are left out as on Coverr
        out.append(dict(src="Pixabay", id=str(v["id"]), title=(v.get("tags") or f"Pixabay {v['id']}").capitalize(),
                        page=v.get("pageURL", ""), thumb=thumb, preview=prev, full=full, duration=v.get("duration")))
    return out


SOURCES = {"coverr": coverr, "mixkit": mixkit, "pexels": pexels, "pixabay": pixabay}


# ---------- helpers ----------

def load(work):
    p = os.path.join(work, "candidates.json")
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else []


def save(work, cands):
    with open(os.path.join(work, "candidates.json"), "w", encoding="utf-8") as f:
        json.dump(cands, f, indent=1, ensure_ascii=False)


def sheet(cands, path):
    from PIL import Image, ImageDraw, ImageFont
    W, H, C = 320, 180, 6
    rows = (len(cands) + C - 1) // C
    img = Image.new("RGB", (W * C, H * rows), "white")
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("arialbd.ttf", 22)
    except OSError:
        font = ImageFont.load_default()
    for i, c in enumerate(cands):
        x, y = (i % C) * W, (i // C) * H
        try:
            im = Image.open(io.BytesIO(get(c["thumb"]))).convert("RGB") if c["thumb"] else None
        except Exception:
            im = None
        if im:
            img.paste(im.resize((W, H)), (x, y))
        d.rectangle([x, y, x + 62, y + 28], fill="black")
        d.text((x + 4, y + 2), c["key"], fill="yellow", font=font)
    img.save(path, quality=80)


def ff(*args):
    subprocess.run(["ffmpeg", "-y", "-v", "error", *args], check=True)


def duration(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                       capture_output=True, text=True)
    try:
        return float(r.stdout.strip())
    except ValueError:
        return 0.0


def pick(cands, keys):
    by = {c["key"]: c for c in cands}
    missing = [k for k in keys if k not in by]
    if missing:
        sys.exit(f"Not in candidates.json: {', '.join(missing)}")
    return [by[k] for k in keys]


# ---------- commands ----------

def cmd_search(a):
    global CACHE
    CACHE = os.path.join(a.work, "cache")
    os.makedirs(os.path.join(a.work, "sheets"), exist_ok=True)
    cands = load(a.work)
    seen = {(c["src"], c["id"]) for c in cands}
    n = max((int(c["key"][1:]) for c in cands), default=0)
    blocked = set()
    for kw in a.keywords:
        found = []
        for name in a.sources.split(","):
            if name in blocked:
                continue
            try:
                for c in SOURCES[name](kw):
                    if (c["src"], c["id"]) not in seen:
                        seen.add((c["src"], c["id"]))
                        n += 1
                        found.append({**c, "key": f"k{n:03d}", "keyword": kw})
            except Blocked as e:
                blocked.add(name)
                print(f"  {name}: skipped ({e})")
            except Exception as e:
                print(f"  {name} / {kw}: {e}")
        cands += found
        save(a.work, cands)
        safe = re.sub(r"[^a-z0-9]+", "-", kw.lower()).strip("-")
        for i in range(0, len(found), 36):
            p = os.path.join(a.work, "sheets", f"{safe}-{i // 36 + 1}.jpg")
            sheet(found[i:i + 36], p)
            print(p)
        print(f"{kw}: {len(found)} new clips")


def cmd_picker(a):
    cands = load(a.work)
    chosen = pick(cands, a.keys)
    notes = dict(x.split("=", 1) for x in a.note)
    out = os.path.join(a.work, "picker")
    os.makedirs(os.path.join(out, "v"), exist_ok=True)
    clips = []
    for c in chosen:
        raw = os.path.join(a.work, "raw", c["key"] + ".mp4")
        os.makedirs(os.path.dirname(raw), exist_ok=True)
        if not os.path.exists(raw):
            open(raw, "wb").write(get(c["preview"], timeout=120))
        dur = duration(raw)
        ss = max(0.0, dur / 2 - 3)
        v = os.path.join(out, "v", c["key"])
        ff("-ss", f"{ss:.2f}", "-i", raw, "-t", "6", "-an", "-vf", "scale=480:-2,fps=24", "-c:v", "libx264", "-crf", "30",
           "-preset", "slow", "-movflags", "+faststart", "-pix_fmt", "yuv420p", v + ".mp4")
        ff("-ss", f"{ss + 1:.2f}", "-i", raw, "-frames:v", "1", "-vf", "scale=480:-2", "-q:v", "5", v + ".jpg")
        clips.append({"key": c["key"], "src": c["src"], "title": c["title"], "page": c["page"],
                      "note": notes.get(c["key"], ""), "group": c.get("keyword", ""),
                      "duration": round(c.get("duration") or dur, 1)})
    terms = [{"src": s, "text": LICENCES[s][0], "url": LICENCES[s][1]} for s in dict.fromkeys(c["src"] for c in chosen)]
    page = open(os.path.join(HERE, "picker-template.html"), encoding="utf-8").read()
    data = json.dumps({"title": a.title, "clips": clips, "terms": terms}, ensure_ascii=False).replace("</", "<\\/")
    open(os.path.join(out, "picker.html"), "w", encoding="utf-8").write(page.replace("__DATA__", data))
    print(os.path.join(out, "picker.html"))
    print("Publish it with capabilities {db: {}} and every file in v/ as a published file.")


def cmd_fetch(a):
    cands = load(a.work)
    os.makedirs(a.to, exist_ok=True)
    log = os.path.join(a.to, "clip-licenses.csv")
    new = not os.path.exists(log)
    with open(log, "a", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        if new:
            w.writerow(["file", "source", "title", "page", "licence", "licence link", "downloaded"])
        for c in pick(cands, a.keys):
            dst = os.path.join(a.to, c["key"] + ".mp4")
            open(dst, "wb").write(get(c["full"], timeout=600))
            ff("-ss", f"{min(1.0, duration(dst) / 2):.2f}", "-i", dst, "-frames:v", "1", "-q:v", "3",
               os.path.join(a.to, c["key"] + ".jpg"))
            lic, url = LICENCES[c["src"]]
            w.writerow([c["key"] + ".mp4", c["src"], c["title"], c["page"], lic, url, time.strftime("%Y-%m-%d")])
            print(f"{dst}  ({duration(dst):.1f}s)")


def main():
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg isn't on the PATH. Install it (SETUP.md) and try again.")
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("search")
    s.add_argument("work")
    s.add_argument("keywords", nargs="+")
    s.add_argument("--sources", default="coverr,mixkit,pexels,pixabay")
    s.set_defaults(fn=cmd_search)
    k = sub.add_parser("picker")
    k.add_argument("work")
    k.add_argument("keys", nargs="+")
    k.add_argument("--title", default="Video clips to choose from")
    k.add_argument("--note", action="append", default=[], help='KEY="why it fits this moment"')
    k.set_defaults(fn=cmd_picker)
    f = sub.add_parser("fetch")
    f.add_argument("work")
    f.add_argument("keys", nargs="+")
    f.add_argument("--to", required=True)
    f.set_defaults(fn=cmd_fetch)
    a = p.parse_args()
    load_env()
    a.fn(a)


if __name__ == "__main__":
    main()
