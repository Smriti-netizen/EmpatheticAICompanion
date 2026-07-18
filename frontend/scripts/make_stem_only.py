"""Stem/leaves strip only (cream bg) to extend under the complete side bloom."""
from pathlib import Path

from PIL import Image, ImageOps

CREAM = (250, 246, 239)  # match current page cream
PUB = Path(__file__).resolve().parents[1] / "public"


def main() -> None:
    # Use flush (full petals) — not the holey alpha cut
    main = Image.open(PUB / "landing_main_flush.png").convert("RGB")
    # Lower stem/leaves only
    stem = main.crop((0, int(main.height * 0.5), main.width, main.height))
    stem = ImageOps.mirror(stem)

    # Paint exact page cream so it blends
    out = Image.new("RGB", stem.size, CREAM)
    # keep plant pixels; simple distance key from old cream
    old = (245, 239, 227)
    sp = stem.load()
    op = out.load()
    for y in range(stem.height):
        for x in range(stem.width):
            r, g, b = sp[x, y]
            d = abs(r - old[0]) + abs(g - old[1]) + abs(b - old[2])
            if d > 36:
                op[x, y] = (r, g, b)

    path = PUB / "landing_stem_right.png"
    out.save(path, "PNG")
    print("wrote", path, out.size)


if __name__ == "__main__":
    main()
