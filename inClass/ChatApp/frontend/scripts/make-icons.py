"""
Draws the huddle. app icon, Android adaptive layers, splash mark and favicon
from the design tokens: a lowercase Inter SemiBold "h" with the accent
gradient dot, on the dark slab colour. Re-run after changing the mark:

    python3 scripts/make-icons.py

Needs Pillow. Reads the Inter font from node_modules; writes into assets/.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf"
ASSETS = ROOT / "assets"

SLAB = (0x22, 0x20, 0x21, 255)
WHITE = (255, 255, 255, 255)
GRADIENT = [(0.0, (0xE6, 0xA0, 0x65)), (0.55, (0xDB, 0x97, 0x96)), (1.0, (0xD0, 0x92, 0xBB))]
SIZE = 1024
SPLASH_RADIUS = 230


def gradient_at(t):
    for (t0, c0), (t1, c1) in zip(GRADIENT, GRADIENT[1:]):
        if t <= t1:
            k = (t - t0) / (t1 - t0)
            return tuple(round(a + (b - a) * k) for a, b in zip(c0, c1)) + (255,)
    return GRADIENT[-1][1] + (255,)


def gradient_disc(diameter):
    disc = Image.new("RGBA", (diameter, diameter))
    pixels = disc.load()
    for x in range(diameter):
        colour = gradient_at(x / (diameter - 1))
        for y in range(diameter):
            pixels[x, y] = colour
    mask = Image.new("L", (diameter, diameter), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, diameter - 1, diameter - 1), fill=255)
    disc.putalpha(mask)
    return disc


def mark(scale, gradient_dot=True):
    """The "h." mark centred on a transparent square; `scale` sets the font size."""
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.truetype(str(FONT), round(SIZE * scale))
    left, top, right, bottom = draw.textbbox((0, 0), "h", font=font)
    glyph_w, glyph_h = right - left, bottom - top
    dot_d = round(glyph_h * 0.30)
    gap = round(dot_d * 0.35)
    x0 = (SIZE - (glyph_w + gap + dot_d)) // 2 - left
    y0 = (SIZE - glyph_h) // 2 - top
    draw.text((x0, y0), "h", font=font, fill=WHITE)
    dot_x = x0 + left + glyph_w + gap
    dot_y = y0 + top + glyph_h - dot_d
    if gradient_dot:
        canvas.alpha_composite(gradient_disc(dot_d), (dot_x, dot_y))
    else:
        draw.ellipse((dot_x, dot_y, dot_x + dot_d, dot_y + dot_d), fill=WHITE)
    return canvas


def on_slab(scale):
    icon = Image.new("RGBA", (SIZE, SIZE), SLAB)
    icon.alpha_composite(mark(scale))
    return icon


def main():
    on_slab(0.62).convert("RGB").save(ASSETS / "icon.png")
    # Android adaptive icon: the mark stays inside the 66% safe zone.
    mark(0.42).save(ASSETS / "android-icon-foreground.png")
    Image.new("RGBA", (SIZE, SIZE), SLAB).save(ASSETS / "android-icon-background.png")
    mark(0.42, gradient_dot=False).save(ASSETS / "android-icon-monochrome.png")
    # Splash: the rounded slab tile, readable on both the light and dark splash backgrounds.
    tile = on_slab(0.62)
    corners = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(corners).rounded_rectangle((0, 0, SIZE - 1, SIZE - 1), radius=SPLASH_RADIUS, fill=255)
    tile.putalpha(corners)
    tile.save(ASSETS / "splash-icon.png")
    on_slab(0.62).resize((48, 48), Image.LANCZOS).save(ASSETS / "favicon.png")
    print("icons written to", ASSETS)


if __name__ == "__main__":
    main()
