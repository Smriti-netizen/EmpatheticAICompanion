from PIL import Image
import os

src_dir = r"C:\Users\smrit\.cursor\projects\c-Users-smrit-OneDrive-empathaticaicompanion\assets"
dst_dir = r"C:\Users\smrit\OneDrive\empathaticaicompanion\frontend\public"
cream = (245, 239, 227)  # #F5EFE3


def flatten_to_cream(path_in: str, path_out: str) -> None:
    im = Image.open(path_in).convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            brightness = (r + g + b) / 3
            chroma = max(r, g, b) - min(r, g, b)
            is_plant_green = g > r + 12 and g > b + 8 and brightness < 215
            is_flower_pink = r > g + 15 and r > b + 8 and brightness < 220
            if is_plant_green or is_flower_pink:
                px[x, y] = (r, g, b, 255)
                continue
            if a < 240 or (brightness > 215 and chroma < 40) or (
                abs(r - g) < 20 and abs(g - b) < 20 and brightness > 195
            ):
                px[x, y] = (*cream, 255)
            else:
                px[x, y] = (r, g, b, 255)
    bg = Image.new("RGBA", im.size, (*cream, 255))
    out = Image.alpha_composite(bg, im).convert("RGB")
    out.save(path_out, "PNG")
    print(path_out, out.size, out.getpixel((0, 0)))


for name in ["landing_vine.png", "landing_vine_small.png", "landing_vine_left.png"]:
    src = os.path.join(src_dir, name)
    if not os.path.exists(src):
        print("skip missing", name)
        continue
    flatten_to_cream(src, os.path.join(dst_dir, name))
print("done")
