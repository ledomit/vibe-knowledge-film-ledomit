/* ★ ledo 新件演示 · 12 秒（2026-10-29，照 VibeSCI《HS-AFM》参考片补的"3D + 实物 + 证据"语言）
 * 0–3.2 论文页斜放在桌上（L.paper + L.paperMark + L.plane3），镜头推近，标题被荧光笔涂过，左上出处行，金色年份
 * 3.2–6.4 3D 粉彩"分子"（L.molecule + L.blobs3），镜头绕着转一个角度（L.cam3），右上真实影像小窗
 * 6.4–9.6 对照窗（L.compare）：左边静止照片被盖上红章"STATIC · 只有静止的照片"（L.stamp），右边连续影像 + 计时；比例尺（L.scaleBar）
 * 9.6–12 人物卡排成一排（L.portrait）+ 出处行（L.citation）
 * 素材：assets/aldrin.jpg、assets/apollo/（NASA 原始素材，公有领域，同 ledo_video_demo）。论文页是代码生成的示意，不是真论文。 */
(function () {
'use strict';
const { W, H, lerp, seg, ss, E } = VK;
const L = VKLedo, P = L.PAL;
L.brandSet();
const photo = L.img('assets/aldrin.jpg'), clip = L.video('assets/apollo', 48, 24);
const BAR = 60 / 120 * 4, DB = k => k * BAR + .2;
const SUBS = [
  { a: DB(0), b: 3.05, zh: '论文页斜放在桌上，标题被荧光笔涂过。' },
  { a: 3.3, b: 6.25, zh: '3D 模型：镜头绕着它转一个角度。' },
  { a: 6.5, b: 9.45, zh: '真实 vs 真实：静止照片被盖上红章。' },
  { a: 9.7, b: 11.9, zh: '人物卡：证件照 + 名牌，排成一排。' },
];

function deskPaper(fr, t) {                                          // 一张论文 / 镜头从斜上方推近 / 标题被荧光笔涂过
  if (t > 3.4) return;
  const a = 1 - ss(t, 3.0, 3.35), k = E.io3(seg(t, 0, 3.2));
  L.under(x => { const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2A1C12'); g.addColorStop(1, '#4A3220'); x.globalAlpha = a; x.fillStyle = g; x.fillRect(0, 0, W, H); x.globalAlpha = 1; });
  const pp = L.paper({ key: 'demo', journal: 'Nature 468, 72 (2010)  ·  示意', title: 'Video imaging of walking myosin V by high-speed atomic force microscopy', authors: 'N. Kodera, D. Yamamoto, R. Ishikawa, T. Ando', body: 22 });
  const marked = L.paperMark(pp, [[pp.lines.title, E.io3(seg(t, 1.0, 1.7))]]);
  const cam = L.cam3({ at: [W / 2, 560], pitch: lerp(.55, .3, k), yaw: lerp(-.25, -.08, k), dist: lerp(2300, 1500, k) });
  L.plane3(fr, cam, marked, { c: [0, 0, 0], w: 900, rx: -1.05, ry: .12, a });
  L.citation(fr, 'NATURE 468, 72 (2010) · FIG. 1', { a: a * ss(t, .4, .8) });
  L.year(fr, t, { t0: DB(1), year: 2010, cap: 'HS-AFM · 第一次拍下蛋白质走路', x: 1240, y: 250, t1: 3.0 });
  fr.sfx(1.0, 'soft', { gain: .5 }); fr.sfx(DB(1), 'thud', { gain: .7 });
}
const MOL = [L.molecule(7, 60, { r: 34, cols: ['#A9C4F0', '#F1DE9C'] }), L.molecule(11, 46, { r: 30, cols: ['#F1DE9C', '#C8B4E8'] })];
function model3d(fr, t) {                                            // 两团粉彩分子 / 镜头绕着转 / 这是一个有体积的东西
  if (t < 3.1 || t > 6.6) return;
  const a = ss(t, 3.1, 3.4) * (1 - ss(t, 6.3, 6.6)), k = E.io3(seg(t, 3.2, 6.4));
  L.under(x => { const g = x.createRadialGradient(W / 2, H * .45, 50, W / 2, H / 2, W * .7); g.addColorStop(0, '#2F6764'); g.addColorStop(1, '#0F2423'); x.globalAlpha = a; x.fillStyle = g; x.fillRect(0, 0, W, H); x.globalAlpha = 1; });
  const cam = L.cam3({ at: [W / 2 - 80, 520], yaw: lerp(-.9, .5, k), pitch: lerp(.35, .15, k), dist: 1500 });
  L.blobs3(fr, cam, MOL[0], { a, at: [-260, 40, 0], fogColor: '#1E4A48' });
  L.blobs3(fr, cam, MOL[1], { a, at: [120, -80, 80], fogColor: '#1E4A48' });
  L.footage(fr, t, { t0: 3.6, t1: 6.2, label: '真实影像', en: 'REAL FOOTAGE', src: 'NASA · 1969 · 公有领域（示意）' }, clip);
  fr.sfx(3.6, 'shimmer', { gain: .6 });
}
function evidence(fr, t) {                                           // 两个画面同框 / 左边是静止的、被盖章；右边是连续的 / 以前只能拍照片，现在能拍视频
  if (t < 6.3 || t > 9.8) return;
  L.compare(fr, t, { t0: 6.4, t1: 9.5, labels: ['PHOTO · 静止照片', 'VIDEO · 连续影像'], time: Math.max(0, t - 6.4), src: ['NASA · 公有领域', 'NASA · 公有领域'] }, photo, clip);
  L.stamp(fr, t, 7.4, 'STATIC · 静止', 560, 420, { size: 54, out: 9.5 });
  L.scaleBar(fr, 1640, 680, 120, '1 m', { a: ss(t, 6.8, 7.1) * (1 - ss(t, 9.3, 9.5)) });
}
function people(fr, t) {                                             // 三张人物卡排成一排 / 依次落下 / 这些是具体的人
  if (t < 9.5) return;
  ['示意人物 A', '示意人物 B', '示意人物 C'].forEach((n, i) => { const k = E.out3(seg(t, 9.7 + i * .2, 10.1 + i * .2));
    L.portrait(fr, photo, { x: 620 + i * 340, y: lerp(520, 470, k), w: 230, name: n, role: '照片：NASA', rot: (i - 1) * .03, a: k }); });
  L.citation(fr, 'PORTRAITS · 人物卡示意', { a: ss(t, 9.8, 10.2) });
}

VK.film({
  dur: 12, theme: 'ledo', bloom: .3, meta: { title: 'ledo 新件' },
  draw(fr, t) {
    L.frame(fr);
    deskPaper(fr, t); model3d(fr, t); evidence(fr, t); people(fr, t);
    L.brand(fr, t);
    L.sub(fr, t, SUBS);
  },
});
})();
