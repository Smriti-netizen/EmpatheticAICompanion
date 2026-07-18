from pathlib import Path
from PIL import Image, ImageChops

CREAM = (245, 239, 227)
PUB = Path(__file__).resolve().parents[1] / "public"

for name in [
    "landing_flower_main.png",
    "landing_flower_left.png",
    "landing_vine.png",
    "landing_vine_path.png",
    "landing_vine_edge.png",
]:
    p = PUB / name
    if not p.exists():
        continue
    rgb = Image.open(p).convert("RGB")
    cream = Image.new("RGB", rgb.size, CREAM)
    mask = ImageChops.difference(rgb, cream).convert("L").point(lambda v: 255 if v > 36 else 0)
    bbox = mask.getbbox()
    print(name, rgb.size, "bbox", bbox)
