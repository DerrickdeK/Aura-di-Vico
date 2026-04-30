"""Generates PWA icons for Aura di Brera. Run once — outputs PNGs into
/app/frontend/public. Re-run whenever the branding palette changes.

Design: three concentric aura rings in terracotta on a cream square, with
a small "A" letter at the centre (serif). Inspired by the app's listening-
compass motif.
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

CREAM     = (245, 241, 232, 255)
TERRA     = (189,  87,  69, 255)
OCHRE     = (201, 138,  60, 255)
DEEP      = ( 30,  58,  47, 255)
INK       = ( 26,  26,  24, 255)

OUT_DIR = Path("/app/frontend/public")

def _find_serif_font(size: int):
    # Try a few system-installed serif fonts; fallback to default.
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVu-Serif-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()

def make_icon(size: int, maskable: bool = False) -> Image.Image:
    """Draw the Aura di Brera icon at a given edge size."""
    img = Image.new("RGBA", (size, size), CREAM)
    draw = ImageDraw.Draw(img)

    # Maskable icons must keep their content inside a central safe zone of 80%.
    safe = int(size * 0.78) if maskable else size
    pad = (size - safe) // 2
    cx, cy = size // 2, size // 2

    # Three concentric aura rings (outer = ochre, middle = terracotta, inner = deep green).
    ring_widths = max(2, int(size / 48))
    rings = [
        (int(safe * 0.46), OCHRE,  ring_widths),
        (int(safe * 0.34), TERRA,  ring_widths),
        (int(safe * 0.22), DEEP,   ring_widths),
    ]
    for r, color, w in rings:
        draw.ellipse((cx - r, cy - r, cx + r, cy + r),
                     outline=color, width=w)

    # Centre dot (filled terracotta) — the "pulse"
    cd = int(safe * 0.08)
    draw.ellipse((cx - cd, cy - cd, cx + cd, cy + cd), fill=TERRA)

    # A serif "A" centred above the rings for a subtle wordmark.
    if size >= 128:
        font_size = int(size * 0.18)
        font = _find_serif_font(font_size)
        text = "A"
        try:
            bbox = draw.textbbox((0, 0), text, font=font)
            tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        except AttributeError:
            tw, th = draw.textsize(text, font=font)
        tx = cx - tw // 2 - bbox[0] if size >= 128 else cx - tw // 2
        ty = cy - th // 2 - (bbox[1] if size >= 128 else 0)
        draw.text((tx, ty), text, fill=INK, font=font)

    return img


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for size in (192, 512):
        make_icon(size).save(OUT_DIR / f"icon-{size}.png", "PNG")
        make_icon(size, maskable=True).save(OUT_DIR / f"icon-maskable-{size}.png", "PNG")
    # Apple touch icon (iOS "Add to Home Screen")
    make_icon(180).save(OUT_DIR / "apple-touch-icon.png", "PNG")
    # Favicon (32px)
    make_icon(64).save(OUT_DIR / "favicon-64.png", "PNG")
    print("Icons written to", OUT_DIR)


if __name__ == "__main__":
    main()
