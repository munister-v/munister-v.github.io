#!/usr/bin/env python3
"""Фавікон сайту: «M» антиквою Iowan Old Style (як заголовки) на темному тлі сайту й зелена крапка-акцент.

    python3 scripts/build_favicon.py

Літера переведена в криві (не залежить від шрифтів у браузері). Пише favicon.svg, favicon.ico,
favicon-16x16.png, favicon-32x32.png, favicon-48x48.png, apple-touch-icon.png, icon-192.png,
icon-512.png, icon-maskable-512.png. Потрібні fontTools, Pillow і rsvg-convert.
"""
import subprocess
from pathlib import Path
from fontTools.ttLib import TTCollection
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
FONT = "/System/Library/Fonts/Supplemental/Iowan Old Style.ttc"
BG, INK, ACCENT = "#0c0f0e", "#eef2f0", "#6fcf9f"

def glyph_path(char, face, box, cx, baseline):
    font = TTCollection(FONT).fonts[face]
    gs = font.getGlyphSet()
    name = font.getBestCmap()[ord(char)]
    b = BoundsPen(gs); gs[name].draw(b)
    x0, y0, x1, y1 = b.bounds
    k = box / (y1 - y0)
    pen = SVGPathPen(gs, ntos=lambda v: f'{v:.2f}'.rstrip('0').rstrip('.'))
    # шрифт - вгору по y, SVG - вниз: віддзеркалюємо й ставимо по центру
    gs[name].draw(TransformPen(pen, (k, 0, 0, -k, cx - (x0 + x1) / 2 * k, baseline + y0 * k)))
    return pen.getCommands(), (x1 - x0) * k

def svg(pad=0, radius=14):
    size = 64
    letter, w = glyph_path("M", 1, 30 * (1 - pad / 32), 30.5, 46 - pad * .3)
    dot_x = 30.5 + w / 2 + 3.2
    bg = f'<rect width="64" height="64" rx="{radius}" fill="{BG}"/>' if radius is not None else f'<rect width="64" height="64" fill="{BG}"/>'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" role="img" aria-label="Munister">'
            f'{bg}<path fill="{INK}" d="{letter}"/><circle cx="{dot_x:.2f}" cy="{43.2 - pad * .3:.2f}" r="2.9" fill="{ACCENT}"/></svg>\n')

def render(src, out, px):
    subprocess.run(["rsvg-convert", "-w", str(px), "-h", str(px), src, "-o", out], check=True)

if __name__ == "__main__":
    (ROOT / "favicon.svg").write_text(svg())
    tmp = ROOT / "_square.svg"
    tmp.write_text(svg(radius=None))           # для iOS і maskable: квадрат, кути заокруглює система
    tmp2 = ROOT / "_mask.svg"
    tmp2.write_text(svg(pad=9, radius=None))   # maskable: літера в безпечній зоні
    for name, px, src in [("favicon-16x16.png", 16, "favicon.svg"), ("favicon-32x32.png", 32, "favicon.svg"),
                          ("favicon-48x48.png", 48, "favicon.svg"), ("apple-touch-icon.png", 180, "_square.svg"),
                          ("icon-192.png", 192, "favicon.svg"), ("icon-512.png", 512, "favicon.svg"),
                          ("icon-maskable-512.png", 512, "_mask.svg")]:
        render(str(ROOT / src), str(ROOT / name), px)
    ims = [Image.open(ROOT / f) for f in ("favicon-16x16.png", "favicon-32x32.png", "favicon-48x48.png")]
    ims[2].save(ROOT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)], append_images=ims[:2])
    tmp.unlink(); tmp2.unlink()
    print("written to", ROOT)
