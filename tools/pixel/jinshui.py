#!/usr/bin/env python3
"""金水伯（廟口主委）像素角色試作：用程式一格一格畫出來，輸出動畫 GIF 和 sprite sheet。

用法：python3 tools/pixel/jinshui.py 輸出資料夾
畫布 48×64，每個身體部位分開畫、各自描深色外框再疊起來（像紙娃娃）。
"""
import os, sys
from PIL import Image, ImageDraw

W, H = 48, 64
PAL = {
    'ol': (43, 29, 26),        # 外框
    'sk': (242, 185, 140), 'sk2': (214, 142, 100), 'sk3': (252, 214, 176),  # 皮膚、陰影、亮面
    'bl': (232, 116, 106),     # 腮紅
    'hr': (200, 200, 208), 'hr2': (140, 140, 152), 'hr3': (240, 240, 244),  # 灰白頭髮
    'mo': (107, 31, 42), 'tg': (224, 86, 106), 'th': (255, 255, 255),       # 嘴巴、舌頭、牙齒
    'vs': (214, 58, 58), 'vs2': (156, 35, 48), 'vs3': (239, 106, 90),       # 紅背心
    'sh': (244, 241, 234), 'sh2': (196, 192, 206),                         # 白襯衫
    'pt': (59, 63, 88), 'pt2': (38, 40, 56),                               # 褲子
    'so': (29, 27, 34), 'so2': (84, 78, 94),                               # 皮鞋
    'bd': (138, 75, 42), 'bd2': (196, 124, 70),                            # 佛珠
    'sw': (150, 210, 250),                                                 # 汗滴
}
KEYS = list(PAL)
IDX = {k: i + 1 for i, k in enumerate(KEYS)}


class Layer:
    def __init__(self):
        self.im = Image.new('P', (W, H), 0)
        self.d = ImageDraw.Draw(self.im)

    def ell(self, x0, y0, x1, y1, c):
        self.d.ellipse([x0, y0, x1, y1], fill=IDX[c])

    def rect(self, x0, y0, x1, y1, c):
        self.d.rectangle([x0, y0, x1, y1], fill=IDX[c])

    def line(self, pts, c, w=1):
        self.d.line(pts, fill=IDX[c], width=w)

    def px(self, pts, c):
        for x, y in pts:
            if 0 <= x < W and 0 <= y < H:
                self.im.putpixel((x, y), IDX[c])

    def shade(self, region_c, c, fn):
        """把顏色 region_c 中符合 fn(x,y) 的像素改成 c（做陰影用）"""
        a = IDX[region_c]
        for y in range(H):
            for x in range(W):
                if self.im.getpixel((x, y)) == a and fn(x, y):
                    self.im.putpixel((x, y), IDX[c])

    def outlined(self):
        out = self.im.copy()
        for y in range(H):
            for x in range(W):
                if self.im.getpixel((x, y)):
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H and self.im.getpixel((nx, ny)):
                        out.putpixel((x, y), IDX['ol'])
                        break
        return out


def leg(x, top, lift, side):
    L = Layer()
    bot = 58 - lift
    L.rect(x, top, x + 6, bot, 'pt')
    L.shade('pt', 'pt2', lambda X, Y: X >= x + 5 if side > 0 else X <= x)
    # 皮鞋（往外側突出一點）
    sx = x - 1 if side < 0 else x
    L.rect(sx, bot + 1, sx + 7, bot + 3, 'so')
    L.px([(sx + 1, bot + 1), (sx + 2, bot + 1)], 'so2')
    return L


def arm(sx, sy, hx, hy, beads=False):
    """從肩膀 (sx,sy) 到手 (hx,hy)：白襯衫袖子＋手"""
    L = Layer()
    L.line([(sx, sy), (hx, hy)], 'sh', 5)
    L.ell(sx - 2, sy - 2, sx + 2, sy + 2, 'sh')
    L.shade('sh', 'sh2', lambda X, Y: Y > (sy + hy) / 2 + 2 and X <= min(sx, hx) + 1)
    L.ell(hx - 3, hy - 2, hx + 3, hy + 3, 'sk')
    L.px([(hx + 2, hy + 2), (hx + 1, hy + 3)], 'sk2')
    if beads:  # 佛珠：從手上垂下來的一圈
        for i, (bx, by) in enumerate([(hx - 3, hy + 3), (hx - 4, hy + 6), (hx - 3, hy + 9), (hx - 1, hy + 11),
                                      (hx + 2, hy + 11), (hx + 4, hy + 9), (hx + 4, hy + 6)]):
            L.ell(bx - 1, by - 1, bx + 1, by + 1, 'bd')
            L.px([(bx - 1, by - 1)], 'bd2')
    return L


def body(by):
    L = Layer()
    # 胖胖的身體：白襯衫底
    L.ell(11, by, 37, by + 26, 'sh')
    L.rect(13, by + 12, 35, by + 21, 'sh')
    # 紅背心：左右兩片，中間露出白襯衫和扣子
    L.ell(11, by, 22, by + 26, 'vs')
    L.rect(12, by + 6, 21, by + 21, 'vs')
    L.ell(26, by, 37, by + 26, 'vs')
    L.rect(27, by + 6, 36, by + 21, 'vs')
    L.shade('vs', 'vs2', lambda X, Y: X >= 34 or Y >= by + 19)
    L.shade('vs', 'vs3', lambda X, Y: X <= 13 and Y < by + 14)
    L.px([(24, by + 8), (24, by + 13), (24, by + 18)], 'sh2')  # 襯衫扣子
    L.px([(x, by + 1) for x in range(20, 29)], 'sh')  # 領口
    L.px([(21, by + 2), (27, by + 2), (22, by + 3), (26, by + 3)], 'sh2')
    L.rect(13, by + 22, 35, by + 23, 'pt')  # 腰帶下緣（褲頭）
    return L


def head(hx, hy, face='laugh'):
    L = Layer()
    # 大圓頭
    L.ell(hx - 13, hy - 12, hx + 13, hy + 12, 'sk')
    # 耳朵
    L.ell(hx - 15, hy - 1, hx - 10, hy + 5, 'sk')
    L.ell(hx + 10, hy - 1, hx + 15, hy + 5, 'sk')
    L.px([(hx - 13, hy + 1), (hx - 13, hy + 2), (hx + 13, hy + 1), (hx + 13, hy + 2)], 'sk2')
    # 灰白頭髮：兩側比較多、頭頂稀疏
    L.ell(hx - 13, hy - 12, hx + 13, hy - 1, 'hr')
    L.ell(hx - 9, hy - 9, hx + 9, hy + 2, 'sk')  # 額頭露出來
    L.shade('hr', 'hr2', lambda X, Y: Y >= hy - 4)
    L.px([(hx - 6, hy - 11), (hx - 3, hy - 12), (hx + 2, hy - 12), (hx + 6, hy - 11), (hx - 9, hy - 9), (hx + 9, hy - 9)], 'hr3')
    L.px([(hx - 2, hy - 10), (hx + 1, hy - 10), (hx + 4, hy - 9)], 'hr')  # 頭頂幾根頭髮
    # 臉的陰影和亮面
    L.shade('sk', 'sk2', lambda X, Y: Y >= hy + 9 and abs(X - hx) < 12)
    L.px([(hx - 5, hy - 7), (hx - 4, hy - 7), (hx - 6, hy - 6)], 'sk3')
    # 抬頭紋
    L.px([(x, hy - 5) for x in range(hx - 4, hx + 4)], 'sk2')
    # 腮紅
    L.rect(hx - 10, hy + 3, hx - 8, hy + 4, 'bl')
    L.rect(hx + 8, hy + 3, hx + 10, hy + 4, 'bl')
    if face in ('laugh', 'smile'):
        # 笑瞇瞇的眼睛 ^ ^
        for ex in (hx - 6, hx + 6):
            L.px([(ex - 3, hy + 1), (ex - 2, hy), (ex - 1, hy - 1), (ex, hy - 1), (ex + 1, hy - 1), (ex + 2, hy), (ex + 3, hy + 1)], 'ol')
        L.px([(hx - 1, hy + 2), (hx, hy + 3), (hx + 1, hy + 2)], 'sk2')  # 鼻子
    else:  # sad：八字眉、閉眼
        for ex, s in ((hx - 6, 1), (hx + 6, -1)):
            L.px([(ex - 2, hy + 1), (ex - 1, hy + 1), (ex, hy + 1), (ex + 1, hy + 1), (ex + 2, hy + 1)], 'ol')
            L.px([(ex - 2 * s, hy - 3), (ex - s, hy - 3), (ex, hy - 4), (ex + s, hy - 5)], 'hr2')
        L.px([(hx - 1, hy + 2), (hx, hy + 3), (hx + 1, hy + 2)], 'sk2')
    if face == 'laugh':
        # 張大嘴哈哈笑
        L.ell(hx - 5, hy + 4, hx + 5, hy + 10, 'mo')
        L.rect(hx - 4, hy + 4, hx + 4, hy + 5, 'th')
        L.ell(hx - 3, hy + 8, hx + 3, hy + 10, 'tg')
    elif face == 'smile':
        L.ell(hx - 4, hy + 5, hx + 4, hy + 8, 'mo')
        L.rect(hx - 3, hy + 5, hx + 3, hy + 5, 'th')
    else:
        L.px([(hx - 3, hy + 8), (hx - 2, hy + 7), (hx - 1, hy + 7), (hx, hy + 7), (hx + 1, hy + 7), (hx + 2, hy + 7), (hx + 3, hy + 8)], 'mo')
    return L


def frame(bob=0, legs=(0, 0), armL=(0, 0), armR=(0, 0), face='laugh', head_dy=0, jump=0, sweat=False):
    """組出一格：bob = 身體上下、legs = 左右腳抬起幾格、armL/armR = 手的位移"""
    y = -jump
    by = 30 + bob + y
    layers = []
    layers.append(leg(16, 50 + y, legs[0], -1))
    layers.append(leg(26, 50 + y, legs[1], 1))
    layers.append(body(by))
    layers.append(head(24, 18 + bob + y + head_dy, face))
    # 左手（畫面左邊）自然垂下；右手拿佛珠舉在胸前
    layers.append(arm(13, by + 5, 9 + armL[0], by + 17 + armL[1]))
    layers.append(arm(35, by + 5, 37 + armR[0], by + 12 + armR[1], beads=True))
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for L in layers:
        o = L.outlined()
        rgba = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        for yy in range(H):
            for xx in range(W):
                v = o.getpixel((xx, yy))
                if v:
                    rgba.putpixel((xx, yy), PAL[KEYS[v - 1]] + (255,))
        out.alpha_composite(rgba)
    if sweat:
        d = ImageDraw.Draw(out)
        hy = 18 + bob + y + head_dy
        for (x, yy) in [(38, hy - 8), (39, hy - 7), (38, hy - 7), (39, hy - 6), (38, hy - 6), (39, hy - 5)]:
            out.putpixel((x, yy), PAL['sw'] + (255,))
        out.putpixel((38, hy - 9), PAL['ol'] + (255,))
    return out


ANIMS = {
    # 站著：輕輕呼吸，佛珠晃一晃
    'idle': ([frame(0, armR=(0, 0)), frame(0, armR=(0, 0)), frame(1, armR=(0, 1)), frame(1, armR=(0, 1))], 220),
    # 走路：左右腳輪流抬、手前後擺、身體一上一下
    'walk': ([frame(0, (2, 0), (2, -2), (-1, 2), 'smile'), frame(-1, (1, 0), (1, -1), (0, 1), 'smile'),
              frame(0, (0, 0), (0, 0), (0, 0), 'smile'), frame(0, (0, 2), (-2, 2), (1, -2), 'smile'),
              frame(-1, (0, 1), (-1, 1), (0, -1), 'smile'), frame(0, (0, 0), (0, 0), (0, 0), 'smile')], 100),
    # 大笑跳起來：蹲 → 跳 → 落地
    'happy': ([frame(2, face='laugh'), frame(0, armL=(-2, -12), armR=(2, -12), jump=4),
               frame(0, armL=(-3, -14), armR=(3, -14), jump=7), frame(0, armL=(-2, -12), armR=(2, -12), jump=4),
               frame(2, face='laugh'), frame(0, face='laugh')], 90),
    # 沮喪：低頭、流汗
    'sad': ([frame(2, head_dy=2, face='sad', armR=(-2, 4), sweat=True), frame(3, head_dy=2, face='sad', armR=(-2, 5), sweat=True)], 400),
}


def main(out):
    os.makedirs(out, exist_ok=True)
    sheet_rows = []
    for name, (frames, ms) in ANIMS.items():
        big = [f.resize((W * 4, H * 4), Image.NEAREST) for f in frames]
        bg = []
        for f in big:  # GIF 用白底，方便在手機上看
            b = Image.new('RGBA', f.size, (255, 255, 255, 255))
            b.alpha_composite(f)
            bg.append(b.convert('P', palette=Image.ADAPTIVE))
        bg[0].save(os.path.join(out, f'jinshui_{name}.gif'), save_all=True, append_images=bg[1:], duration=ms, loop=0, disposal=2)
        sheet_rows.append(frames)
    # sprite sheet（原尺寸，給遊戲用）
    cols = max(len(r) for r in sheet_rows)
    sheet = Image.new('RGBA', (W * cols, H * len(sheet_rows)), (0, 0, 0, 0))
    for r, frames in enumerate(sheet_rows):
        for c, f in enumerate(frames):
            sheet.paste(f, (c * W, r * H))
    sheet.save(os.path.join(out, 'jinshui_sheet.png'))
    colors = set()
    for frames in sheet_rows:
        for f in frames:
            colors |= {c for _, c in f.getcolors(9999) if c[3]}
    print('顏色數', len(colors))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'out')
