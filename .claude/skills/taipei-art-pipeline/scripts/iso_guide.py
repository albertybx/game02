#!/usr/bin/env python3
"""產生「透視底圖」：白底＋一塊 2:1 菱形（等同遊戲裡一格地磚），給畫圖 AI 當底圖編輯。

用法：python3 iso_guide.py 輸出.png [畫布邊長=1024]
"""
import sys
from PIL import Image, ImageDraw

out = sys.argv[1]
size = int(sys.argv[2]) if len(sys.argv) > 2 else 1024
im = Image.new('RGB', (size, size), 'white')
d = ImageDraw.Draw(im)
w = size - 24                      # 菱形寬：左右各留 12
h = w // 2                         # 2:1
cx, bottom = size // 2, size - 24  # 下方頂點貼近底部中間
top = bottom - h
mid = (top + bottom) // 2
d.polygon([(cx, top), (cx + w // 2, mid), (cx, bottom), (cx - w // 2, mid)], outline=(255, 0, 0), width=6)
d.line([(cx, top), (cx, bottom)], fill=(255, 180, 180), width=2)
d.line([(cx - w // 2, mid), (cx + w // 2, mid)], fill=(255, 180, 180), width=2)
im.save(out)
print(f'寫好了：{out}（菱形寬 {w}、高 {h}）')
