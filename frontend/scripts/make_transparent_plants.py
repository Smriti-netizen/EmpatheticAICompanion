"""Convert cream-bg botanicals to transparent PNGs (preserve soft pinks)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter

CREAM = (245, 239, 227)
PUB = Path(__file__).resolve().parents[1] / "public"


def cream_distance(r: int, g: int, b: int) -> float:
    # Weighted: greens/pinks differ more in channels that matter for botanicals
    return (
        abs(r - CREAM[0]) * 1.1
        + abs(g - CREAM[1]) * 1.0
        + abs(b - CREAM[2]) * 1.2
    )


def to_transparent(src: str, dst: str, soft: float = 28.0, hard: float = 55.0) -> None:
    rgb = Image.open(PUB / src).convert("RGB")
    px = rgb.load()
    w, h = rgb.size
    alpha = Image.new("L", (w, h))
    ap = alpha.load()
    for y in range(h):
        for x in range(w):
            d = cream_distance(*px[x, y])
            if d <= soft:
                ap[x, y] = 0
            elif d >= hard:
                ap[x, y] = 255
            else:
                ap[x, y] = int(255 * (d - soft) / (hard - soft))
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.35))
    rgba = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    rgba.paste(rgb, (0, 0))
    rgba.putalpha(alpha)
    bbox = rgba.getbbox()
    if bbox:
        rgba = rgba.crop(bbox)
    rgba.save(PUB / dst, "PNG")
    print(src, "->", dst, rgba.size)


if __name__ == "__main__":
    to_transparent("landing_main_flush.png", "landing_main_cut.png", soft=22, hard=48)
    to_transparent("landing_left_flush.png", "landing_left_cut.png", soft=22, hard=48)
    to_transparent("landing_side_flush.png", "landing_side_cut.png", soft=22, hard=48)
    to_transparent("landing_pink_bud.png", "landing_pink_cut.png", soft=20, hard=46)
