from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent / "out"
W, H = 48, 64
COLORS = {
    "ink": "#29233a", "hair": "#646076", "silver": "#a5a1ad",
    "shine": "#dfdce0", "skin": "#ffc294", "tan": "#e48b6b",
    "light": "#ffdfb3", "blush": "#f99c82", "mouth": "#672839",
    "tongue": "#f57383", "white": "#fff7e9", "fold": "#c2c7da",
    "red": "#d64150", "wine": "#963149", "trim": "#f97a65",
    "pants": "#44415a", "crease": "#625d76", "shoe": "#312e42",
    "glint": "#827a91", "wood": "#703d32", "amber": "#b56d3d",
    "gold": "#ffd279",
}

# Each pose gives body lift, back and front foot offsets (x, height),
# bead-hand offset, and expression.
ANIMATIONS = {
    "idle": (125, [
        (0, (0, 0), (0, 0), (0, 0), "smile"),
        (0, (0, 0), (0, 0), (0, -1), "smile"),
        (1, (0, 0), (0, 0), (0, -1), "smile"),
        (1, (0, 0), (0, 0), (0, -1), "grin"),
        (0, (0, 0), (0, 0), (0, 0), "smile"),
    ]),
    "walk": (95, [
        (0, (-5, 0), (6, 0), (2, 0), "smile"),
        (1, (-3, 2), (3, 0), (1, -1), "smile"),
        (2, (2, 4), (0, 0), (-1, 0), "smile"),
        (0, (9, 0), (-9, 0), (-2, 2), "smile"),
        (1, (5, 0), (-5, 3), (-1, 1), "smile"),
        (2, (0, 0), (2, 4), (1, 0), "smile"),
    ]),
    "laugh": (105, [
        (0, (0, 0), (0, 0), (0, 0), "grin"),
        (-2, (-1, 0), (1, 0), (0, 1), "laugh"),
        (3, (-2, 3), (2, 4), (-1, -4), "laugh"),
        (5, (-4, 7), (4, 9), (-2, -7), "laugh"),
        (4, (-2, 5), (3, 6), (-1, -5), "laugh"),
        (-1, (-1, 0), (1, 0), (0, 1), "grin"),
    ]),
    "dejected": (130, [
        (0, (0, 0), (0, 0), (0, 1), "sigh"),
        (-1, (0, 0), (0, 0), (1, 3), "sad"),
        (-2, (0, 0), (0, 0), (1, 5), "sad"),
        (-3, (0, 0), (0, 0), (1, 6), "sad"),
        (-2, (0, 0), (0, 0), (1, 5), "sad"),
        (-1, (0, 0), (0, 0), (0, 3), "sigh"),
    ]),
}


def draw_pose(pose):
    lift, back, front, (hand_x, hand_y), face = pose
    img = Image.new("RGBA", (W, H))
    d = ImageDraw.Draw(img)

    def poly(points, fill, edge=None, dx=0, dy=-lift):
        d.polygon([(x + dx, y + dy) for x, y in points],
                  COLORS[fill], outline=COLORS[edge] if edge else None)

    def line(points, color, dx=0, dy=-lift):
        d.line([(x + dx, y + dy) for x, y in points], COLORS[color])

    # Move the feet independently while keeping the hips attached to the torso.
    for hip, (step, height), near in [(20, back, False), (29, front, True)]:
        foot = hip + step
        poly([(hip-5, 44-lift), (hip+5, 44-lift), (foot+4, 56-height),
              (foot+2, 60-height), (foot-4, 60-height), (foot-5, 56-height)],
             "pants" if near else "shoe", "ink", dy=0)
        line([(hip-2, 47-lift), (foot-2, 55-height)], "crease", dy=0)
        poly([(foot-4, 57), (foot+2, 57), (foot+5, 58), (foot+6, 60),
              (foot+5, 61), (foot-4, 61), (foot-5, 60)],
             "shoe", "ink", dy=-height)
        line([(foot+1, 59), (foot+4, 59)], "glint", dy=-height)

    # Far sleeve and hand, then the shirt and vest.
    far = -hand_y // 2
    poly([(33, 33), (37, 34), (40, 39+far), (39, 45+far),
          (36, 46+far), (34, 43+far), (34, 41+far)], "skin", "ink")
    poly([(33, 32), (37, 33), (40, 39+far), (37, 42+far),
          (33, 40+far), (32, 36)], "white", "ink")
    line([(36, 39+far), (38, 38+far)], "fold")
    poly([(17, 31), (30, 30), (35, 33), (37, 43), (35, 48),
          (31, 50), (19, 50), (13, 47), (13, 40)], "white", "ink")
    poly([(23, 34), (26, 36), (24, 47), (30, 49), (20, 49),
          (19, 45)], "fold")
    poly([(17, 31), (21, 32), (20, 38), (18, 44), (19, 49),
          (14, 48), (12, 45), (13, 38)], "red", "ink")
    poly([(29, 31), (34, 32), (36, 38), (37, 45), (34, 49),
          (27, 50), (27, 46), (29, 38)], "red", "ink")
    poly([(31, 45), (36, 42), (36, 46), (33, 48), (28, 49),
          (28, 47)], "wine")
    line([(30, 34), (31, 37), (29, 43)], "trim")
    line([(31, 43), (34, 42)], "wine")
    for y in (39, 42, 46):
        line([(23, y), (24, y)], "hair")
    poly([(20, 30), (28, 30), (30, 33), (27, 36), (24, 34),
          (21, 36), (19, 33)], "white", "ink")

    x, y = 10 + hand_x, 35 + hand_y
    poly([(16, 33), (19, 36), (16, 42), (12, 44+hand_y//2),
          (8+hand_x, y+5), (8+hand_x, y+1), (12+hand_x, y),
          (13, 36)], "white", "ink")
    line([(10+hand_x, y+4), (13, 42+hand_y//2), (16, 39)], "fold")

    # The rosary is a closed loop with individual shaded beads and a drop bead.
    ring = [(x-1,y+1), (x-3,y+3), (x-4,y+5), (x-4,y+8),
            (x-2,y+10), (x+1,y+10), (x+3,y+8), (x+3,y+5),
            (x+2,y+3)]
    d.line([(a, b-lift) for a,b in ring + ring[:1]], COLORS["wood"], width=2)
    for a, b in ring + [(x, y+12)]:
        b -= lift
        d.polygon([(a,b-1), (a+1,b), (a,b+1), (a-1,b)], COLORS["wood"])
        d.point((a,b), COLORS["amber"])
        d.point((a,b-1), COLORS["gold"])
    poly([(x-3,y), (x-3,y-3), (x-1,y-5), (x+2,y-5),
          (x+4,y-3), (x+4,y), (x+2,y+2), (x,y+2)],
         "skin", "ink")
    line([(x-1, y-3), (x+1, y-3), (x+3, y-1)], "light")
    line([(x-2, y), (x, y-1), (x+2, y)], "tan")

    # Lower the head independently when his shoulders slump.
    hx = 1 if face in ("sad", "sigh") else 0
    hy = -lift + (2 if face == "sad" else 1 if face == "sigh" else 0)

    def head(points, color, edge=None):
        poly(points, color, edge, hx, hy)

    def mark(points, color):
        line(points, color, hx, hy)

    head([(15,14),(16,11),(20,9),(28,9),(34,12),(37,17),(37,20),
          (40,20),(41,22),(40,26),(37,27),(34,31),(30,33),(22,33),
          (17,30),(14,26),(12,25),(12,21),(14,20)], "skin", "ink")
    head([(35,19),(37,22),(39,21),(40,22),(39,25),(36,26),(34,29),
          (30,32),(23,32),(20,30),(26,31),(31,29),(33,26)], "tan")
    mark([(37,24),(38,22),(39,23)], "wood")
    head([(13,21),(12,16),(14,11),(17,8),(22,6),(30,6),(35,8),
          (38,11),(39,15),(38,20),(36,23),(34,20),(34,16),
          (32,15),(31,12),(28,13),(24,12),(21,14),(17,14),
          (16,17),(15,21)], "hair", "ink")
    head([(14,15),(16,11),(20,8),(24,7),(30,7),(35,9),(37,12),
          (33,11),(31,10),(28,11),(25,10),(22,11),(19,11),
          (17,13)], "silver")
    mark([(17,11),(21,9),(25,8),(28,8)], "shine")
    mark([(30,8),(33,9),(35,10)], "shine")
    mark([(36,15),(37,16),(36,20)], "silver")
    head([(18,15),(21,14),(24,15),(23,16),(19,16)], "light")
    head([(16,23),(20,22),(21,24),(19,26),(16,25)], "blush")
    head([(30,23),(34,22),(35,24),(33,26),(30,25)], "blush")
    if face in ("sad", "sigh"):
        mark([(17,19),(20,19),(22,17)], "hair")
        mark([(27,17),(29,19),(32,19)], "hair")
        mark([(17,21),(19,22),(22,22)], "ink")
        mark([(27,22),(30,22),(32,21)], "ink")
    else:
        mark([(17,18),(19,16),(22,17)], "hair")
        mark([(27,17),(30,16),(32,17)], "hair")
        mark([(17,21),(19,19),(21,19),(23,21)], "ink")
        mark([(27,21),(29,19),(31,19),(33,21)], "ink")
        mark([(16,24),(17,23)], "tan")
        mark([(33,23),(34,24)], "tan")
    mark([(23,21),(22,23),(23,24),(26,24),(27,23)], "tan")
    mark([(23,22),(25,22)], "light")
    if face in ("laugh", "grin", "smile"):
        bottom = {"smile": 29, "grin": 30, "laugh": 32}[face]
        head([(19,25),(22,26),(28,26),(32,24),(31,bottom-2),
              (28,bottom),(23,bottom),(21,bottom-1)], "mouth", "ink")
        mark([(21,26),(24,27),(29,27),(31,25)], "white")
        if face == "laugh":
            head([(23,30),(25,29),(28,29),(29,30),(28,31),(24,31)], "tongue")
    elif face == "sad":
        mark([(21,29),(23,27),(27,27),(29,28)], "mouth")
    else:
        head([(23,27),(26,27),(28,28),(27,29),(23,29)], "mouth")

    return img


def build():
    OUT.mkdir(exist_ok=True)
    sheet = Image.new("RGBA", (max(len(p) for _, p in ANIMATIONS.values()) * W,
                               len(ANIMATIONS) * H))
    preview = Image.new("RGB", sheet.size, "#edf5f6")
    backdrop = ImageDraw.Draw(preview)
    for row, (name, (duration, poses)) in enumerate(ANIMATIONS.items()):
        frames = []
        for col, pose in enumerate(poses):
            sprite = draw_pose(pose)
            x, y = col * W, row * H
            sheet.paste(sprite, (x, y))
            backdrop.rectangle((x, y, x+W-2, y+H-2),
                               fill=("#f8eee2" if row % 2 else "#e0f0f4"))
            preview.paste(sprite, (x, y), sprite)
            white = Image.new("RGB", (W, H), "white")
            white.paste(sprite, mask=sprite.getchannel("A"))
            frames.append(white.resize((W*4, H*4), Image.Resampling.NEAREST))
        # GIF delays are measured in hundredths of a second.
        delays = [(i+1)*duration//10*10 - i*duration//10*10
                  for i in range(len(frames))]
        frames[0].save(OUT / f"codex_jinshui_{name}.gif", save_all=True,
                       append_images=frames[1:], duration=delays, loop=0,
                       disposal=2)
    sheet.save(OUT / "codex_jinshui_sheet.png")
    preview.resize((sheet.width*5, sheet.height*5),
                   Image.Resampling.NEAREST).save(OUT / "codex_preview.png")


if __name__ == "__main__":
    build()
