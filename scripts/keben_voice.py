# -*- coding: utf-8 -*-
"""keben 的旁白：整段一口气生成几版 → 量每一截的音高 / 响度挑最稳的一版 → 按停顿切截、排进配乐的拍子 → audio/voice.wav + vo_timing.js。
  python3 keben_voice.py tts   <工程> [--dry]       # 调 Gemini TTS 出 takes 版（已生成的不重调）；--dry 只列文件、不调
  python3 keben_voice.py stats <工程> [a.wav …]     # 每版每截的 F0 中位 / P90（相对整段中位，半音）和响度；⚠ 标出突然扬起的截
  python3 keben_voice.py place <工程> [--estimate]  # 把 pick 那版排进时间轴；--estimate 不要音频，按 4.2 字/秒出静音占位（改文案时用）
  python3 keben_voice.py ask   "问题" a.mp3 [b.wav …]   # 把音频连同问题发给 Gemini 听（上传前先问用户）；只做整体复核，音高稳不稳以 stats 为准
密钥只从环境变量 GEMINI_API_KEY 读。TTS 额度很少：只有用户说要配音时才跑 tts；两次调用至少隔 7 s；要等很久的 429（每日额度）直接停下报给用户。

<工程>/voice.json：
  voice, model?, style（声线：港台老电影国语配音女声……）, act（这一版的表演指导，要收着）, text（全文，标点控断句）, takes（出几版，默认 3）, prefix（文件名前缀）
  beat {B 一拍秒数, db0 第一个下拍}, dur_beats（片长 = 第几拍）
  chunks [每一截的字]（按 ≥ min_gap 的停顿切出来应该得到这么多截）, cut（第几截起是第二句，荧光笔跟第二句）
  anchor {截号: 拍号}（钉在鼓点上的截）, gap [最短, 最长]（截间停顿压到这个范围）, pre / post（每截前留的吸气、后留的尾音）
  grid（没钉拍的截对到几分音符，默认 16）, min_gap（切截的停顿阈值）, level_db（各截响度往中位拉一半，最多 ±几 dB；0 不拉）
  marks {名字: 截号}（画面节点 = 这一截开口的时刻）, beat_marks {名字: 拍号}, hl（第二句每截对应荧光笔的第几到第几个字）, pick（选定的那版文件名）
产出 window.VO = {chunks, s1, s2: 每截 [起, 止], hl, marks: {…, s2, end}}"""
import base64, hashlib, json, os, re, subprocess, sys, time, urllib.error, urllib.parse, urllib.request, wave, mimetypes
from pathlib import Path
import numpy as np

SR = 48000
HOST = ".".join(["generativelanguage", "googleapis", "com"])
a = sys.argv[1:]
if len(a) < 2 or a[0] not in ("tts", "stats", "place", "ask"): sys.exit(__doc__)
CMD = a[0]


def key(): return os.environ.get("GEMINI_API_KEY") or sys.exit("没读到 GEMINI_API_KEY")


def load(p, sr=SR):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-f", "f32le", "-ac", "1", "-ar", str(sr), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, "<f4").astype(float)


def chunks(x, sr, min_gap=.2):
    """按停顿切截：10 ms 帧能量 > max(0.008, 峰值 5%) 算有声，连续静 ≥ min_gap 秒就断开。返回采样点 [起, 止]。"""
    fr = int(.01 * sr); e = np.array([np.sqrt((x[i:i + fr] ** 2).mean()) for i in range(0, len(x) - fr, fr)])
    on = e > max(.008, e.max() * .05); cs, s, run = [], None, 0
    for i, v in enumerate(on):
        if v:
            if s is None: s = i
            run = 0
        elif s is not None:
            run += 1
            if run * .01 >= min_gap: cs.append([s * fr, (i - run + 1) * fr]); s, run = None, 0
    if s is not None: cs.append([s * fr, len(on) * fr])
    return cs


if CMD == "ask":
    q, files = a[1], a[2:]
    parts = []
    for i, f in enumerate(files):
        parts += [{"text": f"[音频 {i + 1}: {os.path.basename(f)}]"}, {"inline_data": {"mime_type": mimetypes.guess_type(f)[0] or "audio/wav", "data": base64.b64encode(open(f, "rb").read()).decode()}}]
    body = {"contents": [{"role": "user", "parts": parts + [{"text": q}]}], "generationConfig": {"temperature": 0.2}}
    req = urllib.request.Request(f"https://{HOST}/v1beta/models/gemini-3.8-flash:generateContent", data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", "x-goog-api-key": key()})
    r = json.load(urllib.request.urlopen(req, timeout=300))
    print("".join(p.get("text", "") for p in r["candidates"][0]["content"]["parts"])); sys.exit()

HERE = Path(a[1]).resolve()
C = json.load(open(HERE / "voice.json", encoding="utf-8"))
VO_DIR = HERE / "audio/vo"; VO_DIR.mkdir(parents=True, exist_ok=True)
STYLE = C["style"] + (C.get("act") or "")
NAMES = C.get("chunks") or []


def take_path(k):
    text = C["text"] + " " * k                                        # 末尾加空格：同一份文字出几版，哈希各不相同、各自生成
    h = hashlib.md5((C["voice"] + STYLE + text).encode()).hexdigest()[:8]
    return VO_DIR / f"{C.get('prefix', 'take')}{k}_{C['voice']}_{h}.wav", text


if CMD == "tts":
    URL = urllib.parse.urlunsplit(("https", HOST, "/v1beta/interactions", "", "")); LAST = [0.0]

    def tts(text):
        body = {"model": C.get("model", "gemini-3.8-flash-tts"), "input": [{"type": "user_input", "content": [{"type": "text", "text": text,
                "annotations": [{"type": "speech_metadata", "style": STYLE}]}]}],
                "response_format": {"type": "audio"}, "generation_config": {"speech_config": [{"voice": C["voice"]}]}}
        req = urllib.request.Request(URL, data=json.dumps(body, ensure_ascii=False).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": key()})
        for i in range(6):
            time.sleep(max(0, 7.0 - (time.time() - LAST[0]))); LAST[0] = time.time()
            try: resp = json.load(urllib.request.urlopen(req, timeout=180)); break
            except urllib.error.HTTPError as e:
                msg = e.read().decode()
                if e.code == 429:
                    m = re.search(r"retry in (?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?", msg)
                    w = int(m.group(1) or 0) * 3600 + int(m.group(2) or 0) * 60 + float(m.group(3) or 0) if m else 60
                    if w > 120: sys.exit(f"TTS 额度用完，约 {w / 60:.0f} 分钟后再试：{msg[:200]}")
                    print(f"  限速，等 {w + 5:.0f} s"); time.sleep(w + 5); continue
                if e.code not in (408, 500, 502, 503, 504): sys.exit(f"HTTP {e.code}: {msg[:300]}")
            except Exception as e: print("  重试", repr(e)[:200])
            time.sleep(2 ** (i + 1))
        else: sys.exit("TTS 连试 6 次失败")
        au = [c for s in resp.get("steps", []) if s.get("type") == "model_output" for c in s.get("content", []) if c.get("type") == "audio"][-1]
        return base64.b64decode(au["data"])

    for k in range(C.get("takes", 3)):
        p, text = take_path(k)
        if p.exists(): print("  已有", p.name); continue
        if "--dry" in a: print("  要生成", p.name); continue
        print("TTS", p.name); p.write_bytes(tts(text))
    if "--dry" not in a: print("下一步：python3 keben_voice.py stats", HERE)
    sys.exit()


def f0track(x, sr):
    hop, win = int(.01 * sr), int(.04 * sr); out = []
    for i in range(0, len(x) - win, hop):
        s = x[i:i + win] * np.hanning(win)
        if (s ** 2).sum() < 1e-5: out.append(0); continue
        ac = np.correlate(s, s, "full")[win - 1:]; ac /= ac[0]; lo, hi = int(sr / 500), int(sr / 110); j = lo + np.argmax(ac[lo:hi])
        out.append(sr / j if ac[j] > .6 else 0)
    return np.array(out)


if CMD == "stats":
    files = [Path(f) for f in a[2:]] or [take_path(k)[0] for k in range(C.get("takes", 3)) if take_path(k)[0].exists()]
    sr = 16000
    for p in files:
        x = load(p, sr); f = f0track(x, sr); cs = chunks(x, sr, C.get("min_gap", .2)); ref = np.median(f[f > 0]); worst = 0
        print(f"{p.name}: {len(cs)} 截（想要 {len(NAMES)}）  时长 {len(x) / sr:.2f} s")
        for k, (s0, s1) in enumerate(cs):
            seg = f[s0 // 160:s1 // 160]; v = seg[seg > 0]; r = 20 * np.log10(np.sqrt((x[s0:s1] ** 2).mean()) + 1e-9)
            st = 12 * np.log2(np.median(v) / ref) if len(v) else 0; p90 = 12 * np.log2(np.percentile(v, 90) / ref) if len(v) else 0
            long = (s1 - s0) / sr >= .8                                # 短词（"所以""结"）高一点是正常语调，只看长截
            flag = "  ⚠ 整截扬起" if st >= 2.5 or (long and st >= 1.5) else ""
            if long: worst = max(worst, st)
            nm = NAMES[k] if len(cs) == len(NAMES) else ""
            print(f"  {k:2d} {nm:12s} F0 {np.median(v) if len(v) else 0:4.0f} Hz（{st:+5.1f} 半音） P90 {p90:+5.1f}  响度 {r:6.1f} dB{flag}")
        print(f"  最高的长截（≥0.8 s）{worst:+.1f} 半音——挑这个数最小的那版；长截 ≥ +1.5 听起来就是'突然抬高'（《丁香结》v10 的'人生中的问题'是 +2.7）\n")
    sys.exit()

# ---------- place ----------
B, D0 = C["beat"]["B"], C["beat"].get("db0", 0)
BEAT = lambda b: D0 + b * B
G = 4 * B / C.get("grid", 16)
DUR = BEAT(C["dur_beats"])
GMIN, GMAX = C.get("gap", [.14, .55]); PRE, POST = C.get("pre", .2), C.get("post", .1)
ANCHOR = {int(k): v for k, v in (C.get("anchor") or {}).items()}
if "--estimate" in a:                                                  # 不要音频：按 4.2 字/秒估每截长度，截间 0.3 s
    lens = [len(re.sub(r"[，。；、！？…：,.;!?\s]", "", s)) / 4.2 for s in NAMES]
    x = np.zeros(int((sum(lens) + .3 * len(lens) + 1) * SR)); cs, t0 = [], .2
    for L in lens: cs.append([int(t0 * SR), int((t0 + L) * SR)]); t0 += L + .3
    print("估时长（静音占位）：", [round(L, 2) for L in lens])
else:
    x = load(VO_DIR / C["pick"]); cs = chunks(x, SR, C.get("min_gap", .2))
    print("截", len(cs), [(round(s / SR, 2), round(e / SR, 2)) for s, e in cs])
    if NAMES and len(cs) != len(NAMES): sys.exit(f"切出 {len(cs)} 截，voice.json 写的是 {len(NAMES)} 截：调 min_gap 或改 chunks")
rms = np.array([np.sqrt((x[s:e] ** 2).mean()) + 1e-9 for s, e in cs]); lv = C.get("level_db", 3)
gain = np.clip((np.median(rms) / rms) ** .5, 10 ** (-lv / 20), 10 ** (lv / 20)) if lv and "--estimate" not in a else np.ones(len(cs))
print("各截响度修正 dB", np.round(20 * np.log10(gain), 1).tolist())
voice = np.zeros(int(DUR * SR) + SR); rows = []; prev = None
for k, (s, e) in enumerate(cs):
    if prev is None: t = BEAT(ANCHOR.get(0, 0))
    else:
        want = prev + min(GMAX, max(GMIN, (s - cs[k - 1][1]) / SR))
        t = np.round((want - D0) / G) * G + D0
        if t < want - .05: t += G                                     # 就近对拍不能把停顿压得比想要的短太多
        if k in ANCHOR:
            at = BEAT(ANCHOR[k])
            if at + 1e-6 < prev + .1: print(f"  ! 第 {k} 截钉不到第 {ANCHOR[k]} 拍（前一截还没说完），放在 {t:.3f}")
            else: t = at
    a0, b0 = max(0, s - int(PRE * SR)), min(len(x), e + int(POST * SR)); seg = x[a0:b0] * gain[k]
    fi, fo = int(PRE * SR * .8), int(POST * SR)
    if fi: seg[:fi] *= np.linspace(0, 1, fi) ** .6
    if fo: seg[-fo:] *= np.linspace(1, 0, fo)
    i0 = int(round((t - (s - a0) / SR) * SR)); voice[i0:i0 + len(seg)] += seg[:max(0, len(voice) - i0)]
    rows.append([round(t, 3), round(t + (e - s) / SR, 3)]); prev = t + (e - s) / SR
if rows[-1][1] > DUR - .5: print(f"  ! 最后一截 {rows[-1][1]:.2f} s 才说完，离片尾 {DUR:.2f} 太近：删字、改 anchor 或放长片子（不改配乐）")
voice = voice[: int(DUR * SR)]; voice *= .7 / (np.abs(voice).max() or 1)
with wave.open(str(HERE / "audio/voice.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(voice, -1, 1) * 32767).astype("<i2").tobytes())
cut = C.get("cut") or len(rows); s1, s2 = rows[:cut], rows[cut:]
marks = {k: rows[v][0] for k, v in (C.get("marks") or {}).items()}
marks.update({k: round(BEAT(v), 3) for k, v in (C.get("beat_marks") or {}).items()})
marks.update({"s2": (s2 or s1)[0][0], "end": rows[-1][1]})
VO = {"chunks": rows, "s1": s1, "s2": s2, "hl": C.get("hl"), "marks": marks}
(HERE / "vo_timing.js").write_text("window.VO = " + json.dumps(VO, ensure_ascii=False) + ";\n", encoding="utf-8")
for k, (r, nm) in enumerate(zip(rows, NAMES or [""] * len(rows))):
    print(f"  {k:2d} {r[0]:6.3f}–{r[1]:6.3f}  {'拍 ' + str(ANCHOR[k]) if k in ANCHOR else '':6s} {nm}")
print("marks", json.dumps(marks, ensure_ascii=False))
