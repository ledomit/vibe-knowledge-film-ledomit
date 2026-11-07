# -*- coding: utf-8 -*-
"""keben：把课本 PDF 渲成翻书用的页面贴图（书必须是真的 PDF，每一页都是原页）。
  python3 keben_pages.py <课本.pdf> <工程> --to 11 [--hi 10,11] [--h 1301] [--hi-h 2601]
产出 <工程>/assets/pages/pNN.jpg（PDF 第 NN 页，从 1 数，渲到第 --to 页），--hi 列出的页另出 pNN_hi.jpg（推近和荧光笔用，约 2 倍高）。
打印页面宽高比 PW（film.js 里书页的宽，高 = 1）和翻页表 LEAVES 的配对。

配对和真书一致：p1 封面单独在右；之后左偶右奇 [p2|p3] [p4|p5] …；目标跨页必须是 [偶|奇]。
先拿一张跨页图（目录、插图跨页）核对：两半拼得上，配对就对了。目标页是奇数页在左时，说明这本 PDF 前面多 / 少了一页，换起点再渲。
需要 pypdfium2：pip install --user pypdfium2"""
import sys
from pathlib import Path

a = sys.argv[1:]
if len(a) < 2: sys.exit(__doc__)
try: import pypdfium2 as pdfium
except ImportError: sys.exit("缺 pypdfium2：pip install --user pypdfium2")
opt = lambda k, d: a[a.index(k) + 1] if k in a else d
pdf, proj = pdfium.PdfDocument(a[0]), Path(a[1]).resolve()
to = int(opt("--to", 11)); hi = {int(x) for x in opt("--hi", "").split(",") if x}
H, HH = int(opt("--h", 1301)), int(opt("--hi-h", 2601))
out = proj / "assets/pages"; out.mkdir(parents=True, exist_ok=True)
w0, h0 = pdf[0].get_size()
for i in range(1, min(to, len(pdf)) + 1):
    pg = pdf[i - 1]; w, h = pg.get_size()
    for name, hh in [(f"p{i:02d}", H)] + ([(f"p{i:02d}_hi", HH)] if i in hi else []):
        pg.render(scale=hh / h).to_pil().convert("RGB").save(out / f"{name}.jpg", quality=92)
    print(f"  p{i:02d}  {w:.0f}×{h:.0f} pt" + ("  +hi" if i in hi else ""))
print(f"PW = {w0 / h0:.5f}（页宽 / 页高）")
L = ["p01"] + [f"p{k:02d}" for k in range(2, to + 1)]
print("跨页：p01 封面 → " + " → ".join(f"[{L[k]}|{L[k + 1]}]" for k in range(1, len(L) - 1, 2)))
print("LEAVES（每张纸 = 正面 / 背面，从上往下翻）：" + ", ".join(f"['{L[k]}','{L[k + 1]}']" for k in range(0, len(L) - 1, 2)) + f"；底页（不翻，右边）= {L[-1]}")
if len(L) % 2 == 0: print("！渲到的最后一页是偶数页：目标跨页的右页应是奇数页，--to 改成奇数")
