from math import cos, radians, sin

from PIL import Image, ImageDraw

from codex_jinshui import COLORS, H, OUT, W

# Arm points are elbow and fist, relative to the shoulder.
# Leg points are knee and ankle, in canvas coordinates, followed by shoe angle.
POSES = (
    (0, (-8, 5, -11, -1), (1, 6, 13, 2),
     (27, 51, 35, 57, -19), (14, 52, 8, 53, 42)),
    (2, (-6, 7, -7, 1), (0, 7, 10, 4),
     (27, 53, 25, 57, 0), (12, 49, 6, 47, 60)),
    (-3, (-3, 7, 5, 5), (-6, 6, -8, 5),
     (13, 50, 8, 45, 58), (26, 46, 30, 52, -18)),
    (0, (1, 6, 13, 2), (-8, 5, -11, -1),
     (14, 52, 8, 53, 42), (27, 51, 35, 57, -19)),
    (2, (0, 7, 10, 4), (-6, 7, -7, 1),
     (12, 49, 6, 47, 60), (27, 53, 25, 57, 0)),
    (-3, (-6, 6, -8, 5), (-3, 7, 5, 5),
     (26, 46, 30, 52, -18), (13, 50, 8, 45, 58)),
)

DUST = (
    ((13, 59), (10, 57), (8, 60)),
    ((10, 58), (7, 56), (4, 59)),
    ((5, 57), (2, 58)),
    ((13, 59), (10, 57), (8, 60)),
    ((10, 58), (7, 56), (4, 59)),
    ((5, 57), (2, 58)),
)


def draw_pose(index):
    bob, near_arm, far_arm, near_leg, far_leg = POSES[index]
    sprite = Image.new("RGBA", (W, H))
    draw = ImageDraw.Draw(sprite)

    def poly(points, color, edge=None, dy=bob):
        draw.polygon([(x, y + dy) for x, y in points], COLORS[color],
                     outline=COLORS[edge] if edge else None)

    def line(points, color, dy=bob, width=1):
        draw.line([(x, y + dy) for x, y in points], COLORS[color], width=width)

    for x, y in DUST[index]:
        line([(x, y), (x + 1, y)], "gold", dy=0)
    if index % 3 == 0:
        line([(11, 61), (14, 61)], "amber", dy=0)
        line([(12, 60), (15, 60)], "gold", dy=0)

    def leg(pose, near):
        kx, ky, ax, ay, angle = pose
        hip = (19 if near else 21, 43 + bob)
        path = [hip, (kx, ky), (ax, ay)]
        line(path, "ink", dy=0, width=9)
        draw.ellipse((kx - 4, ky - 4, kx + 4, ky + 4), COLORS["ink"])
        line(path, "pants" if near else "shoe", dy=0, width=7)
        draw.ellipse((kx - 3, ky - 3, kx + 3, ky + 3),
                     COLORS["pants" if near else "shoe"])
        if near:
            line([(hip[0] + 2, hip[1] + 3), (kx + 1, ky - 1),
                  (ax + 1, ay - 2)], "crease", dy=0)
        c, s = cos(radians(angle)), sin(radians(angle))

        def shoe(points):
            return [(ax + round(x * c - y * s), ay + round(x * s + y * c))
                    for x, y in points]

        poly(shoe([(-4, -3), (2, -3), (3, -1), (7, 0), (8, 2),
                   (7, 4), (-4, 4), (-5, 2)]), "shoe", "ink", dy=0)
        line(shoe([(-3, 3), (6, 3)]), "ink", dy=0)
        line(shoe([(3, 0), (5, 1)]), "glint" if near else "crease", dy=0)

    def arm(pose, near):
        sx, sy = (23, 32) if near else (29, 32)
        ex, ey, fx, fy = pose
        ex, ey, fx, fy = sx + ex, sy + ey, sx + fx, sy + fy
        line([(ex, ey), (fx, fy)], "ink", width=7)
        line([(ex, ey), (fx, fy)], "skin" if near else "tan", width=5)
        line([(sx, sy), (ex, ey)], "ink", width=9)
        line([(sx, sy), (ex, ey)], "white" if near else "fold", width=7)
        line([(ex - 2, ey + 1), (ex + 1, ey + 2)], "fold" if near else "hair")

        if near:
            drift = (-3, -2, -3, -4, -4, -3)[index]
            ring = [(fx - 1, fy + 2), (fx + drift - 1, fy + 4),
                    (fx + drift - 2, fy + 6), (fx + drift - 1, fy + 8),
                    (fx + drift + 1, fy + 8), (fx + drift + 3, fy + 6),
                    (fx + drift + 2, fy + 4), (fx + 2, fy + 2)]
            line(ring + ring[:1], "wood", width=2)
            for x, y in ring[1:-1] + [(fx + drift, fy + 10)]:
                poly([(x, y-1), (x+1, y), (x, y+1), (x-1, y)], "wood")
                line([(x, y)], "amber")
                line([(x, y-1)], "gold")

        poly([(fx-3, fy-2), (fx-1, fy-4), (fx+2, fy-4),
              (fx+4, fy-2), (fx+4, fy+1), (fx+2, fy+3),
              (fx-2, fy+3), (fx-3, fy+2)], "skin" if near else "tan", "ink")
        line([(fx-1, fy-2), (fx+2, fy-2)], "light" if near else "skin")
        line([(fx, fy+1), (fx+2, fy)], "tan" if near else "wood")

    leg(far_leg, False)
    leg(near_leg, True)
    arm(far_arm, False)

    # The shoulders sit ahead of the hips, with the belly on the leading edge.
    poly([(21, 27), (30, 28), (33, 33), (34, 39), (33, 44),
          (29, 48), (17, 48), (13, 45), (13, 40), (16, 32)], "red", "ink")
    poly([(26, 31), (31, 31), (33, 35), (33, 41), (30, 46),
          (26, 47), (27, 42), (26, 39)], "white", "ink")
    poly([(27, 40), (30, 41), (32, 40), (31, 44), (28, 46)], "fold")
    poly([(14, 42), (19, 44), (26, 44), (25, 47), (17, 47), (14, 45)], "wine")
    line([(16, 41), (17, 39), (20, 38)], "trim")
    line([(30, 37), (31, 37)], "hair")
    line([(30, 41), (31, 41)], "hair")
    poly([(24, 27), (32, 28), (33, 31), (30, 33),
          (27, 31), (24, 32), (22, 30)], "white", "ink")
    arm(near_arm, True)

    # One eye and ear, with the nose and chin breaking the right silhouette.
    poly([(20, 13), (25, 9), (35, 9), (39, 13), (40, 18),
          (44, 20), (44, 22), (41, 23), (42, 25), (41, 28),
          (37, 31), (29, 32), (24, 30), (20, 26), (17, 24),
          (17, 20), (19, 18)], "skin", "ink")
    poly([(19, 23), (22, 22), (25, 27), (31, 30), (37, 29),
          (41, 27), (37, 30), (29, 31), (24, 29)], "tan")
    poly([(17, 19), (16, 15), (17, 11), (20, 8), (25, 6),
          (33, 6), (38, 8), (41, 11), (41, 15), (38, 14),
          (36, 12), (32, 12), (29, 13), (26, 13), (24, 16),
          (24, 20), (22, 22), (20, 19)], "hair", "ink")
    poly([(17, 15), (19, 11), (22, 9), (26, 7), (33, 7),
          (38, 9), (40, 12), (36, 10), (32, 9), (27, 10),
          (23, 11), (20, 14), (19, 17)], "silver")
    line([(21, 10), (25, 8), (29, 8)], "shine")
    line([(32, 8), (35, 8), (37, 9)], "shine")
    line([(20, 17), (22, 15), (23, 15)], "silver")
    poly([(19, 19), (22, 19), (24, 21), (23, 24), (21, 26),
          (18, 24), (17, 22)], "skin", "ink")
    line([(19, 22), (20, 21), (22, 22), (21, 24)], "tan")
    poly([(26, 15), (30, 13), (34, 14), (31, 15), (28, 16)], "light")
    line([(31, 16), (34, 15), (37, 16)], "hair")
    line([(32, 20), (34, 18), (36, 18), (38, 19)], "ink")
    poly([(28, 21), (31, 20), (34, 21), (33, 23), (29, 24)], "blush")
    line([(40, 20), (42, 21)], "light")
    line([(40, 23), (38, 23)], "tan")
    poly([(30, 24), (34, 25), (40, 24), (39, 27), (36, 29),
          (33, 28)], "mouth", "ink")
    line([(32, 25), (35, 26), (38, 25)], "white")
    line([(34, 28), (37, 27)], "tongue")
    return sprite


def build():
    OUT.mkdir(exist_ok=True)
    sheet = Image.new("RGBA", (W * len(POSES), H))
    preview = Image.new("RGB", sheet.size)
    frames = []
    for index in range(len(POSES)):
        sprite = draw_pose(index)
        x = index * W
        sheet.paste(sprite, (x, 0))
        preview.paste("#e0f0f4" if index % 2 == 0 else "#edf5f6",
                      (x, 0, x + W, H))
        preview.paste(sprite, (x, 0), sprite)
        white = Image.new("RGB", (W, H), "white")
        white.paste(sprite, (0, 0), sprite)
        frames.append(white.resize((W * 4, H * 4), Image.Resampling.NEAREST))
    frames[0].save(OUT / "codex_jinshui_run.gif", save_all=True,
                   append_images=frames[1:], duration=110, loop=0, disposal=2)
    sheet.save(OUT / "codex_jinshui_run_sheet.png")
    preview.resize((sheet.width * 5, H * 5), Image.Resampling.NEAREST).save(
        OUT / "codex_run_preview.png")


if __name__ == "__main__":
    build()
