"""Compose landing vine layers from poster-style botanical PNGs on cream."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops, ImageFilter, ImageOps

CREAM = (245, 239, 227)
PUB = Path(__file__).resolve().parents[1] / "public"
ASSETS = Path(
    r"C:\Users\smrit\.cursor\projects\c-Users-smrit-OneDrive-empathaticaicompanion\assets"
)


def non_cream_mask(im: Image.Image, thresh: int = 38) -> Image.Image:
    rgb = im.convert("RGB")
    cream = Image.new("RGB", rgb.size, CREAM)
    diff = ImageChops.difference(rgb, cream).convert("L")
    # boost greens/pinks that are close to cream
    return diff.point(lambda p: 255 if p > thresh else 0)


def cutout(im: Image.Image, thresh: int = 38) -> Image.Image:
    rgb = im.convert("RGB")
    mask = non_cream_mask(rgb, thresh).filter(ImageFilter.MaxFilter(3))
    # soften edge slightly
    mask = mask.filter(ImageFilter.GaussianBlur(0.6))
    out = Image.new("RGBA", rgb.size, (0, 0, 0, 0))
    out.paste(rgb, (0, 0))
    out.putalpha(mask)
    # trim
    bbox = out.getbbox()
    if bbox:
        out = out.crop(bbox)
    return out


def paste(base: Image.Image, piece: Image.Image, xy: tuple[int, int], scale: float = 1.0, rotate: float = 0.0, flip: bool = False) -> None:
    p = piece
    if flip:
        p = ImageOps.mirror(p)
    if abs(rotate) > 0.01:
        p = p.rotate(rotate, expand=True, resample=Image.Resampling.BICUBIC)
    if abs(scale - 1.0) > 0.01:
        nw = max(1, int(p.width * scale))
        nh = max(1, int(p.height * scale))
        p = p.resize((nw, nh), Image.Resampling.LANCZOS)
    base.alpha_composite(p, xy)


def flatten_to_cream(rgba: Image.Image) -> Image.Image:
    bg = Image.new("RGBA", rgba.size, (*CREAM, 255))
    bg.alpha_composite(rgba)
    return bg.convert("RGB")


def main() -> None:
    main_src = cutout(Image.open(PUB / "landing_flower_main.png"), 36)
    left_src = cutout(Image.open(PUB / "landing_flower_left.png"), 36)
    side_src = cutout(Image.open(PUB / "landing_flower_side.png"), 36)
    vine_src = cutout(Image.open(PUB / "landing_vine.png"), 36)

    poster = None
    for p in sorted(ASSETS.glob("*.png")):
        if not p.is_file():
            continue
        if "cc73324f" in p.name or "4c3ae63d" in p.name:
            try:
                poster = cutout(Image.open(p), 42)
                print("poster", p.name, poster.size)
                break
            except OSError as e:
                print("skip", p.name, e)

    W, H = 1600, 2200
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    # --- MAIN PATH vine ---
    # 1) Top-left bud start (from main plant top portion, rotated to spill from TL)
    top = main_src.crop((0, 0, main_src.width, int(main_src.height * 0.45)))
    paste(canvas, top, (-40, -80), scale=1.15, rotate=18)

    # 2) Mid flower near untangle / main headline (center-right of upper half)
    mid = main_src.crop(
        (
            int(main_src.width * 0.05),
            int(main_src.height * 0.18),
            int(main_src.width * 0.95),
            int(main_src.height * 0.72),
        )
    )
    paste(canvas, mid, (780, 280), scale=0.95, rotate=-8)

    # 3) Right descending stem framing Available 24/7 zone → green merge
    stem = vine_src.crop(
        (
            int(vine_src.width * 0.15),
            int(vine_src.height * 0.25),
            vine_src.width,
            vine_src.height,
        )
    )
    paste(canvas, stem, (980, 900), scale=1.05, rotate=-12)

    # Extra bloom near bottom-right to merge into green
    bloom = side_src.crop(
        (
            int(side_src.width * 0.2),
            int(side_src.height * 0.15),
            side_src.width,
            int(side_src.height * 0.7),
        )
    )
    paste(canvas, bloom, (1100, 1550), scale=0.7, rotate=15)

    main_out = flatten_to_cream(canvas)
    main_path = PUB / "landing_vine_path.png"
    main_out.save(main_path, "PNG")
    print("wrote", main_path, main_out.size)

    # --- LEFT EDGE vine: Private → Start Talking, pink flower on left boundary ---
    left_canvas = Image.new("RGBA", (700, 1800), (0, 0, 0, 0))
    paste(left_canvas, left_src, (-30, 200), scale=1.2, rotate=-6)
    # Extra pink flower hard against left edge (crop main bloom)
    flower = main_src.crop(
        (
            int(main_src.width * 0.15),
            int(main_src.height * 0.22),
            int(main_src.width * 0.85),
            int(main_src.height * 0.55),
        )
    )
    paste(left_canvas, flower, (-80, 40), scale=0.55, rotate=25)

    left_out = flatten_to_cream(left_canvas)
    left_path = PUB / "landing_vine_edge.png"
    left_out.save(left_path, "PNG")
    print("wrote", left_path, left_out.size)

    if poster:
        print("poster cutout size", poster.size)


if __name__ == "__main__":
    main()
