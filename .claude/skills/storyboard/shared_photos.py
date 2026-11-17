"""Finds the shared "People with Bibles" photos on this computer, so "+ Add a photo" offers them by default.

The folder lives on the SIL Google Drive (LINK). With Google Drive for desktop it shows up under "My Drive" or
"Shared drives"; downloaded as a zip it is usually in Downloads or Documents. Set SHARED_PHOTOS (an environment
variable, or a line in remotion/.env) to point at it somewhere else. Used by the storyboard and review-page builds
and by export_photos.py.
"""
import glob, os, string

NAME = "People with Bibles"   # the folder's name starts with this ("... - photos for partnership videos")
LINK = "https://drive.google.com/drive/folders/1-H_TnNHrNl6CV8D1xkK8dZi33O7p4Fyq"
_ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))


def _setting():
    if os.environ.get("SHARED_PHOTOS"): return os.environ["SHARED_PHOTOS"]
    env = os.path.join(_ROOT, "remotion", ".env")
    if os.path.isfile(env):
        for line in open(env, encoding="utf-8", errors="replace"):
            k, _, v = line.partition("=")
            if k.strip() == "SHARED_PHOTOS" and v.strip(): return v.strip().strip('"')
    return None


def _bases():
    home = os.path.expanduser("~")
    out = []
    if os.name == "nt":   # Google Drive for desktop gives the drive its own letter (G: by default)
        for d in string.ascii_uppercase[2:]:
            for sub in ("My Drive", "Shared drives"):
                p = f"{d}:\\{sub}"
                if os.path.isdir(p): out.append(p)
    out += glob.glob(os.path.join(home, "Library", "CloudStorage", "GoogleDrive-*", "*"))   # macOS
    out += [os.path.join(home, x) for x in ("Google Drive", "My Drive", "Downloads", "Documents", "Desktop")]
    return [p for p in out if os.path.isdir(p)]


def find(depth=4):
    """The folder (it has a photo-credits.csv), or None when it isn't on this computer."""
    s = _setting()
    if s: return s if os.path.isfile(os.path.join(s, "photo-credits.csv")) else None
    for base in _bases():
        level = [base]
        for _ in range(depth):
            nxt = []
            for d in level:
                try: names = sorted(os.listdir(d))
                except OSError: continue
                for n in names:
                    p = os.path.join(d, n)
                    if not os.path.isdir(p) or n.startswith((".", "$")): continue
                    if n.startswith(NAME) and os.path.isfile(os.path.join(p, "photo-credits.csv")): return p
                    nxt.append(p)
            level = nxt
    return None


MISSING = ('The shared "People with Bibles" photos are not on this computer, so "+ Add a photo" offers only this '
           "video's photos. Ask the person whether they'd like them added (storyboard SKILL.md, \"Shared photos\"): "
           "get the folder from " + LINK + ", then build again.")
