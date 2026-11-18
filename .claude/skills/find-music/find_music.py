"""Find free music a ministry video may use, put it on a page to listen to and rate, and fetch the chosen tracks.

    python -I find_music.py search  <work folder> <keyword> [<keyword> ...] [--sources mixkit,incompetech,ccmixter[,openverse]]
    python -I find_music.py picker  <work folder> <key> [<key> ...] [--title "..."] [--voice <voice.mp3>] [--note KEY="why"]
    python -I find_music.py fetch   <work folder> <key> [<key> ...] --to <remotion/public/audio>

search   Searches each source and keeps only tracks whose licence lets a non-profit ministry use them as a music bed
         in a video posted online, including one that invites people to partner:
           Mixkit       Mixkit Stock Music Free License: online video, commercial or not, no credit needed (not for
                        DVDs or TV broadcast). Its search matches moods and genres: use one or two words.
           Incompetech  Kevin MacLeod, CC BY 4.0: credit required
           ccMixter     CC BY or CC BY-NC tracks only: credit required
           Openverse    (only when asked for) Creative Commons music from Jamendo, Freesound and Wikimedia: CC0, CC BY
                        or CC BY-NC only. Most of its music is ND or SA, and it blocks anonymous searching after a few
                        requests, so it adds little.
         Left out everywhere: ND licences (Creative Commons counts music under a video as an adaptation, which ND
         forbids), SA licences (the whole video would have to take the same licence), and tracks under a minute.
         Adds them to <work folder>/candidates.json, each with a key such as m007, with its licence and credit line.
picker   Cuts a 45-second preview of each chosen track (from its start, faded out) and writes picker/picker.html: a
         list to play (alone, or quietly under the video's own voice with --voice), search, filter by mood, style,
         length and credit, mark Use / Maybe / Remove and leave a note. Publish it with the capability {db: {}} and
         the files in a/. The db collection "picks" holds the choices and notes; "requests" holds anything the person
         asked Claude to search for (run those searches, then rebuild and republish the page).
fetch    Downloads the full tracks as <key>.mp3 into --to and appends each one's source, licence and credit line to
         music-licenses.csv there. Keep that file: it is the record that you may use them, and the credit lines go
         in the video's description (description skill).

Needs ffmpeg and ffprobe on the PATH.
"""
import argparse, csv, html, json, os, re, shutil, subprocess, sys, time, urllib.error, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36"}
MIN_SECONDS = 60
CC = {"cc0": ("CC0", "https://creativecommons.org/publicdomain/zero/1.0/"),
      "by": ("CC BY", "https://creativecommons.org/licenses/by/{v}/"),
      "by-nc": ("CC BY-NC", "https://creativecommons.org/licenses/by-nc/{v}/")}


class Blocked(Exception):
    pass


def get(url, timeout=30, referer=None):
    req = urllib.request.Request(url, headers={**UA, **({"Referer": referer} if referer else {})})
    try:
        return urllib.request.urlopen(req, timeout=timeout).read()
    except urllib.error.HTTPError as e:
        if e.code in (401, 403, 429):
            raise Blocked(f"{e.code} {e.reason}")
        raise


def text(url, **kw):
    return get(url, **kw).decode("utf-8", "replace")


def secs(s):
    """'PT1M34S', '00:02:31', '3:26' or a number of seconds."""
    if s is None or s == "":
        return None
    if isinstance(s, (int, float)):
        return float(s)
    m = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?", s)
    if m:
        h, mi, se = m.groups()
        return int(h or 0) * 3600 + int(mi or 0) * 60 + float(se or 0)
    parts = [float(p) for p in s.split(":")]
    t = 0.0
    for p in parts:
        t = t * 60 + p
    return t


def cc_track(src, tid, title, artist, page, audio, dur, code, ver):
    name, url = CC[code]
    url = url.format(v=ver or "4.0")
    lic = f"{name} {ver}".strip() if code != "cc0" else name
    credit = "" if code == "cc0" else f'"{title}" by {artist} ({page}), licensed under {lic}: {url}'
    return dict(src=src, id=str(tid), title=title, artist=artist, page=page, audio=audio, duration=dur,
                licence=lic, licence_url=url, credit=credit, needs_credit=code != "cc0")


# ---------- sources: each returns a list of tracks ----------

def mixkit(kw):
    h = text(f"https://mixkit.co/free-stock-music/discover/{urllib.parse.quote(kw)}/")
    out = []
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', h, re.S):
        try:
            d = json.loads(block)
        except ValueError:
            continue
        for g in d.get("@graph", [d]):
            for it in g.get("itemListElement", []) if isinstance(g, dict) else []:
                if it.get("@type") != "MusicRecording" or it.get("copyrightNotice") != "Mixkit Stock Music Free License":
                    continue
                m = re.search(r"/music/(\d+)/", it.get("url", ""))
                if not m:
                    continue
                tid = m.group(1)
                out.append(dict(src="Mixkit", id=tid, title=html.unescape(it.get("name", "")), artist=it.get("byArtist", ""),
                                page=f"https://mixkit.co/free-stock-music/discover/{urllib.parse.quote(kw)}/",
                                audio=it["url"], duration=secs(it.get("duration")), genre=it.get("genre", ""),
                                licence="Mixkit Stock Music Free License", licence_url="https://mixkit.co/license/#musicFree",
                                credit="", needs_credit=False))
    return out


INCOMPETECH = None


def incompetech(kw):
    global INCOMPETECH
    if INCOMPETECH is None:
        INCOMPETECH = json.loads(text("https://incompetech.com/music/royalty-free/pieces.json", timeout=60))
    words = [w for w in kw.lower().split() if w]
    out = []
    for p in INCOMPETECH:
        hay = " ".join(str(p.get(k) or "") for k in ("title", "description", "feel", "instruments")).lower()
        if not all(w in hay for w in words):
            continue
        title = p["title"]
        audio = "https://incompetech.com/music/royalty-free/mp3-royaltyfree/" + urllib.parse.quote(p["filename"])
        out.append(dict(src="Incompetech", id=p.get("isrc") or title, title=title, artist="Kevin MacLeod",
                        page="https://incompetech.com/music/royalty-free/index.html?isrc=" + (p.get("isrc") or ""),
                        audio=audio, duration=secs(p.get("length")), genre=p.get("feel", ""),
                        instruments=p.get("instruments", ""),
                        licence="CC BY 4.0", licence_url="https://creativecommons.org/licenses/by/4.0/",
                        credit=f"{title} Kevin MacLeod (incompetech.com)\nLicensed under Creative Commons: By Attribution 4.0\n"
                               "https://creativecommons.org/licenses/by/4.0/", needs_credit=True))
    return out[:40]


def ccmixter(kw):
    # ccMixter's text search ("search=") breaks its server's replies, so search its tags: every word must be a tag
    tags = ",".join(["instrumental"] + [w for w in re.split(r"[\s,]+", kw.lower()) if w])
    q = urllib.parse.urlencode({"f": "json", "tags": tags, "lic": "by,nc", "sort": "rank", "limit": 30})
    out = []
    for r in json.loads(text("https://ccmixter.org/api/query?" + q)):
        lic = (r.get("license_url") or "").lower()
        m = re.search(r"/licenses/(by|by-nc)/([\d.]+)/", lic)
        if not m:
            continue   # by-sa, by-nd, by-nc-sa, by-nc-nd, sampling licences: left out
        f = next((f for f in r.get("files", []) if (f.get("download_url") or "").endswith(".mp3")), None)
        if not f:
            continue
        dur = secs((f.get("file_format_info") or {}).get("ps"))
        artist = r.get("user_real_name") or r.get("user_name", "")
        t = cc_track("ccMixter", r.get("upload_id"), r.get("upload_name", ""), artist, r.get("file_page_url", ""),
                     f["download_url"], dur, m.group(1), m.group(2))
        # its tags are mostly site housekeeping (media, remix, bpm_110_115); keep the few that describe the music
        moods = [x for x in (r.get("upload_tags") or "").split(",") if x and x not in ("media", "remix", "sample", "instrumental",
                 "multiple_formats", "trackback", "in_video", "attribution", "non_commercial", "how_i_did_it", "stems",
                 "cc_by", "cc_by_nc", "flac", "mp3", "zip", "audio", "44k", "48k", "stereo", "vbr", "CBR")
                 and not re.match(r"(bpm_|.*_(remix|contest|project)|\d)", x)]
        t["genre"] = ", ".join(x.replace("_", " ") for x in moods[:4])
        out.append(t)
    return out


def openverse(kw):
    """Anonymous use of the Openverse API is rate-limited; one request per keyword here. (Combining licence filters
    in the request fails on their side, so the licences are filtered here.)"""
    q = urllib.parse.urlencode({"q": kw, "category": "music", "page_size": 40})
    d = json.loads(text("https://api.openverse.org/v1/audio/?" + q))
    out = []
    for r in d.get("results", []):
        code = r.get("license")
        if code not in CC:
            continue   # nd, sa and anything else: left out
        dur = (r.get("duration") or 0) / 1000 or None
        t = cc_track("Openverse", r["id"], r.get("title", ""), r.get("creator", ""), r.get("foreign_landing_url", ""),
                     r.get("url"), dur, code, r.get("license_version"))
        t["via"] = r.get("source", "")
        t["genre"] = ", ".join((g or "") for g in (r.get("genres") or []))[:80]
        out.append(t)
    return out


SOURCES = {"mixkit": mixkit, "incompetech": incompetech, "ccmixter": ccmixter, "openverse": openverse}


# ---------- helpers ----------

def load(work):
    p = os.path.join(work, "candidates.json")
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else []


def save(work, cands):
    with open(os.path.join(work, "candidates.json"), "w", encoding="utf-8") as f:
        json.dump(cands, f, indent=1, ensure_ascii=False)


def ff(*args):
    subprocess.run(["ffmpeg", "-y", "-v", "error", *args], check=True)


def pick(cands, keys):
    by = {c["key"]: c for c in cands}
    missing = [k for k in keys if k not in by]
    if missing:
        sys.exit(f"Not in candidates.json: {', '.join(missing)}")
    return [by[k] for k in keys]


def fmt(s):
    s = int(round(s or 0))
    return f"{s // 60}:{s % 60:02d}"


# ---------- the listening page's filters: a small, fixed vocabulary, so filters mean the same on every page ----------

MOODS = {   # mood -> words in a track's genre, feel, title, search word or Claude's note that suggest it
    "Calm": ("calm", "relax", "serene", "peace", "meditat", "gentle", "soft", "quiet", "lullaby", "rest", "zen", "chill"),
    "Hopeful": ("hope", "inspir", "dream", "possible", "believe", "new life", "promise", "morning", "sunrise"),
    "Uplifting": ("uplift", "bright", "joy", "happy", "positive", "triumph", "celebrat", "sun"),
    "Reflective": ("somber", "sad", "melanchol", "tender", "emotional", "heavy", "reflect", "farewell", "miss you"),
    "Playful": ("bouncy", "humorous", "fun", "child", "playful", "quirky"),
    "Energetic": ("driving", "action", "epic", "intense", "edm", "rock", "dance", "energ", "upbeat"),
}
STYLES = {
    "Piano": ("piano",),
    "Orchestral": ("film score", "orchestra", "classical", "strings", "cinematic", "waltz"),
    "Ambient": ("ambient", "new age", "minimal", "meditat", "drone", "atmospher"),
    "Acoustic": ("folk", "acoustic", "guitar", "ukulele", "uke", "kalimba", "flute"),
    "Pop": ("pop", "indie", "corporate", "r&b"),
    "Electronic": ("edm", "electronic", "trap", "hip hop", "synth", "electro"),
}


def facets(c, note, extra):
    hay = " ".join(str(x or "") for x in (c.get("genre"), c.get("title"), c.get("keyword"), c.get("instruments"), note)).lower()
    pick_ = lambda vocab: [k for k, words in vocab.items() if any(w in hay for w in words)]
    moods, styles = pick_(MOODS), pick_(STYLES)
    for t in extra:   # Claude's own --tags win: add any word from either list
        t = t.strip().capitalize()
        if t in MOODS and t not in moods: moods.append(t)
        if t in STYLES and t not in styles: styles.append(t)
    return moods, styles


def peaks(mp3, n=96):
    """The preview's loudness in n bars (0-100), for the waveform you click to jump around in."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", mp3, "-ac", "1", "-ar", "4000", "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    import array
    a = array.array("h"); a.frombytes(raw[: len(raw) // 2 * 2])
    if not a: return [0] * n
    step = max(1, len(a) // n)
    vals = [max((abs(x) for x in a[i * step:(i + 1) * step]), default=0) for i in range(n)]
    top = max(vals) or 1
    return [round(100 * (v / top) ** 0.7) for v in vals]   # a gentle curve, so quiet passages still show


# ---------- commands ----------

def cmd_search(a):
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
                    if (c["src"], c["id"]) in seen or not c.get("audio") or (c.get("duration") or 0) < MIN_SECONDS:
                        continue
                    seen.add((c["src"], c["id"]))
                    n += 1
                    found.append({**c, "key": f"m{n:03d}", "keyword": kw})
            except Blocked as e:
                blocked.add(name)
                print(f"  {name}: skipped ({e})")
            except Exception as e:
                print(f"  {name} / {kw}: {e}")
            time.sleep(1)
        cands += found
        save(a.work, cands)
        print(f"{kw}: {len(found)} new tracks")
        for c in found:
            print(f"  {c['key']}  {c['src']:<11} {fmt(c['duration']):>5}  {c['licence']:<12} {c['title'][:44]} / {c['artist'][:24]}"
                  f"  {c.get('genre', '')[:40]}")


def cmd_picker(a):
    cands = load(a.work)
    chosen = pick(cands, a.keys)
    notes = dict(x.split("=", 1) for x in a.note)
    tags = {k: v.split(",") for k, v in (x.split("=", 1) for x in a.tags)}
    out = os.path.join(a.work, "picker")
    os.makedirs(os.path.join(out, "a"), exist_ok=True)
    tracks = []
    for c in chosen:
        raw = os.path.join(a.work, "raw", c["key"] + ".mp3")
        os.makedirs(os.path.dirname(raw), exist_ok=True)
        if not os.path.exists(raw):
            data = get(c["audio"], timeout=300, referer=c["page"])   # ccMixter refuses downloads without the referer
            open(raw, "wb").write(data)   # only once it has arrived, so a failed download leaves no empty file
        # 45 seconds from the start (where a music bed starts), faded out, small enough to publish
        ff("-i", raw, "-t", "45", "-af", "afade=t=out:st=42:d=3", "-ac", "2", "-b:a", "112k",
           os.path.join(out, "a", c["key"] + ".mp3"))
        prev = os.path.join(out, "a", c["key"] + ".mp3")
        moods, styles = facets(c, notes.get(c["key"], ""), tags.get(c["key"], []))
        tracks.append({k: c.get(k, "") for k in ("key", "src", "title", "artist", "page", "duration", "licence",
                                                  "licence_url", "credit", "needs_credit", "genre", "via", "instruments")}
                      | {"note": notes.get(c["key"], ""), "moods": moods, "styles": styles, "peaks": peaks(prev)})
    voice = None
    if a.voice:
        ff("-i", a.voice, "-t", "45", "-ac", "1", "-b:a", "64k", os.path.join(out, "a", "voice.mp3"))
        voice = "a/voice.mp3"
    page = open(os.path.join(HERE, "picker-template.html"), encoding="utf-8").read()
    data = json.dumps({"title": a.title, "tracks": tracks, "voice": voice}, ensure_ascii=False).replace("</", "<\\/")
    open(os.path.join(out, "picker.html"), "w", encoding="utf-8").write(page.replace("__DATA__", data))
    print(os.path.join(out, "picker.html"))
    print("Publish it with capabilities {db: {}} and every file in a/ as a published file.")


def cmd_fetch(a):
    cands = load(a.work)
    os.makedirs(a.to, exist_ok=True)
    log = os.path.join(a.to, "music-licenses.csv")
    new = not os.path.exists(log)
    with open(log, "a", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        if new:
            w.writerow(["file", "source", "title", "artist", "page", "licence", "licence link", "credit line", "downloaded"])
        for c in pick(cands, a.keys):
            dst = os.path.join(a.to, c["key"] + ".mp3")
            data = get(c["audio"], timeout=600, referer=c["page"])
            open(dst, "wb").write(data)
            w.writerow([c["key"] + ".mp3", c["src"] + (f" ({c['via']})" if c.get("via") else ""), c["title"], c["artist"],
                        c["page"], c["licence"], c["licence_url"], c["credit"], time.strftime("%Y-%m-%d")])
            print(dst)


def main():
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg isn't on the PATH. Install it (SETUP.md) and try again.")
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("search")
    s.add_argument("work")
    s.add_argument("keywords", nargs="+")
    s.add_argument("--sources", default="mixkit,incompetech,ccmixter")
    s.set_defaults(fn=cmd_search)
    k = sub.add_parser("picker")
    k.add_argument("work")
    k.add_argument("keys", nargs="+")
    k.add_argument("--title", default="Music to choose from")
    k.add_argument("--voice", help="the video's voice track (render --stems), to hear each track under it")
    k.add_argument("--note", action="append", default=[], help='KEY="why it might fit"')
    k.add_argument("--tags", action="append", default=[],
                   help='KEY="calm,piano": moods (Calm, Hopeful, Uplifting, Reflective, Playful, Energetic) and styles '
                        '(Piano, Orchestral, Ambient, Acoustic, Pop, Electronic) for the filters, added to the ones found')
    k.set_defaults(fn=cmd_picker)
    f = sub.add_parser("fetch")
    f.add_argument("work")
    f.add_argument("keys", nargs="+")
    f.add_argument("--to", required=True)
    f.set_defaults(fn=cmd_fetch)
    a = p.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
