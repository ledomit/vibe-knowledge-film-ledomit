/* VKCard：card 风格的件（从《AI 时代，你还需要花几万块找中介申请美国研究生吗？》提炼，去掉了题目里的具体东西）。
 * card = ledo 的底（暗场 + 品牌角标）+ 有旁白的口播讲解：金框深色 3D 卡、真实网页截图卡、撕纸剪贴、褶皱便签、红章、灵动岛滑块、居中大字幕。
 * 规格和用法见 references/card.md；依赖 vk.js、vk-kit.js、vk-ledo.js（先引入它们）。
 *   const C = VKCard, T = C.beat({ B: .53191, db0: 3.656 }), V = C.voice(T);
 *   C.card(fr, face, { c: C.at(960, 450), w, h, rx, ry, a });  C.subs(fr, t, SUBS); */
(function () {
'use strict';
const { W, H, clamp, lerp, seg, ss, E } = VK;
const L = VKLedo;

const PAL = { ink: '#ECECEA', gold: '#E9C46A', goldHi: '#F7E3A1', goldLo: '#9C7533', red: '#D9483B', green: '#4CC38A', amber: '#F0A030',
  teal: '#3E9C96', gray: '#9AA0A6', card: '#14120E', cardDeep: '#0B0A08', paper: '#F2ECE0', island: '#050506' };
const SANS = '"VK Sans"';
const h1 = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/* ---------- 节拍和旁白 ---------- */
function beat({ B, bpm, db0 = 0, beats = 4 }) {                                      // 下拍表：DB(n) 第 n 小节的下拍，BT(n, i) 第 i 拍，snap 吸到最近的一拍
  B = B || 60 / bpm; const BAR = beats * B, DB = n => db0 + BAR * n;
  return { B, E8: B / 2, BAR, DB, BT: (n, i) => DB(n) + i * B, SN: n => DB(n) + 2 * B, snap: x => db0 + B * Math.round((x - db0) / B) };
}
function voice(T, lines = window.VOICE_LINES || []) {                                // VL(i) 第 i 句起止；wordAt(i, 词) 这个词大约在什么时候说到；at(i) 吸到拍上的起点
  const VL = i => lines[i] || { a: 0, b: 0, text: '' };
  const wordAt = (i, w) => { const l = VL(i), s = l.text.replace(/[，。；：！？—、,.;:!?\s]/g, ''), k = s.indexOf(w); return k < 0 ? l.a : l.a + (l.b - l.a) * k / s.length; };
  return { VL, wordAt, at: (i, lead = .15) => T.snap(VL(i).a - lead), has: i => !!(lines[i] && lines[i].b) };
}

/* ---------- 进出场：上一段在下一段开始前 0.1 s 完全消失（不叠） ---------- */
const span = (t, t0, t1, o = {}) => ss(t, t0, t0 + (o.in || .3)) * (1 - ss(t, t1 - (o.out || .5), t1 - (o.gap == null ? .1 : o.gap)));

/* ---------- 3D 卡：卡面画在离屏画布（2 倍分辨率），贴到斜放的平面上；圆角阴影和金框辉光另画在底层 ---------- */
const cam = L.cam3({ at: [W / 2, H / 2], dist: 1600, focal: 1600 });                  // z = 0 处 1:1
const at = (sx, sy, z = 0) => [sx - W / 2, H / 2 - sy, z];
const CANV = {};
function face(key, w, h, scale = 2) { let c = CANV[key]; if (!c) { c = CANV[key] = document.createElement('canvas'); c.width = w * scale; c.height = h * scale; }
  const x = c.getContext('2d'); x.setTransform(scale, 0, 0, scale, 0, 0); x.clearRect(0, 0, w, h); return { c, x }; }
function uvOf(o) { const { c, w, h, rx = 0, ry = 0 } = o;                           // 卡面 (u, v) → 屏幕坐标，和 plane3 一致：往卡上的某一点贴东西用
  return (u, v) => { const x = (u - .5) * w, y = (.5 - v) * h, y1 = y * Math.cos(rx), z1 = y * Math.sin(rx);
    return cam.proj([c[0] + x * Math.cos(ry) + z1 * Math.sin(ry), c[1] + y1, c[2] - x * Math.sin(ry) + z1 * Math.cos(ry)]); }; }
function roundUV(w, h, r) { const out = [], ru = r / w, rv = r / h;
  [[1 - ru, rv, -Math.PI / 2], [1 - ru, 1 - rv, 0], [ru, 1 - rv, Math.PI / 2], [ru, rv, Math.PI]].forEach(([cu, cv, a0]) => {
    for (let i = 0; i <= 6; i++) { const a = a0 + i / 6 * Math.PI / 2; out.push([cu + Math.cos(a) * ru, cv + Math.sin(a) * rv]); } });
  out.push(out[0]); return out; }
function card(fr, im, o, glowA = 1) {                                                // o: { c: at(…), w, h, rx, ry, a, r, glow }；im = face() 的画布
  const uv = uvOf(o), q = roundUV(o.w, o.h, o.r || 28).map(([u, v]) => uv(u, v)), A = o.a == null ? 1 : o.a, a = A * glowA;
  const path = x => { x.beginPath(); q.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); };
  L.under(x => { if (A <= .01) return; x.save(); x.globalAlpha = A * .9; x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 44; x.shadowOffsetY = 20; x.fillStyle = PAL.cardDeep; path(x); x.fill(); x.restore(); });
  L.plane3(fr, cam, { im, w: im.width, h: im.height, ok: true }, Object.assign({ cols: 8, rows: 10, shadow: false }, o));
  if (o.glow !== false) L.under(x => { if (a <= .01) return; x.save(); x.globalAlpha = .6 * a; x.strokeStyle = PAL.gold; x.lineWidth = 2; x.shadowColor = PAL.gold; x.shadowBlur = 22; path(x); x.stroke(); x.restore(); });
  return uv;
}

/* ---------- 卡面画法（原生 ctx） ---------- */
function rr(x, X, Y, w, h, r) { x.beginPath(); x.roundRect(X, Y, w, h, r); }
function goldG(x, x0, y0, x1, y1) { const g = x.createLinearGradient(x0, y0, x1, y1);
  [[0, '#8E6A2F'], [.28, '#F7E3A1'], [.5, '#C9A24E'], [.75, '#FBEFC4'], [1, '#9C7533']].forEach(([p, c]) => g.addColorStop(p, c)); return g; }
function txt(x, s, X, Y, o = {}) {                                                   // o: { size, wt, fam, align, track, a, glow, glowColor, grad, color, maxW }
  x.save(); let size = o.size || 32; x.font = `${o.wt || 700} ${size}px ${o.fam || SANS}`; x.letterSpacing = (o.track || 0) + 'px';
  if (o.maxW) { const tw = x.measureText(s).width; if (tw > o.maxW) { size *= o.maxW / tw; x.font = `${o.wt || 700} ${size}px ${o.fam || SANS}`; } }
  x.textAlign = o.align || 'center'; x.textBaseline = 'middle'; x.globalAlpha *= o.a == null ? 1 : o.a;
  if (o.glow) { x.shadowColor = o.glowColor || PAL.gold; x.shadowBlur = o.glow; }
  x.fillStyle = o.grad ? goldG(x, X, Y - size * .6, X, Y + size * .6) : (o.color || PAL.ink); x.fillText(s, X, Y); x.restore(); }
function frameFace(x, w, h, kind = 'dark') {                                         // 金框：渐变外框 + 细内框 + 虚线内框；kind 'dark' | 'paper'
  const r = 30, paper = kind === 'paper'; rr(x, 4, 4, w - 8, h - 8, r);
  const g = paper ? x.createLinearGradient(0, 0, 0, h) : x.createLinearGradient(0, 0, w * .3, h);
  (paper ? [[0, '#F2ECE0'], [1, '#E0D7C6']] : [[0, '#26201A'], [.5, '#14120E'], [1, '#0B0A08']]).forEach(([p, c]) => g.addColorStop(p, c)); x.fillStyle = g; x.fill();
  if (!paper) { const s = x.createRadialGradient(w * .3, 0, 10, w * .3, 0, h * .8); s.addColorStop(0, 'rgba(255,236,190,.10)'); s.addColorStop(1, 'rgba(255,236,190,0)'); x.fillStyle = s; x.fill(); }
  x.lineWidth = 9; x.strokeStyle = goldG(x, 0, 0, w, h); rr(x, 6, 6, w - 12, h - 12, r - 2); x.stroke();
  x.lineWidth = 1.5; x.strokeStyle = paper ? 'rgba(156,117,51,.7)' : 'rgba(233,196,106,.55)'; rr(x, 17, 17, w - 34, h - 34, r - 10); x.stroke();
  x.save(); x.setLineDash([5, 6]); x.lineWidth = 1.2; x.strokeStyle = paper ? 'rgba(156,117,51,.5)' : 'rgba(247,227,161,.38)'; rr(x, 27, 27, w - 54, h - 54, r - 16); x.stroke(); x.restore();
}
function divider(x, cx, y, half) {                                                   // 分隔线：点线 + 中间菱形 + 两头梭形
  x.save(); x.setLineDash([2, 5]); x.strokeStyle = 'rgba(233,196,106,.7)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(cx - half, y); x.lineTo(cx + half, y); x.stroke(); x.restore();
  x.save(); x.fillStyle = PAL.gold; x.beginPath(); x.moveTo(cx, y - 9); x.lineTo(cx + 7, y); x.lineTo(cx, y + 9); x.lineTo(cx - 7, y); x.closePath(); x.fill();
  for (const s of [-1, 1]) { x.beginPath(); x.ellipse(cx + s * half, y, 16, 3.5, 0, 0, 7); x.fill(); } x.restore();
}
function pill(x, cx, cy, w, h, s, o = {}) {                                          // 发光药丸：目录项 / 问题；o.hot 0..1 点亮
  x.save(); x.globalAlpha *= o.a == null ? 1 : o.a; const hot = o.hot || 0;
  if (hot) { x.shadowColor = PAL.gold; x.shadowBlur = 26 * hot; }
  rr(x, cx - w / 2, cy - h / 2, w, h, h / 2 * .45); x.fillStyle = hot ? `rgba(60,48,22,${.6 + .4 * hot})` : PAL.cardDeep; x.fill(); x.shadowBlur = 0;
  x.lineWidth = 2; x.strokeStyle = hot ? PAL.goldHi : 'rgba(233,196,106,.6)'; x.stroke();
  txt(x, s, cx, cy + 1, { size: o.size || 34, wt: 700, grad: true, track: 2, maxW: w - 40 }); x.restore();
}
function stampFace(x, cx, cy, k, s, size, o = {}) {                                  // 红章：从 2.4 倍砸下，双线框 + 缺墨斑点；k 0→1
  if (k <= 0) return; const col = o.color || PAL.red; x.save(); x.translate(cx, cy); x.rotate(o.rot == null ? -.2 : o.rot); x.scale(lerp(2.4, 1, k), lerp(2.4, 1, k)); x.globalAlpha *= Math.min(1, k * 1.2) * .94;
  x.font = `900 ${size}px ${SANS}`; x.letterSpacing = size * .06 + 'px'; const w = x.measureText(s).width + size * .7, h = size * 1.35;
  x.strokeStyle = col; x.lineWidth = size * .07; rr(x, -w / 2, -h / 2, w, h, 12); x.stroke(); x.lineWidth = size * .025; rr(x, -w / 2 + size * .11, -h / 2 + size * .11, w - size * .22, h - size * .22, 7); x.stroke();
  x.fillStyle = col; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s, 0, size * .04);
  x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 60; i++) { x.beginPath(); x.arc((h1(i * 3.1) - .5) * w, (h1(i * 5.7) - .5) * h, 1 + h1(i * 9.3) * size * .03, 0, 7); x.fill(); }
  x.restore();
}
function torn(x, X, Y, w, h, seed, amp = 7, step = 16) {                             // 撕纸：锯齿边的矩形路径（之后自己 fill / clip）
  const pts = [], R = i => (h1(seed + i * 1.37) - .5) * 2 * amp; let i = 0;
  for (let u = 0; u <= w; u += step) pts.push([X + u, Y + R(i++)]);
  for (let v = 0; v <= h; v += step) pts.push([X + w + R(i++), Y + v]);
  for (let u = w; u >= 0; u -= step) pts.push([X + u, Y + h + R(i++)]);
  for (let v = h; v >= 0; v -= step) pts.push([X + R(i++), Y + v]);
  x.beginPath(); pts.forEach((p, j) => j ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); }
function scrap(x, w, h, o, fn) {                                                     // 撕纸剪贴：米白纸 + 软阴影 + 一条胶带，fn(x, w, h) 在纸上画内容；中心在 (0, 0)
  x.save(); x.rotate(o.rot || 0); x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 22; x.shadowOffsetY = 10;
  torn(x, -w / 2, -h / 2, w, h, o.seed || 1, 5, 18); x.fillStyle = o.fill || '#F3EEE3'; x.fill(); x.shadowColor = 'transparent';
  x.save(); x.translate(-w / 2, -h / 2); fn && fn(x, w, h); x.restore();
  if (o.tape !== false) { x.save(); x.rotate(-.05); x.globalAlpha *= .8; x.fillStyle = o.tape || 'rgba(233,196,106,.75)'; x.fillRect(-55, -h / 2 - 16, 110, 30); x.restore(); }
  x.restore(); }

/* ---------- 褶皱便签：纸纹只算一次；和纸胶带 + 小图 + 标题 + 一行英文小标 ---------- */
const WR = {};
function wrinkle(w = 340, h = 410) { const k = w + 'x' + h; if (WR[k]) return WR[k];
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.beginPath(); x.roundRect(0, 0, w, h, 5); x.clip();
  const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#F7F2E8'); g.addColorStop(1, '#ECE5D6'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  const fy = h * .58, f = x.createLinearGradient(0, fy - 12, 0, fy + 12); f.addColorStop(0, 'rgba(255,255,255,0)'); f.addColorStop(.45, 'rgba(255,255,255,.55)'); f.addColorStop(.55, 'rgba(120,100,70,.10)'); f.addColorStop(1, 'rgba(120,100,70,0)');
  x.save(); x.translate(w / 2, fy); x.rotate(-.035); x.translate(-w / 2, -fy); x.fillStyle = f; x.fillRect(-20, fy - 12, w + 40, 24); x.restore();     // 一道很浅的对折痕
  const cu = x.createLinearGradient(w, h, w - 90, h - 90); cu.addColorStop(0, 'rgba(110,90,60,.20)'); cu.addColorStop(1, 'rgba(110,90,60,0)'); x.fillStyle = cu; x.fillRect(w - 140, h - 130, 140, 130);   // 右下角微翘
  const v = x.createRadialGradient(w / 2, h * .46, 120, w / 2, h / 2, h * .73); v.addColorStop(0, 'rgba(255,255,255,0)'); v.addColorStop(1, 'rgba(120,100,70,.12)'); x.fillStyle = v; x.fillRect(0, 0, w, h);
  for (let i = 0; i < w * h / 63; i++) { x.fillStyle = `rgba(90,70,40,${h1(i * 2.3) * .05})`; x.fillRect(h1(i * 1.7) * w, h1(i * 3.1) * h, 1.2, 1.2); }
  return (WR[k] = c); }
function note(x, o) {                                                                // o: { x, y, s, a, rot, tape, title, en, art(x) }（art 在 120 px 见方里画，中心 0,0）
  const a = o.a == null ? 1 : o.a; if (a <= 0) return; const w = 340, h = 410;
  x.save(); x.globalAlpha *= a; x.translate(o.x || 0, o.y || 0); x.rotate(o.rot || 0); x.scale(o.s || 1, o.s || 1);
  x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 30; x.shadowOffsetY = 14; x.drawImage(wrinkle(w, h), -w / 2, -h / 2 - 1); x.shadowColor = 'transparent';
  x.save(); x.rotate(-.04); x.globalAlpha *= .85; x.fillStyle = o.tape || '#E08E6D'; x.fillRect(-60, -h / 2 - 17, 120, 36); x.restore();
  if (o.art) { x.save(); x.translate(0, -50); o.art(x); x.restore(); }
  if (o.title) txt(x, o.title, 0, 98, { size: 44, wt: 900, fam: '"VK Serif"', color: '#1E1A16', maxW: 290 });
  if (o.en) txt(x, o.en, 0, 142, { size: 13, wt: 600, fam: '"VK Mono"', color: '#8A6A2A', track: 2 });
  x.restore(); }

/* ---------- 真实网页截图卡 / 仓库卡 ---------- */
const FEE = { free: PAL.green, part: PAL.amber, paid: PAL.amber };
function shot(x, h, crop, X, Y, w, hh) { if (!h || !h.ok) return; const [cx, cy, cw, ch] = crop || [0, 0, 1, 1], s = Math.max(w / (h.w * cw), hh / (h.h * ch));
  x.drawImage(h.im, h.w * cx, h.h * cy, w / s, hh / s, X, Y, w, hh); }
function feeTag(x, s, rx, cy, col) { x.save(); x.font = `800 24px ${SANS}`; const tw = x.measureText(s).width + 36;
  x.translate(rx - tw, cy - 22); x.rotate(-.04); x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 12; rr(x, 0, 0, tw, 44, 22); x.fillStyle = col || PAL.green; x.fill(); x.shadowColor = 'transparent';
  x.fillStyle = '#101010'; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText(s, 18, 23); x.restore(); }
function webCard(x, o, w, hh) {                                                      // o: { name, line, img, crop, fee, feeKind: 'free'|'part'|'paid' }；中心在 (0, 0)
  x.save(); x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 44; x.shadowOffsetY = 18; rr(x, -w / 2, -hh / 2, w, hh, 22); x.fillStyle = '#100E0B'; x.fill(); x.restore();
  x.save(); const pa = x.globalAlpha; rr(x, -w / 2 + 8, -hh / 2 + 8, w - 16, hh - 16, 16); x.clip();
  x.globalAlpha = pa * .5; x.filter = 'saturate(.7)'; shot(x, o.img, o.crop, -w / 2 + 8, -hh / 2 + 8, w - 16, hh - 16); x.filter = 'none'; x.globalAlpha = pa;   // 透明度一定要乘外面的（直接设 .5 / 1 会让淡出的旧卡还压在新卡上）
  const g = x.createLinearGradient(0, -hh / 2, 0, hh / 2); g.addColorStop(0, 'rgba(12,10,8,.35)'); g.addColorStop(.45, 'rgba(12,10,8,.55)'); g.addColorStop(1, 'rgba(12,10,8,.92)'); x.fillStyle = g; x.fillRect(-w / 2, -hh / 2, w, hh); x.restore();
  x.lineWidth = 7; x.strokeStyle = goldG(x, -w / 2, -hh / 2, w / 2, hh / 2); rr(x, -w / 2 + 3, -hh / 2 + 3, w - 6, hh - 6, 20); x.stroke();
  x.save(); x.setLineDash([5, 6]); x.lineWidth = 1.2; x.strokeStyle = 'rgba(247,227,161,.45)'; rr(x, -w / 2 + 18, -hh / 2 + 18, w - 36, hh - 36, 12); x.stroke(); x.restore();
  x.save(); x.font = `900 54px ${SANS}`; const fs = Math.min(54, 54 * (w - 80) / x.measureText(o.name).width); x.restore();
  x.save(); x.shadowColor = 'rgba(0,0,0,.85)'; x.shadowBlur = 16; x.font = `900 ${fs}px ${SANS}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  const lg = x.createLinearGradient(0, hh * .12 - fs / 2, 0, hh * .12 + fs / 2); lg.addColorStop(0, '#FFFBEA'); lg.addColorStop(1, '#F7D98A'); x.fillStyle = lg; x.fillText(o.name, 0, hh * .12); x.restore();
  if (o.line) txt(x, o.line, 0, hh * .12 + fs * .5 + 34, { size: 24, wt: 500, color: '#FFFFFF', glow: 10, glowColor: 'rgba(0,0,0,.9)', maxW: w - 60 });
  if (o.fee) feeTag(x, o.fee, w / 2 + 10, hh / 2 - 8, FEE[o.feeKind || 'free']); }
function repoCard(x, o, w, hh) {                                                     // 扁的开源仓库卡：o: { owner, repo, desc, star, tag }
  x.save(); x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 40; rr(x, -w / 2, -hh / 2, w, hh, 20); x.fillStyle = 'rgba(16,20,28,.95)'; x.fill(); x.restore();
  x.save(); x.lineWidth = 2.5; x.strokeStyle = '#B89B63'; rr(x, -w / 2, -hh / 2, w, hh, 20); x.stroke();
  const L0 = -w / 2 + 36; x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillStyle = '#8A8F98'; x.font = '700 16px "VK Mono"'; x.fillText('GITHUB · ' + (o.owner || ''), L0, -hh / 2 + 34);
  x.fillStyle = '#FFFFFF'; x.font = '800 40px "VK Mono"'; x.fillText(o.repo, L0, -4); const nw = x.measureText(o.repo).width;
  x.strokeStyle = '#8A8F98'; x.lineWidth = 2; rr(x, L0 + 18 + nw, -22, 92, 36, 18); x.stroke(); x.fillStyle = '#C9CCD0'; x.font = `500 18px ${SANS}`; x.fillText('Public', L0 + 36 + nw, -3);
  x.font = `500 24px ${SANS}`; x.fillText(o.desc || '', L0, hh / 2 - 32);
  [['★ ' + (o.star || ''), '#FFFFFF'], [o.tag || '开源免费', PAL.green]].forEach(([s, bc], i) => { const X = w / 2 - 36 - (2 - i) * 190 + 10; x.strokeStyle = bc; x.lineWidth = 2.5; rr(x, X, -26, 170, 52, 26); x.stroke();
    x.fillStyle = bc; x.font = `800 26px ${SANS}`; x.textAlign = 'center'; x.fillText(s, X + 85, 0); x.textAlign = 'left'; });
  x.restore(); }

/* ---------- 发牌：一组卡一拍一张从右下飞进来、轻微歪着；到 t1 前整组往左撤、同时变淡，下一组进来前已经看不见 ---------- */
function deal(fr, t, o) {                                                            // o: { t0, t1, n, w, h, step, gap, y, a, draw(x, i, w, h), sfx }
  if (t < o.t0 - .1 || t > o.t1 + .4) return;
  const out = E.in2(seg(t, o.t1 - .45, o.t1 - .15)), gone = 1 - ss(t, o.t1 - .45, o.t1 - .2), A = (o.a == null ? 1 : o.a) * gone, gap = o.gap || 28;
  for (let i = 0; i < o.n; i++) { const tb = o.t0 + i * (o.step || .5), k = E.out3(seg(t, tb, tb + .3)); if (k <= 0) continue;
    const cx = W / 2 + (i - (o.n - 1) / 2) * (o.w + gap), cy = o.y || 520, X = lerp(cx + 260, cx, k) - out * 600, Y = lerp(cy + 160, cy, k), rot = lerp(.12, (h1(i * 7.1 + o.t0) - .5) * .05, k), s = lerp(.85, 1, k);
    L.under(x => { x.save(); x.globalAlpha = A * Math.min(1, k * 1.6); x.translate(X, Y); x.rotate(rot); x.scale(s, s); o.draw(x, i, o.w, o.h); x.restore(); });
    if (o.sfx !== false) { fr.sfx(tb, 'tick', { pitch: 8 + i * 3, gain: .5 }); fr.sfx(tb, 'soft', { gain: .25 }); } }
}

/* ---------- 灵动岛滑块：纯黑胶囊从一颗黑点弹开，内容随后淡入；贴到 plane3 上，侧着往后仰，一边拖一边摆正 ---------- */
function islandFace(t, o) {                                                          // o: { p 0..1, grow 0..1, label, icon, value(p) → 字符串 }
  const SW = 940, SH = 260, { c, x } = face('vkc-island', SW, SH), grow = o.grow == null ? 1 : o.grow, p = o.p || 0;
  const wv = lerp(120, 840, grow), hv = lerp(120, 132, grow), r = hv / 2;
  x.save(); x.translate(SW / 2, SH / 2 - 14);
  x.save(); x.shadowColor = 'rgba(0,0,0,.7)'; x.shadowBlur = 44; x.shadowOffsetY = 22; rr(x, -wv / 2, -hv / 2, wv, hv, r); x.fillStyle = PAL.island; x.fill(); x.restore();
  x.save(); rr(x, -wv / 2, -hv / 2, wv, hv, r); x.clip();
  const hl = x.createLinearGradient(0, -hv / 2, 0, hv / 2); hl.addColorStop(0, 'rgba(255,255,255,.16)'); hl.addColorStop(.35, 'rgba(255,255,255,0)'); hl.addColorStop(1, 'rgba(255,255,255,.04)');
  x.strokeStyle = hl; x.lineWidth = 3; rr(x, -wv / 2 + 1.5, -hv / 2 + 1.5, wv - 3, hv - 3, r - 1.5); x.stroke();
  const sp = lerp(-.2, 1.2, (t * .45) % 1), sh = x.createLinearGradient(-wv / 2, -hv / 2, wv / 2, hv / 2);      // 斜向光泽慢慢扫过
  sh.addColorStop(clamp(sp - .12, 0, 1), 'rgba(255,255,255,0)'); sh.addColorStop(clamp(sp, 0, 1), 'rgba(255,255,255,.07)'); sh.addColorStop(clamp(sp + .12, 0, 1), 'rgba(255,255,255,0)');
  x.fillStyle = sh; x.fillRect(-wv / 2, -hv / 2, wv, hv);
  const ca = ss(grow, .6, 1); if (ca > 0) { const L0 = -wv / 2; x.globalAlpha = ca; x.filter = `blur(${(1 - ca) * 8}px)`;
    const ig = x.createLinearGradient(L0 + 34, -36, L0 + 106, 36); ig.addColorStop(0, PAL.goldHi); ig.addColorStop(1, PAL.goldLo);
    x.fillStyle = ig; rr(x, L0 + 34, -36, 72, 72, 18); x.fill(); txt(x, o.icon || '¥', L0 + 70, 2, { size: 40, wt: 900, fam: '"VK Latin"', color: '#1E1A16' });
    txt(x, o.label || '', L0 + 126, 2, { size: 32, wt: 800, color: '#FFFFFF', align: 'left' });
    const T0x = L0 + 300, TW = 300, kx = T0x + TW * p;
    x.fillStyle = '#2C2C2E'; rr(x, T0x, -6, TW, 12, 6); x.fill();
    const gf = x.createLinearGradient(T0x, 0, kx, 0); gf.addColorStop(0, PAL.goldLo); gf.addColorStop(1, PAL.goldHi); x.save(); x.shadowColor = PAL.gold; x.shadowBlur = 14; x.fillStyle = gf; rr(x, T0x, -6, Math.max(12, kx - T0x), 12, 6); x.fill(); x.restore();
    x.save(); x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 10; x.shadowOffsetY = 4; x.fillStyle = '#FFFFFF'; x.beginPath(); x.arc(kx, 0, 17, 0, 7); x.fill(); x.restore();
    if (o.value) txt(x, o.value(p), wv / 2 - 40, 2, { size: 42, wt: 800, color: '#FFFFFF', align: 'right' });
    x.filter = 'none'; }
  x.restore(); x.restore(); return c; }
function island(fr, t, o) {                                                          // o: { t0, pa, pb（拖动起止，相对 t0）, x, y, a, label, icon, value, tilt: [rx, ry] }
  const lt = t - (o.t0 || 0); if (lt < 0) return;
  const grow = Math.min(1, E.outBack(seg(lt, 0, .45))), p = E.io3(seg(lt, o.pa == null ? .35 : o.pa, o.pb == null ? 2.3 : o.pb)), st = E.io3(seg(lt, 0, o.pb == null ? 2.3 : o.pb)), [rx, ry] = o.tilt || [.32, .9];
  L.plane3(fr, cam, { im: islandFace(t, Object.assign({}, o, { p, grow })), w: 1880, h: 520, ok: true },
    { c: at(o.x || W / 2, o.y || 548), w: 940, h: 260, shadow: false, rx: lerp(rx, 0, st), ry: lerp(ry, 0, st), cols: 10, rows: 3, a: o.a == null ? 1 : o.a });
}

/* ---------- 底：按段换的模糊压暗照片（交叉淡 0.8 s，慢推）；没有照片时是一团暖暗光 ---------- */
const BLUR = new Map();
function blurred(h) { if (!h || !h.ok) return null; if (BLUR.has(h)) return BLUR.get(h);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.filter = 'blur(10px) brightness(.4) saturate(.8)';
  const s = Math.max(W / h.w, H / h.h) * 1.12, w = h.w * s, hh = h.h * s; x.drawImage(h.im, (W - w) / 2, (H - hh) / 2, w, hh); x.filter = 'none';
  const g = x.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 1150); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.72)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  BLUR.set(h, c); return c; }
function stage(fr, t, plan, dim = 1) {                                               // plan: [[时刻, L.img 句柄 | null], …]
  L.under(x => { for (let i = 0; i < plan.length; i++) { const [t0, h] = plan[i], t1 = plan[i + 1] ? plan[i + 1][0] : 1e9; if (t < t0 - .4 || t > t1 + .4) continue;
    const a = ss(t, t0 - .4, t0 + .4) * (1 - ss(t, t1 - .4, t1 + .4)) * dim; if (a <= 0) continue; const c = blurred(h), z = 1 + .04 * ((t - t0) / 30 % 1);
    x.save(); x.globalAlpha = a; x.translate(W / 2, H / 2); x.scale(z, z);
    if (c) x.drawImage(c, -W / 2, -H / 2); else { const g = x.createRadialGradient(0, -80, 40, 0, 0, 1100); g.addColorStop(0, '#3A3024'); g.addColorStop(1, 'rgba(18,19,22,0)'); x.fillStyle = g; x.fillRect(-W / 2, -H / 2, W, H); }
    x.restore(); } });
}
function pattern(fr, t, icon, o = {}) {                                              // 很淡的平铺小图标，慢慢往左上漂；icon(x) 在 (0, 0) 画一个
  L.under(x => { x.save(); x.globalAlpha = o.a || .05; x.strokeStyle = x.fillStyle = o.color || '#E9D8A6'; x.lineWidth = 2; const sp = o.space || 210, ox = -(t * 9) % sp, oy = -(t * 5) % sp;
    for (let j = -1; j < H / sp + 2; j++) for (let i = -1; i < W / sp + 2; i++) { x.save(); x.translate(ox + i * sp + (j % 2) * sp / 2, oy + j * sp); icon(x); x.restore(); }
    x.restore(); }); }

/* ---------- 章节标、目录药丸、关键帧轨迹 ---------- */
function chapterHead(fr, t, no, title, t0, t1) { const a = ss(t, t0, t0 + .4) * (1 - ss(t, t1 - .4, t1)); if (a <= 0) return;
  fr.text(no, 110, 100, { font: 'mono', size: 26, color: PAL.gold, align: 'l', a, track: 4 });
  fr.text(title, 170, 100, { font: 'sansh', size: 46, color: PAL.ink, align: 'l', a, track: 3 });
  fr.line(110, 138, 600, 138, { color: PAL.gold, w: 1.2, a: .5 * a }); }
function tag(fr, s, x, y, a) { if (a <= 0) return; fr.g({ at: [x, y] }, () => {     // 左上的组名药丸
  fr.rect(0, -32, fr.measure(s, { font: 'sansh', size: 36 }) + 60, 64, { r: 32, fill: PAL.card, color: PAL.gold, w: 2.5, a, glow: 12 }); fr.text(s, 30, 2, { font: 'sansh', size: 36, color: PAL.goldHi, align: 'l', a }); }); }
function track(keys, t, dur = .45) {                                                 // keys: [[到达时刻, x, y, s, a?, arc?, dur?]]
  const pick = k => ({ x: k[1], y: k[2], s: k[3], a: k[4] == null ? 1 : k[4] }); let cur = pick(keys[0]); if (t <= keys[0][0]) return cur;
  for (let i = 1; i < keys.length; i++) { const k = keys[i], d = k[6] || dur; if (t < k[0] - d) break; const p = cur, u = E.io3(seg(t, k[0] - d, k[0])), q = pick(k);
    cur = { x: lerp(p.x, q.x, u), y: lerp(p.y, q.y, u) - (k[5] || 0) * Math.sin(Math.PI * u), s: lerp(p.s, q.s, u), a: lerp(p.a, q.a, u) }; if (u < 1) return cur; }
  return cur; }

/* ---------- 字幕：居中、白色粗黑体；先垫一层黑字 + 紧贴的黑晕，再画白字 + 投影（不用黑带）；{词} 金色；gold: true 金句加大 ---------- */
function subs(fr, t, list, o = {}) {
  for (const s of list) { if (t < s.a - .02 || t > s.b) continue;
    const a = E.out3(seg(t, s.a - .02, s.a + .16)) * (1 - ss(t, s.b - .18, s.b)), size = s.gold ? (o.goldSize || 70) : (o.size || 58), y = s.y || o.y || 948;
    const cs = []; let g = false; for (const c of Array.from(s.zh)) { if (c === '{') g = true; else if (c === '}') g = false; else cs.push({ c, g }); }
    const fullW = fr.measure((s.full || s.zh).replace(/[{}]/g, ''), { font: 'sansh', size, track: size * .05 });   // full：一句分两截出时按整句定左端
    const pop = E.out3(seg(t, s.a, s.a + .16)), str = cs.map(c => c.c).join(''), X0 = W / 2 - fullW / 2;
    const per = j => { const fresh = s.from == null || j >= s.from, q = cs[j].g || s.gold ? { color: PAL.gold, glow: 18 } : {}; if (fresh) { q.dy = 14 * (1 - pop); q.a = pop * a; } return q; };
    fr.chars(str, X0, y, { font: 'sansh', size, track: size * .05, color: '#000', shadow: 1, shadowBlur: 7, shadowY: 0, align: 'l', a: a * .85 }, j => Object.assign(per(j), { color: '#000', glow: 0 }));
    fr.chars(str, X0, y, { font: 'sansh', size, track: size * .05, color: PAL.ink, shadow: 1, shadowBlur: 18, shadowY: 3, align: 'l', a }, per);
  }
}

window.VKCard = { PAL, h1, beat, voice, span, cam, at, face, uvOf, card, rr, goldG, txt, frameFace, divider, pill, stampFace, torn, scrap, wrinkle, note,
  shot, feeTag, webCard, repoCard, deal, islandFace, island, stage, pattern, chapterHead, tag, track, subs };
})();
