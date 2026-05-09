#!/usr/bin/env python3
"""
Build master icons from new brand assets.

Two distinct sources — one per surface — so the Dock icon and the menu-bar
icon are visibly different artworks:

- Circular app icon (used for Dock / DMG / Finder / About dialog).
  Source: LightPay_iOS_Icons/app_logo.png — the full brand mark with the
  "LightPay Wallet" wordmark. A circular alpha mask is applied so the result
  reads as a round app logo while preserving the wordmark.
- Rectangular menu/tray icon (used for the macOS menu bar).
  Source: LightPay_iOS_Icons/menu_icon.png — the icon-only rounded square
  mark, which is already the desired shape, shipped as-is at the required
  sizes.
"""

import os
import sys
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICON_DIR = os.path.join(ROOT, "LightPay_iOS_Icons")
APP_LOGO = os.path.join(ICON_DIR, "app_logo.png")
MENU_ICON = os.path.join(ICON_DIR, "menu_icon.png")

OUT_DIR = os.path.join(ROOT, ".icon-masters")
os.makedirs(OUT_DIR, exist_ok=True)

CIRCULAR_MASTER = os.path.join(OUT_DIR, "app_circular_1024.png")
RECT_MASTER = os.path.join(OUT_DIR, "tray_rect_1024.png")


def sample_background(img: Image.Image) -> tuple:
    """Pick the dominant backdrop color from the corners of the source."""
    w, h = img.size
    samples = [
        img.getpixel((2, 2)),
        img.getpixel((w - 3, 2)),
        img.getpixel((2, h - 3)),
        img.getpixel((w - 3, h - 3)),
    ]
    # Average the corner pixels (drop alpha if present).
    rs, gs, bs = 0, 0, 0
    for px in samples:
        rs += px[0]
        gs += px[1]
        bs += px[2]
    n = len(samples)
    return (rs // n, gs // n, bs // n, 255)


def build_circular(source_path: str, out_path: str, size: int = 1024) -> None:
    src = Image.open(source_path).convert("RGBA")
    src = src.resize((size, size), Image.LANCZOS)

    bg = sample_background(src)

    # Composite onto a flat backdrop so the rounded-square corners get
    # painted with the same navy that the rest of the icon uses.
    backdrop = Image.new("RGBA", (size, size), bg)
    flat = Image.alpha_composite(backdrop, src)

    # Apply a circular alpha mask.
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size, size), fill=255)

    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(flat, (0, 0), mask)
    out.save(out_path, "PNG")
    print(f"  circular master: {out_path}")


def build_rectangular(source_path: str, out_path: str, size: int = 1024) -> None:
    src = Image.open(source_path).convert("RGBA")
    src = src.resize((size, size), Image.LANCZOS)
    src.save(out_path, "PNG")
    print(f"  rectangular master: {out_path}")


def main() -> int:
    if not os.path.exists(MENU_ICON):
        print(f"missing source: {MENU_ICON}", file=sys.stderr)
        return 1
    if not os.path.exists(APP_LOGO):
        print(f"missing source: {APP_LOGO}", file=sys.stderr)
        return 1

    print("building master icons:")
    build_circular(APP_LOGO, CIRCULAR_MASTER)
    build_rectangular(MENU_ICON, RECT_MASTER)
    return 0


if __name__ == "__main__":
    sys.exit(main())
