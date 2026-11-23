from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "out"
SIZE = (48, 64)
INK = "#120f16"
SKIN = "#ffc08d"
CREAM = "#fff1d4"
RESAMPLE = Image.Resampling.NEAREST


class Sprite:
    def __init__(self):
        self.image = Image.new("RGBA", SIZE)
        self.draw = ImageDraw.Draw(self.image)

    def shape(self, fill, *points):
        self.draw.polygon(points, fill=fill, outline=INK, width=2)

    def line(self, color, *points, width=1):
        self.draw.line(points, fill=color, width=width)

    def patch(self, color, *points):
        self.draw.polygon(points, fill=color)


def afang():
    s = Sprite()
    hair, apron, shirt = "#592b32", "#a93554", "#efa268"
    leaf, stalk, basket = "#429853", "#9fca60", "#e29645"

    s.shape("#484055", (10, 48), (23, 49), (24, 56), (27, 59),
            (27, 61), (8, 61), (7, 59), (10, 56))
    s.line(CREAM, (10, 58), (13, 58))
    s.line(CREAM, (21, 59), (24, 59))
    s.shape(shirt, (12, 37), (21, 36), (27, 39), (30, 47),
            (27, 54), (20, 56), (9, 54), (5, 50), (7, 43))
    s.shape(apron, (14, 39), (17, 40), (18, 44), (24, 44),
            (26, 40), (28, 42), (28, 53), (24, 55), (9, 53),
            (10, 47), (14, 44))
    s.line(CREAM, (14, 48), (21, 49), (20, 52), (16, 52))
    s.shape(hair, (7, 27), (10, 24), (14, 24), (17, 22),
            (22, 23), (26, 26), (27, 31), (24, 37), (13, 41),
            (8, 39), (5, 35), (5, 30))
    s.line("#a65b51", (8, 31), (11, 28), (13, 29), (16, 26),
           (19, 27), (21, 25))
    s.shape(SKIN, (14, 33), (17, 30), (22, 29), (25, 31),
            (26, 33), (29, 34), (28, 36), (26, 36), (25, 40),
            (21, 42), (16, 40), (13, 37), (11, 37), (11, 34))
    s.line(INK, (17, 34), (19, 32), (21, 33))
    s.line(INK, (23, 32), (25, 32))
    s.patch(INK, (18, 36), (25, 36), (23, 39), (20, 39))
    s.line(CREAM, (19, 36), (24, 36))
    # Her free hand cups the side of her mouth as she calls out.
    s.shape(SKIN, (10, 45), (11, 39), (13, 36), (16, 35),
            (18, 37), (15, 39), (14, 45), (12, 47))
    s.shape(SKIN, (22, 45), (28, 43), (33, 44), (34, 48),
            (28, 50), (23, 49))
    s.shape(leaf, (33, 45), (30, 40), (31, 35), (35, 37),
            (36, 32), (40, 34), (41, 37), (45, 35), (46, 39),
            (42, 46))
    s.line(stalk, (35, 40), (38, 43), (38, 36))
    s.line(stalk, (39, 43), (43, 39))
    s.shape(basket, (29, 43), (46, 43), (45, 49), (42, 54),
            (33, 54), (30, 51))
    s.line(CREAM, (31, 45), (44, 45))
    s.line(apron, (32, 48), (43, 48))
    s.line(apron, (34, 51), (41, 51))
    return s.image


def tsai():
    s = Sprite()
    suit, lapel, tie = "#79388e", "#ab59b4", "#f0bf43"
    metal = "#93a7b6"

    s.shape(suit, (12, 46), (28, 46), (27, 56), (31, 58),
            (31, 61), (22, 61), (20, 58), (19, 53), (15, 57),
            (15, 61), (5, 61), (5, 58), (9, 55))
    s.shape(suit, (13, 34), (22, 32), (28, 35), (30, 42),
            (28, 50), (19, 51), (9, 49), (8, 43))
    s.patch(CREAM, (18, 35), (25, 34), (24, 44), (21, 42))
    s.patch(tie, (22, 35), (24, 36), (23, 39), (24, 43),
            (22, 46), (21, 41))
    s.line(lapel, (16, 36), (13, 40), (18, 43), (17, 45), (21, 47))
    s.line(tie, (23, 48), (24, 48))
    s.shape(suit, (25, 36), (30, 37), (35, 34), (36, 29),
            (41, 30), (40, 37), (36, 42), (28, 43))
    s.shape(metal, (33, 31), (37, 21), (42, 23), (38, 33))
    s.shape("#4e5b74", (34, 20), (35, 16), (39, 13), (44, 14),
            (47, 17), (47, 21), (44, 25), (40, 25), (36, 23))
    s.line(metal, (37, 18), (40, 15), (44, 16))
    s.line(metal, (38, 21), (44, 19), (45, 18))
    s.shape(SKIN, (34, 28), (36, 25), (40, 26), (41, 28),
            (39, 32), (35, 32))
    s.shape("#352734", (6, 27), (6, 22), (9, 17), (15, 17),
            (18, 15), (23, 16), (28, 20), (28, 24), (23, 28),
            (17, 34), (10, 33))
    s.line("#774555", (9, 23), (13, 19), (18, 19), (21, 17))
    s.shape(SKIN, (12, 27), (16, 27), (19, 23), (24, 21),
            (28, 23), (29, 26), (32, 27), (32, 29), (29, 29),
            (30, 33), (27, 37), (21, 38), (16, 35), (13, 34),
            (11, 31))
    s.line(INK, (19, 26), (22, 24), (25, 25))
    s.line(INK, (22, 27), (24, 27), (24, 28))
    s.patch(INK, (19, 30), (28, 29), (28, 33), (26, 35), (23, 35))
    s.line(CREAM, (21, 30), (27, 30))
    s.line("#ea6c78", (24, 34), (26, 34))
    s.shape(suit, (13, 36), (16, 38), (13, 44), (9, 47),
            (5, 47), (3, 43), (8, 41))
    s.shape(SKIN, (2, 42), (6, 41), (8, 43), (7, 46),
            (3, 46), (1, 44))
    return s.image


def lily():
    s = Sprite()
    red, stripe, hair, gold = "#cb3641", "#ffe4cb", "#45252e", "#ffc341"
    s.shape(red, (16, 44), (27, 44), (25, 52), (19, 57),
            (18, 59), (11, 59), (10, 57), (14, 53))
    s.shape(red, (20, 45), (28, 44), (29, 51), (32, 55),
            (33, 60), (26, 60), (22, 55))
    s.line(stripe, (26, 48), (27, 52), (30, 57))
    s.line(stripe, (17, 49), (16, 53), (13, 56))
    s.shape(CREAM, (11, 56), (17, 56), (20, 58), (20, 60),
            (18, 61), (9, 61), (8, 59))
    s.shape(CREAM, (26, 57), (31, 57), (35, 59), (35, 61),
            (25, 61), (24, 59))
    s.shape(hair, (16, 29), (11, 27), (7, 28), (5, 33),
            (6, 37), (3, 40), (9, 39), (13, 36), (14, 33), (18, 34))
    s.line(red, (13, 28), (15, 31))
    s.shape(red, (17, 37), (24, 35), (28, 38), (33, 36),
            (38, 35), (42, 38), (39, 41), (34, 43), (28, 44),
            (28, 47), (23, 49), (15, 47), (13, 43))
    s.line(stripe, (28, 40), (34, 38), (39, 37))
    s.line(stripe, (23, 38), (21, 46))
    s.shape(red, (17, 38), (20, 40), (16, 46), (11, 47),
            (9, 44), (12, 42))
    s.line(stripe, (16, 40), (12, 44))
    s.shape(hair, (14, 29), (17, 24), (22, 22), (27, 23),
            (31, 26), (31, 31), (27, 35), (18, 38), (14, 34))
    s.shape(SKIN, (18, 32), (21, 31), (25, 27), (28, 28),
            (29, 31), (32, 32), (31, 34), (29, 34), (28, 37),
            (25, 40), (21, 39), (18, 37), (16, 35), (16, 33))
    s.line(INK, (23, 32), (25, 30), (27, 31))
    s.line(INK, (28, 30), (29, 30))
    s.patch(INK, (23, 35), (29, 34), (27, 37), (25, 37))
    s.line(CREAM, (24, 35), (28, 35))
    # The lifted ribbon leaves a clear opening in the outline.
    ribbon = ((23, 40), (30, 51), (38, 51), (45, 44), (43, 36))
    s.line(INK, *ribbon, width=4)
    s.line("#42b2b6", *ribbon, width=2)
    s.shape(SKIN, (38, 35), (40, 32), (44, 32), (47, 34),
            (45, 38), (41, 39), (38, 38))
    s.shape(gold, (39, 27), (44, 26), (47, 28), (47, 33),
            (44, 35), (39, 35), (36, 33), (36, 29))
    s.line("#a65833", (41, 30), (43, 29), (43, 32))
    return s.image


def lineup(sprites, silhouette=False):
    image = Image.new("RGBA", (172, 72), "#b0b7b7")
    for index, sprite in enumerate(sprites):
        if silhouette:
            mask = sprite.getchannel("A")
            sprite = Image.new("RGBA", SIZE, "black")
            sprite.putalpha(mask)
        image.alpha_composite(sprite, (6 + 56 * index, 4))
    return image.resize((860, 360), RESAMPLE).convert("RGB")


def board_preview(sprites):
    with Image.open(ROOT / "ref" / "our_board.png") as background:
        image = background.convert("RGBA")
    # Place the feet on visible tiles around the screenshot's central dialog.
    tile_centers = [(672, 187), (1163, 520), (1246, 565)]
    for sprite, (x, y) in zip(sprites, tile_centers, strict=True):
        sprite = sprite.crop(sprite.getbbox())
        width = round(sprite.width * 72 / sprite.height)
        sprite = sprite.resize((width, 72), RESAMPLE)
        image.alpha_composite(sprite, (x - width // 2, y - 71))
    return image.convert("RGB")


def main():
    OUT.mkdir(exist_ok=True)
    characters = {"afang": afang(), "tsai_dazui": tsai(), "lily": lily()}
    for name, sprite in characters.items():
        sprite.save(OUT / f"codex_hero_{name}.png")
    sprites = list(characters.values())
    lineup(sprites).save(OUT / "codex_heroes_lineup.png")
    lineup(sprites, silhouette=True).save(OUT / "codex_heroes_silhouette.png")
    board_preview(sprites).save(OUT / "codex_heroes_board.png")


if __name__ == "__main__":
    main()
