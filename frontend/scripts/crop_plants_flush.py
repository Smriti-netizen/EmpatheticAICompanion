"""Crop botanical PNGs so plant content starts at the left/top edge."""
from pathlib import Path

from PIL import Image, ImageChops

CREAM = (245, 239, 227)
PUB = Path(__file__).resolve().parents[1] / "public"
PAD = 24


def content_bbox(rgb: Image.Image, thresh: int = 36):
    cream = Image.new("RGB", rgb.size, CREAM)
    mask = ImageChops.difference(rgb, cream).convert("L").point(
        lambda v: 255 if v > thresh else 0
    )
    return mask.getbbox()


def crop_flush(src_name: str, dst_name: str, pad: int = PAD) -> None:
    rgb = Image.open(PUB / src_name).convert("RGB")
    bbox = content_bbox(rgb)
    if not bbox:
        raise SystemExit(f"no content in {src_name}")
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(rgb.width, r + pad)
    b = min(rgb.height, b + pad)
    cropped = rgb.crop((l, t, r, b))
    # ensure exact cream bg
    out = Image.new("RGB", cropped.size, CREAM)
    # paste only non-cream? keep as-is since already cream elsewhere
    out.paste(cropped, (0, 0))
    out.save(PUB / dst_name, "PNG")
    print(src_name, "->", dst_name, cropped.size, "from bbox", bbox)


if __name__ == "__main__":
    crop_flush("landing_flower_main.png", "landing_main_flush.png", pad=16)
    crop_flush("landing_vine.png", "landing_right_flush.png", pad=16)
    crop_flush("landing_flower_left.png", "landing_left_flush.png", pad=8)
