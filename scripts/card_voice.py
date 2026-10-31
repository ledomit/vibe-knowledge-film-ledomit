# -*- coding: utf-8 -*-
"""card 风格的旁白：<工程>/narration.json 里每一句单独调 Gemini TTS（密钥只从环境变量 GEMINI_API_KEY 读），
去掉首尾静音，全片统一语速（tempo）和统一句间停顿（gap），按下拍排进时间轴（前一句没说完就顺延，超时只报警，改文字解决）。
产出：audio/voice/NN_hash.wav（单句缓存，文字和语气没变就不重调）· audio/voice.wav（整轨 48 kHz）· voice_subs.js（VOICE_SUBS 字幕 + VOICE_LINES 每句起止）· audio/旁白.srt。
  python3 card_voice.py <工程>              # 只补没生成过的句子
  python3 card_voice.py <工程> --redo 12    # 重新生成第 12 句
  python3 card_voice.py <工程> --estimate   # 不调 TTS：缺的句子按平均语速估时长、出静音占位（改文案时先用这个）
TTS 额度很少：只有用户说要配音时才去掉 --estimate；限速每分钟最多 8～9 次，遇到每日额度用完的 429 直接停下报给用户。
narration.json：{ "voice", "style", "tempo", "gap", "end", "beat": { "B": 一拍秒数, "db0": 第一个下拍 }, "model"?, "lines": [[下拍号, 旁白, 选项?], …] }
  旁白里 {词} 字幕金色、| 强制断字幕；选项 gold（金句居中加大）· nosub（画面上已有这句）· anchor（让这个词落在拍点上）· gap（这一句的句间停顿）· style_add（这一句额外的语气）"""
import base64, hashlib, json, os, re, subprocess, sys, time, urllib.error, urllib.parse, urllib.request, wave
from pathlib import Path
import numpy as np

HERE = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else sys.exit(__doc__)
N = json.load(open(HERE / "narration.json", encoding="utf-8"))
B, DB0 = N["beat"]["B"], N["beat"].get("db0", 0)
DB = lambda n: DB0 + 4 * B * n
SR = 48000
URL = urllib.parse.urlunsplit(("https", ".".join(["generativelanguage", "googleapis", "com"]), "/v1beta/interactions", "", ""))
KEY = os.environ.get("GEMINI_API_KEY") or sys.exit("没读到 GEMINI_API_KEY")
OUT = HERE / "audio/voice"; OUT.mkdir(parents=True, exist_ok=True)
ESTIMATE = "--estimate" in sys.argv
TTS_GAP, LAST = 7.0, [0.0]                                         # TTS 限速：两次调用至少隔 7 s
redo = {int(x) for x in sys.argv[sys.argv.index("--redo") + 1:]} if "--redo" in sys.argv else set()


def tts(text, style):
    body = {"model": N.get("model", "gemini-3.8-flash-tts"), "input": [{"type": "user_input", "content": [{"type": "text", "text": text,
            "annotations": [{"type": "speech_metadata", "style": style}]}]}],
            "response_format": {"type": "audio"}, "generation_config": {"speech_config": [{"voice": N["voice"]}]}}
    req = urllib.request.Request(URL, data=json.dumps(body, ensure_ascii=False).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": KEY})
    for i in range(8):
        time.sleep(max(0, TTS_GAP - (time.time() - LAST[0]))); LAST[0] = time.time()   # 每分钟最多 8～9 次（间隔 7 s）
        try: resp = json.load(urllib.request.urlopen(req, timeout=180)); break
        except urllib.error.HTTPError as e:
            msg = e.read().decode()
            if e.code == 429:                                         # 按报错里的 retry in 等；要等很久（多半是每日额度）就停下报给用户
                m = re.search(r"retry in (?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?", msg)
                w = int(m.group(1) or 0) * 3600 + int(m.group(2) or 0) * 60 + float(m.group(3) or 0) if m else 60
                if w > 120: sys.exit(f"TTS 额度用完，约 {w / 60:.0f} 分钟后再试：{msg[:200]}")
                print(f"  限速，等 {w + 5:.0f} s"); time.sleep(w + 5); continue
            if e.code not in (408, 500, 502, 503, 504): sys.exit(f"HTTP {e.code}: {msg[:300]}")
        except Exception as e: print("  重试", repr(e)[:200])
        time.sleep(2 ** (i + 1))
    else: sys.exit("TTS 连试 8 次失败")
    a = [c for s in resp.get("steps", []) if s.get("type") == "model_output" for c in s.get("content", []) if c.get("type") == "audio"][-1]
    return base64.b64decode(a["data"])


def load(path):                                                       # 任意 wav → 48 kHz 单声道 float
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, "<f4").astype(np.float64)


def trim(x, thr=.012):
    idx = np.where(np.abs(x) > thr)[0]
    return x[max(0, idx[0] - int(.03 * SR)): idx[-1] + int(.08 * SR)] if len(idx) else x


def tempo(x, f):
    if f <= 1.001: return x
    p = OUT / "_t.wav"; w = wave.open(str(p), "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes()); w.close()
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-filter:a", f"atempo={f:.4f}", "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, "<f4").astype(np.float64)


lines = N["lines"]; clips = []
for i, ln in enumerate(lines):
    text = re.sub(r"[{}|]", "", ln[1]); st = N["style"] + (ln[2].get("style_add", "") if len(ln) > 2 else ""); h = hashlib.md5((N["voice"] + st + text).encode()).hexdigest()[:8]; p = OUT / f"{i:02d}_{h}.wav"   # style_add：这一句额外的语气说明
    same = [q for q in OUT.glob(f"*_{h}.wav") if q != p]                 # 插了一句、序号变了：按文字的哈希找回旧缓存，不重新生成
    if not p.exists() and same and i not in redo:
        for old in OUT.glob(f"{i:02d}_*.wav"): old.rename(OUT / f"_old_{old.name}")
        p.write_bytes(same[0].read_bytes())
    pre = OUT / f"{i:02d}_{h}_tempo.wav"                                   # 已经按 tempo 变过速的现成片段（比如 TTS 额度用完时从上一版整轨里截回来的）：直接用
    if pre.exists() and i not in redo: clips.append(("pre", load(pre))); continue
    if ESTIMATE and not p.exists():                                       # --estimate：不调 TTS，缺的句子按全片平均语速估时长（只用来出 SRT / 字幕时间）
        clips.append(("est", len(re.sub(r"[，。；：！？—、\s]", "", text)))); print(f"估 {i:02d} {text}"); continue
    if not p.exists() or i in redo:
        for old in OUT.glob(f"{i:02d}_*.wav"):
            if old != p: old.rename(OUT / f"_old_{old.name}")
        print(f"TTS {i:02d} {text}"); p.write_bytes(tts(text, st))
    clips.append(trim(load(p)))

TEMPO, GAP = N.get("tempo", 1.0), N.get("gap", .3)
if any(isinstance(c, tuple) and c[0] == "est" for c in clips):           # 平均语速 = 已有句子（变速后）的秒数 / 字数
    tot = [(len(tempo(c, TEMPO)) / SR, len(re.sub(r"[{}|，。；：！？—、\s]", "", lines[k][1]))) for k, c in enumerate(clips) if not isinstance(c, tuple)]
    cps = sum(n for _, n in tot) / sum(d for d, _ in tot); print(f"平均 {cps:.2f} 字/秒")
    clips = [("pre", np.zeros(int(c[1] / cps * SR))) if isinstance(c, tuple) and c[0] == "est" else c for c in clips]                      # 全片统一语速、统一句间停顿（不再逐句提速）
total = np.zeros(int((N["end"] + 1) * SR)); subs = []; srt = []; vlines = []; prev = -9.0
for i, ln in enumerate(lines):
    o = ln[2] if len(ln) > 2 else {}; x = clips[i][1] if isinstance(clips[i], tuple) else tempo(clips[i], TEMPO); d = len(x) / SR; slot = DB(ln[0])
    if o.get("anchor"):                                                # anchor：让这个词正好落在 slot 上（按字数比例估）
        plain = re.sub(r"[{}|，。；：！？—、\s]", "", ln[1]); slot -= d * plain.index(o["anchor"]) / len(plain)
    start = max(slot, prev + o.get("gap", GAP))
    if o.get("anchor") and start > slot + .05: print(f"  ⚠ 第 {i:02d} 句的 anchor 晚了 {start - slot:.2f} s")
    nxt = DB(lines[i + 1][0]) if i + 1 < len(lines) else N["end"] - .25
    if start + d > nxt + .3: print(f"  ⚠ 第 {i:02d} 句超出下一句的拍点 {start + d - nxt:.2f} s")
    s0 = int(start * SR); total[s0:s0 + len(x)] += x[: len(total) - s0]; prev = start + d
    vlines.append({"i": i, "a": round(start, 3), "b": round(prev, 3), "text": re.sub(r"[{}|]", "", ln[1])})
    merged = []                                                      # 字幕：按标点切，短的并起来（≤18 字）；| 强制断开
    for chunk in ln[1].split("|"):
        first = True
        for q in [q for q in re.split(r"(?<=[，。；：！？—])", chunk) if q.strip()]:
            if merged and not first and len(re.sub(r"[{}]", "", merged[-1] + q)) <= 18: merged[-1] += q
            else: merged.append(q)
            first = False
    n = sum(len(re.sub(r"[{}，。；：！？—\s]", "", q)) for q in merged) or 1; t = start
    for q in merged:
        dd = d * len(re.sub(r"[{}，。；：！？—\s]", "", q)) / n
        sub = {"a": round(t, 3), "b": round(t + dd + .12, 3), "zh": q.rstrip("，；")}
        if len(ln) > 2 and ln[2].get("gold"): sub["gold"] = True
        srt.append(dict(sub))
        if not (len(ln) > 2 and ln[2].get("nosub")): subs.append(sub)                # nosub：画面上已经有这句字
        t += dd
    print(f"{i:02d} {start:7.2f}–{prev:7.2f}  {re.sub(r'[{}|]', '', ln[1])}")
for a, b2 in zip(subs, subs[1:]): a["b"] = min(a["b"], b2["a"] - .02)
pk = np.abs(total).max(); total *= .89 / pk if pk else 1
w = wave.open(str(HERE / "audio/voice.wav"), "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(total[: int(N["end"] * SR)], -1, 1) * 32767).astype("<i2").tobytes()); w.close()
(HERE / "voice_subs.js").write_text("/* tools/voice.py 生成，勿手改：旁白字幕和每句的起止（时刻按实际配音） */\nwindow.VOICE_SUBS = " + json.dumps(subs, ensure_ascii=False) + ";\nwindow.VOICE_LINES = " + json.dumps(vlines, ensure_ascii=False) + ";\n", encoding="utf-8")
for a, b2 in zip(srt, srt[1:]): a["b"] = min(a["b"], b2["a"] - .02)
ts = lambda x: f"{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{int(x % 60):02d},{int(round(x % 1 * 1000)) % 1000:03d}"
(HERE / "audio/旁白.srt").write_text("\n".join(f"{k + 1}\n{ts(s['a'])} --> {ts(s['b'])}\n{re.sub(r'[{}]', '', s['zh'])}\n" for k, s in enumerate(srt)), encoding="utf-8")
print(f"→ audio/voice.wav · voice_subs.js（{len(subs)} 条字幕）")
