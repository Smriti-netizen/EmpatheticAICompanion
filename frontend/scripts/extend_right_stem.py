"""Right side: keep bloom cluster as-is at top; long stem trail to green boundary."""
from pathlib import Path

from PIL import Image, ImageOps

PUB = Path(__file__).resolve().parents[1] / "public"


def main() -> None:
    stem_src = Image.open(PUB / "landing_main_cut.png").convert("RGBA")
    bloom_src = Image.open(PUB / "landing_side_cut.png").convert("RGBA")

    # Stem/leaves only — extend downward under the existing bloom art
    stem = stem_src.crop(
        (0, int(stem_src.height * 0.48), stem_src.width, stem_src.height)
    )
    stem = ImageOps.mirror(stem)
    stem = stem.resize(
        (int(stem.width * 0.7), int(stem.height * 1.55)),
        Image.Resampling.LANCZOS,
    )

    bloom = bloom_src

    W = max(stem.width, bloom.width) + 40
    overlap = int(bloom.height * 0.22)
    H = bloom.height + stem.height - overlap
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    bloom_x = W - bloom.width - 4
    canvas.alpha_composite(bloom, (bloom_x, 0))

    stem_x = W - stem.width - 18
    stem_y = bloom.height - overlap
    canvas.alpha_composite(stem, (stem_x, stem_y))

    out = PUB / "landing_right_tall.png"
    canvas.save(out, "PNG")
    print("wrote", out, canvas.size)


if __name__ == "__main__":
    main()
