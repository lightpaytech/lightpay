"""Crop the LightPay master icon tight to its visible content, square it,
and (optionally) apply a circular alpha mask. Default: NO mask — produces
a fully-opaque RGB square so macOS / Windows can apply their own rounded
corner masks without leaving a white halo behind transparent pixels.

usage:
    circular-mask.py SRC DST [TARGET=1024] [PADDING=0.06] [MASK=0]
"""
import sys
from PIL import Image, ImageDraw, ImageChops

src, dst = sys.argv[1], sys.argv[2]
target = int(sys.argv[3]) if len(sys.argv) > 3 else 1024
padding_pct = float(sys.argv[4]) if len(sys.argv) > 4 else 0.06
apply_mask = bool(int(sys.argv[5])) if len(sys.argv) > 5 else False

im = Image.open(src).convert("RGBA")
w, h = im.size

corners = [im.getpixel(p) for p in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]]
bg_rgb = tuple(sum(c[i] for c in corners) // 4 for i in range(3))

ref = Image.new("RGB", im.size, bg_rgb)
diff = ImageChops.difference(im.convert("RGB"), ref)
gray = diff.convert("L").point(lambda v: 255 if v > 14 else 0)
bbox = gray.getbbox()
if not bbox:
    raise SystemExit("no content detected — aborting")

l, t, r, b = bbox
cx, cy = (l + r) / 2, (t + b) / 2
side = max(r - l, b - t) * (1 + padding_pct * 2)
half = side / 2
crop_l, crop_t = max(0, int(cx - half)), max(0, int(cy - half))
crop_r, crop_b = min(w, int(cx + half)), min(h, int(cy + half))

content = im.crop((crop_l, crop_t, crop_r, crop_b))

side_px = max(content.size)
canvas = Image.new("RGBA", (side_px, side_px), bg_rgb + (255,))
ox = (side_px - content.size[0]) // 2
oy = (side_px - content.size[1]) // 2
canvas.paste(content, (ox, oy))

canvas = canvas.resize((target, target), Image.LANCZOS)

if apply_mask:
    mask = Image.new("L", (target, target), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, target, target), fill=255)
    canvas.putalpha(mask)
    canvas.save(dst)
else:
    # Save as RGB (no alpha) — fully opaque square. macOS / Windows / Linux
    # will apply their own rounded-corner mask in the dock/launcher.
    canvas.convert("RGB").save(dst)

print(
    f"src {w}x{h} bbox {bbox} -> cropped {content.size} -> "
    f"{'circular' if apply_mask else 'square'} {target}x{target} -> {dst}"
)
