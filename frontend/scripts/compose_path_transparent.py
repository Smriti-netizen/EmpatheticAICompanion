"""Compose an S-path vine from transparent cutouts on a transparent canvas, then flatten cream."""
from pathlib import Path

from PIL import Image, ImageOps

CREAM = (245, 239, 227)
PUB = Path(__file__).resolve().parents[1] / "public"


def load(name: str) -> Image.Image:
    return Image.open(PUB / name).convert("RGBA")


def place(
    canvas: Image.Image,
    piece: Image.Image,
    xy: tuple[int, int],
    scale: float = 1.0,
    rotate: float = 0.0,
    flip: bool = False,
) -> None:
    p = piece
    if flip:
        p = ImageOps.mirror(p)
    if abs(rotate) > 0.01:
        p = p.rotate(rotate, expand=True, resample=Image.Resampling.BICUBIC)
    if abs(scale - 1.0) > 0.01:
        p = p.resize(
            (max(1, int(p.width * scale)), max(1, int(p.height * scale))),
            Image.Resampling.LANCZOS,
        )
    canvas.alpha_composite(p, xy)


def main() -> None:
    main_cut = load("landing_main_cut.png")
    left_cut = load("landing_left_cut.png")
    side_cut = load("landing_side_cut.png")
    pink = load("landing_pink_cut.png")

    W, H = 1800, 2400
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    # Layout anchors: TL start → Privacy/untangle → Available 24/7 → green merge
    top = main_cut.crop((0, 0, main_cut.width, int(main_cut.height * 0.42)))
    place(canvas, top, (-20, -40), scale=1.25, rotate=12)

    mid = main_cut.crop(
        (0, int(main_cut.height * 0.12), main_cut.width, int(main_cut.height * 0.62))
    )
    place(canvas, mid, (820, 220), scale=0.9, rotate=-14)

    place(canvas, side_cut, (1080, 980), scale=1.05, rotate=-6)

    lower = main_cut.crop(
        (0, int(main_cut.height * 0.45), main_cut.width, main_cut.height)
    )
    place(canvas, lower, (1200, 1500), scale=0.75, rotate=8)

    bg = Image.new("RGBA", (W, H), (*CREAM, 255))
    bg.alpha_composite(canvas)
    bg.convert("RGB").save(PUB / "landing_path_cream.png", "PNG")

    canvas.save(PUB / "landing_path_cut.png", "PNG")
    print("wrote path cream + cut", canvas.size)

    left_c = Image.new("RGBA", (520, 2000), (0, 0, 0, 0))
    place(left_c, pink, (-40, 20), scale=0.42, rotate=18)
    place(left_c, left_cut, (-10, 280), scale=0.95, rotate=-4)
    left_c.save(PUB / "landing_edge_cut.png", "PNG")
    print("wrote edge cut", left_c.size)


if __name__ == "__main__":
    main()
