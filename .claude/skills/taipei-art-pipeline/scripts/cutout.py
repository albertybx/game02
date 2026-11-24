#!/usr/bin/env python3
"""把畫圖 AI 畫的「白底圖」去背、裁切，並做一張「遊戲實際大小」預覽。

用法：python3 -I cutout.py 輸入.png 輸出.png [--width 256] [--preview 預覽.png --game-width 122]
- 去背：從四個邊往內，把連在一起的接近白色（>238）區域變透明，所以建築裡面的白牆不會被挖掉。
- --width：輸出圖縮成這個寬度（遊戲地標原圖用 256，角色用 200；縮小用 LANCZOS）。
- --preview：再輸出一張縮到遊戲裡實際顯示寬度（地標 ISO_W-6=122、角色約 72 高）的預覽，放大 3 倍方便看。
"""
import argparse
from collections import deque
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('dst')
ap.add_argument('--width', type=int, default=0)
ap.add_argument('--threshold', type=int, default=238)
ap.add_argument('--preview'); ap.add_argument('--game-width', type=int, default=122)
a = ap.parse_args()

im = Image.open(a.src).convert('RGBA')
px = np.asarray(im).copy()
h, w = px.shape[:2]
white = px[:, :, :3].astype(int).min(2) > a.threshold
seen = np.zeros((h, w), bool)
q = deque([(0, x) for x in range(w)] + [(h - 1, x) for x in range(w)] + [(y, 0) for y in range(h)] + [(y, w - 1) for y in range(h)])
while q:
    y, x = q.popleft()
    if seen[y, x] or not white[y, x]:
        continue
    seen[y, x] = True
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx]:
            q.append((ny, nx))
px[seen, 3] = 0
out = Image.fromarray(px)
out = out.crop(out.getbbox())
if a.width:
    out = out.resize((a.width, round(out.height * a.width / out.width)), Image.LANCZOS)
out.save(a.dst)
print(f'寫好了：{a.dst} {out.size}')
if a.preview:
    gw = a.game_width
    sm = out.resize((gw, round(out.height * gw / out.width)), Image.LANCZOS)
    bg = Image.new('RGBA', (gw + 40, sm.height + 40), (120, 165, 100, 255))
    bg.alpha_composite(sm, (20, 20))
    bg.resize((bg.width * 3, bg.height * 3), Image.NEAREST).save(a.preview)
    print(f'預覽：{a.preview}')
