/* ★ ledo 真实素材样片 · 15 秒 ·《一小步》
 * 素材（都是 NASA 原始素材，公有领域，来自 Wikimedia Commons）：
 *   assets/aldrin.jpg      ← Aldrin_Apollo_11_original.jpg（奥尔德林站在月面，1969-07-20，摄影 Neil Armstrong / NASA）
 *   assets/apollo/         ← Apollo_11_Landing_-_first_steps_on_the_moon.ogv 第 33–41 秒，拆成 192 帧（scripts/extract_frames.py）
 * 事实：1969 年 7 月 20 日阿波罗 11 号登月；"据估计全球约 6 亿人观看直播"是常见估计，屏上写"据估计"。
 * 112 BPM，一小节 2.143 s。0–4.3 照片 + 年份 + 标注 · 4.3–6.4 推进照片 · 6.43 白场 · 6.4–10.7 CRT 里的原始直播 · 10.7–12.9 长到全屏 + 金句 · 12.9– 片尾 logo */
(function () {
'use strict';
const { W, H, clamp, lerp, seg, ss, E } = VK;
const L = VKLedo, P = L.PAL;
L.brandSet();
const photo = L.img('assets/aldrin.jpg'), clip = L.video('assets/apollo', 192, 24);
const BAR = 60 / 112 * 4, DB = k => k * BAR, SN = k => DB(k) + BAR / 2;
const SUBS = [
  { a: DB(0) + .15, b: DB(1) - .15, zh: '1969 年 7 月 20 日，' },
  { a: DB(1), b: DB(2) - .15, zh: '人类第一次站上了另一个星球。' },
  { a: DB(3), b: DB(4) - .15, zh: '这是当年电视直播的{原始画面}。' },
  { a: DB(4), b: DB(5) - .15, zh: '据估计，全球约 6 亿人同时在看。' },
  { a: DB(5), b: DB(6) - .15, zh: '这是个人的一小步，\n人类的一大步。', gold: true, y: 880 },
];
const PR = [560, 140, 560, 563];                                   // 照片在屏上的位置（宽 560，按 3912×3936 的比例）
function scene1(fr, t) {                                           // 一张月面照片 / 贴上来、年份落下、引线指向地点 / 这是真的，在 1969 年
  if (t > DB(3) + .1) return;
  const k = E.out3(seg(t, 0, .6)), push = seg(t, DB(2), DB(3));
  if (push <= 0) {
    L.photo(fr, photo, { x: lerp(560, 840, k), y: 430, w: 560, rot: lerp(-.1, -.03, k), style: 'tape', a: k });
    L.year(fr, t, { t0: SN(0), year: 1969, cap: 'APOLLO 11 · 静海基地', x: 1180, y: 330, t1: DB(2) - .1 });
    L.callout(fr, t, { t0: DB(1), x: 900, y: 600, tx: 1180, ty: 640, zh: '月面', en: 'Tranquility Base', t1: DB(2) - .1 });
  } else {                                                        // 推进照片：焦点在宇航员面罩上；胶带白边在前 0.3 s 里淡出
    L.pushThrough(fr, photo, [560, 148, 560, 563], push, { focus: [.46, .42], zoom: 7 });
    L.photo(fr, photo, { x: 840, y: 430, w: 560, rot: lerp(-.03, 0, ss(push, 0, .15)), style: 'tape', a: 1 - ss(push, 0, .15) });
  }
  L.whiteFlash(fr, t, DB(3), { rise: .3, fall: .6 });
  fr.sfx(SN(0), 'thud', { gain: .8 }); fr.sfx(DB(1), 'tock', { gain: .6 }); fr.sfx(DB(2), 'rise', { dur: BAR, gain: .7 }); fr.sfx(DB(3), 'bloom', { gain: .8 });
}
function scene2(fr, t) {                                           // 一台 CRT 在放当年的直播 / 宇航员走下梯子 / 原始影像，就是这样的颗粒和模糊
  if (t < DB(3) - .05 || t > DB(6) + .2) return;
  const lt = t - DB(3), grow = seg(t, DB(5) - .1, DB(5) + .6), a = 1 - ss(t, DB(6) - .2, DB(6) + .15);
  const scr = L.crt(fr, { x: 960, y: 450, s: 1.25, a: a * (1 - ss(grow, 0, .5)) });
  if (grow <= 0) {
    L.videoDraw(fr, clip, lt, scr, { round: 30, scan: .8, vignette: .6, filter: 'contrast(1.15) brightness(1.05)' });
    fr.text('REAL FOOTAGE · 真实影像', scr[0], scr[1] - 26, { font: 'mono', size: 16, track: 3, color: P.line, align: 'l', a: ss(lt, .2, .6) });
    fr.text('NASA · 1969-07-20 · 公有领域', scr[0] + scr[2], scr[1] + scr[3] + 24, { font: 'mono', size: 13, track: 1, color: P.label, align: 'r', a: ss(lt, .4, .8) });
  } else L.grow(fr, clip.frames[clamp(Math.floor(lt * 24), 0, 191)], scr, [0, 0, W, H], grow, { scan: lerp(.8, .3, grow), vignette: .7, filter: 'contrast(1.15) brightness(1.05)', a });
  fr.sfx(DB(4), 'tick', { pitch: 3, gain: .5 }); fr.sfx(DB(5), 'shimmer', { gain: .9 });
}
function scene3(fr, t) { if (t < DB(6) - .1) return; L.endLogo(fr, t - DB(6), { line: '一小步 · 真实素材样片' }); fr.sfx(DB(6), 'chord', { gain: .7 }); }

VK.film({
  dur: 15, theme: 'ledo', bloom: .3, meta: { title: '一小步', root: -2 },
  draw(fr, t) {
    L.frame(fr);
    scene1(fr, t); scene2(fr, t); scene3(fr, t);
    if (t < DB(6) - .2) L.brand(fr, t);
    L.sub(fr, t, SUBS);
  },
});
})();
