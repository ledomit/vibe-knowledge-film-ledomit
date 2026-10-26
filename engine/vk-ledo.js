/* vk-ledo.js — ledo 风格的件（飞行少年v）
 * 来源：references/ledo-reference-breakdown.md。真实图片 + 3D/矢量混排、左下竖线字幕、金色大年份、"真实影像"小窗、
 * 引线标注、复古设备画框、右上角品牌角标和片尾 logo 动画。
 * 用法（film.js）：
 *   const L = VKLedo; L.brandSet();  const photo = L.img('assets/xxx.jpg');   // 载入时调：logo 和图片读完才放行渲染
 *   VK.film({ dur, theme: 'ledo', bloom: .35, draw(fr, t) { L.frame(fr); …; L.brand(fr, t); L.sub(fr, t, SUBS); } });
 * 依赖 vk.js、vk-kit.js；不改它们，B / C 两套外观照旧。 */
(function (G) {
'use strict';
const { W, H, clamp, lerp, seg, ss, E, fade, rng, rgba, mix, BG } = G.VK;

const PAL = { bg: '#121316', ink: '#F2F2F0', sub: '#ECECEA', en: '#9A9A98', gold: '#E9C46A', goldHi: '#F6DE9C', goldLo: '#B8933F',
  teal: '#3E9C96', amber: '#F0A030', line: '#D2D2D0', label: '#9AA0A6', dim: '#5E6266', red: '#D9483B' };
const BRAND = { name: '飞行少年v', handle: '@飞行少年v', logo: 'engine/brand/logo_circle.png' };

/* ---------- 图片：读完才放行渲染 ---------- */
let pending = 0, fontsReady = false;
Object.defineProperty(G, 'READY', { configurable: true, get: () => fontsReady && pending === 0, set: v => { fontsReady = v; } });
function img(src) {
  const h = { im: new Image(), w: 0, h: 0, ok: false, src }; pending++;
  h.im.onload = () => { h.w = h.im.naturalWidth; h.h = h.im.naturalHeight; h.ok = true; pending--; };
  h.im.onerror = () => { console.error('图片读不到：' + src); pending--; };
  h.im.src = src; return h;
}
let LOGO = null;
function brandSet(o) { Object.assign(BRAND, o || {}); LOGO = img(BRAND.logo); }

/* ---------- 底层队列：照片、设备这类实心的东西画在底层，不吃辉光 ---------- */
const UQ = [];
function frame(fr) { UQ.length = 0; fr.look.under = x => UQ.forEach(f => f(x)); }   // 每帧 draw 开头调一次
const under = f => UQ.push(f);

/* ---------- 底：炭灰 + 中央一团很淡的暖光 + 浮尘 + 暗角 ---------- */
BG.ledo = function (x, t, o = {}) {
  x.fillStyle = o.color || PAL.bg; x.fillRect(0, 0, W, H);
  const g = x.createRadialGradient(W * .5, H * .42, 0, W * .5, H * .42, W * .62), c = o.tint || '#2A2621', k = o.pool == null ? 1 : o.pool;
  g.addColorStop(0, rgba(c, .7 * k)); g.addColorStop(.6, rgba(c, .18 * k)); g.addColorStop(1, rgba(c, 0)); x.fillStyle = g; x.fillRect(0, 0, W, H);
  const R = rng(44); x.fillStyle = '#E8E2D6';
  for (let i = 0; i < 60; i++) { const px = (R() * W + t * (6 + R() * 10)) % W, py = (R() * H - t * (3 + R() * 6) + H * 4) % H, a = (.05 + R() * .12) * (o.dust == null ? 1 : o.dust); x.globalAlpha = a; x.beginPath(); x.arc(px, py, .8 + R() * 1.4, 0, 6.2832); x.fill(); }
  x.globalAlpha = 1;
  const v = x.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, W * .72); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, rgba('#000000', .6)); x.fillStyle = v; x.fillRect(0, 0, W, H);
};

/* ---------- 字幕：左下、左对齐、左侧细竖线；金句居中金色加大。整行出 ----------
 * list: [{ a, b, zh, en?, gold? }]；zh 里用 \n 换行；{词} 金色 */
function parse(s) { const out = []; let gold = false; for (const c of Array.from(s)) { if (c === '{') gold = true; else if (c === '}') gold = false; else out.push({ c, gold }); } return out; }
function sub(fr, t, list, o = {}) {
  for (const s of list) {
    if (t < s.a - .02 || t > s.b) continue;
    const k = E.out3(seg(t, s.a - .02, s.a + .18)), out = 1 - ss(t, s.b - .22, s.b), a = k * out;
    if (s.gold) {
      const lines = s.zh.split('\n'), size = s.size || 64, y0 = (s.y || 905) - (lines.length - 1) * size * .62;
      lines.forEach((ln, i) => fr.text(ln, W / 2, y0 + i * size * 1.24, { font: 'sansh', size, track: size * .06, color: PAL.gold, a, glow: 14, glowColor: PAL.goldLo, glowA: .5, shadow: .6 }));
      if (s.en) fr.text(s.en, W / 2, y0 + lines.length * size * 1.24 - size * .35, { font: 'sansr', size: 24, color: PAL.en, a: a * .9 });
      continue;
    }
    const lines = s.zh.split('\n'), size = s.size || o.size || 44, lh = size * 1.32, x0 = o.x || 112, hasEn = !!s.en && o.en !== false;
    const bottom = (o.y || 990) - (hasEn ? 34 : 0), top = bottom - (lines.length - 1) * lh - size * .5;
    fr.line(x0 - 24, top - 4, x0 - 24, bottom + (hasEn ? 34 : 0) + size * .45, { w: 3, color: PAL.gold, a: a * .9, cap: 'butt' });
    lines.forEach((ln, i) => { const cs = parse(ln), str = cs.map(c => c.c).join('');
      fr.chars(str, x0, bottom - (lines.length - 1 - i) * lh, { font: 'sans', size, track: size * .04, color: PAL.sub, align: 'l', shadow: .7, shadowBlur: 10, a }, j => cs[j].gold ? { color: PAL.gold } : { dy: 6 * (1 - k) }); });
    if (hasEn) fr.text(s.en, x0, bottom + 40, { font: 'sansr', size: 22, color: PAL.en, align: 'l', a: a * .9 });
  }
}

/* ---------- 品牌角标：右上角"@飞行少年v" + 圆形头像 ---------- */
function brand(fr, t, o = {}) {
  const a = (o.a == null ? .82 : o.a) * (o.t0 == null ? 1 : ss(t, o.t0, o.t0 + .4)), r = o.r || 30, cx = W - (o.right || 70), cy = o.top || 62;
  if (a <= 0) return;
  fr.text(BRAND.handle, cx - r - 16, cy + 1, { font: 'sansm', size: o.size || 24, track: 1, color: '#C8C8C6', align: 'r', a, shadow: .6 });
  if (LOGO && LOGO.ok) under(x => { x.save(); x.globalAlpha = a; x.beginPath(); x.arc(cx, cy, r, 0, 6.2832); x.closePath(); x.save(); x.clip(); x.drawImage(LOGO.im, cx - r, cy - r, r * 2, r * 2); x.restore();
    x.lineWidth = 2; x.strokeStyle = rgba('#FFFFFF', .55); x.stroke(); x.restore(); });
}
/* 中间斜向淡水印 */
function watermark(fr, o = {}) {
  const x = fr.x; x.save(); x.globalAlpha = o.a || .045; x.translate(W / 2, H / 2); x.rotate(-.5); x.fillStyle = '#FFFFFF'; x.font = `500 ${o.size || 40}px "VK Sans"`; x.textAlign = 'center';
  for (const [dx, dy] of [[-560, -40], [0, 60], [560, 160]]) x.fillText(BRAND.handle, dx, dy); x.restore();
}
/* 片尾 logo 动画：lt = 本地时间。弧光画圆（0–.8）→ 头像浮现（.6–1.2）→ 名字（1.0–1.5） */
function endLogo(fr, lt, o = {}) {
  const cx = o.x || W / 2, cy = o.y || 470, r = o.r || 120, a = o.a == null ? 1 : o.a;
  const k = E.io3(seg(lt, 0, .8)), pts = []; for (let i = 0; i <= 64 * k; i++) { const an = -Math.PI * .75 + i / 64 * 6.2832; pts.push([cx + Math.cos(an) * r * 1.12, cy + Math.sin(an) * r * 1.12]); }
  if (pts.length > 1) { fr.poly(pts, { color: PAL.goldHi, w: 2, a: a * .9, glow: 12 }); if (k < 1) fr.comet(pts[pts.length - 1][0], pts[pts.length - 1][1], 120, 9, PAL.goldHi, a, Math.atan2(pts[pts.length - 1][1] - cy, pts[pts.length - 1][0] - cx) + Math.PI / 2); }
  const la = ss(lt, .6, 1.2) * a;
  if (LOGO && LOGO.ok && la > 0) under(x => { x.save(); x.globalAlpha = la; x.beginPath(); x.arc(cx, cy, r, 0, 6.2832); x.clip(); x.drawImage(LOGO.im, cx - r, cy - r, r * 2, r * 2); x.restore(); });
  fr.glow(cx, cy, r * 1.6, PAL.gold, .12 * la);
  fr.text(BRAND.name, cx, cy + r + 70, { font: 'sansm', size: 44, track: 10, color: PAL.ink, a: ss(lt, 1, 1.5) * a, glow: 10, glowA: .3 });
  if (o.line) fr.text(o.line, cx, cy + r + 124, { font: 'sansr', size: 24, track: 6, color: PAL.label, a: ss(lt, 1.2, 1.7) * a });
}

/* ---------- 真实图片：拍立得 / 胶带 / 夹子 / 无框；带阴影、轻微旋转、可推近 ----------
 * o: { x, y 中心, w 图片宽, rot, style: 'polaroid'|'tape'|'clip'|'clean', a, s 缩放, caption, crop:[sx,sy,sw,sh] } */
function photo(fr, h, o = {}) {
  if (!h || !h.ok) return;
  const a = o.a == null ? 1 : o.a; if (a <= .003) return;
  const s = o.s || 1, w = (o.w || 520) * s, cr = o.crop || [0, 0, h.w, h.h], hh = w * cr[3] / cr[2], st = o.style || 'polaroid';
  const pad = st === 'polaroid' ? w * .045 : st === 'clean' ? 0 : w * .02, padB = st === 'polaroid' ? w * .16 : pad;
  under(x => {
    x.save(); x.globalAlpha = a; x.translate(o.x || W / 2, o.y || H / 2); x.rotate(o.rot || 0);
    const fw = w + pad * 2, fh = hh + pad + padB, fx = -fw / 2, fy = -fh / 2;
    if (st !== 'clean') { x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 28 * s; x.shadowOffsetY = 12 * s; x.fillStyle = st === 'polaroid' ? '#F1EEE6' : '#E9E6DE'; x.fillRect(fx, fy, fw, fh); x.shadowColor = 'transparent'; }
    else { x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 24 * s; x.shadowOffsetY = 10 * s; }
    x.drawImage(h.im, cr[0], cr[1], cr[2], cr[3], fx + pad, fy + pad, w, hh); x.shadowColor = 'transparent';
    if (st === 'tape') { x.fillStyle = 'rgba(232,224,200,.75)'; x.save(); x.translate(0, fy); x.rotate(-.04); x.fillRect(-w * .14, -14 * s, w * .28, 30 * s); x.restore(); }
    if (st === 'clip') { x.fillStyle = '#9EA3A8'; x.fillRect(-16 * s, fy - 26 * s, 32 * s, 40 * s); x.fillStyle = '#6E7378'; x.fillRect(-10 * s, fy - 34 * s, 20 * s, 12 * s); }
    if (st === 'polaroid' && o.caption) { x.fillStyle = '#3A3530'; x.font = `400 ${Math.round(w * .055)}px "VK Serif"`; x.textAlign = 'center'; x.fillText(o.caption, 0, fy + pad + hh + padB * .58); }
    x.restore();
  });
}

/* ---------- "真实影像"小窗：右上角弹出，细框 + 小标；content 是图片句柄或画法函数 (ctx, x, y, w, h, lt) ----------
 * o: { t0, x, y, w, h, label, en, marks:[[u, v, n], …]（窗内 0..1 坐标的编号圈）, src: 小字出处 } */
function footage(fr, t, o, content) {
  const lt = t - o.t0; if (lt < -.05 || (o.t1 != null && t > o.t1 + .3)) return;
  const k = E.out3(seg(lt, 0, .35)) * (o.t1 == null ? 1 : 1 - ss(t, o.t1, o.t1 + .3)), w = o.w || 460, h = o.h || 260, x0 = o.x == null ? W - w - 90 : o.x, y0 = o.y == null ? 120 : o.y, s = lerp(.92, 1, k);
  const cx = x0 + w / 2, cy = y0 + h / 2, X = cx - w * s / 2, Y = cy - h * s / 2, ww = w * s, hh = h * s;
  under(x => { x.save(); x.globalAlpha = k; x.fillStyle = '#050506'; x.fillRect(X, Y, ww, hh); x.beginPath(); x.rect(X, Y, ww, hh); x.clip();
    if (content && content.ok) { const z = 1.04 + .04 * Math.min(1, Math.max(0, lt) / 6); x.drawImage(content.im, cx - ww * z / 2, cy - hh * z / 2, ww * z, hh * z); }
    else if (typeof content === 'function') content(x, X, Y, ww, hh, lt);
    x.restore(); });
  fr.rect(X, Y, ww, hh, { color: PAL.line, w: 1.4, a: .8 * k });
  fr.text((o.en == null ? 'REAL FOOTAGE · ' : o.en ? o.en + ' · ' : '') + (o.label || '真实影像'), X, Y - 16, { font: 'mono', size: 15, track: 3, color: PAL.line, align: 'l', a: .85 * k });
  if (o.src) fr.text(o.src, X, Y + hh + 18, { font: 'mono', size: 12, track: 1, color: PAL.label, align: 'l', a: .7 * k });
  (o.marks || []).forEach(([u, v, n]) => marker(fr, X + u * ww, Y + v * hh, n, { a: k, r: 13 }));
}
/* 编号圈 */
function marker(fr, x, y, n, o = {}) {
  const a = o.a == null ? 1 : o.a, r = o.r || 16; if (a <= 0) return;
  fr.circle(x, y, r, { color: o.color || '#7FE0DA', w: 1.6, a: a * .9, glow: 6 });
  fr.text(String(n), x, y + 1, { font: 'mono', size: r * 1.1, color: '#FFFFFF', a });
}

/* ---------- 金色大年份 + 等宽小字说明 ---------- o: { t0, year, cap, x, y, size, align } */
function year(fr, t, o) {
  const lt = t - o.t0; if (lt < -.05 || (o.t1 != null && t > o.t1 + .3)) return;
  const k = E.out3(seg(lt, 0, .35)) * (o.t1 == null ? 1 : 1 - ss(t, o.t1, o.t1 + .3)), size = o.size || 132, x = o.x || 700, y = o.y || 260, al = o.align || 'l';
  fr.text(String(o.year), x, y + 26 * (1 - k), { font: 'latinm', size, track: size * .04, align: al, a: k, grad: [[0, PAL.goldHi], [1, PAL.goldLo]], glow: 16, glowColor: PAL.gold, glowA: .35 });
  if (o.cap) { const cy = y + size * .58; fr.line(x - (al === 'l' ? 14 : 0), cy - 4, x + 380 * E.out3(seg(lt, .15, .6)), cy - 4, { w: 1, color: PAL.gold, a: .5 * k });
    fr.text(o.cap, x, cy + 22, { font: 'mono', size: 18, track: 4, color: '#C9C2B0', align: al, a: k * ss(lt, .2, .5) }); }
}

/* ---------- 引线标注：一个点 → 一根折线 → 一行字（中文 + 可选英文大写） ---------- o: { t0, x, y, tx, ty, zh, en } */
function callout(fr, t, o) {
  const lt = t - o.t0; if (lt < -.05 || (o.t1 != null && t > o.t1 + .3)) return;
  const k = E.out3(seg(lt, 0, .45)), out = o.t1 == null ? 1 : 1 - ss(t, o.t1, o.t1 + .3), a = out;
  fr.circle(o.x, o.y, 6, { fill: PAL.goldHi, a: a * ss(lt, 0, .1), glow: 10 }); fr.circle(o.x, o.y, 14 + 10 * (1 - k), { color: PAL.goldHi, w: 1.2, a: a * .6 * ss(lt, 0, .15) });
  fr.poly([[o.x, o.y], [o.tx, o.ty], [o.tx + (o.tx >= o.x ? 60 : -60), o.ty]], { color: PAL.line, w: 1.2, a: a * .8, k });
  const al = o.tx >= o.x ? 'l' : 'r', lx = o.tx + (o.tx >= o.x ? 72 : -72);
  fr.text((o.en ? o.en.toUpperCase() + ' · ' : '') + o.zh, lx, o.ty + 1, { font: o.en ? 'mono' : 'sansr', size: o.size || 22, track: o.en ? 3 : 2, color: PAL.ink, align: al, a: a * ss(lt, .3, .55) });
}

/* ---------- 步骤清单：左上角，逐条点亮 ---------- o: { x, y, items, times, t1 } */
function checklist(fr, t, o) {
  if (t < o.times[0] - .3 || (o.t1 != null && t > o.t1 + .3)) return;
  const a = ss(t, o.times[0] - .3, o.times[0]) * (o.t1 == null ? 1 : 1 - ss(t, o.t1, o.t1 + .3)), x = o.x || 110, y = o.y || 150;
  o.items.forEach((it, i) => { const on = t >= o.times[i], cur = on && (i === o.items.length - 1 || t < o.times[i + 1]), k = ss(t, o.times[i], o.times[i] + .2);
    fr.text(`${i + 1}  ${it}`, x, y + i * 34, { font: 'sansr', size: 22, track: 1, align: 'l', color: cur ? PAL.ink : on ? PAL.label : PAL.dim, a: a * (cur ? 1 : on ? .8 : .45) });
    if (cur) fr.line(x - 16, y + i * 34 - 10, x - 16, y + i * 34 + 10, { w: 2.5, color: PAL.gold, a: a * k }); });
}

/* ---------- 复古设备 ---------- */
/* CRT 显示器：返回屏幕矩形 [x, y, w, h]，内容自己往里画（可配合 footage 的画法函数） */
function crt(fr, o = {}) {
  const cx = o.x || W / 2, cy = o.y || 430, s = o.s || 1, w = 560 * s, h = 440 * s, a = o.a == null ? 1 : o.a, sx = cx - w * .38, sy = cy - h * .4, sw = w * .76, sh = h * .6;
  under(x => { x.save(); x.globalAlpha = a; x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 40 * s; x.shadowOffsetY = 18 * s;
    const g = x.createLinearGradient(0, cy - h / 2, 0, cy + h / 2); g.addColorStop(0, '#D9D2C2'); g.addColorStop(1, '#A9A190'); x.fillStyle = g;
    x.beginPath(); x.roundRect(cx - w / 2, cy - h / 2, w, h, 26 * s); x.fill(); x.shadowColor = 'transparent';
    x.fillStyle = '#0A0F0B'; x.beginPath(); x.roundRect(sx, sy, sw, sh, 30 * s); x.fill();
    x.fillStyle = '#8C8475'; for (let i = 0; i < 9; i++) x.fillRect(cx - w * .3 + i * 22 * s, cy + h * .3, 12 * s, 4 * s);
    x.fillStyle = '#3FBF6A'; x.beginPath(); x.arc(cx + w * .36, cy + h * .32, 5 * s, 0, 6.2832); x.fill(); x.restore(); });
  return [sx, sy, sw, sh];
}
/* 秒表：value 0..1 一圈；label 中间的小字 */
function clock(fr, o = {}) {
  const cx = o.x || 1500, cy = o.y || 430, r = o.r || 110, a = o.a == null ? 1 : o.a, v = o.value || 0;
  fr.circle(cx, cy, r, { color: PAL.line, w: 1.6, a: a * .7 });
  for (let i = 0; i < 60; i++) { const an = i / 60 * 6.2832 - Math.PI / 2, l = i % 5 ? 6 : 14; fr.line(cx + Math.cos(an) * (r - l), cy + Math.sin(an) * (r - l), cx + Math.cos(an) * r, cy + Math.sin(an) * r, { w: 1, color: PAL.line, a: a * .5 }); }
  const an = v * 6.2832 - Math.PI / 2; fr.line(cx, cy, cx + Math.cos(an) * r * .82, cy + Math.sin(an) * r * .82, { w: 2, color: PAL.gold, a, glow: 6 }); fr.circle(cx, cy, 4, { fill: PAL.gold, a });
  if (o.label) fr.text(o.label, cx, cy + r * .45, { font: 'mono', size: 22, track: 2, color: PAL.ink, a });
}
/* 胶片条：横向走过画面，frames 是图片句柄数组（可空） */
function filmstrip(fr, t, o = {}) {
  const y = o.y || 540, hgt = o.h || 220, a = o.a == null ? 1 : o.a, sp = o.speed || 260, fw = hgt * 1.35, n = Math.ceil(W / fw) + 2, off = (t * sp) % fw;
  under(x => { x.save(); x.globalAlpha = a; x.fillStyle = '#0B0B0C'; x.fillRect(0, y - hgt / 2 - 34, W, hgt + 68);
    for (let i = -1; i < n; i++) { const fx = i * fw - off; x.fillStyle = '#1C1C1E'; x.fillRect(fx + 8, y - hgt / 2, fw - 16, hgt);
      const f = o.frames && o.frames.length ? o.frames[((i % o.frames.length) + o.frames.length) % o.frames.length] : null; if (f && f.ok) x.drawImage(f.im, fx + 8, y - hgt / 2, fw - 16, hgt);
      x.fillStyle = '#D8D4CA'; for (let j = 0; j < 4; j++) { x.fillRect(fx + 14 + j * fw / 4, y - hgt / 2 - 24, fw / 8, 12); x.fillRect(fx + 14 + j * fw / 4, y + hgt / 2 + 12, fw / 8, 12); } }
    x.restore(); });
}

G.VKLedo = { PAL, BRAND, brandSet, img, frame, under, sub, brand, watermark, endLogo, photo, footage, marker, year, callout, checklist, crt, clock, filmstrip };
})(window);
