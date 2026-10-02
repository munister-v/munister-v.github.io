#!/usr/bin/env python3
"""Картинки для соцмереж (og:image, 1200×630) основних сторінок у темній темі сайту.

    python3 scripts/build_og.py

Пише images/og-en.jpg, og-research.jpg, og-writing.jpg, og-course.jpg, og-cv.jpg.
Кольори - ті самі токени, що в munister.css; шрифти системні (macOS). Потрібен Pillow.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "images"
W, H = 1200, 630
PAPER, INK, MUTED, FAINT, ACCENT, RULE = (12, 15, 14), (238, 242, 240), (178, 186, 182), (135, 145, 137), (111, 207, 159), (38, 44, 42)
SERIF = "/System/Library/Fonts/Supplemental/Iowan Old Style.ttc"  # та сама антиква, що в munister.css
SANS = "/System/Library/Fonts/HelveticaNeue.ttc"

CARDS = {
    "og-en": ("Independent practice · Europe / remote", "Viacheslav Munister",
              "Writer, editor and heritage researcher. Long-form journalism, museum curation and the systems that publish them.",
              "EPRIS Journal · EPRIS Museum · Irpin City · 29 papers", "munister.com.ua"),
    "og-research": ("Peer-reviewed papers · 2021–2026", "Research",
                    "Industrial automation, edge computing and machine learning in measurement systems.",
                    "29 papers · Scopus · 70+ citations", "munister.com.ua/research"),
    "og-writing": ("Essays · published in EPRIS Journal", "Writing",
                   "On architecture, restoration, heritage and the visual culture of cities, with interviews with artists and architects.",
                   "Essays · interviews · reviews", "munister.com.ua/writing"),
    "og-course": ("Teaching · working syllabi", "Courses",
                  "Course materials written up as working syllabi and reference sheets, built while teaching the subject.",
                  "Databases · SQL · data modelling", "munister.com.ua/course"),
    "og-cv": ("Curriculum vitae · 2026", "Viacheslav Munister",
              "Writer, editor and heritage researcher working across long-form journalism, museum curation, editorial systems and product delivery.",
              "Experience · publications · product work", "munister.com.ua/cv.html"),
}

def font(path, size):
    return ImageFont.truetype(path, size)

def wrap(draw, text, f, width):
    lines, line = [], ""
    for word in text.split():
        test = f"{line} {word}".strip()
        if draw.textlength(test, font=f) <= width:
            line = test
        else:
            lines.append(line)
            line = word
    return lines + [line]

def portrait():
    src = Image.open(IMG / "munister.jpg").convert("RGB")
    pw = 440
    # кадр під висоту картки, обличчя ближче до центру
    scale = H / (src.height * 0.78)
    im = src.resize((round(src.width * scale), round(src.height * scale)), Image.LANCZOS)
    left = max(0, im.width - pw)
    im = im.crop((left, round(im.height * 0.12), left + pw, round(im.height * 0.12) + H))
    # притемнення до тла сайту й м'який перехід зліва
    im = Image.blend(im, Image.new("RGB", im.size, PAPER), 0.18)
    mask = Image.new("L", im.size, 255)
    d = ImageDraw.Draw(mask)
    for x in range(160):
        d.line([(x, 0), (x, H)], fill=round(255 * (x / 160) ** 1.4))
    return im, mask

def build(name, eyebrow, title, lead, facts, url, photo):
    im = Image.new("RGB", (W, H), PAPER)
    ph, mask = photo
    im.paste(ph, (W - ph.width, 0), mask)
    d = ImageDraw.Draw(im)
    x, maxw = 64, 640
    d.text((x, 58), eyebrow.upper(), font=font(SANS, 16), fill=ACCENT, spacing=4)
    tf = font(SERIF, 68 if len(title) > 12 else 96)
    lf = font(SANS, 25)
    lead_lines = wrap(d, lead, lf, maxw)
    y = 400 - len(lead_lines) * 36
    d.text((x - 2, y - tf.size - 18), title, font=tf, fill=INK)
    for i, line in enumerate(lead_lines):
        d.text((x, y + i * 36), line, font=lf, fill=MUTED)
    d.text((x, y + len(lead_lines) * 36 + 22), facts, font=font(SANS, 18), fill=FAINT)
    d.line([(x, 540), (x + maxw, 540)], fill=RULE, width=1)
    d.text((x, 560), "MUNISTER", font=font(SANS, 16), fill=INK)
    uf = font(SANS, 16)
    d.text((x + maxw - d.textlength(url, font=uf), 560), url, font=uf, fill=FAINT)
    im.save(IMG / f"{name}.jpg", quality=88, optimize=True, progressive=True)

if __name__ == "__main__":
    photo = portrait()
    for name, card in CARDS.items():
        build(name, *card, photo)
    print("written to", IMG)
