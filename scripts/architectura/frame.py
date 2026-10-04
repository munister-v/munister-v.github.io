"""Puts App Store screenshots into an iPhone body (transparent PNG-like webp),
in the manner of the Irpin City page. Output 780×1625.
    python3 scripts/architectura/frame.py <screens dir> <out dir>"""
import os, sys
from PIL import Image, ImageDraw, ImageFilter
SRC, OUT = sys.argv[1], sys.argv[2]
W, M = 780, 8                      # canvas width, margin for the side buttons
BW = W - 2 * M                     # body width 764
INSET = 22                         # bezel
SW = BW - 2 * INSET                # screen width 720
SH = round(SW * 2868 / 1320)       # 1565
BH = SH + 2 * INSET
H = BH + 2 * M
R_BODY, R_SCREEN = 118, 98
for f in sorted(os.listdir(SRC)):
    if not f.endswith('.png'): continue
    c = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(c)
    # side buttons: action and volume on the left, power on the right
    for y0, y1 in ((250, 310), (360, 470), (500, 610)):
        d.rounded_rectangle((M - 5, M + y0, M + 6, M + y1), 4, fill=(58, 58, 60, 255))
    d.rounded_rectangle((W - M - 6, M + 400, W - M + 5, M + 560), 4, fill=(58, 58, 60, 255))
    # titanium body: outer edge, a lighter rim and the black bezel
    d.rounded_rectangle((M, M, M + BW - 1, M + BH - 1), R_BODY, fill=(72, 72, 76, 255))
    d.rounded_rectangle((M + 3, M + 3, M + BW - 4, M + BH - 4), R_BODY - 3, fill=(28, 28, 30, 255))
    d.rounded_rectangle((M + 7, M + 7, M + BW - 8, M + BH - 8), R_BODY - 7, fill=(6, 6, 7, 255))
    shot = Image.open(os.path.join(SRC, f)).convert('RGB').resize((SW, SH), Image.LANCZOS)
    mask = Image.new('L', (SW, SH), 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, SW - 1, SH - 1), R_SCREEN, fill=255)
    c.paste(shot, (M + INSET, M + INSET), mask)
    # a faint highlight along the rim
    hl = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(hl).rounded_rectangle((M + 1, M + 1, M + BW - 2, M + BH - 2), R_BODY - 1, outline=(150, 150, 156, 120), width=2)
    c = Image.alpha_composite(c, hl.filter(ImageFilter.GaussianBlur(0.6)))
    c.save(os.path.join(OUT, f[3:].replace('.png', '.webp')), 'WEBP', quality=84)
print(W, H)
