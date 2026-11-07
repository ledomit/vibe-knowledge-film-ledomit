# -*- coding: utf-8 -*-
"""keben 的音效 + 混音 + 交付三样。先跑 render.py --events 和全片渲染（renders/raw.mp4），旁白先用 keben_voice.py place 排好。
  python3 keben_mix.py <工程> --bgm 配乐.mp3 --name 片名 --v v1 [--bgm-db -10.5] [--fade-from 秒] [--reverb .75 .1] [--sfx-db -9]
步骤：
  1. audio/events.json（film.js 的 fr.sfx）→ audio/sfx.wav：引擎 audio.py 的事件音（flip / marker / wind / soft / rise / shimmer / bloom …），短混响 t60 1.6 / wet .18
  2. 配乐：取前 DUR 秒（= voice.json 的 dur_beats 拍；没有就用 events.json 的 end），整体常数增益 --bgm-db（有旁白时 −10.5 dB，不闪避、不改形状），
     从 --fade-from（默认旁白说完后 0.09 s）cos² 渐弱到片尾——只有用户要了"bgm 渐渐消失"才这样做
  3. 旁白 audio/voice.wav 加一点电影对白的后期混响（默认 t60 0.75 s，wet 0.1；用户喜欢，但"不要太过"）
  4. 动效放在旁白峰值下 --sfx-db；三者相加会削波的几毫秒才局部压低动效（配乐和旁白一个样本都不动）
  5. 交付 ../final/：<片名>_<v>_完整版.mp4、_仅动效配音.mp4（旁白 + 动效，没有配乐）、_动效配音.wav；校验 完整版 − 动效配音 − 配乐 ≈ 0"""
import json, subprocess, sys, wave, importlib.util
from pathlib import Path
import numpy as np
from scipy.ndimage import minimum_filter1d
from scipy.signal import lfilter

a = sys.argv[1:]
if not a or "--bgm" not in a or "--name" not in a: sys.exit(__doc__)
opt = lambda k, d=None, n=1: (a[a.index(k) + 1] if n == 1 else a[a.index(k) + 1:a.index(k) + 1 + n]) if k in a else d
HERE = Path(a[0]).resolve()
_s = importlib.util.spec_from_file_location("vka", Path(__file__).resolve().parent.parent / "engine/audio.py"); A = importlib.util.module_from_spec(_s); _s.loader.exec_module(A)
SR = A.SR
spec = json.load(open(HERE / "audio/events.json", encoding="utf-8"))
vj = HERE / "voice.json"
if vj.exists():
    C = json.load(open(vj, encoding="utf-8")); DUR = C["beat"].get("db0", 0) + C["dur_beats"] * C["beat"]["B"]
else: DUR = spec["end"]
NAME, V = opt("--name"), opt("--v", "v1")
BGM_DB, SFX_DB = float(opt("--bgm-db", -10.5)), float(opt("--sfx-db", -9))
RT60, WET = [float(v) for v in opt("--reverb", [".75", ".1"], 2)]

# 1. 动效
n = int(round(DUR * SR)); rng = np.random.default_rng(1105); dry = np.zeros((n + SR, 2))
for when, name, p in spec["events"]:
    if name in A.EV: A.add(dry, A.EV[name](rng, p), when)
sfx = A.reverb(dry, rng, t60=1.6, wet=.18)[:n]
t = np.arange(n) / SR; sfx *= np.clip((DUR - t) / .4, 0, 1)[:, None]; sfx /= (np.abs(sfx).max() or 1)
A.write_wav(HERE / "audio/sfx.wav", sfx * 10 ** (-3 / 20))


def pcm(path, ch):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", str(ch), "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, "<f4").astype(float).reshape(-1, ch)


def write(path, x):
    with wave.open(str(path), "wb") as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).round().astype("<i2").tobytes())


# 2. 配乐
bgm = np.zeros((n, 2)); b = pcm(opt("--bgm"), 2)[:n]; bgm[:len(b)] = b
if len(b) < n: print(f"！配乐只有 {len(b) / SR:.2f} s，比片子短：片长要跟着配乐，别循环")
vo = (HERE / "vo_timing.js").read_text(encoding="utf-8") if (HERE / "vo_timing.js").exists() else ""
end = json.loads(vo[vo.index("{"):vo.rindex("}") + 1])["marks"]["end"] if vo else DUR
F0 = float(opt("--fade-from", end + .09))
fade = np.where(t < F0, 1, np.cos(np.clip((t - F0) / max(.01, DUR - F0), 0, 1) * np.pi / 2) ** 2)
bgm *= (10 ** (BGM_DB / 20) * fade)[:, None]
# 3. 旁白
voice = np.zeros((n, 2)); v = pcm(HERE / "audio/voice.wav", 1)[:n]; voice[:len(v)] = v
if WET > 0: voice = A.reverb(voice, np.random.default_rng(7), t60=RT60, wet=WET)
voice *= .7 / (np.abs(voice).max() or 1)
# 4. 动效压在旁白下，只在会削波处局部压低
s = pcm(HERE / "audio/sfx.wav", 2)[:n]; sfx = np.zeros((n, 2)); sfx[:len(s)] = s
sfx *= np.abs(voice).max() * 10 ** (SFX_DB / 20) / (np.abs(sfx).max() or 1)
need = np.clip((.98 - np.abs(bgm + voice)) / np.maximum(np.abs(sfx), 1e-9), 0, 1).min(axis=1)
env = minimum_filter1d(need, int(.01 * SR)); rel = np.exp(-1 / (.08 * SR))
env = np.minimum(env, lfilter([1 - rel], [1, -rel], env, zi=[env[0] * rel])[0]); env = minimum_filter1d(env, int(.005 * SR))
sfx *= env[:, None]
fxv = voice + sfx; full = bgm + fxv
# 5. 交付
FINAL = HERE.parent / "final"; FINAL.mkdir(exist_ok=True)
write(HERE / "audio/full_mix.wav", full); write(FINAL / f"{NAME}_{V}_动效配音.wav", fxv)
for wav, out in [(HERE / "audio/full_mix.wav", f"{NAME}_{V}_完整版.mp4"), (FINAL / f"{NAME}_{V}_动效配音.wav", f"{NAME}_{V}_仅动效配音.mp4")]:
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(HERE / "renders/raw.mp4"), "-i", str(wav), "-map", "0:v", "-map", "1:a",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-shortest", str(FINAL / out)], check=True)
rms = lambda x: 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-12)
on = np.abs(voice[:, 0]) > .02
print(f"片长 {DUR:.2f} s，配乐 {F0:.2f} s 起渐弱；旁白段 配乐 RMS {rms(bgm[on]):.1f} / 旁白 RMS {rms(voice[on]):.1f} dB；"
      f"动效局部压低 {np.mean(env < .99) * 100:.1f}%；完整版峰值 {np.abs(full).max():.3f}；完整版 − 动效配音 − 配乐 最大差 {np.abs(full - fxv - bgm).max():.1e}")
print("交付：", *(FINAL / f"{NAME}_{V}_{k}" for k in ("完整版.mp4", "仅动效配音.mp4", "动效配音.wav")), sep="\n  ")
