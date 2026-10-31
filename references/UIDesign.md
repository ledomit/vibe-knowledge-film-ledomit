# UIDesign：液态玻璃 + UI 动效 + 灵动岛黑框

**来源**：用户 2026-10-30 提供的一条抖音参考视频（19 秒，720×720，60 fps，片尾写着用 Opus 5.5 生成）。
文件不进仓库（仓库公开，视频不是我们的），这里只记从画面里看出来的设计决定，并倒推成提示词。

这不是第四套外观，而是一种**画法**：把信息做成"系统 UI 组件"，一块液态玻璃不停地变形，依次变成按钮、播放器、控制中心、图表、搜索框、通知。
知识片里适合拿来讲**工具、产品、App、流程、数据**（例如"有哪些好用还免费的工具"那一章），也可以单独做一条 15–20 秒的炫技开场。

---

## 一、一句话风格

> 浅色粉紫渐变底上，**一块乳白色的液态玻璃**不停地变形——圆点拉成药丸、分裂成三颗按钮、并进**纯黑的灵动岛**再展开成播放器，然后变回玻璃，依次长成控制中心、Tab 栏、数据卡、搜索框、通知堆叠；全程一镜到底、没有硬切，每一次变形都带弹簧回弹和运动模糊。

---

## 二、完整提示词（直接交给模型）

### 中文版

```
做一条 16:9（或 1:1）、60 fps 的 UI 动效短片，风格是 Apple「液态玻璃（Liquid Glass）」+ iOS 灵动岛。

【底】浅色、高调：淡紫 #C9C3F0 → 雾蓝 #BFD8F2 → 奶白 #F1EEF6 的柔和渐变，像磨砂玻璃后面的天光；
有一道很淡的斜向光带，整块底极慢地漂移（20 秒移动不到 5%）。不要纯白，不要深色，不要噪点。

【玻璃】所有组件都是同一种材质：
- 乳白半透明，透出后面被高斯模糊（约 18 px）、略提饱和度的底；
- 上沿一圈亮边（白 90% → 底部 15% 的渐变描边，1.5 px），下沿略暗，像有厚度；
- 下方一团很软的投影（偏蓝紫的灰，透明度 15–20%，模糊 40 px，往下偏 16–20 px），没有硬边；
- 圆角大：按钮是正圆，条是胶囊，卡片是 28–36 px 的超椭圆圆角；
- 透镜：玻璃圆滑过大字时，圆里的字被放大、边缘轻微弯折（折射），圆边有一圈亮环。

【灵动岛】纯黑 #050506 的胶囊，圆角始终 = 高度的一半（展开成卡片时 40 px 上下）；
上沿 1 px 的弱高光，展开时有一道斜向的光泽从左上扫到右下；
里面的内容（专辑封面、歌名、进度条、按钮）在形状展开到 60% 之后才从模糊淡入；
封面是柔和渐变方块，右上角的音量条颜色取自封面。

【字】SF Pro Display 一类的无衬线：标题粗黑、字距略紧（Fluid. / Fast. / Alive. 这样一个词加句号）；
UI 里的标签用 13–15 px 的中灰小字。点缀色只有 iOS 蓝 #0A84FF（选中、开关打开）和一点紫 #7D6BF2。

【动】一镜到底，没有硬切，全部是"一个东西变成下一个东西"：
1. 第 0 帧一颗玻璃圆点弹出来；
2. 拉成药丸（像液体一样中间先变细再断开），分裂成三颗按钮：播放、红心、分享，依次弹一下；
3. 三颗按钮并拢、变黑，成为灵动岛小胶囊；胶囊展开成黑色播放器，播放 → 暂停，切歌时封面和歌名横向滑走；
4. 播放器收回，退成玻璃圆点；
5. 大字一个词一个词出（Fluid. → Fast. → Alive. → Liquid Glass），玻璃透镜从字上滑过，字在透镜里被放大；
6. 玻璃铺开成控制中心 2×3 方块：Wi-Fi、专注、正在播放、亮度、音量、手电筒；开关一个个点亮成蓝色 / 紫色；
7. 方块收成一条玻璃胶囊 → Tab 栏（Home / Search / Activity / Profile），选中的那颗玻璃泡在图标之间滑动，滑的时候被拉长；
8. Tab 栏鼓起成空白玻璃卡 → Activity 柱状图：数字滚动计数（47,883 → 58,198），柱子错开长高，一根变蓝并弹出小气泡；
9. 卡片压扁成搜索框，打字 "liquid"，下面展开结果列表，第一行蓝色高亮，高亮条往下滑一格；
10. 通知从上面一张张掉下来叠成三层；
11. 收尾：玻璃圆 + "Liquid Glass" 字，透镜滑过，最后缩回一颗圆点。

【手感】
- 所有形状变化用弹簧（阻尼 0.6–0.7，过冲 5–8%，约 0.45 s 停稳）；
- 快速移动加运动模糊；内容进出用"模糊 12 px → 0 + 透明度 + 缩放 0.96 → 1"；
- 每个状态停 0.8–1.5 秒，19 秒左右讲完 10 个状态；节奏均匀，不留空镜；
- 每一次变形都卡在音乐的拍点上（轻电子 / Lo-fi，110–120 BPM），点按时配很短的 UI 点击声，展开时配一口气的 whoosh。

【不要】硬切、闪白、粒子、霓虹、深色底、粗描边、扁平无阴影的图标、一个字一个字出的字幕。
```

### English (for other models / tools)

```
A 60 fps motion-design piece in Apple "Liquid Glass" + iOS Dynamic Island style. One continuous shot, no cuts:
a single milky frosted-glass blob keeps morphing — dot → pill → splits into three buttons (play / heart / share) →
merges into a pure-black Dynamic Island capsule that expands into a music player → collapses back to glass →
bold black words "Fluid." "Fast." "Alive." with a glass lens sliding over them (magnified, refracted letters) →
a 2×3 Control Center grid (toggles light up iOS blue #0A84FF) → a glass tab bar with a stretchy selection bubble →
an Activity bar chart with a rolling counter → a search field typing "liquid" with an expanding results list →
stacked notifications dropping in → ends on "Liquid Glass" and shrinks to a dot.
Background: soft high-key lavender / periwinkle / milk-white gradient with a faint diagonal sheen, slowly drifting, no grain.
Glass: translucent white over an 18 px blur of the background, bright top rim, slightly darker bottom rim,
soft blue-grey drop shadow (15–20 %, 40 px blur, 18 px down), large continuous corner radii.
Island: #050506 capsule, radius = height / 2, faint top highlight, a glossy diagonal sweep on expand,
content blur-fades in after 60 % of the morph. Type: SF Pro Display–like, heavy and tight for titles, small grey UI labels.
Motion: spring physics (damping 0.6–0.7, 5–8 % overshoot), motion blur on fast moves, blur-in/out transitions,
every morph lands on a beat, 0.8–1.5 s per state. No hard cuts, flashes, particles, neon or dark backgrounds.
```

---

## 三、设计规格（tokens）

| 项 | 值 |
|---|---|
| 底 | 线性渐变 `#C9C3F0`（左上）→ `#D9E6F7` → `#F1EEF6`（右下）+ 径向的淡青 `#BFE3F0` 一团；一道 20% 白的斜向光带 |
| 玻璃填充 | 背景模糊 18 px、饱和 ×1.4、亮度 ×1.06，再盖一层 `rgba(255,255,255,.35)` |
| 玻璃亮边 | 描边 1.5 px，线性渐变：上 `rgba(255,255,255,.9)` → 下 `rgba(255,255,255,.15)` |
| 玻璃投影 | `rgba(70,64,120,.18)`，blur 40，offsetY 18 |
| 灵动岛 | `#050506`；上沿 `rgba(255,255,255,.12)` 1 px；光泽带 `rgba(255,255,255,.08)` |
| 强调色 | iOS 蓝 `#0A84FF`、紫 `#7D6BF2`、红心 `#FF3B5C`、音量条按封面取色 |
| 圆角 | 按钮正圆；胶囊 = h/2；卡片 28–36；岛展开 40 |
| 字 | 标题 800–900 重、字距 −1%；UI 标签 500 重、13–15 px、`#6B6B78`；数字用等宽数字 |
| 节奏 | 每状态 0.8–1.5 s；弹簧 0.45 s 停稳；内容晚于形状 0.1–0.15 s |

---

## 四、动效语法（这条片子的"词汇"）

1. **一个东西变成下一个东西**：没有出场 / 退场，只有变形。上一个组件的外轮廓就是下一个组件的起点（圆 → 胶囊 → 卡片 → 胶囊 → 圆）。
2. **形先动，内容后到**：外形先用弹簧走到位，里面的图标、字晚 0.1–0.15 s 从模糊淡入；收回时反过来，内容先模糊消失，形再缩。
3. **液体的分与合**：分裂时中间先变细（脖子）再断开，断开的瞬间两边各弹一下；合并时先靠近、再连出脖子、最后鼓成一个。
4. **透镜**：玻璃圆从大字上滑过，圆内的字放大约 1.2 倍、边缘有一点弯折，是"这是玻璃"的最强证据。
5. **黑与白的反差**：全片是浅色玻璃，只有灵动岛是纯黑——最贵气的那一下留给黑框展开。
6. **选中态会滑**：Tab 的选中泡、搜索结果的高亮条、控制中心的开关，都是"一块颜色滑过去"，滑的时候被拉长。
7. **数字在跳**：图表卡里的数字滚动计数，柱子错开半拍长高，最后一根变色并弹出气泡。

---

## 五、在本引擎里怎么做（Canvas）

先把底画到一张离屏画布 `BGC`（每帧或每几帧更新一次），所有玻璃从它取模糊。

```js
// 弹簧：u ∈ [0,1] 是这段动画的进度，返回带过冲的 0 → 1
const spring = (u, z = .65, w = 13) => u <= 0 ? 0 : u >= 1 ? 1 : 1 - Math.exp(-z * w * u) * (Math.cos(w * Math.sqrt(1 - z * z) * u) + z / Math.sqrt(1 - z * z) * Math.sin(w * Math.sqrt(1 - z * z) * u));

// 液态玻璃：path(x) 画出形状路径（roundRect / arc），y0–y1 是形状的上下沿（给亮边的渐变用）
function glass(x, BGC, path, y0, y1, a = 1) {
  x.save(); x.globalAlpha = a;
  x.save(); x.shadowColor = 'rgba(70,64,120,.18)'; x.shadowBlur = 40; x.shadowOffsetY = 18; path(x); x.fillStyle = '#E8E5F2'; x.fill(); x.restore();   // 不透明底 + 投影，下面会被盖住
  x.save(); path(x); x.clip(); x.filter = 'blur(18px) saturate(1.4) brightness(1.06)'; x.drawImage(BGC, 0, 0); x.filter = 'none';
  x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(0, 0, x.canvas.width, x.canvas.height); x.restore();
  path(x); const g = x.createLinearGradient(0, y0, 0, y1);                                                           // 亮边：上亮下暗
  g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,.15)'); x.strokeStyle = g; x.lineWidth = 1.5; x.stroke();
  x.restore(); }

// 透镜：大字先画在离屏 T 上；透镜里把 T 以透镜中心放大 1.2 倍再画一次
function lens(x, T, cx, cy, r) {
  x.save(); x.beginPath(); x.arc(cx, cy, r, 0, 7); x.clip();
  x.translate(cx, cy); x.scale(1.2, 1.2); x.translate(-cx, -cy); x.drawImage(T, 0, 0); x.restore();
  const g = x.createRadialGradient(cx, cy, r * .7, cx, cy, r); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.45)');
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); }

// 灵动岛：w、h 用弹簧在两个状态之间走；圆角 = min(h/2, 40)；内容在 k > .6 后从模糊淡入
function island(x, cx, cy, w, h, k, drawContent) {
  const r = Math.min(h / 2, 40); x.save(); x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 30; x.shadowOffsetY = 12;
  x.beginPath(); x.roundRect(cx - w / 2, cy - h / 2, w, h, r); x.fillStyle = '#050506'; x.fill(); x.restore();
  x.save(); x.clip(); const s = x.createLinearGradient(cx - w, cy - h, cx + w, cy + h), p = Math.min(1, k);   // 斜向光泽扫一遍
  s.addColorStop(Math.max(0, p - .1), 'rgba(255,255,255,0)'); s.addColorStop(p, 'rgba(255,255,255,.08)'); s.addColorStop(Math.min(1, p + .1), 'rgba(255,255,255,0)');
  x.fillStyle = s; x.fillRect(cx - w / 2, cy - h / 2, w, h);
  const c = Math.max(0, (k - .6) / .4); if (c > 0) { x.globalAlpha = c; x.filter = `blur(${(1 - c) * 10}px)`; drawContent(x); x.filter = 'none'; }
  x.restore(); }
```

- **液体分合**：最省事的是两颗胶囊之间画一段"脖子"（上下两条二次贝塞尔，宽度随距离变细到 0 后断开）；要真正的 metaball，就在 1/4 分辨率的离屏上画实心圆、`blur(12px)`，再用 `getImageData` 按透明度阈值 0.5 二值化，最后当遮罩去裁玻璃。
- **运动模糊**：快速移动的那几帧，把同一组件沿运动方向以递减透明度多画 3–5 次，或者对组件离屏图加 `blur()` 再横向拉伸。
- **滚动数字**：`K.odometer`；等宽数字。
- **声音**：点按用 `tick`（高音、短），展开用 `soft` + 短的 `rise`，落定用 `tock`。

---

## 六、和三套外观怎么配

- **ledo**：一章里需要"产品 / 工具 / App"时，可以整段换成浅色玻璃底（像推开一扇窗），结束时玻璃缩成一颗点、再推回 ledo 的暗底；字幕仍按 ledo（左下或居中），品牌角标不变。
- **C 夜曲 / B 寓言**：不建议混——C 是深色宇宙，B 是纸本，玻璃会显得突兀。
- 单独做 15–20 秒的开场 / 预告：直接用第二节的提示词。

## 七、返工话术

- "玻璃像塑料" → 底的模糊不够、亮边太粗或投影太硬：模糊 18 px，亮边 1.5 px，投影 blur 40、透明度 ≤ 20%。
- "变形像 PPT 缩放" → 没有弹簧、内容和外形同时动：外形弹簧，内容晚 0.1 s 从模糊进。
- "灵动岛不高级" → 黑得不够纯、圆角不对、缺光泽：`#050506`，圆角 = h/2（卡片 40），展开时扫一道斜光。
- "太花" → 一次只变一个东西，一个状态停够 1 秒，点缀色只留蓝和一点紫。
