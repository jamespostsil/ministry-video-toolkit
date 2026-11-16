"""Turn a Google Doc script into script.md plus its pictures, in order.

  python gdoc_import.py <doc.zip> <out-folder>

<doc.zip> is the Google Doc exported as a zipped web page: Claude gets it with the Google Drive connector
(download_file_content, exportMimeType "application/zip"), or anyone can use File > Download > Web page (.html, zipped).
Pictures keep the size they were uploaded at.

Writes <out-folder>/script.md: one paragraph per line, bracketed markers kept as they are, **bold** and *italic*
kept, and each picture as <img src="images/NN-name.jpg" alt="..."> where it sits, followed by any words on the same
line or in italics on the line just under it (its caption and credit). Pictures go to <out-folder>/images/, numbered in reading order and named
from their alt text. Nothing is uploaded anywhere.
"""
import os, re, shutil, sys, zipfile
from html.parser import HTMLParser

BLOCK = {"p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "td"}


class Doc(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.lines, self.cur, self.imgs, self.styles, self.in_style, self.css = [], [], [], [], False, {}

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "style": self.in_style = True
        elif tag in BLOCK:
            self.flush(); self.cur.append({"h1": "# ", "h2": "## ", "h3": "### "}.get(tag, "- " if tag == "li" else ""))
        elif tag == "img":
            self.imgs.append((a.get("src", ""), a.get("alt", "") or a.get("title", "")))
            self.cur.append(f"\0IMG{len(self.imgs) - 1}\0")
        elif tag == "span":
            st = (a.get("style", "") or "") + "".join(self.css.get(c, "") for c in (a.get("class", "") or "").split())
            b, i = "font-weight:700" in st.replace(" ", ""), "font-style:italic" in st.replace(" ", "")
            mark = ("**" if b else "") + ("*" if i else "")
            self.styles.append(mark); self.cur.append(mark)
        elif tag == "br": self.cur.append(" ")

    def handle_endtag(self, tag):
        if tag == "style": self.in_style = False
        elif tag == "span" and self.styles:
            m = self.styles.pop()
            if m and self.cur and self.cur[-1] == m: self.cur.pop()   # empty run: drop it
            elif m:   # keep spaces outside the marks: "**your** ", not "**your **"
                i = len(self.cur) - 1
                while i >= 0 and self.cur[i] != m: i -= 1
                body = "".join(self.cur[i + 1:]); self.cur[i:] = [body[:len(body) - len(body.lstrip())], m, body.strip(), m[::-1], body[len(body.rstrip()):]] if body.strip() else [body]
        elif tag in BLOCK: self.flush()

    def handle_data(self, d):
        if self.in_style:   # Google puts bold / italic in classes: .c3{font-weight:700}
            for name, body in re.findall(r"\.([\w-]+)\{([^}]*)\}", d): self.css[name] = body
        else: self.cur.append(d)

    def flush(self):
        t = "".join(self.cur)
        t = re.sub(r"[ \t ]+", " ", t).strip()
        if t.strip("#- "): self.lines.append(t)
        self.cur = []


def slug(t, n):
    s = re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")[:50].strip("-")
    return f"{n:02d}-{s}" if s else f"{n:02d}-picture"


def main(zpath, out):
    z = zipfile.ZipFile(zpath)
    page = next(n for n in z.namelist() if n.lower().endswith(".html"))
    d = Doc(); d.feed(z.read(page).decode("utf-8")); d.flush()
    os.makedirs(os.path.join(out, "images"), exist_ok=True)
    names = []
    for k, (src, alt) in enumerate(d.imgs, 1):
        ext = os.path.splitext(src)[1].lower() or ".png"
        name = slug(alt, k) + ext
        with z.open(src) as f, open(os.path.join(out, "images", name), "wb") as g: shutil.copyfileobj(f, g)
        alt_attr = alt.replace('"', "&quot;")
        names.append(f'<img src="images/{name}" alt="{alt_attr}">')
    lines = [re.sub(r"\0IMG(\d+)\0", lambda m: names[int(m.group(1))], ln) for ln in d.lines]
    out_lines = []
    for ln in lines:   # an italic line right under a picture is its caption: keep it with the picture
        prev = out_lines[-1] if out_lines else ""
        if re.fullmatch(r"\**(<img [^>]+>\s*)+\**", prev) and re.fullmatch(r"\*[^*].*[^*]\*|\*[^*]\*", ln):
            m = re.search(r'<img src="images/((\d+)-picture(\.\w+))" alt="">', prev)
            if m:   # no alt text: name the file after its caption, and use the caption as the alt text
                cap = ln.strip("*").strip(); new = slug(cap, int(m.group(2))) + m.group(3)
                os.replace(os.path.join(out, "images", m.group(1)), os.path.join(out, "images", new))
                prev = prev.replace(m.group(0), f'<img src="images/{new}" alt="{cap.replace(chr(34), "&quot;")}">')
            out_lines[-1] = prev + " " + ln
        else: out_lines.append(ln)
    md = "\n\n".join(out_lines)
    md = re.sub(r"\*+(<img [^>]+>)\*+", r"\1", md)   # bold that Google spread over a picture
    open(os.path.join(out, "script.md"), "w", encoding="utf-8").write(md + "\n")
    print(f"{len(d.lines)} paragraphs, {len(names)} pictures -> {os.path.join(out, 'script.md')}")


if __name__ == "__main__":
    if len(sys.argv) != 3: sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
