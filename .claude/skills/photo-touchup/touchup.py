"""Touch up washed-out photos: measure, make before/after versions with a comparison page, then swap in the ones chosen.

  python touchup.py measure <folder>                      list each photo's darkest and brightest levels; flags hazy ones
  python touchup.py make <out> <photo> [<photo> ...] [--strength 0.5]   (or photo.jpg@0.4 for one photo) touched-up copies + compare/index.html (before / after, a choice each)
  python touchup.py accept <out> (--all | --choices <json>)   swap the chosen ones in: originals to backups/, info copied over

The fix is the same on every colour channel, so colours never shift: the darkest 0.5% of the picture becomes black,
the brightest 0.3% white, a gentle S-curve adds contrast, and colour is lifted 18% (unless the photo is already colourful). Faces stay bright (mid-tones are
lifted a little, not darkened). Nothing is cropped and no one is retouched.

`make` never changes the originals. `accept` keeps each original in <its folder>/backups/before-touchup-<date>/
and copies its credit, rights and other info into the new file with ExifTool (if ExifTool is installed).
"""
import argparse, datetime, html, json, os, shutil, subprocess, sys
import numpy as np
from PIL import Image, ImageEnhance

HAZY_BLACK, DIM_WHITE = 0.07, 0.92   # darkest parts lighter than this, or brightest parts darker than this: worth a look


def levels(im):
    s = im.copy(); s.thumbnail((800, 800))
    lum = (np.asarray(s.convert("RGB"), np.float32) / 255) @ np.array([.299, .587, .114], np.float32)
    return float(np.percentile(lum, 0.5)), float(np.percentile(lum, 99.7))


def fix(im, strength=1.0, saturation=1.18, midtone=0.97, contrast=0.12):
    orig = im.convert("RGB")
    a = np.asarray(orig, np.float32) / 255
    lo, hi = levels(im)
    a = np.clip((a - lo) / max(hi - lo, 1e-3), 0, 1)        # same stretch on every channel: no colour shift
    a = a ** midtone                                        # below 1 lifts mid-tones, so faces stay bright
    a = a + contrast * (a - a * a) * (2 * a - 1) * 2        # gentle S-curve
    out = Image.fromarray((np.clip(a, 0, 1) * 255 + .5).astype(np.uint8))
    vivid = float((a.max(2) - a.min(2)).mean()) > 0.30          # already colourful: no extra colour
    out = out if vivid else ImageEnhance.Color(out).enhance(saturation)
    return out if strength >= 1 else Image.blend(orig, out, strength)   # part-way: a middle ground


def exiftool():
    for c in ("exiftool", os.path.expandvars(r"%LOCALAPPDATA%\Programs\ExifTool\ExifTool.exe")):
        p = shutil.which(c) or (c if os.path.isfile(c) else None)
        if p: return p
    return None


PAGE = """<title>__TITLE__</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
:root{--bg:#faf8f4;--fg:#2a2433;--muted:#6b6375;--line:#e3ddd3;--card:#fff;--accent:#5f4d72;--on:#efeaf5}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#1c1a20;--fg:#ece8f1;--muted:#a8a0b3;--line:#38333f;--card:#25222b;--accent:#b7a3d0;--on:#332c3d;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#1c1a20;--fg:#ece8f1;--muted:#a8a0b3;--line:#38333f;--card:#25222b;--accent:#b7a3d0;--on:#332c3d;color-scheme:dark}
body{background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:28px 60px}
main{max-width:1200px;margin:0 auto}header{max-width:760px}h1{font-size:1.6rem;margin:0 0 6px}header p{color:var(--muted);margin:0 0 6px}
.item{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px;margin-top:22px}.item h2{font-size:1.05rem;margin:0 0 2px}.item .cr{color:var(--muted);font-size:.85rem;margin:0 0 12px}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0;min-width:0}figure img{width:100%;border-radius:6px;display:block;cursor:zoom-in}
figcaption{font-size:.82rem;font-weight:600;color:var(--muted);margin-top:4px;text-transform:uppercase;letter-spacing:.04em}
.choice{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:12px}
.choice button{font:inherit;font-weight:600;padding:7px 14px;border-radius:999px;border:1.5px solid var(--line);background:none;color:var(--fg);cursor:pointer}
.choice button[aria-pressed=true]{background:var(--on);border-color:var(--accent);color:var(--accent)}.choice .st{font-size:.8rem;color:var(--muted);margin-left:auto}
.note{display:block;width:100%;box-sizing:border-box;margin-top:10px;font:inherit;color:var(--fg);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px 10px;resize:vertical}.note:focus{outline:2px solid var(--accent);outline-offset:1px}
dialog{padding:0;border:0;background:#000;max-width:96vw;max-height:94vh}dialog img{max-width:96vw;max-height:94vh;display:block}dialog::backdrop{background:rgba(0,0,0,.85)}
@media (max-width:640px){.pair{grid-template-columns:1fr}}
</style>
<main><header><h1>__TITLE__</h1>
<p>These photos looked washed out. The touched-up versions have deeper darks and slightly richer colour. Faces stay bright and skin tones stay natural. Nothing is cropped and no one is retouched.</p>
<p>The originals don't change until you choose. Click a picture to see it large.</p>
<div class="choice"><button type="button" id="allnew">Use the touched-up version for all</button><span class="st" id="gst"></span></div>
<textarea class="note" id="gnote" rows="2" placeholder="Notes about all the photos (optional)" aria-label="Notes about all the photos"></textarea></header>
<div id="list"></div></main><dialog id="big"><img alt=""></dialog>
<script>
const P = __DATA__;
const list = document.getElementById("list"), big = document.getElementById("big"), rows = {}; let db = null;
P.forEach((p) => {
  const el = document.createElement("section"); el.className = "item";
  el.innerHTML = '<h2></h2><p class="cr"></p><div class="pair"><figure><img alt=""><figcaption>Original</figcaption></figure><figure><img alt=""><figcaption>Touched up</figcaption></figure></div>'
    + '<div class="choice"><button type="button" data-v="original" aria-pressed="false">Keep the original</button><button type="button" data-v="new" aria-pressed="false">Use the touched-up one</button><span class="st"></span></div>'
    + '<textarea class="note" rows="2" placeholder="Note about this photo (optional)" aria-label="Note about this photo"></textarea>';
  el.querySelector("h2").textContent = p.name; el.querySelector(".cr").textContent = p.credit || "";
  const im = el.querySelectorAll("img"); im[0].src = p.before; im[0].alt = p.name + ", original"; im[1].src = p.after; im[1].alt = p.name + ", touched up";
  im.forEach((i) => i.addEventListener("click", () => { big.querySelector("img").src = i.src; big.showModal(); }));
  el.querySelectorAll(".choice button").forEach((b) => b.addEventListener("click", () => choose(p.id, b.dataset.v)));
  const ta = el.querySelector(".note"); ta.addEventListener("input", () => saveNote(p.id, ta.value, el.querySelector(".st")));
  rows[p.id] = el; list.appendChild(el);
});
big.addEventListener("click", () => big.close());
function show(id, v, msg) { rows[id].querySelectorAll(".choice button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === v))); if (msg !== undefined) rows[id].querySelector(".st").textContent = msg; }
async function choose(id, v) {
  show(id, v, db ? "Saving…" : "Not saved: tell Claude in the chat"); if (!db) return;
  try { await db.collection("choices").doc(id).set({ choice: v, at: new Date().toISOString() }); show(id, v, "Saved. Claude can read it."); }
  catch (e) { show(id, v, "Not saved: tell Claude in the chat"); }
}
const timers = {};
function saveNote(id, text, st) {
  clearTimeout(timers[id]); if (!db) { st.textContent = "Not saved: tell Claude in the chat"; return; }
  timers[id] = setTimeout(async () => {
    try { await db.collection("notes").doc(id).set({ text, at: new Date().toISOString() }); st.textContent = "Saved. Claude can read it."; }
    catch (e) { st.textContent = "Not saved: tell Claude in the chat"; } }, 600);
}
document.getElementById("gnote").addEventListener("input", (e) => saveNote("_all", e.target.value, document.getElementById("gst")));
document.getElementById("allnew").addEventListener("click", () => P.forEach((p) => choose(p.id, "new")));
(async () => {
  const warn = () => { document.getElementById("gst").textContent = "Choices can't be saved here: tell Claude in the chat."; };
  try { db = window.claude ? await window.claude.use("db") : null; if (!db) return warn();
    (await db.collection("choices").get()).docs.forEach((d) => { const x = d.data() || {}; if (rows[d.id] && x.choice) show(d.id, x.choice, "Saved. Claude can read it."); });
    (await db.collection("notes").get()).docs.forEach((d) => { const x = d.data() || {}; const ta = d.id === "_all" ? document.getElementById("gnote") : rows[d.id] && rows[d.id].querySelector(".note"); if (ta && x.text) ta.value = x.text; });
  } catch (e) { warn(); }
})();
</script>
"""


def cmd_measure(a):
    files = sorted(f for f in os.listdir(a.folder) if f.lower().endswith((".jpg", ".jpeg", ".png")))
    for f in files:
        lo, hi = levels(Image.open(os.path.join(a.folder, f)))
        flag = "  <- hazy" if lo > HAZY_BLACK or hi < DIM_WHITE else ""
        print(f"black {lo:.2f}  white {hi:.2f}  {f}{flag}")


def cmd_make(a):
    os.makedirs(os.path.join(a.out, "full"), exist_ok=True); os.makedirs(os.path.join(a.out, "compare", "img"), exist_ok=True)
    items, manifest = [], {}
    for path in a.photos:
        k = a.strength
        if "@" in os.path.basename(path): path, k = path.rsplit("@", 1); k = float(k)   # photo.jpg@0.4: its own strength
        path = os.path.abspath(path); name = os.path.basename(path); stem = os.path.splitext(name)[0]
        im = Image.open(path); exif = im.info.get("exif")
        out = fix(im, k); out.save(os.path.join(a.out, "full", name), quality=93, **({"exif": exif} if exif else {}))
        for tag, x in (("before", im.convert("RGB")), ("after", out)):
            s = x.copy(); s.thumbnail((1100, 1100)); s.save(os.path.join(a.out, "compare", "img", f"{stem}_{tag}.jpg"), quality=85)
        credit = title = ""
        csvp = os.path.join(os.path.dirname(path), "photo-credits.csv")
        if os.path.isfile(csvp):
            import csv
            for r in csv.DictReader(open(csvp, encoding="utf-8-sig")):
                if r.get("file") == name: credit = r.get("on-screen credit", ""); title = r.get("title", "")
        items.append({"id": stem, "name": title or stem.replace("-", " "), "credit": credit,
                      "before": f"img/{stem}_before.jpg", "after": f"img/{stem}_after.jpg"})
        manifest[stem] = path
    page = PAGE.replace("__TITLE__", html.escape(a.title)).replace("__DATA__", json.dumps(items, ensure_ascii=False).replace("</", "<\\/"))
    open(os.path.join(a.out, "compare", "index.html"), "w", encoding="utf-8").write(page)
    json.dump(manifest, open(os.path.join(a.out, "manifest.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print(f"{len(items)} photos -> {os.path.join(a.out, 'compare', 'index.html')} (publish with the img/ folder and the db capability)")


def cmd_accept(a):
    manifest = json.load(open(os.path.join(a.out, "manifest.json"), encoding="utf-8"))
    if a.all: chosen = list(manifest)
    else:
        ch = json.load(open(a.choices, encoding="utf-8"))   # {id: "new"|"original"} or {id: {"choice": ...}}
        chosen = [k for k, v in ch.items() if (v.get("choice") if isinstance(v, dict) else v) == "new"]
    et, day = exiftool(), datetime.date.today().isoformat()
    if not et: print("ExifTool not found: the photos' own info (credit, rights) won't be copied. Install it first.", file=sys.stderr); sys.exit(1)
    for k in chosen:
        orig = manifest[k]; name = os.path.basename(orig); new = os.path.join(a.out, "full", name)
        bdir = os.path.join(os.path.dirname(orig), "backups", f"before-touchup-{day}"); os.makedirs(bdir, exist_ok=True)
        shutil.copy2(orig, os.path.join(bdir, name))
        tmp = orig + ".new.jpg"; shutil.copy(new, tmp)
        subprocess.run([et, "-q", "-q", "-overwrite_original", "-TagsFromFile", orig, "-all:all", tmp], check=True)
        os.replace(tmp, orig); print("replaced", orig, "(original in", bdir + ")")
        for extra in a.also:   # e.g. a Google Drive for desktop copy of the same folder
            dst = os.path.join(extra, name)
            if os.path.isfile(dst): shutil.copy2(orig, dst); print("  and", dst)


ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
sp = ap.add_subparsers(dest="cmd", required=True)
m = sp.add_parser("measure"); m.add_argument("folder"); m.set_defaults(f=cmd_measure)
m = sp.add_parser("make"); m.add_argument("out"); m.add_argument("photos", nargs="+"); m.add_argument("--title", default="Photo touch-up"); m.add_argument("--strength", type=float, default=1.0, help="0 to 1; 0.5 is half-way between the original and the full fix"); m.set_defaults(f=cmd_make)
m = sp.add_parser("accept"); m.add_argument("out"); g = m.add_mutually_exclusive_group(required=True)
g.add_argument("--all", action="store_true"); g.add_argument("--choices"); m.add_argument("--also", action="append", default=[], help="another folder holding copies to update (repeatable)")
m.set_defaults(f=cmd_accept)
a = ap.parse_args(); a.f(a)
