# -*- coding: utf-8 -*-
"""从 p11（《丁香结》第 6 页）那幅丁香画里提取：
  assets/lilac_mask.png  R = 画的遮罩（锐利），G = 模糊后的遮罩（算投影、算厚度），整页 566×800
  assets/lilac_pts.json  每一朵小花 / 每一块叶子碎片：[u, v, r, g, b, 类型(0 花 1 叶茎), 随机]
用法：python3 tools/make_lilac.py"""
import json, colorsys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

proj = Path(__file__).resolve().parent.parent
im = Image.open(proj / "assets/pages/p11.jpg").convert("RGB"); W, H = im.size
a = np.asarray(im).astype(float) / 255
mn, mx = a.min(2), a.max(2); sat = (mx - mn) / np.maximum(mx, 1e-3)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
mask = ((1 - mn) > .085) | (sat > .09)
yy, xx = np.mgrid[0:H, 0:W]
mask &= yy < int(H * .47)                                         # 只要上面那幅画
purple = (b > g + .02) | (r > g + .06)
head = (yy < H * .035) & (xx > W * .3) & (xx < W * .7)            # 页眉"人民教育出版社"压在画上：只留紫色
mask &= ~(head & ~purple)
m = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(5))
mask = np.asarray(m) > 127
green = (g > r + .02) & (g > b - .02) & ~purple
blur = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(28))).astype(float) / 255
out = np.zeros((H, W, 4), np.uint8); out[..., 0] = mask * 255; out[..., 1] = np.clip(blur * 1.6, 0, 1) * 255; out[..., 3] = 255
Image.fromarray(out, "RGBA").resize((566, 800), Image.LANCZOS).save(proj / "assets/lilac_mask.png")

rng = np.random.default_rng(611); pts = []
def sample(step, want_leaf):
    for y in range(0, int(H * .47), step):
        for x in range(0, W, step):
            jx, jy = int(x + rng.uniform(0, step)), int(y + rng.uniform(0, step))
            if jx >= W or jy >= H or not mask[jy, jx]: continue
            x0, x1, y0, y1 = max(0, jx - 3), min(W, jx + 4), max(0, jy - 3), min(H, jy + 4)
            lf = green[y0:y1, x0:x1].mean() > .5
            if lf != want_leaf: continue
            c = a[y0:y1, x0:x1].reshape(-1, 3).mean(0)
            pts.append([round(jx / W, 5), round(jy / H, 5), *[round(float(v), 3) for v in c], int(lf), round(float(rng.random()), 3)])
sample(11, False); sample(13, True)
json.dump(pts, open(proj / "assets/lilac_pts.json", "w"))
print(W, H, "mask px", int(mask.sum()), "points", len(pts), "leaf", sum(p[5] for p in pts))
