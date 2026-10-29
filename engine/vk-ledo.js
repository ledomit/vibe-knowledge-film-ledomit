/* vk-ledo.js — ledo 风格的件（飞行少年v）
 * 来源：references/ledo-reference-breakdown.md。真实图片 + 3D/矢量混排、左下竖线字幕、金色大年份、"真实影像"小窗、
 * 引线标注、复古设备画框、右上角品牌角标和片尾 logo 动画。
 * 用法（film.js）：
 *   const L = VKLedo; L.brandSet();  const photo = L.img('assets/xxx.jpg');   // 载入时调：logo 和图片读完才放行渲染
 *   VK.film({ dur, theme: 'ledo', bloom: .35, draw(fr, t) { L.frame(fr); …; L.brand(fr, t); L.sub(fr, t, SUBS); } });
 * 依赖 vk.js、vk-kit.js；不改它们，B / C 两套外观照旧。 */
(function (G) {
'use strict';
const { W, H, clamp, lerp, seg, ss, E, fade, rng, hash, rgba, mix, BG } = G.VK;

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
    if (content && content.frames) drawInto(x, videoFrame(content, lt), [X, Y, ww, hh], { fit: 'cover' });
    else if (content && content.ok) { const z = 1.04 + .04 * Math.min(1, Math.max(0, lt) / 6); x.drawImage(content.im, cx - ww * z / 2, cy - hh * z / 2, ww * z, hh * z); }
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

/* ---------- 真实视频片段：先用 scripts/extract_frames.py 拆成逐帧图片，再按时间取帧（渲染是逐帧 seek，这样每帧都对得上） ----------
 * const clip = L.video('assets/apollo', 192, 24);   L.videoDraw(fr, clip, lt, [x, y, w, h], { a, fit, round, tint, scan }) */
function video(dir, n, fps) {
  const c = { frames: [], n, fps, ok: true, dir };
  for (let i = 1; i <= n; i++) c.frames.push(img(`${dir}/${String(i).padStart(4, '0')}.jpg`));
  return c;
}
function videoFrame(c, lt) { if (!c || !c.n) return null; const i = clamp(Math.floor(Math.max(0, lt) * c.fps), 0, c.n - 1); return c.frames[i]; }
/* 把一张图或一段视频画进矩形：fit 'cover'（铺满裁切）或 'contain'；round 圆角；scan CRT 扫描线 0..1；tint 叠色 */
function drawInto(x, h, r, o = {}) {
  if (!h || !h.ok) return; const [X, Y, Wd, Hd] = r, ar = h.w / h.h, rr = Wd / Hd;
  let dw = Wd, dh = Hd; if ((o.fit || 'cover') === 'cover' ? ar > rr : ar < rr) dw = Hd * ar; else dh = Wd / ar;
  const z = o.zoom || 1, fx = o.focus ? o.focus[0] : .5, fy = o.focus ? o.focus[1] : .5; dw *= z; dh *= z;
  x.save(); x.globalAlpha *= o.a == null ? 1 : o.a; x.beginPath(); if (o.round) x.roundRect(X, Y, Wd, Hd, o.round); else x.rect(X, Y, Wd, Hd); x.clip();
  if (o.filter) x.filter = o.filter;
  x.drawImage(h.im, X + Wd / 2 - dw * fx - (Wd / 2 - Wd * fx) * 0 , Y + Hd / 2 - dh * fy, dw, dh); x.filter = 'none';
  if (o.tint) { x.globalCompositeOperation = 'multiply'; x.fillStyle = o.tint; x.fillRect(X, Y, Wd, Hd); x.globalCompositeOperation = 'source-over'; }
  if (o.scan) { x.fillStyle = `rgba(0,0,0,${.28 * o.scan})`; for (let yy = Y; yy < Y + Hd; yy += 4) x.fillRect(X, yy, Wd, 2); }
  if (o.vignette) { const g = x.createRadialGradient(X + Wd / 2, Y + Hd / 2, Math.min(Wd, Hd) * .3, X + Wd / 2, Y + Hd / 2, Math.max(Wd, Hd) * .7); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${o.vignette})`); x.fillStyle = g; x.fillRect(X, Y, Wd, Hd); }
  x.restore();
}
function videoDraw(fr, c, lt, r, o = {}) { const h = videoFrame(c, lt); under(x => drawInto(x, h, r, o)); }
function imageDraw(fr, h, r, o = {}) { under(x => drawInto(x, h, r, o)); }

/* ---------- 推进转场 ----------
 * pushThrough：把一张图 / 一帧视频从 rect 推近到焦点 focus（图内 0..1），k 0→1；焦点同时移到画面中央，缩放在对数空间走。
 * 常和 whiteFlash 连用：推到底 → 白场 → 下一个画面。 */
function lerpRect(a, b, k) { return a.map((v, i) => lerp(v, b[i], k)); }
function pushThrough(fr, h, r, k, o = {}) {
  if (!h || !h.ok) return; const zoom = Math.exp(lerp(0, Math.log(o.zoom || 9), E.in3(clamp(k)))), f = o.focus || [.5, .5];
  const [X, Y, Wd, Hd] = r, cx = lerp(X + Wd * f[0], W / 2, E.io3(clamp(k))), cy = lerp(Y + Hd * f[1], H / 2, E.io3(clamp(k)));
  const nw = Wd * zoom, nh = Hd * zoom, nr = [cx - nw * f[0], cy - nh * f[1], nw, nh];
  under(x => { x.save(); x.globalAlpha = o.a == null ? 1 : o.a; x.drawImage(h.im, nr[0], nr[1], nr[2], nr[3]); x.restore(); });
  if (o.blur && k > .5) fr.look.bloom = Math.max(fr.look.bloom, .35 + .8 * (k - .5));
  return nr;
}
/* 白场：t0 最亮，rise 前推、fall 后落 */
function whiteFlash(fr, t, t0, o = {}) { G.VKit.flash(fr, t, t0, { color: '#FFFFFF', edge: '#FFFFFF', peak: o.peak || 1, rise: o.rise == null ? .25 : o.rise, fall: o.fall == null ? .55 : o.fall }); }
/* 从一个矩形长到另一个矩形（小窗 → 全屏、CRT 屏 → 全屏） */
function grow(fr, h, from, to, k, o = {}) { const r = lerpRect(from, to, E.io3(clamp(k))); under(x => drawInto(x, h, r, Object.assign({}, o, { round: o.round == null ? lerp(18, 0, clamp(k)) : o.round }))); return r; }


/* ======================= 2026-10-29 加的件：照参考片（VibeSCI《HS-AFM》188 s）补齐 ledo 的"3D + 实物 + 证据"语言 ======================= */

/* ---------- 3D：一台透视相机 ----------
 * const cam = L.cam3({ at: [960, 540], yaw, pitch, dist: 1600, focal: 1500 });  cam.proj([x, y, z]) → [sx, sy, 缩放, 深度]
 * 世界坐标：x 向右、y 向上、z 朝向观众。yaw 绕竖轴转、pitch 绕横轴转（镜头"转一个角度"就是让 yaw / pitch 随时间走） */
function cam3(o = {}) {
  const at = o.at || [W / 2, H / 2], yaw = o.yaw || 0, pitch = o.pitch || 0, dist = o.dist || 1600, focal = o.focal || 1500;
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  return { at, proj(p) {
    const x1 = p[0] * cy + p[2] * sy, z1 = -p[0] * sy + p[2] * cy, y2 = p[1] * cp - z1 * sp, z2 = p[1] * sp + z1 * cp, f = focal / Math.max(60, dist - z2);
    return [at[0] + x1 * f, at[1] - y2 * f, f, z2];
  } };
}

/* ---------- 3D：一团"粉彩蛋白"（参考片的蛋白质：一串有体积的小球，淡蓝 / 淡黄，顶光，远处雾化） ----------
 * L.molecule(seed, n, o) 生成小球表：沿一条随机游走排开；o: { r: 球半径, step: 步长, spread: 横向抖动, cols: 颜色组 }
 * L.blobs3(fr, cam, balls, o) 按远近排序画（实心，走底层不吃辉光）；o: { a, fog: 远处往底色淡多少, fogColor, light: [lx, ly] } */
function molecule(seed, n, o = {}) {
  const R = rng(seed), r = o.r || 26, step = o.step || r * .55, sp = o.spread || r * 1.5, cols = o.cols || ['#A9C4F0', '#F1DE9C'], out = [];
  let p = [0, 0, 0], d = [1, 0, 0];
  for (let i = 0; i < n; i++) {
    d = [d[0] + (R() - .5) * .9, d[1] + (R() - .5) * .9, d[2] + (R() - .5) * .9]; const m = Math.hypot(...d) || 1; d = d.map(v => v / m);
    p = [p[0] + d[0] * step, p[1] + d[1] * step, p[2] + d[2] * step];
    out.push({ p: [p[0] + (R() - .5) * sp, p[1] + (R() - .5) * sp, p[2] + (R() - .5) * sp], r: r * (.75 + R() * .5), col: cols[Math.floor(i / Math.max(1, n / cols.length)) % cols.length] });
  }
  return out;
}
function blobs3(fr, cam, balls, o = {}) {
  const a = o.a == null ? 1 : o.a; if (a <= 0) return;
  const off = o.at || [0, 0, 0], fog = o.fog == null ? .45 : o.fog, fogC = o.fogColor || '#1E3A3A', lx = (o.light || [-.45, -.55])[0], ly = (o.light || [-.45, -.55])[1];
  const pr = balls.map(b => { const q = cam.proj([b.p[0] + off[0], b.p[1] + off[1], b.p[2] + off[2]]); return { x: q[0], y: q[1], r: b.r * q[2], z: q[3], col: b.col }; }).sort((u, v) => u.z - v.z);
  const zs = pr.map(p => p.z), z0 = Math.min(...zs), z1 = Math.max(...zs) + 1e-6;
  under(x => { x.save(); x.globalAlpha = a;
    pr.forEach(p => { if (p.r < .5) return; const fg = fog * (1 - (p.z - z0) / (z1 - z0)), c = mix(p.col, fogC, fg);
      const g = x.createRadialGradient(p.x + lx * p.r * .6, p.y + ly * p.r * .6, p.r * .05, p.x, p.y, p.r);
      g.addColorStop(0, mix(c, '#FFFFFF', .55)); g.addColorStop(.55, c); g.addColorStop(1, mix(c, '#000000', .45));
      x.fillStyle = g; x.beginPath(); x.arc(p.x, p.y, p.r, 0, 6.2832); x.fill(); });
    x.restore(); });
}

/* ---------- 3D：把一张图贴在一块斜放的平面上（课本躺在桌上、论文页斜着、屏幕里的论文） ----------
 * L.plane3(fr, cam, img, { c: 中心 [x,y,z], w, h, rx: 绕横轴倾斜（躺下 ≈ -1.2）, ry: 绕竖轴, a, shadow, cols, rows })
 * 切成 cols×rows 的三角网格，每块精确仿射，近似透视（默认 10×10）；img 可以是图片句柄或 L.paper() 生成的画布 */
function plane3(fr, cam, h, o = {}) {
  const im = h && (h.im || h); if (!im || (h.ok === false)) return;
  const iw = h.w || im.width, ih = h.h || im.height, c = o.c || [0, 0, 0], w = o.w || 600, hh = o.h || w * ih / iw, rx = o.rx || 0, ry = o.ry || 0, N = o.cols || 10, a = o.a == null ? 1 : o.a;
  const P = (u, v) => { let x = (u - .5) * w, y = (.5 - v) * hh, z = 0;
    const y1 = y * Math.cos(rx) - z * Math.sin(rx), z1 = y * Math.sin(rx) + z * Math.cos(rx); y = y1; z = z1;
    const x2 = x * Math.cos(ry) + z * Math.sin(ry), z2 = -x * Math.sin(ry) + z * Math.cos(ry);
    return cam.proj([c[0] + x2, c[1] + y, c[2] + z2]); };
  under(x => { x.save(); x.globalAlpha = a;
    if (o.shadow !== false) { const q = [P(0, 0), P(1, 0), P(1, 1), P(0, 1)]; x.save(); x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 46; x.shadowOffsetY = 22; x.fillStyle = '#1A1410';
      x.beginPath(); q.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); x.fill(); x.restore(); }
    const M = o.rows || 10, G2 = [];                                  // 网格 N×M，每格两块三角形，各自精确仿射（透视不会裂缝）
    for (let j = 0; j <= M; j++) { G2.push([]); for (let i = 0; i <= N; i++) G2[j].push(P(i / N, j / M)); }
    const tri = (s0, s1, s2, d0, d1, d2) => {
      const den = (s1[0] - s0[0]) * (s2[1] - s0[1]) - (s2[0] - s0[0]) * (s1[1] - s0[1]); if (!den) return;
      const A = ((d1[0] - d0[0]) * (s2[1] - s0[1]) - (d2[0] - d0[0]) * (s1[1] - s0[1])) / den, B = ((d1[1] - d0[1]) * (s2[1] - s0[1]) - (d2[1] - d0[1]) * (s1[1] - s0[1])) / den;
      const C = ((d2[0] - d0[0]) * (s1[0] - s0[0]) - (d1[0] - d0[0]) * (s2[0] - s0[0])) / den, D = ((d2[1] - d0[1]) * (s1[0] - s0[0]) - (d1[1] - d0[1]) * (s2[0] - s0[0])) / den;
      const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3, ex = q => [q[0] + Math.sign(q[0] - cx) * 1.2, q[1] + Math.sign(q[1] - cy) * 1.2];
      const e0 = ex(d0), e1 = ex(d1), e2 = ex(d2), bx = Math.max(0, Math.min(s0[0], s1[0], s2[0]) - 2), by = Math.max(0, Math.min(s0[1], s1[1], s2[1]) - 2), bw = Math.min(iw, Math.max(s0[0], s1[0], s2[0]) + 2) - bx, bh = Math.min(ih, Math.max(s0[1], s1[1], s2[1]) + 2) - by;
      x.save(); x.beginPath(); x.moveTo(e0[0], e0[1]); x.lineTo(e1[0], e1[1]); x.lineTo(e2[0], e2[1]); x.closePath(); x.clip();
      x.setTransform(A, B, C, D, d0[0] - A * s0[0] - C * s0[1], d0[1] - B * s0[0] - D * s0[1]); x.drawImage(im, bx, by, bw, bh, bx, by, bw, bh); x.restore(); };
    for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) {
      const s00 = [i / N * iw, j / M * ih], s10 = [(i + 1) / N * iw, j / M * ih], s01 = [i / N * iw, (j + 1) / M * ih], s11 = [(i + 1) / N * iw, (j + 1) / M * ih];
      tri(s00, s10, s01, G2[j][i], G2[j][i + 1], G2[j + 1][i]); tri(s11, s01, s10, G2[j + 1][i + 1], G2[j + 1][i], G2[j][i + 1]); }
    x.restore(); });
}

/* ---------- 论文页 / 课本页：生成一张"纸"（离屏画布，带缓存），可以平放（L.imageDraw / L.photo 的 clean 样式）或斜放（L.plane3） ----------
 * L.paper({ key, journal: 'Nature 468, 72 (2010)', title, authors, body: 行数, fig: 图片句柄, figCap, w: 900, tone: 'paper'|'book', mark: [行号…] })
 * 返回 { im, w, h, ok, lines: { title: [x,y,w,h], authors: [...], 'body3': [...] } }——行的位置给 L.highlight 用 */
const PAPERS = {};
function paper(o = {}) {
  const key = o.key || JSON.stringify([o.journal, o.title, o.authors, o.body, o.w, o.tone]); if (PAPERS[key] && (!o.fig || PAPERS[key].figOk)) return PAPERS[key];
  const w = o.w || 900, h = Math.round(w * 1.3), c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'), R = rng(w + (o.body || 0));
  const book = o.tone === 'book', ink = book ? '#3A3226' : '#1E1E1E', lines = {};
  x.fillStyle = book ? '#ECE3CC' : '#F3F1EA'; x.fillRect(0, 0, w, h);
  const vg = x.createRadialGradient(w / 2, h / 2, w * .3, w / 2, h / 2, w * .85); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(60,45,20,.18)'); x.fillStyle = vg; x.fillRect(0, 0, w, h);
  const m = w * .08; let y = m;
  if (o.journal) { x.fillStyle = '#6A6A6A'; x.font = `500 ${w * .022}px "VK Mono"`; x.fillText(o.journal, m, y); y += w * .06; }
  if (o.title) { x.fillStyle = ink; const fs = w * .05; x.font = `${book ? '700' : 'italic 600'} ${fs}px ${book ? '"VK Serif"' : '"VK Latin"'}`;
    const latin = / /.test(o.title), words = latin ? o.title.split(' ').map((v, i) => (i ? ' ' : '') + v) : Array.from(o.title), maxW = w - 2 * m; let ln = '', ty = y + fs; const tls = [];
    for (const ch of words) { if (x.measureText(ln + ch).width > maxW && ln) { x.fillText(ln, m, ty); tls.push([m, ty - fs * .9, x.measureText(ln).width, fs * 1.1]); ln = ch.trimStart(); ty += fs * 1.25; } else ln += ch; }
    if (ln) { x.fillText(ln, m, ty); tls.push([m, ty - fs * .9, x.measureText(ln).width, fs * 1.1]); }
    lines.title = [m, tls[0][1], Math.max(...tls.map(l => l[2])), ty - tls[0][1] + fs * .25]; lines.titleLines = tls; y = ty + fs * .8; }
  if (o.authors) { const fs = w * .024; x.fillStyle = '#2E4E8A'; x.font = `500 ${fs}px "VK Sans"`; x.fillText(o.authors, m, y); lines.authors = [m, y - fs * .9, x.measureText(o.authors).width, fs * 1.2]; y += fs * 2.2; }
  if (o.fig && o.fig.ok) { const fw = w - 2 * m, fh = fw * o.fig.h / o.fig.w * .8; x.drawImage(o.fig.im, m, y, fw, fh); lines.fig = [m, y, fw, fh]; y += fh + w * .02;
    if (o.figCap) { x.fillStyle = '#444'; x.font = `italic 500 ${w * .022}px "VK Latin"`; x.fillText(o.figCap, m, y + w * .02); y += w * .05; } }
  const nb = o.body == null ? 14 : o.body, lh = w * .03;
  for (let i = 0; i < nb && y < h - m; i++, y += lh) { const lw = (w - 2 * m) * (i % 7 === 6 ? .55 + R() * .2 : .92 + R() * .08);
    x.fillStyle = 'rgba(40,40,40,.55)'; for (let s = 0; s < lw; s += 8 + R() * 30) { const ww = 6 + R() * 26; x.fillRect(m + s, y, Math.min(ww, lw - s), lh * .32); } lines['body' + i] = [m, y - lh * .2, lw, lh * .7]; }
  const res = { im: c, w, h, ok: true, lines, figOk: !o.fig || o.fig.ok }; PAPERS[key] = res; return res;
}

/* ---------- 荧光笔：一道黄色的笔迹从左到右涂过一行（论文标题、作者、课本里的一句话） ----------
 * L.highlight(fr, [x, y, w, h], k, { color, a, under: true 画在底层（压在纸上，字在上面）}) */
function highlight(fr, r, k, o = {}) {
  if (k <= 0) return; const [X, Y, Wd, Hd] = r, col = o.color || '#F6D35B', a = (o.a == null ? .55 : o.a);
  const draw = x => { x.save(); x.globalAlpha = a; x.globalCompositeOperation = o.mode || 'multiply'; x.fillStyle = col; x.beginPath();
    const ww = Wd * clamp(k); x.moveTo(X - 6, Y + Hd * .1); x.lineTo(X + ww, Y); x.lineTo(X + ww + 4, Y + Hd); x.lineTo(X - 4, Y + Hd * .95); x.closePath(); x.fill(); x.restore(); };
  if (o.under === false) draw(fr.x); else under(draw);
}

/* ---------- 红色橡皮章：参考片里的"STATIC"（只拍到静止的照片）、限制和否定都用它 ----------
 * L.stamp(fr, t, t0, '静止 · STATIC', x, y, { size, rot, out: 消失时刻, a })——从 2.4 倍砸下，带缺墨斑点 */
function stamp(fr, t, t0, txt, x, y, o = {}) {
  if (t < t0 - .01) return;
  const k = E.out3(seg(t, t0, t0 + .1)), a = k * (o.out == null ? 1 : 1 - ss(t, o.out - .2, o.out)) * (o.a == null ? 1 : o.a); if (a <= 0) return;
  const size = o.size || 64, font = o.font || 'sansh', col = o.color || PAL.red, tw = fr.measure(txt, { font, size, track: size * .08 }), w = tw + size * .7, h = size * 1.32;
  fr.g({ at: [x, y], rot: o.rot == null ? -.15 : o.rot, s: lerp(2.4, 1, k) }, () => {
    fr.rect(-w / 2, -h / 2, w, h, { r: 10, color: col, w: size * .07, a: a * .95 });
    fr.rect(-w / 2 + size * .11, -h / 2 + size * .11, w - size * .22, h - size * .22, { r: 6, color: col, w: size * .025, a: a * .9 });
    fr.text(txt, 0, size * .04, { font, size, track: size * .08, color: col, a });
    for (let i = 0; i < 60; i++) fr.circle((hash(i * 3.1 + size) - .5) * w, (hash(i * 5.7 + size) - .5) * h, 1.2 + hash(i * 9.3) * size * .035, { fill: '#121316', a: a * .7 });
  });
  fr.sfx(t0, 'stamp', { gain: .8 });
}

/* ---------- 对照窗：左右两个画面同框（真实影像 vs 模型、以前 vs 现在、荧光 vs AFM），各带一个等宽小标，可选同步计时 ----------
 * L.compare(fr, t, { t0, t1, y, h, gap, labels: ['FLUORESCENCE · 荧光', 'HS-AFM · 高速原子力'], time: 秒数或 null, src: ['出处', '出处'] }, left, right)
 * left / right：图片句柄、L.video 片段（按 t - t0 取帧）或画法函数 (ctx, x, y, w, h, lt) */
function compare(fr, t, o, left, right) {
  const lt = t - o.t0; if (lt < -.05 || (o.t1 != null && t > o.t1 + .3)) return;
  const k = E.out3(seg(lt, 0, .4)) * (o.t1 == null ? 1 : 1 - ss(t, o.t1, o.t1 + .3)), gap = o.gap || 36, h = o.h || 470, w = o.w || (W - 2 * 130 - gap) / 2, y = o.y == null ? 150 : o.y, x0 = (W - 2 * w - gap) / 2;
  [[left, 0], [right, 1]].forEach(([c, i]) => { const X = x0 + i * (w + gap) + (1 - k) * (i ? 60 : -60), r = [X, y, w, h];
    under(xx => { xx.save(); xx.globalAlpha = k; xx.fillStyle = '#050506'; xx.fillRect(...r);
      if (c && c.frames) drawInto(xx, videoFrame(c, lt), r, { fit: 'cover' }); else if (c && c.ok) drawInto(xx, c, r, { fit: 'cover' }); else if (typeof c === 'function') { xx.beginPath(); xx.rect(...r); xx.clip(); c(xx, ...r, lt); }
      xx.restore(); });
    fr.rect(...r, { color: PAL.line, w: 1.2, a: .7 * k });
    if (o.labels) fr.text(o.labels[i], X, y - 18, { font: 'mono', size: 16, track: 3, color: PAL.line, align: 'l', a: .9 * k });
    if (o.src && o.src[i]) fr.text(o.src[i], X, y + h + 20, { font: 'mono', size: 12, track: 1, color: PAL.label, align: 'l', a: .75 * k });
    if (o.time != null) fr.text(`${o.time.toFixed(2)} s`, X + w - 14, y + h - 22, { font: 'mono', size: 22, color: '#FFFFFF', align: 'r', a: k, shadow: .7 });
  });
}

/* ---------- 人物卡：证件照 + 底下一条白色名牌（名字 + 身份），可成排排开（参考片里的科学家墙、颁奖照） ----------
 * L.portrait(fr, img, { x, y, w, name, role, rot, a, s }) */
function portrait(fr, h, o = {}) {
  if (!h || !h.ok) return; const a = o.a == null ? 1 : o.a; if (a <= .003) return;
  const s = o.s || 1, w = (o.w || 220) * s, ih = w * 1.25, tag = o.name ? w * .26 : 0, X = (o.x || W / 2), Y = (o.y || H / 2);
  under(x => { x.save(); x.globalAlpha = a; x.translate(X, Y); x.rotate(o.rot || 0);
    x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 24 * s; x.shadowOffsetY = 10 * s; x.fillStyle = '#E8E6E0'; x.fillRect(-w / 2 - 6 * s, -ih / 2 - 6 * s, w + 12 * s, ih + tag + 12 * s); x.shadowColor = 'transparent';
    const ar = h.w / h.h, rr = w / ih; let sw = h.w, sh = h.h, sx = 0, sy = 0; if (ar > rr) { sw = h.h * rr; sx = (h.w - sw) / 2; } else { sh = h.w / rr; sy = (h.h - sh) * .25; }
    x.drawImage(h.im, sx, sy, sw, sh, -w / 2, -ih / 2, w, ih);
    if (tag) { x.fillStyle = '#FFFFFF'; x.fillRect(-w / 2, ih / 2, w, tag); x.fillStyle = '#1C1C1C'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = `700 ${Math.round(tag * .36)}px "VK Sans"`; x.fillText(o.name, 0, ih / 2 + tag * (o.role ? .36 : .5));
      if (o.role) { x.fillStyle = '#6A6A6A'; x.font = `500 ${Math.round(tag * .24)}px "VK Sans"`; x.fillText(o.role, 0, ih / 2 + tag * .74); } }
    x.restore(); });
}

/* ---------- 出处行：画面左上角一行等宽小字（"Nature 468, 72 (2010) · Fig. 1 · Supplementary Movie"），每一张真实图都配一行 ---------- */
function citation(fr, txt, o = {}) { fr.text(txt, o.x == null ? 110 : o.x, o.y == null ? 96 : o.y, { font: 'mono', size: o.size || 15, track: 2, color: PAL.label, align: o.align || 'l', a: (o.a == null ? 1 : o.a) * .85 }); }

/* ---------- 比例尺：一根短线 + 两头竖线 + 等宽标注（"10 nm"） ---------- */
function scaleBar(fr, x, y, len, label, o = {}) { const a = o.a == null ? 1 : o.a, c = o.color || PAL.line;
  fr.line(x, y, x + len, y, { color: c, w: 2, a }); fr.line(x, y - 7, x, y + 7, { color: c, w: 2, a }); fr.line(x + len, y - 7, x + len, y + 7, { color: c, w: 2, a });
  fr.text(label, x + len / 2, y + 22, { font: 'mono', size: 15, track: 2, color: c, a }); }

/* 在论文页上涂荧光笔（贴到 3D 平面上之前用）：L.paperMark(L.paper({...}), [[rect, k], …]) → 一张临时画布（每帧重画，共用一块） */
let MARKC = null;
function paperMark(pp, marks) {
  if (!MARKC) MARKC = document.createElement('canvas'); MARKC.width = pp.w; MARKC.height = pp.h; const x = MARKC.getContext('2d');
  x.drawImage(pp.im, 0, 0); (marks || []).forEach(([r, k]) => { if (k <= 0) return; const [X, Y, Wd, Hd] = r; x.save(); x.globalCompositeOperation = 'multiply'; x.globalAlpha = .6; x.fillStyle = '#F6D35B';
    x.beginPath(); const ww = Wd * clamp(k); x.moveTo(X - 6, Y + Hd * .1); x.lineTo(X + ww, Y); x.lineTo(X + ww + 4, Y + Hd); x.lineTo(X - 4, Y + Hd * .95); x.closePath(); x.fill(); x.restore(); });
  return { im: MARKC, w: pp.w, h: pp.h, ok: true };
}

G.VKLedo = { PAL, BRAND, brandSet, img, frame, under, sub, brand, watermark, endLogo, photo, footage, marker, year, callout, checklist, crt, clock, filmstrip,
  video, videoFrame, videoDraw, imageDraw, drawInto, pushThrough, whiteFlash, grow, lerpRect,
  cam3, molecule, blobs3, plane3, paper, paperMark, highlight, stamp, compare, portrait, citation, scaleBar };
})(window);
