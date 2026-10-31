/* card 风格的件各演一遍（14 s，没有配乐和旁白；时刻按 120 BPM、第一个下拍 3.0 s 的假下拍表算）。
 * 题目是编的："你会花三千块，买一门剪辑课吗？"——只为演示件，不是风格的一部分。拼图：examples/look_card.jpg */
(function () {
'use strict';
const { W, lerp, seg, ss, E } = VK;
const L = VKLedo, C = VKCard, P = C.PAL, T = C.beat({ bpm: 120, db0: 3 }), { DB, BT, B } = T;
L.brandSet();

// 正片里这两张表由 TTS 脚本生成（voice_subs.js）：VOICE_LINES 是每句起止，VOICE_SUBS 是切好的字幕
window.VOICE_LINES = [{ a: .05, b: 2.2, text: '你会花三千块，买一门剪辑课吗？' }, { a: 2.5, b: 2.95, text: '不一定。' },
  { a: 3.2, b: 6.3, text: '分三件事讲：流程、重点、工具。' }, { a: 7.1, b: 10.2, text: '工具先看这三个，都能免费用。' }, { a: 10.6, b: 13.4, text: '最重要的，是先把素材按拍子剪齐。' }];
const SUBS = [{ a: 3.2, b: 6.3, zh: '分三件事讲：{流程}、{重点}、{工具}' }, { a: 7.1, b: 10.2, zh: '工具先看这三个，都能{免费}用' }, { a: 10.6, b: 13.4, zh: '最重要的，是先把素材{按拍子}剪齐', gold: false }];
const V = C.voice(T);

const T_STAMP = T.snap(V.VL(1).a), T_DRUM = DB(0), T_CH = V.at(3), T_NOTE = V.at(4), END = 14;
const QS = ['流程长啥样？', '哪些最重要？', '有哪些免费工具？'], HOT = ['流程', '重点', '工具'].map(w => V.wordAt(2, w));

function titleFace(t) {                                                    // 金框深色卡：小标 + 金色大字 + 一行副题 + 分隔线 + 三个问题药丸
  const w = 860, h = 600, { c, x } = C.face('title', w, h); C.frameFace(x, w, h);
  C.txt(x, 'AI 时代', w / 2, 74, { size: 30, wt: 500, color: P.goldHi, track: 8 });
  C.txt(x, '剪辑自学', w / 2, 178, { size: 124, wt: 900, grad: true, glow: 26, track: 8 });
  C.txt(x, '经验分享', w / 2, 278, { size: 34, wt: 400, color: '#D8D2C4', track: 6 });
  C.divider(x, w / 2, 328, 280);
  QS.forEach((s, i) => { const k = E.out3(seg(t, BT(0, 1 + i), BT(0, 1 + i) + .18)), hot = t >= HOT[i] ? E.out3(seg(t, HOT[i], HOT[i] + .2)) * (.45 + .55 * Math.exp(-(t - HOT[i] - .2) / .5)) : 0;
    if (k > 0) { x.save(); x.translate(w / 2, 400 + i * 74); x.scale(lerp(.85, 1, k), lerp(.85, 1, k)); C.pill(x, 0, 0, 520, 60, s, { a: k, hot, size: 32 }); x.restore(); } });
  return c;
}
const CARDS = [{ name: '剪映', line: '模板多、上手快', fee: '部分付费', feeKind: 'part' }, { name: 'DaVinci', line: '调色最强的免费版', fee: '免费' }, { name: 'Audacity', line: '开源的音频剪辑', fee: '开源免费' }];

VK.film({
  dur: END, theme: 'ledo', bloom: .2, grain: 0, meta: { title: 'card 风格的件' },
  draw(fr, t) {
    L.frame(fr);
    C.stage(fr, t, [[0, null]], t < T_DRUM ? .75 : 1);
    C.pattern(fr, t, x => { x.beginPath(); x.moveTo(-18, -22); x.lineTo(24, 0); x.lineTo(-18, 22); x.closePath(); x.fill(); });

    // 钩子：第 0 帧大字 + 灵动岛滑块（侧着、往后仰，一边拖一边摆正）+ 红章 = 第二句旁白；鼓组进入那拍整组淡掉
    const out = 1 - ss(t, T_DRUM - .03, T_DRUM + .25);
    if (out > 0) {
      C.island(fr, t, { t0: 0, pb: 2.2, y: 560, a: out, label: '课程费', value: p => '¥' + (Math.round((300 + 2700 * p) / 100) * 100).toLocaleString('en-US') });
      const k = E.out3(seg(t, 0, .2)), s = '你会花三千块，买一门剪辑课吗？', w = fr.measure(s, { font: 'sansh', size: 88, track: 6 });
      fr.chars(s, W / 2 - w / 2, 230, { font: 'sansh', size: 88, track: 6, color: P.ink, align: 'l', shadow: .9, a: k * out }, j => j >= 3 && j < 6 ? { color: P.gold, glow: 22 } : {});
      L.stamp(fr, t, T_STAMP, '不一定！', 1400, 420, { size: 84, rot: -.1 });
      fr.sfx(T_STAMP, 'stamp', { gain: 1 });
    }

    // 鼓组进入：3D 金框标题卡从侧面转正；三个问题一拍一个出来，旁白说到时点亮；下一章开始前 0.1 s 完全走完
    const ca = C.span(t, T_DRUM - .05, T_CH, { in: .13 });
    if (ca > 0) { const e = E.out3(seg(t, T_DRUM, T_DRUM + .35)), ex = ss(t, T_CH - .55, T_CH - .2);
      C.card(fr, titleFace(t), { c: C.at(960, 440 + 5 * Math.sin(t * 1.2), lerp(700, 0, e) - 260 * ex), w: 860 * 1.15, h: 600 * 1.15, rx: .04, ry: lerp(.5, .06, e) + .02 * Math.sin(t * .8), a: ca }, 1 - ex);
      L.whiteFlash(fr, t, T_DRUM, { rise: .04, fall: .4, peak: .6 }); fr.sfx(T_DRUM, 'bloom', { gain: 1 }); }

    // 第一章：章节标 + 组名药丸 + 发牌（一拍一张截图卡；没给截图就是暗底）
    const A = C.span(t, T_CH, END + 1);
    C.chapterHead(fr, t, '01', '有哪些免费工具？', T_CH, END + 1);
    C.tag(fr, '剪辑软件', 110, 200, A * (1 - ss(t, T_NOTE - .45, T_NOTE - .2)));
    C.deal(fr, t, { t0: T_CH + .2, t1: T_NOTE, n: 3, w: 520, h: 400, step: B * .9, y: 540, a: A, draw: (x, i, w, h) => C.webCard(x, CARDS[i], w, h) });

    // 便签 + 撕纸剪贴：从左边甩进来，轻微歪着，不抖
    const e2 = E.out3(seg(t, T_NOTE - .1, T_NOTE + .35));
    if (e2 > 0) L.under(x => {
      C.note(x, { x: 520 + (1 - e2) * -500, y: 470, s: lerp(.6, 1, e2), a: e2, rot: -.03 + (1 - e2) * -.4, tape: '#8FB3C9', title: '按拍子剪', en: 'CUT ON THE BEAT',
        art: x => { x.fillStyle = '#2A2A2A'; for (let i = 0; i < 6; i++) x.fillRect(-56 + i * 20, -40 + (i % 2) * 30, 12, 60 - (i % 2) * 30); } });
      const k = E.out3(seg(t, T_NOTE + B * 2, T_NOTE + B * 2 + .3)); if (k <= 0) return;
      x.save(); x.globalAlpha *= k; x.translate(1250, lerp(700, 460, k)); C.scrap(x, 560, 300, { rot: .03, seed: 7 }, (x, w, h) => {
        C.txt(x, 'BPM 120', w / 2, 90, { size: 64, wt: 900, fam: '"VK Latin"', color: '#1E1A16' });
        C.txt(x, '每拍 0.5 秒 · 每小节 2 秒', w / 2, 180, { size: 30, wt: 500, color: '#3A3530' }); }); x.restore();
    });

    C.subs(fr, t, SUBS);
    L.brand(fr, t);
  },
});
})();
