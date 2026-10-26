/* ★ ledo 示例 · 15 秒，把 ledo 的件各用一遍（112 BPM，一小节 2.143 s）
 * 0–4.3 拍立得照片 + 金色年份 + 引线标注 · 4.3–8.6 "真实影像"小窗 + 编号圈 + 步骤清单 + 金句 · 8.6–12.9 CRT + 秒表 · 12.9–15 片尾 logo。
 * sample.jpg 只是占位的"真实照片"。 */
(function () {
'use strict';
const { W, H, clamp, lerp, seg, ss, E, rng, rgba } = VK;
const L = VKLedo, P = L.PAL;
L.brandSet();
const photoImg = L.img('assets/sample.jpg');
const BAR = 60 / 112 * 4, DB = k => k * BAR, SN = k => DB(k) + BAR / 2;
const SUBS = [
  { a: DB(0) + .2, b: DB(2) - .15, zh: '1989 年，\n一位科学家看到了这项技术的潜力。' },
  { a: DB(2), b: SN(2) - .1, zh: '他把探针对准了一颗蛋白质。' },
  { a: SN(2), b: DB(4) - .15, zh: '这，就是蛋白质走起路来的样子', gold: true },
  { a: DB(4), b: DB(6) - .15, zh: '早期的设备，拍一张图要{好几分钟}。' },
];
function amber(x, X, Y, w, h, lt) {                       // 示意的"真实影像"：一条橙黄的纤维和两个亮点在挪动
  const R = rng(9); x.fillStyle = '#1A0E04'; x.fillRect(X, Y, w, h);
  for (let i = 0; i < 260; i++) { const px = X + R() * w, py = Y + h * (.5 + Math.sin(R() * 6 + lt) * .12) + (R() - .5) * h * .25; x.fillStyle = `rgba(240,${120 + R() * 80},30,${.15 + R() * .3})`; x.fillRect(px, py, 3 + R() * 6, 3 + R() * 6); }
  [[.38 + .04 * Math.sin(lt * 3), .5], [.62 + .04 * Math.cos(lt * 3), .48]].forEach(([u, v]) => { const g = x.createRadialGradient(X + u * w, Y + v * h, 0, X + u * w, Y + v * h, 30); g.addColorStop(0, 'rgba(255,230,160,.95)'); g.addColorStop(1, 'rgba(255,160,40,0)'); x.fillStyle = g; x.fillRect(X, Y, w, h); });
}
function scene1(fr, t) {                                   // 一位科学家的照片 / 滑进来、年份落下、引线指向地点 / 这是一个具体的人、具体的年份
  if (t > DB(2) + .4) return;
  const a = 1 - ss(t, DB(2) - .1, DB(2) + .3), k = E.out3(seg(t, .1, .7));
  L.photo(fr, photoImg, { x: lerp(330, 460, k), y: 430, w: 380, rot: lerp(-.12, -.04, k), style: 'polaroid', caption: '示意照片', a: a * k });
  L.year(fr, t, { t0: SN(0), year: 1989, cap: 'ANDO STARTS · 开始用 AFM 看蛋白质', x: 760, y: 300, t1: DB(2) - .2 });
  L.callout(fr, t, { t0: DB(1), x: 1350, y: 560, tx: 1460, ty: 470, zh: '金泽', en: 'Kanazawa', t1: DB(2) - .2 });
  fr.sfx(SN(0), 'thud', { gain: .7 }); fr.sfx(DB(1), 'tock', { gain: .6 });
}
function scene2(fr, t) {                                   // 一条轨道上的"马达" + 右上角真实影像 / 两只脚交替 / 模型和真实对得上
  if (t < DB(2) - .3 || t > DB(4) + .4) return;
  const a = ss(t, DB(2) - .3, DB(2)) * (1 - ss(t, DB(4) - .1, DB(4) + .3)), step = Math.floor((t - DB(2)) / (BAR / 2)), ph = ((t - DB(2)) % (BAR / 2)) / (BAR / 2);
  fr.line(160, 620, 1300, 620, { w: 14, color: '#8E86C8', a: a * .6, cap: 'round' });
  const fx = [560 + step * 90, 650 + step * 90]; fx[step % 2] += 90 * E.io3(ph);
  fx.forEach((x, i) => { fr.circle(x, 600, 26, { fill: i ? '#9CC7E8' : '#E8D79C', a }); L.marker(fr, x, 540, i + 1, { a }); });
  fr.line(fx[0], 600, (fx[0] + fx[1]) / 2, 470, { w: 6, color: '#E8D79C', a }); fr.line(fx[1], 600, (fx[0] + fx[1]) / 2, 470, { w: 6, color: '#9CC7E8', a });
  L.footage(fr, t, { t0: SN(2), t1: DB(4) - .2, marks: [[.38, .5, 1], [.62, .48, 2]], src: '示意 · 不是真实素材' }, amber);
  L.checklist(fr, t, { items: ['ATP 结合', '后脚松开', '前脚甩到前面', '落下'], times: [DB(2), DB(2) + BAR / 4, SN(2), SN(2) + BAR / 4], t1: DB(4) - .2 });
  fr.sfx(SN(2), 'shimmer', { gain: .8 });
}
function scene3(fr, t) {                                   // 一台老 CRT + 秒表 / 指针一圈圈走 / 慢，是看得见的慢
  if (t < DB(4) - .3 || t > DB(6) + .3) return;
  const a = ss(t, DB(4) - .3, DB(4)) * (1 - ss(t, DB(6) - .2, DB(6) + .1));
  const [sx, sy, sw, sh] = L.crt(fr, { x: 760, y: 450, s: 1, a });
  const scan = ((t - DB(4)) / (BAR * 2)) % 1; fr.line(sx + 20, sy + sh * scan, sx + sw - 20, sy + sh * scan, { w: 2, color: '#6CFF9A', a: a * .8, glow: 8 });
  L.clock(fr, { x: 1440, y: 440, r: 110, value: ss(t, DB(4), DB(6)), label: ss(t, DB(4), DB(6)) < .5 ? '00:02' : '3 min', a });
}
function scene4(fr, t) { if (t < DB(6) - .1) return; L.endLogo(fr, t - DB(6), { line: '用一根针尖，看见生命的动作' }); fr.sfx(DB(6), 'chord', { gain: .7 }); }

VK.film({
  dur: 15, theme: 'ledo', bloom: .35, meta: { title: 'ledo 示例' },
  draw(fr, t) {
    L.frame(fr); L.watermark(fr);
    scene1(fr, t); scene2(fr, t); scene3(fr, t); scene4(fr, t);
    if (t < DB(6) - .2) L.brand(fr, t);
    L.sub(fr, t, SUBS);
  },
});
})();
