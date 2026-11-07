/* keben 示例：《翻书·丁香结》v11（19.76 s，统编版语文六上第 2 课）。规格和做法见 references/keben.md。
 * 不带课本页面（版权）：先跑 scripts/keben_pages.py <课本.pdf> 本目录 --to 11 --hi 10,11，再跑 tools/make_lilac.py 出插图遮罩。
 * 能整块搬走的：书（sheet / quad / VS FS）、相机（camera）、荧光笔（hlChar + band）、小花着色器（FVS FFS）。
 * 要为每一课重写的：TREES / PANS / LEAFS / PAL_*、落点、HL 的行坐标、LEAVES 的页名。画面节点都读 vo_timing.js 的 window.VO.marks。 */
/* ★ 翻书 → 《丁香结》→ 一枝真的丁香从书页上那幅画里长出来 → 推近右页 → 荧光笔划出最后两句（17.6 s，配 bgm_zijie + 女声旁白，无字幕）
 * 书是真的：每一页都是 PDF（统编版语文六上 2019 版）原页渲染的贴图（assets/pages/pNN.jpg；p10、p11 另有高清 _hi 版给推近用）。
 * 配对和真书一致：p1 封面；[p2|p3] [p4|p5 目录跨页] [p6|p7] [p8|p9] → 停在 [p10|p11]。
 * 全部用 WebGL 画在 look.under（不进辉光）；只有光点画在内容层（带辉光）。
 * 长花（照真丁香的样子，也照画的构图：右上方的枝、往左下垂的几串、左边一串粉色花苞）：
 *   纸上画里的枝条处亮起一个光点、荡开一圈涟漪 → 枝条破纸长出来、分叉 → 叶子成对展开 →
 *   四串圆锥形花序沿着花轴从下往上冒出花苞 → 花苞从下往上一朵朵开成四瓣小花（顶端留着粉色花苞）。
 *   颜色取自画（tools/make_lilac.py 的点表只用来取色），纸上的画同时淡一点，让立体的那枝成为主角。
 * 荧光笔：在 p11 的贴图坐标里画（跟着纸的透视），三行逐行扫过。 */
(function () {
'use strict';
const { W, H, clamp, lerp, seg, ss, E, rng } = VK;
/* 卡点：bgm_zijie.mp3 111.4 BPM，一拍 BP，第一个下拍 D0；DB(k) 第 k 小节下拍，SN(k) 同小节第 3 拍的重军鼓（最重的一记 SN(3) = 7.906）。8.98 起第二个四小节乐句 */
const BP = .53874, D0 = .3638, BAR = 4 * BP, BEAT = b => D0 + b * BP, DB = k => D0 + k * BAR, SN = k => DB(k) + BAR / 2;
const DUR = BEAT(36);                                                       // 19.76 s（第 9 小节下拍）；bgm 从第二句说完渐弱到这里
const MK = (window.VO && window.VO.marks) || { pan: 5.304, burst: DB(4), wind: SN(4), s2: 11.408, end: 18.65 };   // tools/vo_place.py 排好旁白后给的画面节点
const PW = 521.575 / 737.008, T = 0.027, EPS = 0.0009;
const NU = 48, NV = 16;
const zl = i => 0.0012 * (i + 1);
const thEnd = i => Math.PI + Math.asin((T - zl(i)) / PW);
const LEAVES = [['p01', 'p02', 0, BEAT(0), .04], ['p03', 'p04', .12, BEAT(.5), .42], ['p05', 'p06', .34, BEAT(1), .42], ['p07', 'p08', .56, BEAT(1.5), .42], ['p09', 'p10_hi', .78, BEAT(2), .45]];   // 每张纸落在一个八分音符上，1.44 停在《丁香结》
const LAND = BEAT(2);
const leafP = (i, t) => { const L = LEAVES[i], k = seg(t, L[2], L[3]); return i === 4 ? 1 - Math.pow(1 - E.io3(k), 1.4) * (k < 1 ? 1 : 0) : E.io3(k); };
/* 长花的时刻：TG 光点 + 涟漪，枝条 [ST0, ST1]，各串花序见 PANS */
/* 画面跟着旁白（tools/vo_place.py 把关键几截钉在鼓点上）：
 * 0.36 "每个人一辈子"——翻书 · 1.98 "都有许多不顺心的事"——破纸长枝、叶子展开 · 3.60 重军鼓——花序一串串冒出（"一件完了一件又来"）
 * 6.83 下拍"丁香结年年都有"——上半截一起开 · 7.91 最重的军鼓——起风、落花，镜头顺着落花推向正文 · 8.98 第二乐句下拍"结，"——荧光笔开始划 */
const TG = BEAT(3), ST0 = BEAT(3), ST1 = BEAT(4);
const T_BURST = MK.burst;                                                  // 8.98 第二乐句下拍，念到"丁香结"，上半截一起开
/* 荧光笔：三行（p11 贴图坐标，tools 里量的：1133×1601 原图的像素 / 尺寸）[u0, u1, v0, v1, 开始, 结束] */
const HL = [[674 / 1133, 987 / 1133, 1079 / 1601, 1117 / 1601], [96 / 1133, 814 / 1133, 1132 / 1601, 1170 / 1601]];   // 只划"结，是解不完的；人生 / 中的问题……无味了吗？"
/* 荧光笔跟着第二句念到哪划到哪：vo_timing.js（tools/vo_place.py）给每小截的起止；第 k 截对应下面第 k 段字（共 34 个字符，前 10 个在上一行） */
const HL_RANGES = [[0, 2], [2, 8], [8, 14], [14, 21], [21, 24], [24, 34]];
function hlChar(t) {
  const V = window.VO || {}, RG = V.hl || HL_RANGES, cs = (V.s2 && V.s2.length === RG.length) ? V.s2 : RG.map((_, k) => [9 + k * 1.3, 9 + k * 1.3 + 1.1]);   // vo_timing.js 带了每截对应哪几个字（hl），换声音时跟着变
  let c = 0; cs.forEach(([a, b], k) => { const [r0, r1] = RG[k]; if (t >= a) c = Math.max(c, r0 + (r1 - r0) * clamp((t - a) / (b - a))); }); return c;
}

/* ---------- 矩阵 ---------- */
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm3 = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
function persp(fy, asp, n, f) { const q = 1 / Math.tan(fy / 2); return [q / asp, 0, 0, 0, 0, q, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]; }
function lookAt(e, c, u) { const z = norm3(sub3(e, c)), x = norm3(cross3(u, z)), y = cross3(z, x); return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot3(x, e), -dot3(y, e), -dot3(z, e), 1]; }
function mul(a, b) { const r = new Array(16); for (let c = 0; c < 4; c++) for (let w = 0; w < 4; w++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + w] * b[c * 4 + k]; r[c * 4 + w] = s; } return r; }

/* ---------- 相机：关键帧之间缓动 [时刻, 目标 x, y, z, 俯角°, 偏航°, 距离] ---------- */
const CAM = [[0, PW / 2, -.02, T, 44, -16, 2.6], [1.6, 0, 0, T, 23, 0, 2.12], null, null, [MK.s2 + .35, .345, -.19, T, 17, 2, .8], [DUR, .345, -.18, T, 15, 0, .64]];   // [2][3] 由树定：开花时停住，起风后才推
let VP = null, CAMNOW = null;
function CAMX([tx, ty, tz, tl, yw, d]) { const tilt = tl * Math.PI / 180, yaw = yw * Math.PI / 180, tg = [tx, ty, tz];
  const e = [tg[0] + d * Math.sin(tilt) * Math.sin(yaw), tg[1] - d * Math.sin(tilt) * Math.cos(yaw), tg[2] + d * Math.cos(tilt)];
  VP = mul(persp(30 * Math.PI / 180, W / H, .005, 10), lookAt(e, tg, [0, 0, 1])); CAMNOW = { tg, d, eye: e }; }
function camera(t) {
  if (window.MACRO) { CAMX(window.MACRO); return; }                               // 特写看花瓣（tree.js 里设）
  let i = 0; while (i < CAM.length - 2 && t > CAM[i + 1][0]) i++;
  const a = CAM[i], b = CAM[i + 1], k0 = seg(t, a[0], b[0]), k = i === 0 ? E.out3(k0) : i === CAM.length - 2 ? E.out2(k0) : E.io3(k0);
  const c = [1, 2, 3, 4, 5, 6].map(j => lerp(a[j], b[j], k));
  if (i === 0) c[0] = lerp(PW / 2, 0, E.io3(seg(t, 0, .8)));
  const tilt = c[3] * Math.PI / 180, yaw = c[4] * Math.PI / 180, d = c[5], tg = [c[0], c[1], c[2]];
  const e = [tg[0] + d * Math.sin(tilt) * Math.sin(yaw), tg[1] - d * Math.sin(tilt) * Math.cos(yaw), tg[2] + d * Math.cos(tilt)];
  VP = mul(persp(30 * Math.PI / 180, W / H, .03, 10), lookAt(e, tg, [0, 0, 1])); CAMNOW = { tg, d, eye: e };
}

/* ---------- 资源 ---------- */
const NAMES = ['p01', 'p02', 'p03', 'p04', 'p05', 'p06', 'p07', 'p08', 'p09', 'p10_hi', 'p11_hi'];
const IM = {}; let GLR = null, PTS = null, fontsReady = false;
Object.defineProperty(window, 'READY', { configurable: true, get: () => fontsReady && !!GLR, set: v => { fontsReady = v; } });
const loadIm = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.src = src; });
Promise.all([...NAMES.map(n => loadIm('assets/pages/' + n + '.jpg').then(im => { IM[n] = im; })), loadIm('assets/lilac_mask.png').then(im => { IM.mask = im; })]).then(() => { GLR = initGL(); });

/* ---------- 着色器 ---------- */
const LIGHT = `
uniform vec4 uSpot;
float lightAt(vec3 n, vec3 p){ vec3 L=normalize(vec3(-.45,-.35,1.)); float l=.58+.47*max(dot(n,L),0.);
  vec2 d=(p.xy-uSpot.xy)/uSpot.z; return l*mix(uSpot.w,1.,exp(-dot(d,d))); }`;
const VS = `attribute vec3 aP; attribute vec3 aN; attribute vec2 aT; uniform mat4 uVP; varying vec3 vN; varying vec2 vT; varying vec3 vP;
void main(){ vN=aN; vT=aT; vP=aP; gl_Position=uVP*vec4(aP,1.); }`;
const FS = `precision highp float; uniform sampler2D uF; uniform sampler2D uB; uniform sampler2D uM; uniform int uMode; uniform vec3 uCol;
uniform float uSx[5]; uniform float uSs[5]; uniform int uP11; uniform vec3 uHL; uniform float uFade; uniform vec4 uRip; uniform vec4 uShB;
varying vec3 vN; varying vec2 vT; varying vec3 vP;` + LIGHT + `
float h(float n){ return fract(sin(n*91.731)*43758.545); }
float band(vec2 uv, vec4 r, float p){            // 一行荧光笔：左到右扫，边缘毛一点
  if(p<=0.) return 0.; float x0=r.x-.004, x1=mix(r.x, r.y+.004, p);
  float wob=.0013*sin(uv.x*55.+r.z*90.)+.0005*sin(uv.x*231.);
  float y=smoothstep(r.z-.001+wob, r.z+.002+wob, uv.y)*(1.-smoothstep(r.w-.002-wob, r.w+.001-wob, uv.y));
  float x=smoothstep(x0, x0+.006, uv.x)*(1.-smoothstep(x1-.004, x1+.001, uv.x));
  return y*x*(.93+.07*h(floor(uv.x*700.)));
}
void main(){
  vec3 n=normalize(vN); bool fr=gl_FrontFacing; if(!fr) n=-n;
  vec3 c;
  if(uMode==0){ c = fr ? texture2D(uF, vT).rgb : texture2D(uB, vec2(1.-vT.x, vT.y)).rgb; }
  else if(uMode==1){ float s=h(floor(vP.z*5200.)); c=mix(vec3(.80,.78,.72),vec3(.97,.96,.92),.35+.65*s); }
  else c=uCol;
  float lit=lightAt(n, vP);
  if(uMode==0){ lit*=1.-.30*exp(-vT.x*26.)-.06*exp(-vT.x*5.); lit*=1.-.05*(1.-exp(-(1.-vT.x)*40.)); }
  if(uP11==1){
    vec4 m=texture2D(uM, vT);
    c=mix(c, vec3(.985,.982,.975), m.r*uFade);                                 // 画淡一点，让长出来的那枝做主角
    vec2 dq=(vP.xy-uShB.xy)*vec2(1.,1.35); lit*=1.-uShB.z*exp(-dot(dq,dq)/(uShB.w*uShB.w));   // 那枝丁香的投影
    float dr=length(vP.xy-uRip.xy); c+=vec3(1.,.84,.64)*uRip.w*(.55*exp(-pow((dr-uRip.z)/.012,2.))+.9*exp(-dr*dr/.0009));   // 光点 + 涟漪
    float hl=max(band(vT, vec4(${HL[0].map(v => v.toFixed(4))}), uHL.x), band(vT, vec4(${HL[1].map(v => v.toFixed(4))}), uHL.y));
    c*=mix(vec3(1.), vec3(1.,.86,.26), hl*.78);
  }
  for(int i=0;i<5;i++){ float sx=uSx[i], st=uSs[i]; if(st<=0.) continue;
    float x = sx>0. ? vP.x : -vP.x, e=abs(sx);
    if(x>0.) lit*=1.-st*.42*(1.-smoothstep(e-.04,e+.16,x)); }
  gl_FragColor=vec4(c*lit,1.);
}`;
/* 小花：每个顶点 aC 花心、aN 朝向、aQ (花瓣方向角, 沿瓣 0..1, 横向 -1..1, 尺寸)、aD (冒出时刻, 开花时刻, 随机, -)、aO 开花颜色、aBd 花苞颜色。
 * 冒出：从 0 弹到原大；开花：四片花瓣从合拢（花苞）摊开，瓣尖微微后翻。整枝的摆动 / 转动由 uR、uPiv 给。 */
const FVS = `attribute vec3 aC; attribute vec3 aN; attribute vec4 aQ; attribute vec4 aD; attribute vec3 aO; attribute vec3 aBd; attribute vec3 aT3; attribute vec2 aF;
uniform mat4 uVP; uniform float uTime; uniform mat3 uR; uniform vec3 uPiv; uniform vec3 uWind; uniform float uGust;
varying vec3 vCol; varying vec3 vNo; varying vec3 vP; varying vec2 vRW;
void main(){
  float ka=clamp((uTime-aD.x)/.34,0.,1.), g=ka<=0. ? 0. : 1.+2.4*pow(ka-1.,3.)+1.4*pow(ka-1.,2.);
  float ko=clamp((uTime-aD.y)/.55,0.,1.), o=ko*ko*(3.-2.*ko);
  vec3 C=uPiv+uR*(aC-uPiv), n=normalize(uR*aN);
  C+=uWind*(.006*uGust*sin(uTime*8.+aD.z*40.));                                   // 风里轻轻抖
  float kf=aF.x>50. ? 0. : clamp((uTime-aF.x)/aF.y,0.,1.);                          // 被风吹落：飘、翻、落在纸上
  if(kf>0.){ float e=kf*kf*(3.-2.*kf);
    vec3 q=mix(C,aT3,e)+uWind*(.07*sin(3.1416*kf));
    q.z+=.022*sin(3.1416*min(1.,kf*1.25))*(1.-kf);
    q+=vec3(sin(uTime*3.1+aD.z*20.),cos(uTime*2.7+aD.z*13.),0.)*(.014*sin(3.1416*kf));
    C=q; float sp=kf*aF.y*6.5; vec3 tum=normalize(vec3(sin(sp+aD.z*9.)*.7,cos(sp*.8+aD.z*5.)*.7,1.));
    n=normalize(mix(mix(n,tum,smoothstep(0.,.2,kf)),vec3(0.,0.,1.),smoothstep(.82,1.,kf))); }
  vec3 ref=abs(n.z)<.9 ? vec3(0.,0.,1.) : vec3(1.,0.,0.), t1=normalize(cross(ref,n)), t2=cross(n,t1);
  float ph=aQ.x, r=aQ.y, w=aQ.z, sz=aQ.w*g*mix(1.,.68,smoothstep(0.,.25,kf));
  vec3 d=cos(ph)*t1+sin(ph)*t2, pp=-sin(ph)*t1+cos(ph)*t2;
  float fold=mix(mix(1.12,.22,o)-o*.12*r*r, .06, smoothstep(0.,.3,kf));
  float L=sz*mix(.5,.95,o), wd=sz*mix(mix(.3,.28,o),.24,smoothstep(0.,.25,kf));   // 花瓣是一块方片，轮廓在片元里按长卵形裁（宽约为长的 0.6、圆头）
  vec3 dir=cos(fold)*d+sin(fold)*n, p=C+n*sz*mix(.05,.1,o)+dir*(r*L)+pp*(w*wd);
  vNo=normalize(-sin(fold)*d+cos(fold)*n);
  vCol=mix(aBd, aO, o); vRW=vec2(r, w); vP=p;
  gl_Position=uVP*vec4(p,1.);
}`;
const FFS = `precision highp float; uniform vec3 uEye; varying vec3 vCol; varying vec3 vNo; varying vec3 vP; varying vec2 vRW;` + LIGHT + `
void main(){ float r=vRW.x, pr=r<.55 ? .14+.86*sqrt(max(0.,1.-pow((r-.55)/.55,2.))) : sqrt(max(0.,1.-pow((r-.55)/.45,2.))); if(abs(vRW.y)>pr) discard;   // 裂片轮廓：基部窄、中部最宽、圆头
  vec3 n=normalize(vNo); bool fr=gl_FrontFacing; if(!fr) n=-n;
  float lit=lightAt(n, vP); if(!fr) lit=mix(lit,1.,.3);
  float rim=pow(1.-abs(dot(n, normalize(uEye-vP))),2.);
  vec3 col=vCol*mix(.8,1.06,smoothstep(.05,.75,r))*mix(.62,1.,smoothstep(.04,.2,r))*mix(1.,.94,smoothstep(.5,1.,abs(vRW.y)/pr));   // 近筒口深、瓣尖亮、边缘略暗
  gl_FragColor=vec4(col*lit+vec3(1.,.93,1.)*rim*.16,1.); }`;
/* 枝、花轴、叶子：每帧在 CPU 上按生长进度重建（顶点不多） */
const GVS = `attribute vec3 aP; attribute vec3 aN; attribute vec3 aK; uniform mat4 uVP; varying vec3 vN; varying vec3 vK; varying vec3 vP;
void main(){ vN=aN; vK=aK; vP=aP; gl_Position=uVP*vec4(aP,1.); }`;
const GFS = `precision highp float; uniform vec3 uEye; varying vec3 vN; varying vec3 vK; varying vec3 vP;` + LIGHT + `
void main(){ vec3 n=normalize(vN); bool fr=gl_FrontFacing; if(!fr) n=-n;
  float lit=lightAt(n, vP); if(!fr) lit*=.85;
  float rim=pow(1.-abs(dot(n, normalize(uEye-vP))),2.);
  gl_FragColor=vec4(vK*lit+vec3(.9,1.,.8)*rim*.1,1.); }`;

/* ---------- 这一枝丁香（世界坐标；右页 x∈[0,PW]，y∈[-.5,.5]，纸面 z≈T） ---------- */
const v3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const add3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const bez = (p0, p1, p2, p3) => s => { const q = 1 - s; return [0, 1, 2].map(i => q * q * q * p0[i] + 3 * q * q * s * p1[i] + 3 * q * s * s * p2[i] + s * s * s * p3[i]); };
const ZP = T + EPS + .0005;
/* ---------- 五种长法（window.TREE 选，tree.js 里设；给用户挑） ----------
 * 每种：E0 破纸点、STEM 主枝（E0 → J）、XS 另外的枝 [曲线, 粗, 细, 开始, 结束]、PANS 花序（from 从哪根枝上分出来）、LEAFS 叶、VIEW 盛开时镜头 [x, y, z, 距离]、SHB 投影 [x, y, 半径] */
const sph = (el, az) => [Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el)];
const lean = (d, k = [-.12, 0, 0]) => norm3(add3(d, k));
const PAN = (base, dir, len, w, t0, o = {}) => ({ base, dir: norm3(dir), len, w, m: Math.round(len * w * 4300), t0, grow: o.grow || .72 + len * .4, pink: o.pink || 0, droop: o.droop == null ? .1 : o.droop, from: o.from });
const PT = [SN(1), BEAT(6.25), BEAT(6.5), BEAT(6.75), BEAT(7), BEAT(7.25), BEAT(7.5), BEAT(7.75), BEAT(8), BEAT(8.25), BEAT(8.5), BEAT(8.75), BEAT(9)];   // 花序依次冒出：3.60 军鼓起，每个十六分音符一串
const PT2 = k => k < 2 ? SN(1) + k * BP / 4 : Math.round((MK.pan - D0) / BP) * BP + D0 + (k - 2) * BP / 4;   // 3.60 军鼓先冒两串，念到"一件完了，一件又来"再一串接一串冒
const TREES = {
  F() {                                                                      // 介于 v5（伸出尖角）和 v6（太圆）之间：方向往上收一点、花序长短胖瘦取中间、缝里补三串短的
    const E0 = [.56, .34, ZP], J = [.52, .275, .22], STEM = bez(E0, [.565, .335, .08], [.54, .3, .17], J);
    const NA = [.47, .255, .29], NB = [.515, .27, .32], NC = [.565, .262, .285], ND = [.505, .232, .255], up = d => norm3(add3(norm3(d), [0, 0, .25]));
    const spec = [[NB, [-.12, -.22, 1], .31, .125, 0], [NA, [-.62, -.15, .77], .27, .115, 1], [NB, [.38, -.12, .92], .255, .105, 0], [NA, [-.3, -.62, .72], .235, .105, .4], [NC, [.65, -.3, .7], .245, .105, 0],
      [NC, [.25, .42, .87], .225, .1, .2], [ND, [-.05, -.85, .52], .215, .1, .5], [NB, [-.38, .28, .88], .18, .095, 0], [ND, [.38, -.6, .7], .175, .095, 0], [NA, [-.55, .3, .75], .175, .095, .6]];
    const PANS = spec.map(([n, d, len, w, pink], k) => PAN(n, up(d), len, w, PT2(k), { pink, droop: .08, grow: .6 }));
    const LEAFS = [{ s: .45, dir: norm3([.8, -.45, .05]), size: .13, t0: BEAT(4) }, { s: .47, dir: norm3([-.75, -.55, .05]), size: .125, t0: BEAT(4) },
      { s: .98, dir: norm3([.35, -.92, -.1]), size: .115, t0: BEAT(4.75) }, { s: .98, dir: norm3([-.9, .2, -.05]), size: .11, t0: BEAT(4.75) },
      { at: NA, dir: norm3([-.7, -.5, -.25]), size: .1, t0: BEAT(5.5) }, { at: NC, dir: norm3([.75, -.45, -.25]), size: .1, t0: BEAT(5.5) },
      { at: ND, dir: norm3([.1, -.95, -.3]), size: .095, t0: BEAT(6.25) }, { at: NB, dir: norm3([.2, .9, .1]), size: .1, t0: BEAT(6) }];
    return { E0, J, STEM, XS: [], PANS, LEAFS, VIEW: [.5, .24, .33, 1.5], SHB: [.57, .31, .26] };
  },
  A() {                                                                      // 圆球花冠：十三串短花序挤成一个半球，像一整团丁香
    const E0 = [.56, .34, ZP], J = [.52, .28, .2], C0 = add3(J, [0, 0, .05]), STEM = bez(E0, [.565, .335, .07], [.54, .3, .15], J);
    const dirs = [[Math.PI / 2, 0], ...[0, 1, 2, 3, 4].map(k => [.96, k * 1.2566 + .3]), ...[0, 1, 2, 3, 4, 5, 6].map(k => [.38, k * .8976])];
    const PANS = dirs.map(([el, az], i) => { const d = lean(sph(el, az)); return PAN(add3(C0, d, .05), d, i ? (i < 6 ? .22 : .2) : .25, .095, PT[i], { pink: Math.cos(az) < -.5 && i ? .8 : 0, droop: i > 5 ? .12 : .05 }); });
    const LEAFS = [0, 1, 2, 3, 4].map(k => ({ at: add3(C0, sph(-.3, k * 1.2566), .03), dir: norm3(sph(-.35, k * 1.2566 + .6)), size: .11, t0: BEAT(5) + k * .13 }));
    return { E0, J, STEM, XS: [], PANS, LEAFS, VIEW: [.5, .25, .33, 1.55], SHB: [.57, .31, .26] };
  },
  B() {                                                                      // 画里那枝：从右上的枝条破纸，往左拱出一根横枝，几串花序挂在枝上往左下垂（照课本的画）
    const E0 = [.66, .42, ZP], J = [.44, .31, .25], STEM = bez(E0, [.67, .41, .13], [.6, .36, .25], J), X = bez(J, [.37, .3, .26], [.29, .29, .23], [.24, .27, .19]);
    const PANS = [PAN(add3(STEM(.6), [0, 0, .01]), [.1, -.35, .9], .22, .09, PT[0], { from: STEM(.6), droop: .05 }), PAN(J, [-.45, -.45, -.5], .27, .115, PT[1], { pink: .3, droop: .05 }),
      PAN(add3(J, [0, 0, .01]), [-.2, -.25, .95], .24, .1, PT[2], { droop: .05 }), PAN(STEM(.8), [-.25, -.6, -.45], .24, .1, PT[3], { from: STEM(.8), droop: .05 }),
      PAN(X(.5), [-.6, -.3, -.45], .24, .1, PT[4], { from: X(.5), pink: 1, droop: .05 }), PAN(X(1), [-.8, -.15, -.3], .21, .09, PT[5], { from: X(1), pink: 1, droop: .05 })];
    const LEAFS = [{ s: .55, dir: norm3([.5, -.8, -.2]), size: .12, t0: BEAT(5) }, { s: .57, dir: norm3([.25, .9, -.1]), size: .11, t0: BEAT(5) },
      { at: J, dir: norm3([.05, -.95, -.3]), size: .11, t0: BEAT(5.5) }, { at: J, dir: norm3([.25, .9, .05]), size: .1, t0: BEAT(5.5) }, { at: X(.6), dir: norm3([-.3, -.9, -.3]), size: .1, t0: BEAT(6.5) }];
    return { E0, J, STEM, XS: [[X, .0058, .0032, BEAT(5), BEAT(6.25)]], PANS, LEAFS, VIEW: [.44, .26, .2, 1.6], SHB: [.5, .34, .3] };
  },
  C() {                                                                      // 小丁香树：一根树干立起来，顶上一团圆圆的树冠
    const E0 = [.56, .34, ZP], J = [.53, .3, .3], CC = [.52, .29, .4], STEM = bez(E0, [.565, .338, .12], [.54, .31, .23], J);
    const nodes = [0, 1, 2].map(k => add3(CC, sph(-.4, k * 2.094 + .5), .05)), XS = nodes.map((n, k) => [bez(J, v3(J, n, .4), v3(J, n, .75), n), .0065, .0045, BEAT(5) + k * .1, BEAT(6)]);
    const dirs = [[Math.PI / 2, 0], ...[0, 1, 2, 3, 4].map(k => [.9, k * 1.2566 + .2]), ...[0, 1, 2, 3, 4].map(k => [.25, k * 1.2566 + .8])];
    const PANS = dirs.map(([el, az], i) => { const d = lean(sph(el, az), [-.08, 0, 0]); const nd = nodes[i % 3]; return PAN(add3(CC, d, .045), d, i ? .18 : .2, .085, PT[i], { from: nd, pink: Math.cos(az) < -.5 && i ? .7 : 0, droop: .06 }); });
    const LEAFS = [...[0, 1, 2, 3, 4, 5].map(k => ({ at: add3(CC, sph(-.5, k * 1.047), .04), dir: norm3(sph(-.3, k * 1.047 + .3)), size: .095, t0: BEAT(5.75) + k * .1 })),
      { s: .55, dir: norm3([.8, -.5, .0]), size: .1, t0: BEAT(5) }, { s: .57, dir: norm3([-.8, -.4, .0]), size: .095, t0: BEAT(5) }];
    return { E0, J, STEM, STEM_R: [.014, .009], XS, PANS, LEAFS, VIEW: [.52, .27, .37, 1.65], SHB: [.57, .32, .24] };
  },
  D() {                                                                      // 成对花序：一枝直立，枝顶一对大花序、下一节再一对小的（丁香花序本来就成对长在枝顶），叶子十字对生
    const E0 = [.56, .34, ZP], J = [.53, .3, .27], STEM = bez(E0, [.565, .335, .1], [.545, .31, .2], J), N1 = STEM(.62);
    const PANS = [PAN(add3(J, [-.01, 0, .01]), [-.28, -.12, .95], .38, .13, PT[0], { droop: .04 }), PAN(add3(J, [.01, 0, .01]), [.25, -.05, .97], .36, .125, PT[1], { droop: .04 }),
      PAN(N1, [-.75, -.25, .6], .26, .1, PT[3], { from: N1, pink: .8, droop: .12 }), PAN(N1, [.7, -.3, .62], .25, .1, PT[4], { from: N1, droop: .12 })];
    const LEAFS = [{ s: .62, dir: norm3([.1, -.95, -.15]), size: .12, t0: BEAT(5.25) }, { s: .62, dir: norm3([-.1, .95, -.1]), size: .11, t0: BEAT(5.25) },
      { s: .35, dir: norm3([-.9, .1, -.2]), size: .12, t0: BEAT(5) }, { s: .35, dir: norm3([.9, -.1, -.2]), size: .12, t0: BEAT(5) },
      { s: .97, dir: norm3([.3, -.92, 0]), size: .1, t0: BEAT(5.75) }, { s: .97, dir: norm3([-.4, .88, 0]), size: .095, t0: BEAT(5.75) }];
    return { E0, J, STEM, XS: [], PANS, LEAFS, VIEW: [.53, .27, .36, 1.6], SHB: [.57, .32, .24] };
  },
  E() {                                                                      // 一丛灌木：画上好几处同时破纸，长出几根矮枝，各顶一两串花，整体又宽又低
    const E0 = [.5, .3, ZP], J = [.48, .27, .18], STEM = bez(E0, [.505, .3, .07], [.49, .28, .14], J);
    const S = [[[.32, .25, ZP], [.3, .22, .14]], [[.62, .36, ZP], [.63, .33, .2]], [[.42, .18, ZP], [.41, .15, .11]]].map(([a, b]) => bez(a, add3(a, [0, 0, .06]), v3(a, b, .7), b));
    const XS = S.map((f, k) => [f, .008, .005, BEAT(4.5) + k * .2, BEAT(6) + k * .1]);
    const PANS = [PAN(J, [-.1, -.2, .97], .26, .1, PT[0]), PAN(J, [.35, -.2, .9], .22, .09, PT[2], { droop: .08 }), PAN(S[0](1), [-.45, -.3, .84], .22, .09, PT[1], { from: S[0](1), pink: 1 }),
      PAN(S[1](1), [.3, .05, .95], .24, .095, PT[3], { from: S[1](1) }), PAN(S[1](1), [.6, -.3, .75], .2, .085, PT[5], { from: S[1](1) }), PAN(S[2](1), [-.2, -.7, .68], .2, .085, PT[4], { from: S[2](1), pink: .4 })];
    const LEAFS = [{ s: .6, dir: norm3([.8, -.5, 0]), size: .1, t0: BEAT(5) }, { s: .62, dir: norm3([-.7, -.6, 0]), size: .1, t0: BEAT(5) },
      ...S.map((f, k) => ({ at: f(.65), dir: norm3(sph(-.1, k * 2.1 + .4)), size: .095, t0: BEAT(5.5) + k * .15 })), ...S.map((f, k) => ({ at: f(.7), dir: norm3(sph(-.15, k * 2.1 + 3.4)), size: .09, t0: BEAT(5.75) + k * .15 }))];
    return { E0, J, STEM, XS, PANS, LEAFS, VIEW: [.47, .24, .2, 1.65], SHB: [.5, .29, .3] };
  },
};
const TREE = TREES[window.TREE || 'F'](), { E0, J, STEM, XS, PANS, LEAFS } = TREE;
CAM[2] = [T_BURST, ...TREE.VIEW.slice(0, 3), 60, 12, TREE.VIEW[3]]; CAM[3] = [MK.wind, ...TREE.VIEW.slice(0, 3), 60, 14, TREE.VIEW[3] * .96];
PANS.forEach(P => {
  const f = P.from || J; P.branch = bez(f, add3(v3(f, P.base, .35), [0, 0, .008]), v3(f, P.base, .7), P.base);
  P.axis = s => add3(add3(P.base, P.dir, P.len * s), [0, 0, -1], P.len * P.droop * s * s);
  P.appear = s => P.t0 + P.grow * (1 - Math.sqrt(Math.max(0, 1 - s)));        // 花轴按 out2 长：长到 s 的那一刻
});
const PAL_O = [[.648, .566, .69], [.732, .627, .773], [.79, .708, .796], [.812, .784, .856], [.881, .844, .902], [.9, .87, .93]];
const PAL_P = [[.86, .52, .68], [.8, .46, .64], [.92, .62, .76]];
const PAL_B = [[.62, .36, .58], [.72, .4, .6], [.55, .38, .66]];
const PAL_BP = [[.8, .32, .5], [.72, .28, .48], [.86, .42, .58]];
const CAMDIR = norm3([0, -.55, .83]);
const WIND = norm3([-.6, -.8, 0]);
const T_WIND = MK.wind, gust = t => ss(t, T_WIND - .1, T_WIND + .35) * (1 - ss(t, T_WIND + 1.9, T_WIND + 3.3));   // 10.06 重军鼓（"年年都有"）起风
const axisRot = (k, a) => { const c = Math.cos(a), s = Math.sin(a), C = 1 - c, [x, y, z] = k;
  return [c + x * x * C, y * x * C + z * s, z * x * C - y * s, x * y * C - z * s, c + y * y * C, z * y * C + x * s, x * z * C + y * s, y * z * C - x * s, c + z * z * C]; };
const mul3 = (A, B) => { const r = new Array(9); for (let c = 0; c < 3; c++) for (let w = 0; w < 3; w++) r[c * 3 + w] = A[w] * B[c * 3] + A[3 + w] * B[c * 3 + 1] + A[6 + w] * B[c * 3 + 2]; return r; };
const plantRot = t => mul3(axisRot(norm3(cross3([0, 0, 1], WIND)), .11 * gust(t) * (.85 + .15 * Math.sin(t * 6.3))), plantRot0(t));
const plantRot0 = t => { const gr = ss(t, ST0, 5), a = -.2 * ss(t, 2.2, 12) + .035 * Math.sin(t * 1.1) * gr, b = .022 * Math.sin(t * 1.45 + 1) * gr;
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
  return [ca, sa, 0, -sa * cb, ca * cb, sb, sa * sb, -ca * sb, cb]; };          // Rz(a)·Rx(b)，列主序
const rot = (R, p, piv) => { const x = p[0] - piv[0], y = p[1] - piv[1], z = p[2] - piv[2]; return [piv[0] + R[0] * x + R[3] * y + R[6] * z, piv[1] + R[1] * x + R[4] * y + R[7] * z, piv[2] + R[2] * x + R[5] * y + R[8] * z]; };
let FLORETS = null;                                                          // [花心, 开花时刻]，给光点用

function initGL() {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const opt = { antialias: true, preserveDrawingBuffer: true, alpha: true, premultipliedAlpha: true };
  const gl = cv.getContext('webgl2', opt) || cv.getContext('webgl', opt); if (!gl) { console.error('no webgl'); return null; }
  const gl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  if (!gl2) gl.getExtension('OES_element_index_uint');
  const sh = (ty, src) => { const s = gl.createShader(ty); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
  const prog = (v, f) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, v)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, f)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(p)); return p; };
  const pr = prog(VS, FS), fp = prog(FVS, FFS), gp = prog(GVS, GFS);
  const ani = gl.getExtension('EXT_texture_filter_anisotropic');
  const mkTex = src => {
    if (!gl2) { const c = document.createElement('canvas'); c.width = 2048; c.height = 2048; c.getContext('2d').drawImage(src, 0, 0, 2048, 2048); src = c; }
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (ani) gl.texParameterf(gl.TEXTURE_2D, ani.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(16, gl.getParameter(ani.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    return t; };
  const tex = {}; NAMES.forEach(n => { tex[n] = mkTex(IM[n]); }); tex.mask = mkTex(IM.mask);
  /* ---- 书 ---- */
  gl.useProgram(pr);
  const U = n => gl.getUniformLocation(pr, n), aP = gl.getAttribLocation(pr, 'aP'), aN = gl.getAttribLocation(pr, 'aN'), aT = gl.getAttribLocation(pr, 'aT');
  const idx = []; for (let j = 0; j < NV; j++) for (let k = 0; k < NU; k++) { const a = j * (NU + 1) + k; idx.push(a, a + 1, a + NU + 1, a + 1, a + NU + 2, a + NU + 1); }
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
  const vb = gl.createBuffer(), data = new Float32Array((NU + 1) * (NV + 1) * 8);
  const qb = gl.createBuffer(), qib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, qib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  const bookAttrs = () => { gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 32, 0); gl.vertexAttribPointer(aN, 3, gl.FLOAT, false, 32, 12); gl.vertexAttribPointer(aT, 2, gl.FLOAT, false, 32, 24); };
  const setSh = list => { const sx = [0, 0, 0, 0, 0], st = [0, 0, 0, 0, 0]; list.forEach((s, i) => { sx[i] = s[0]; st[i] = s[1]; }); gl.uniform1fv(U('uSx'), sx); gl.uniform1fv(U('uSs'), st); };
  const bindTex = (f, b) => { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[f]); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex[b || f]); };
  function quad(ps, n, mode, col) {
    const d = new Float32Array(32), uv = [[0, 1], [1, 1], [1, 0], [0, 0]];
    ps.forEach((p, i) => d.set([p[0], p[1], p[2], n[0], n[1], n[2], uv[i][0], uv[i][1]], i * 8));
    gl.bindBuffer(gl.ARRAY_BUFFER, qb); gl.bufferData(gl.ARRAY_BUFFER, d, gl.DYNAMIC_DRAW); bookAttrs();
    gl.uniform1i(U('uMode'), mode); gl.uniform3fv(U('uCol'), col || [1, 1, 1]); setSh([]);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, qib); gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }
  function sheet(i, p, curl, flat) {
    const du = PW / NU, te = flat ? 0 : thEnd(i), dz = lerp(EPS * (6 - i), EPS * (i + 1), p);
    for (let j = 0; j <= NV; j++) { const r = j / NV, y = -.5 + r; let X = 0, Z = 0;
      for (let k = 0; k <= NU; k++) { const o = (j * (NU + 1) + k) * 8; data[o] = X; data[o + 1] = y; data[o + 2] = T + dz + Z; data[o + 6] = k / NU; data[o + 7] = 1 - r;
        const sm = (k + .5) / NU; let pe = clamp(p * (1 + curl) - curl * (1 - sm) * (1 - .4 * r)); pe = pe * pe * (3 - 2 * pe);
        const th = te * pe; X += du * Math.cos(th); Z += du * Math.sin(th); } }
    for (let j = 0; j <= NV; j++) for (let k = 0; k <= NU; k++) {
      const g = (jj, kk) => { jj = clamp(jj, 0, NV); kk = clamp(kk, 0, NU); const o = (jj * (NU + 1) + kk) * 8; return [data[o], data[o + 1], data[o + 2]]; };
      const n = norm3(cross3(sub3(g(j, k + 1), g(j, k - 1)), sub3(g(j + 1, k), g(j - 1, k)))), o = (j * (NU + 1) + k) * 8; data[o + 3] = n[0]; data[o + 4] = n[1]; data[o + 5] = n[2]; }
    gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW); bookAttrs();
    gl.uniform1i(U('uMode'), 0); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
  }
  /* ---- 小花：一次建好，冒出和开花都在顶点着色器里 ---- */
  const R = rng(2611), pick = a => a[(R() * a.length) | 0], mixc = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  const fv = [], fi = []; FLORETS = [];
  PANS.forEach(P => {
    const u1 = norm3(cross3(P.dir, [0, 0, 1])), u2 = cross3(u1, P.dir);
    for (let i = 0; i < P.m; i++) {
      const s = Math.min(.985, (i + R() * .8) / P.m), th = i * 2.39996 + R() * .6, rad = add3([0, 0, 0], add3(u1, u2, 0), 0);
      const rd = norm3([u1[0] * Math.cos(th) + u2[0] * Math.sin(th), u1[1] * Math.cos(th) + u2[1] * Math.sin(th), u1[2] * Math.cos(th) + u2[2] * Math.sin(th)]);
      const wr = (P.w * Math.pow(1 - Math.pow(s, 1.3), .75) + .009)   /* 圆锥，顶头略钝 */ * (.55 + .45 * R()), sc = add3(P.axis(s), rd, wr), tip = s > .93;
      const nk = tip ? 3 + (R() * 2 | 0) : 4 + (R() * 4 | 0);
      for (let k = 0; k < nk; k++) {
        const C = add3(sc, norm3([R() - .5, R() - .5, R() - .5]), .016 * Math.sqrt(R()));
        const N = norm3(add3(add3(add3(rd, P.dir, .35), CAMDIR, .45), norm3([R() - .5, R() - .5, R() - .5]), .18));
        const size = .0105 * (.85 + .3 * R()) * (1 - .25 * s), ap = P.appear(s) + R() * .08, op = tip ? 99 : s < .62 ? Math.min(T_BURST - .3, P.t0 + P.grow * .4 + s * 1.8 + R() * .4) : T_BURST - .04 + R() * .15;   // 下半截边长边开，上半截憋到 6.83 下拍（念到"丁香结"）一起开
        const pinkK = P.pink * (.5 + .5 * R()), O = mixc(pick(PAL_O), pick(PAL_P), pinkK * .7), Bd = tip ? mixc(O, pick(PAL_BP), .55 + .3 * P.pink) : mixc(O, pick(PAL_B), .15);
        FLORETS.push([C, op]);
        let det = 99, fl = 1, Tg = C;
        if (!tip && C[2] < .45 && R() < .14) {                                  // 风吹落：落点在两页上，正文区少落一些，要划线的三行不落
          let x, y, n = 0;
          do { const left = R() < .5; x = left ? -.04 - R() * .62 : .02 + R() * .66; y = -.47 + R() * .93; n++; }
          while (n < 20 && ((x > .02 && x < .67 && y > -.26 && y < -.115) || (x > .04 && x < .65 && y > -.45 && y < .07 && R() < .6)));
          Tg = [x, y, (x >= 0 ? T + EPS * 2 : T + (zl(4) - T) * (-x / PW) + EPS * 6) + .0012 + R() * .001];
          det = T_WIND + .02 + clamp(dot3(sub3(C, E0), WIND) + .3, 0, .6) * .9 + R() * .7; fl = 1.6 + R() * 1.2; }
        const ph0 = R() * 6.28, rz = R();
        for (let q = 0; q < 4; q++) { const b0 = fv.length / 25;
          for (let ri = 0; ri <= 2; ri++) for (let wi = 0; wi <= 1; wi++) fv.push(C[0], C[1], C[2], N[0], N[1], N[2], ph0 + q * Math.PI / 2, ri / 2, wi * 2 - 1, size, ap, op, rz, 0, O[0], O[1], O[2], Bd[0], Bd[1], Bd[2], Tg[0], Tg[1], Tg[2], det, fl);
          for (let ri = 0; ri < 2; ri++) { const a = b0 + ri * 2; fi.push(a, a + 2, a + 3, a, a + 3, a + 1); } }
      }
    }
  });
  gl.useProgram(fp);
  const FU = n => gl.getUniformLocation(fp, n);
  const fvb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, fvb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(fv), gl.STATIC_DRAW);
  const fib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, fib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(fi), gl.STATIC_DRAW);
  const FA = [['aC', 3, 0], ['aN', 3, 3], ['aQ', 4, 6], ['aD', 4, 10], ['aO', 3, 14], ['aBd', 3, 17], ['aT3', 3, 20], ['aF', 2, 23]].map(([n, sz, off]) => [gl.getAttribLocation(fp, n), sz, off]);
  const FN = fi.length;
  /* ---- 枝、花轴、叶子：每帧重建 ---- */
  gl.useProgram(gp);
  const GU = n => gl.getUniformLocation(gp, n), GA = ['aP', 'aN', 'aK'].map(n => gl.getAttribLocation(gp, n));
  const gvb = gl.createBuffer(), gib = gl.createBuffer();
  function plantGeo(t, Rm) {
    const V = [], I = [], vtx = (p, n, k) => { const q = rot(Rm, p, E0), m = rot(Rm, add3(n, E0), E0); V.push(q[0], q[1], q[2], m[0] - E0[0], m[1] - E0[1], m[2] - E0[2], k[0], k[1], k[2]); return V.length / 9 - 1; };
    const tube = (f, s1, r0, r1, k0, k1, segs = 22, sides = 9) => { if (s1 <= .002) return; const b0 = V.length / 9;
      for (let i = 0; i <= segs; i++) { const s = s1 * i / segs, c = f(s), tg = norm3(sub3(f(Math.min(1, s + .01)), f(Math.max(0, s - .01)))), rf = Math.abs(tg[2]) < .9 ? [0, 0, 1] : [1, 0, 0];
        const n1 = norm3(cross3(rf, tg)), n2 = cross3(tg, n1), r = lerp(r0, r1, s) * (i === segs ? .6 : 1), kc = v3(k0, k1, s);
        for (let j = 0; j <= sides; j++) { const a = j / sides * 6.2832, nn = add3([n1[0] * Math.cos(a), n1[1] * Math.cos(a), n1[2] * Math.cos(a)], n2, Math.sin(a)); vtx(add3(c, nn, r), nn, kc); } }
      for (let i = 0; i < segs; i++) for (let j = 0; j < sides; j++) { const a = b0 + i * (sides + 1) + j, b = a + sides + 1; I.push(a, b, a + 1, a + 1, b, b + 1); } };
    const leaf = (at, dir, size, k) => { if (k <= 0) return; const sd = norm3(cross3(dir, [0, 0, 1])), up = cross3(sd, dir), fold = lerp(1.35, .22, E.out2(k)), sc = size * E.outBack(clamp(k * 1.05), 1.3), b0 = V.length / 9;
      for (let ia = 0; ia <= 9; ia++) { const a = ia / 9, hw = sc * .42 * Math.pow(Math.sin(Math.PI * Math.pow(a, .68)), .85);
        for (let ib = 0; ib <= 4; ib++) { const b = ib / 2 - 1, sg = Math.sign(b), lat = Math.abs(b) * hw;
          const p = add3(add3(add3(at, dir, a * sc * 1.15), sd, sg * lat * Math.cos(fold)), up, lat * Math.sin(fold) - a * a * sc * .25);
          const n = norm3(add3(add3(up, sd, -sg * Math.sin(fold) * .9), dir, a * .3));
          vtx(p, n, v3([.5, .6, .45], [.66, .74, .56], .35 + .65 * Math.abs(b) * (1 - .3 * a)).map((v, i) => ib === 2 ? v + .1 : v)); } }
      for (let ia = 0; ia < 9; ia++) for (let ib = 0; ib < 4; ib++) { const a = b0 + ia * 5 + ib; I.push(a, a + 5, a + 1, a + 1, a + 5, a + 6); } };
    const gs = E.out3(seg(t, ST0, ST1));
    const SR_ = TREE.STEM_R || [.0105, .0062]; tube(STEM, gs, SR_[0], SR_[1], [.6, .53, .47], [.62, .61, .5], 24, 10);
    XS.forEach(([f, r0, r1, a, b]) => tube(f, E.out3(seg(t, a, b)), r0, r1, [.6, .55, .48], [.63, .66, .51], 20, 9));
    PANS.forEach(P => { const gb = E.out3(seg(t, P.t0 - .28, P.t0 + .02)), ga = E.out2(seg(t, P.t0, P.t0 + P.grow));
      tube(P.branch, gb, .0055, .0042, [.62, .61, .5], [.64, .68, .52], 10, 8);
      if (gb >= 1) tube(P.axis, ga * .9, .0038, .0012, [.64, .68, .52], [.7, .76, .6], 24, 7); });
    LEAFS.forEach(L => { const at = L.at || STEM(L.s); leaf(at, L.dir, L.size, seg(t, L.t0, L.t0 + .55)); });
    return [V, I];
  }
  gl.useProgram(pr); gl.uniform1i(U('uF'), 0); gl.uniform1i(U('uB'), 1); gl.uniform1i(U('uM'), 2);

  function render(t) {
    gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    const spot = [CAMNOW.tg[0], CAMNOW.tg[1], Math.max(.35, CAMNOW.d * .62), .5];
    gl.useProgram(pr); [aP, aN, aT].forEach(a => gl.enableVertexAttribArray(a));
    gl.uniformMatrix4fv(U('uVP'), false, new Float32Array(VP)); gl.uniform4fv(U('uSpot'), spot); gl.uniform1f(U('uFade'), .42 * ss(t, 2.0, 5.0)); gl.uniform4fv(U('uRip'), [E0[0], E0[1], Math.max(0, t - TG) * .42, t > TG ? 1 - ss(t, TG + .15, TG + .9) : 0]);
    gl.uniform4fv(U('uShB'), [TREE.SHB[0], TREE.SHB[1],   .36 * ss(t, ST0, T_BURST), TREE.SHB[2]]); { const c = hlChar(t); gl.uniform3fv(U('uHL'), [clamp(c / 10), clamp((c - 10) / 24), 0]); } gl.uniform1i(U('uP11'), 0);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, tex.mask);
    const ps = LEAVES.map((_, i) => leafP(i, t));
    const mid = i => thEnd(i) * clamp(ps[i] * (1 + LEAVES[i][4]) - LEAVES[i][4] * .5 * .8);
    const caster = i => { const th = mid(i); if (ps[i] <= .002 || ps[i] >= .998) return null; const s = Math.pow(Math.abs(Math.sin(th)), .6); return th < Math.PI / 2 ? [PW * Math.cos(th) + .001, s] : [-(PW * -Math.cos(th) + .001), s]; };
    quad([[PW, -.5, 0], [PW, .5, 0], [PW, .5, T], [PW, -.5, T]], [1, 0, 0], 1);
    quad([[0, -.5, 0], [PW, -.5, 0], [PW, -.5, T], [0, -.5, T]], [0, -1, 0], 1);
    quad([[0, .5, 0], [PW, .5, 0], [PW, .5, T], [0, .5, T]], [0, 1, 0], 1);
    quad([[0, -.5, 0], [0, -.5, T], [0, .5, T], [0, .5, 0]], [-1, 0, 0], 2, [.86, .42, .16]);
    quad([[-.002, -.503, -.002], [PW + .003, -.503, -.002], [PW + .003, -.503, .0005], [-.002, -.503, .0005]], [0, -1, 0], 2, [.88, .45, .17]);
    quad([[PW + .003, -.503, -.002], [PW + .003, .503, -.002], [PW + .003, .503, .0005], [PW + .003, -.503, .0005]], [1, 0, 0], 2, [.88, .45, .17]);
    bindTex('p11_hi'); setSh(LEAVES.map((_, j) => caster(j)).filter(Boolean)); gl.uniform1i(U('uP11'), 1); sheet(5, 0, 0, true); gl.uniform1i(U('uP11'), 0);
    LEAVES.forEach((L, i) => {
      const p = ps[i]; let cs = [];
      if (p <= .002) cs = LEAVES.map((_, j) => j < i ? caster(j) : null).filter(Boolean);
      else if (p >= .998) cs = LEAVES.map((_, j) => j > i ? caster(j) : null).filter(Boolean);
      bindTex(L[0], L[1]); setSh(cs); sheet(i, p, L[4]);
    });
    [aP, aN, aT].forEach(a => gl.disableVertexAttribArray(a));
    if (t > ST0 - .05) {
      const Rm = plantRot(t), eye = CAMNOW.eye;
      const [V, I] = plantGeo(t, Rm);
      gl.useProgram(gp); gl.uniformMatrix4fv(GU('uVP'), false, new Float32Array(VP)); gl.uniform4fv(GU('uSpot'), spot); gl.uniform3fv(GU('uEye'), eye);
      gl.bindBuffer(gl.ARRAY_BUFFER, gvb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(V), gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(I), gl.DYNAMIC_DRAW);
      GA.forEach((l, i) => { gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 3, gl.FLOAT, false, 36, i * 12); });
      gl.drawElements(gl.TRIANGLES, I.length, gl.UNSIGNED_INT, 0); GA.forEach(l => gl.disableVertexAttribArray(l));
      gl.useProgram(fp); gl.uniformMatrix4fv(FU('uVP'), false, new Float32Array(VP)); gl.uniform4fv(FU('uSpot'), spot); gl.uniform3fv(FU('uEye'), eye);
      gl.uniform1f(FU('uTime'), t); gl.uniformMatrix3fv(FU('uR'), false, new Float32Array(Rm)); gl.uniform3fv(FU('uPiv'), E0); gl.uniform3fv(FU('uWind'), WIND); gl.uniform1f(FU('uGust'), gust(t));
      gl.bindBuffer(gl.ARRAY_BUFFER, fvb); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, fib);
      FA.forEach(([l, sz, off]) => { gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, sz, gl.FLOAT, false, 100, off * 4); });
      gl.drawElements(gl.TRIANGLES, FN, gl.UNSIGNED_INT, 0); FA.forEach(([l]) => gl.disableVertexAttribArray(l));
    }
    return cv;
  }
  return { render };
}

/* 光点（内容层，带辉光）：长的时候枝头、花轴头一颗亮点；开花时每朵花附近冒出一点光往上飘 */
function sparks(fr, t) {
  if (!FLORETS || t < TG - .05 || t > T_WIND + 1.2) return;
  const Rm = plantRot(t), Pj = p => { const m = VP, x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15]; return [(x / w + 1) / 2 * W, (1 - y / w) / 2 * H]; };
  const a0 = 1 - ss(t, T_WIND - .3, T_WIND + .2);
  const gs = seg(t, ST0, ST1); if (gs > 0 && gs < 1) { const q = Pj(rot(Rm, STEM(E.out3(gs)), E0)); fr.spark(q[0], q[1], 5, '#F6E6FF', .9); }
  PANS.forEach(P => { const ga = seg(t, P.t0, P.t0 + P.grow); if (ga > 0 && ga < 1) { const q = Pj(rot(Rm, P.axis(E.out2(ga) * .97), E0)); fr.spark(q[0], q[1], 3.5, '#F1E0FF', .8); } });
  const R = rng(905);
  for (let i = 0; i < 130; i++) { const f = FLORETS[(R() * FLORETS.length) | 0], life = .9 + R() * .8, k = (t - f[1]) / life, dx = (R() - .5) * .03; if (k <= 0 || k >= 1) continue;
    const q = Pj(rot(Rm, add3(f[0], [dx * k, 0, .05 * k]), E0)); fr.spark(q[0], q[1], 1.2 + R() * .8, R() < .3 ? '#FFE9C8' : '#EEDCFF', Math.sin(Math.PI * k) * .4 * a0); }
}

function book(fr, t) {
  if (!GLR) return;
  const cv = GLR.render(t);
  fr.look.under = x => {
    const g = x.createRadialGradient(W / 2, H * .55, 60, W / 2, H * .55, 1100); g.addColorStop(0, 'rgba(255,226,190,.13)'); g.addColorStop(1, 'rgba(255,226,190,0)');
    x.fillStyle = g; x.fillRect(0, 0, W, H); x.drawImage(cv, 0, 0);
    const k = ss(t, DUR - .9, DUR); if (k > 0) { x.fillStyle = `rgba(0,0,0,${k})`; x.fillRect(0, 0, W, H); }
  };
  LEAVES.forEach((L, i) => fr.sfx(L[2], 'flip', { gain: i ? .8 : 1, dur: +(L[3] - L[2]).toFixed(2), cover: i ? 0 : 1 }));
  fr.sfx(TG, 'soft', { gain: .8 }); fr.sfx(ST0, 'rise', { gain: .6 }); fr.sfx(SN(1), 'shimmer', { gain: .6 }); fr.sfx(T_BURST, 'bloom', { gain: .6 }); fr.sfx(T_BURST + .03, 'shimmer', { gain: .8 }); fr.sfx(T_WIND - .1, 'wind', { dur: 3.6 }); fr.sfx(MK.s2, 'soft', { gain: .5 }); fr.sfx(PT2(2), 'shimmer', { gain: .45 });
  sparks(fr, t);
  if (window.VO) window.VO.s2.forEach(([a, b]) => fr.sfx(a, 'marker', { dur: +(b - a).toFixed(2), gain: .8 }));
}

VK.film({
  dur: DUR, theme: 'night', bloom: .6, grain: .035, meta: { title: '翻书·丁香结' },
  draw(fr, t) { fr.look.bgo = { stars: .35 }; camera(t); book(fr, t); },
});
})();
