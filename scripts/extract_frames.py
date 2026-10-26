# -*- coding: utf-8 -*-
"""把一段真实视频拆成逐帧图片，给 ledo 的 L.video 用（渲染是一帧一帧 seek 的，直接塞 <video> 对不上帧，所以先拆帧）。
  python extract_frames.py <视频> <输出目录> --start 33 --dur 8 [--fps 24] [--width 960]
输出 <输出目录>/0001.jpg … 和 clip.json（fps、帧数、尺寸、来源）。film.js 里：
  const clip = L.video('assets/<目录名>', 帧数, fps);   // 帧数、fps 从 clip.json 抄过去
素材的来源和授权写进分镜表的素材清单和片尾文献线索。"""
import json, shutil, subprocess, sys
from pathlib import Path

def arg(name, default=None):
    a = sys.argv
    return a[a.index(name) + 1] if name in a else default

if __name__ == "__main__":
    if len(sys.argv) < 3: sys.exit(__doc__)
    src, out = Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve()
    start, dur, fps, width = float(arg("--start", 0)), arg("--dur"), float(arg("--fps", 24)), int(arg("--width", 960))
    ff = shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob("*.jpg"): old.unlink()
    cmd = [ff, "-v", "error", "-y", "-ss", str(start)] + (["-t", str(dur)] if dur else []) + ["-i", str(src),
           "-vf", f"fps={fps},scale={width}:-2:flags=lanczos", "-q:v", "3", str(out / "%04d.jpg")]
    subprocess.run(cmd, check=True)
    frames = sorted(out.glob("*.jpg")); n = len(frames)
    from PIL import Image
    w, h = Image.open(frames[0]).size if n else (0, 0)
    json.dump({"fps": fps, "frames": n, "width": w, "height": h, "source": src.name, "start": start, "dur": dur}, open(out / "clip.json", "w"), ensure_ascii=False, indent=1)
    print(f"{n} 帧 {w}×{h} @ {fps} fps → {out}\n  film.js：L.video('assets/{out.name}', {n}, {fps:g})")
