#!/usr/bin/env python3
"""Generate the PumaSoft-branded installer bitmaps.

Run from the repo root:

    python scripts/generate_installer_assets.py

The source logo is the app icon (a cat). The assets are committed so a release
build does not depend on this script, but keeping it here makes the branding
reproducible.
"""
from __future__ import annotations

import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS = os.path.join(ROOT, "src-tauri", "icons")
LOGO = os.path.join(ICONS, "base.png")

BG = (10, 14, 20)
BG2 = (18, 25, 36)
ACCENT = (43, 134, 255)
TEXT = (232, 238, 247)
MUTED = (148, 163, 184)


def font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    candidates = [
        r"C:\Windows\Fonts\seguisb.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
        if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def logo(size: int) -> Image.Image:
    image = Image.open(LOGO).convert("RGBA")
    image.thumbnail((size, size), Image.LANCZOS)
    return image


def gradient(width: int, height: int) -> Image.Image:
    image = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(image)
    for y in range(height):
        t = y / max(1, height - 1)
        color = tuple(int(BG[i] + (BG2[i] - BG[i]) * t) for i in range(3))
        draw.line([(0, y), (width, y)], fill=color)
    return image


def paste_logo(canvas: Image.Image, size: int, xy: tuple[int, int]) -> None:
    mark = logo(size)
    canvas.paste(mark, xy, mark)


def nsis_header() -> None:
    image = gradient(150, 57)
    paste_logo(image, 42, (7, 7))
    draw = ImageDraw.Draw(image)
    draw.text((56, 8), "VGC Reporter", font=font(12), fill=TEXT)
    draw.text((56, 27), "by PumaSoft", font=font(9, False), fill=MUTED)
    draw.rectangle([0, 53, 150, 57], fill=ACCENT)
    image.save(os.path.join(ICONS, "nsis-header.bmp"), format="BMP")


def nsis_sidebar() -> None:
    image = gradient(164, 314)
    draw = ImageDraw.Draw(image)
    paste_logo(image, 86, (39, 28))
    draw.text((16, 128), "VGC Reporter", font=font(18), fill=TEXT)
    draw.text((16, 152), "Pokemon Champions", font=font(10, False), fill=ACCENT)
    draw.text((16, 167), "stats & team builder", font=font(10, False), fill=MUTED)
    draw.line([(16, 260), (148, 260)], fill=ACCENT, width=2)
    draw.text((16, 272), "PumaSoft", font=font(11), fill=TEXT)
    draw.text((16, 289), "pumasoft.dev", font=font(9, False), fill=MUTED)
    image.save(os.path.join(ICONS, "nsis-sidebar.bmp"), format="BMP")


def wix_banner() -> None:
    image = gradient(493, 58)
    paste_logo(image, 44, (12, 7))
    draw = ImageDraw.Draw(image)
    draw.text((66, 10), "VGC Reporter", font=font(17), fill=TEXT)
    draw.text((66, 33), "by PumaSoft", font=font(10, False), fill=MUTED)
    draw.rectangle([0, 54, 493, 58], fill=ACCENT)
    image.save(os.path.join(ICONS, "wix-banner.bmp"), format="BMP")


def wix_dialog() -> None:
    image = gradient(493, 312)
    draw = ImageDraw.Draw(image)
    paste_logo(image, 112, (190, 34))
    draw.text((36, 164), "Welcome to VGC Reporter", font=font(22), fill=TEXT)
    draw.text(
        (36, 198),
        "Pokemon Champions stats, team building and damage calc.",
        font=font(11, False),
        fill=MUTED,
    )
    draw.text((36, 220), "PumaSoft", font=font(11), fill=ACCENT)
    draw.rectangle([0, 306, 493, 312], fill=ACCENT)
    image.save(os.path.join(ICONS, "wix-dialog.bmp"), format="BMP")


def dmg_background() -> None:
    image = gradient(660, 400)
    draw = ImageDraw.Draw(image)
    paste_logo(image, 112, (54, 74))
    draw.text((54, 200), "VGC Reporter", font=font(26), fill=TEXT)
    draw.text((54, 234), "by PumaSoft", font=font(13, False), fill=MUTED)
    draw.line([(54, 276), (606, 276)], fill=ACCENT, width=2)
    draw.text((54, 292), "Drag the app to Applications", font=font(13, False), fill=TEXT)
    draw.text((54, 330), "Pokemon Champions stats & team builder", font=font(11, False), fill=MUTED)
    image.save(os.path.join(ICONS, "dmg-background.png"), format="PNG")


if __name__ == "__main__":
    nsis_header()
    nsis_sidebar()
    wix_banner()
    wix_dialog()
    dmg_background()
    print("installer assets generated in", ICONS)
