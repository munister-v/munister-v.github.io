#!/usr/bin/env python3
"""Builds the sharp, modern-format versions of the home-page card pictures.

For every card picture in images/works/ it writes AVIF and WebP at each width
a card can need on a 2x screen (plus a JPEG fallback for the new widths),
upscaling with Lanczos and a light unsharp mask where the source is smaller
than the target. Run from the repo root (needs ImageMagick, cwebp, avifenc):

    python3 scripts/build-card-images.py [card ...]

Source = the largest existing images/works/<name>*.jpg. The existing JPEGs are
never rewritten. Widths: full cards 1600/2400/3200, wide, app and Schemata cards
1600/2400, half-width cards 800/1600 (Horreum, TeachEd).
"""
import os
import re
import subprocess
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
DIR = os.path.join(ROOT, "images", "works")

CARDS = {
    "museum": (1600, 2400, 3200),
    "epris": (1600, 2400, 3200),
    "mist": (1600, 2400, 3200),
    "fuzzy-risk": (1600, 2400),
    "epris-ios-logo": (1600, 2400),
    "architectura-logo": (1600, 2400),
    "ampub-ios-logo": (1600, 2400),
    "irpin-ios-logo": (1600, 2400),
    "horreum": (800, 1600),
    "teached": (800, 1600),
    "schemata": (1600, 2400),
}


def path(name, width, ext):
    if width == 1600:
        return os.path.join(DIR, f"{name}.{ext}")
    return os.path.join(DIR, f"{name}-{width}.{ext}")

# A chat-widget button was captured at the right edge of the MIST screenshot.
# Rectangles (x, y, w, h) in source pixels are painted over with the mirrored
# strip to their left, and that picture's JPEGs are rewritten.
CLEAN = {"mist": (2360, 1208, 40, 104)}


def run(*cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def widest_source(name):
    best = None
    for fn in os.listdir(DIR):
        m = re.fullmatch(re.escape(name) + r"(?:-(\d+))?\.jpg", fn)
        if m:
            w = int(m.group(1) or 1600)
            if w > 2400:  # generated upscales are never used as sources
                continue
            if best is None or w > best[0]:
                best = (w, os.path.join(DIR, fn))
    return best


def main():
    tmp = os.path.join(DIR, ".tmp")
    os.makedirs(tmp, exist_ok=True)
    only = set(sys.argv[1:])  # optional: rebuild just these cards
    for name, widths in CARDS.items():
        if only and name not in only:
            continue
        src_w, src = widest_source(name)
        if name in CLEAN:
            x, y, w, h = CLEAN[name]
            cleaned = os.path.join(tmp, f"{name}-clean.png")
            run("magick", src, "(", "+clone", "-crop", f"{w}x{h}+{x - w}+{y}", "+repage", "-flop", ")",
                "-geometry", f"+{x}+{y}", "-composite", cleaned)
            src = cleaned
        for w in widths:
            jpg = path(name, w, "jpg")
            png = os.path.join(tmp, f"{name}-{w}.png")
            if w == src_w:
                run("magick", src, png)
            elif w > src_w:  # upscale: Lanczos + a gentle unsharp to keep edges crisp
                run("magick", src, "-filter", "Lanczos", "-resize", f"{w}x", "-unsharp", "0x0.7+0.6+0.02", png)
            else:  # downscale from the widest source
                run("magick", src, "-filter", "Lanczos", "-resize", f"{w}x", "-unsharp", "0x0.4+0.3+0.02", png)
            if name in CLEAN or not os.path.exists(jpg):
                run("magick", png, "-strip", "-interlace", "Plane", "-sampling-factor", "4:2:0", "-quality", "88", jpg)
            run("cwebp", "-quiet", "-q", "88", "-m", "6", "-sharp_yuv", png, "-o", path(name, w, "webp"))
            run("avifenc", "-q", "62", "-s", "5", "-j", "all", png, path(name, w, "avif"))
            print(name, w, "ok", file=sys.stderr)
            os.remove(png)
        if name in CLEAN:
            os.remove(src)
    os.rmdir(tmp)


if __name__ == "__main__":
    main()
