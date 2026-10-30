# -*- coding: utf-8 -*-
"""分镜图：把工程真实渲出的关键帧拼成一页 storyboardN.html，给用户批准。每次出视频（样片或成片）之前都先出这一页。
  python make_storyboard.py <工程目录> <分镜帧表.json> [--out <输出目录>] [--no-render]
分镜帧表.json：
  { "title": "片名", "version": "1", "intro": ["一段说明（可含 HTML）", …],
    "frames": [[时刻, 镜号, "状态", "字幕 / 大字", "卡点和画面"], …],     每镜至少一张，关键变化前后各一张
    "rep":    {"镜号": 时刻, …},                                         总览里每镜用哪一张（省略 = 每镜第一张）
    "pairs":  [["名字", [时刻, …], "这组前后图说明什么"], …] }
产出（默认在 <工程目录>/../storyboard/）：overviewN.jpg 全部分镜总览 · shotsN/ 每镜大图（附字幕和卡点）· pairsN/ 关键变化前后 · storyboardN.html。
关键帧由 engine/render.py --stills 现渲（和视频是同一份代码，画面一致）；--no-render 只用 <工程目录>/review/ 里已有的静帧。
出新版时把旧版（storyboardN.html、overviewN.jpg、shotsN/、pairsN/）删掉，只留最新一版。"""
import html, json, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

SKILL = Path(__file__).resolve().parent.parent
FONT = SKILL / "engine/fonts/NotoSansSC-VF.ttf"


def font(size, weight=400):
    f = ImageFont.truetype(str(FONT), size)
    try: f.set_variation_by_axes([weight])
    except Exception: pass
    return f


def wrap(d, text, f, width):
    lines, cur = [], ""
    for ch in text:
        if d.textlength(cur + ch, font=f) > width and cur: lines.append(cur); cur = ch
        else: cur += ch
    return lines + ([cur] if cur else [])


def captioned(rev, k, width=1920):
    t, no, state, zh, beat = k
    im = Image.open(rev / f"s_{t:07.2f}.png").convert("RGB").resize((width, width * 9 // 16), Image.LANCZOS)
    s = width / 1920; pad = int(40 * s)
    fh, fz, fb = font(int(34 * s), 600), font(int(36 * s), 500), font(int(28 * s))
    tmp = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    rows = [(f"第 {no} 镜 · {t:.2f} s · {state}", fh, (233, 196, 106))]
    rows += [(x, fz, (240, 240, 238)) for x in wrap(tmp, "字幕：" + zh, fz, width - 2 * pad)]
    rows += [(x, fb, (170, 176, 184)) for x in wrap(tmp, "卡点：" + beat, fb, width - 2 * pad)]
    hh = pad + sum(int(r[1].size * 1.45) for r in rows) + pad // 2
    out = Image.new("RGB", (width, im.height + hh), (18, 19, 22)); out.paste(im, (0, 0)); d = ImageDraw.Draw(out); y = im.height + pad // 2
    for txt, f, c in rows: d.text((pad, y), txt, font=f, fill=c); y += int(f.size * 1.45)
    return out


def main():
    a = sys.argv
    if len(a) < 3: sys.exit(__doc__)
    proj, spec = Path(a[1]).resolve(), json.load(open(a[2], encoding="utf-8"))
    out = Path(a[a.index("--out") + 1]).resolve() if "--out" in a else proj.parent / "storyboard"
    V, K = str(spec.get("version", "1")), [tuple(f) for f in spec["frames"]]
    rev = proj / "review"
    if "--no-render" not in a:
        subprocess.run([sys.executable, str(SKILL / "engine/render.py"), str(proj), "--stills"] + [f"{k[0]}" for k in K], check=True)
    for sub in ("shots" + V, "pairs" + V): (out / sub).mkdir(parents=True, exist_ok=True)
    byt = {k[0]: k for k in K}
    rep = {int(n): float(t) for n, t in spec.get("rep", {}).items()}
    for k in K: rep.setdefault(k[1], k[0])
    shots = []
    for k in K:
        p = out / f"shots{V}/{k[1]:02d}_{k[0]:06.2f}.jpg"; captioned(rev, k).save(p, quality=86); shots.append(p)
    cw, cols = 640, 6 if len(rep) > 15 else 5
    cells = [captioned(rev, byt[rep[n]], cw) for n in sorted(rep)]
    ch, rows = max(c.height for c in cells), -(-len(cells) // cols)
    ov = Image.new("RGB", (cw * cols + (cols + 1) * 12, ch * rows + (rows + 1) * 12), (8, 8, 10))
    for i, c in enumerate(cells): ov.paste(c, (12 + (i % cols) * (cw + 12), 12 + (i // cols) * (ch + 12)))
    ov.save(out / f"overview{V}.jpg", quality=86)
    pairs = []
    for name, ts, title in spec.get("pairs", []):
        cs = [captioned(rev, byt[float(t)], 760) for t in ts]; hmax = max(c.height for c in cs)
        pi = Image.new("RGB", (len(cs) * 772 + 12, hmax + 24 + 60), (8, 8, 10)); d = ImageDraw.Draw(pi)
        d.text((16, 14), title, font=font(30, 600), fill=(233, 196, 106))
        for i, c in enumerate(cs): pi.paste(c, (12 + i * 772, 72))
        p = out / f"pairs{V}/{name}.jpg"; pi.save(p, quality=86); pairs.append((title, p))
    e = html.escape
    h = [f"""<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>{e(spec['title'])} · 分镜 v{V}</title>
<style>body{{background:#111214;color:#ECECEA;font-family:-apple-system,"PingFang SC",sans-serif;max-width:1500px;margin:auto;padding:24px}}
h1{{color:#E9C46A}}h2{{color:#E9C46A;margin-top:48px}}img{{width:100%;border-radius:6px;margin:10px 0}}
.g{{display:grid;grid-template-columns:1fr 1fr;gap:18px}}p,li{{color:#C9CCD0;line-height:1.7}}</style></head><body>
<h1>{e(spec['title'])} · 分镜 v{V}</h1>"""]
    h += [f"<p>{x}</p>" for x in spec.get("intro", [])]
    h.append(f"<h2>全部分镜总览</h2><img src='overview{V}.jpg'><h2>关键变化前后</h2>")
    for title, p in pairs: h.append(f"<p>{e(title)}</p><img src='{p.relative_to(out)}'>")
    h.append("<h2>每镜大图</h2><div class='g'>")
    for p in shots: h.append(f"<div><img src='{p.relative_to(out)}'></div>")
    h.append("</div></body></html>")
    (out / f"storyboard{V}.html").write_text("\n".join(h), encoding="utf-8")
    print(f"→ {out / f'storyboard{V}.html'}：{len(shots)} 张每镜大图，{len(rep)} 镜总览，{len(pairs)} 组前后图")


if __name__ == "__main__":
    main()
