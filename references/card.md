# card：金框卡片 + 口播讲解

**来源**：飞行少年v 2026-10 的《AI 时代，你还需要花几万块找中介申请美国研究生吗？》（2:28，ledo 底 + 口播旁白，改了 9 版）。
这里只留**能带走的风格**：版式、配色、卡片、动效语法、卡点方法、踩过的坑。那条片子里的具体东西（学校抠像、学士帽底纹、漏斗和百元钞、具体工具、排序表）都是一次性的，换题目要重新找形象。

card 是**第四套外观**，也是这个 skill 里**唯一有人声的**：旁白就是文案，字幕跟着配音走。适合"经验分享 / 攻略 / 清单 / 工具推荐 / 流程讲解"这类口播知识片——观众要的是"一条条记下来"，所以信息装在一张张卡上，一拍一张地发出来。
件在 `engine/vk-card.js`（`VKCard`，依赖 `vk-ledo.js`），示例 `examples/card_demo/`，拼图 `examples/look_card.jpg`，配音脚本 `scripts/card_voice.py`。

---

## 一、一句话风格

> 炭灰暗场，底下是一张**模糊压暗的真实照片**（按章换），前景是**金色描边的深色 3D 卡片**：标题卡从侧面转正、问题药丸跟着旁白一个个点亮；内容段一拍发一张卡（真实网页截图压暗当底、上面只放名字和一句话、右下角绿 / 橙费用标），或者甩进来一张带和纸胶带的褶皱便签、撕纸剪贴；结论用红章砸下、用金色大字揭晓；底部居中一行白色粗黑体字幕，关键词金色。

---

## 二、完整提示词（直接交给模型）

### 中文版

```
做一条 16:9、1920×1080、30 fps 的口播知识短片，风格叫 card。

【底】炭灰 #121316 暗场；每一章换一张真实照片当背景：模糊 10px、亮度 0.4、饱和 0.8、四周压暗，慢推 4%，换章时交叉淡 0.8 秒。没有噪点，辉光很轻（0.2）。
右上角常驻品牌角标（圆形头像 + @账号）。

【主角是卡片】
- 标题卡：深色渐变卡面（#26201A → #0B0A08），9px 金色渐变外框 + 细内框 + 虚线内框，圆角 30；
  小标（AI 时代）/ 金色渐变大字（主题）/ 一行灰白副题 / 金色点线分隔（中间菱形）/ 三个问题药丸（目录）。
  卡片是 3D 的：从屏幕外侧着飞进来（ry 0.5 → 0.06），之后一直极轻微地浮动；圆角软阴影 + 金框辉光。
- 内容卡：真实网页截图压暗（透明度 0.5、饱和 0.7、上浅下深的暗渐变）铺满卡面，上面只写名字（奶白→浅金渐变，粗黑）和一句话；
  右下角斜贴一个费用标：免费 / 开源免费 = 绿 #4CC38A，部分付费 / 付费 = 橙 #F0A030。一组 2–4 张，一拍一张。
- 实物感：褶皱便签（米白纸、浅对折痕、右下角微翘、彩色和纸胶带、上面一个彩色小图标 + 宋体标题 + 等宽英文小标）、撕纸剪贴（锯齿边、胶带）、白描边的抠像贴纸。
- 证据动作：红章（双线框、缺墨斑点、从 2.4 倍砸下）否定一个说法；金色大字 + 白场揭晓结论；荧光笔划网页上的关键句。
- 钩子用一个纯黑灵动岛式滑块（胶囊从一颗黑点弹开、上沿细高光、斜向光泽扫过、金色进度条、白色圆钮），
  一开始侧着往后仰，一边拖数字一边摆正。

【字】思源黑体。字幕底部居中 y≈948，58px 白色粗黑体，先垫一层黑字 + 紧贴黑晕、再画白字 + 投影，不用黑带；关键词 {金色} 发光；金句 70px 全金。
大字标题 88–124px，一句里只有一个词是金色。左上章节标：等宽金色编号 + 46px 白字标题 + 一根细金线。不配英文字幕。

【节奏】有旁白，画面跟着人声走：每一句的出场时刻 = 这一句开口的时刻吸到最近的一拍；一句里说到某个词，那个东西在那一拍出来。
前 2 秒整句钩子（用"你"起头），第 0 帧就有动画；第一个鼓点（配乐的鼓组进入）出标题卡 + 白场；最大的揭晓放在配乐最满的那一拍。
换章、换组：上一组在下一组开始前 0.1 秒就完全消失——往左撤 600px 同时淡出，或往后退着淡出——绝不和下一组叠在一起。
东西到位就停，不抖。

【声音】配乐整体压低 14 dB（常数，不闪避），人声在上面；提示音很少：卡片 tick、红章 stamp、揭晓 bloom + thud，放在人声峰值下 9 dB。
```

### English (for other models / tools)

```
A 16:9 1920×1080 30 fps narrated explainer in the "card" style.
Background: charcoal #121316; per chapter a real photo, blurred 10px, brightness .4, saturation .8, vignetted, slow 4% push, 0.8 s cross-fades. Light bloom, no grain. Brand badge top-right.
Hero element: dark 3D cards with a gold gradient frame (9px outer, thin inner, dashed innermost, radius 30), soft rounded shadow and a gold rim glow.
The title card flies in edge-on and turns to face camera on the first drum hit, with a white flash; its three question pills light up as the narrator says each topic.
Content cards are dealt one per beat from the lower right, slightly tilted: a darkened real web screenshot as the card bed, only a name (cream→gold) and one line on top, and a green (free) / amber (paid) fee tag in the corner.
Physical props: wrinkled sticky notes with washi tape, torn-paper scraps, white-outlined cut-out stickers. Evidence moves: red rubber stamp slammed from 2.4×, gold headline reveal with a white flash, highlighter over a web page.
Hook: a pure-black Dynamic-Island-style slider that springs open from a dot, tilted back in perspective, straightening while its value is dragged up.
Subtitles: bottom-centre, 58px bold white sans with a tight black halo and drop shadow (no band), keywords in glowing gold; no English line.
Timing follows the voice: each item appears on the beat nearest to when it is spoken. Every group is fully gone 0.1 s before the next starts (slide 600px left + fade, or pull back + fade). Nothing jitters once it lands.
Sound: music −14 dB constant under the voice; sparse ticks, a stamp, bloom + thud on the reveal, 9 dB under the voice peak.
```

---

## 三、设计规格

**色**（`VKCard.PAL`）：字 `#ECECEA` · **金 `#E9C46A` / 亮金 `#F7E3A1` / 暗金 `#9C7533`（标题、关键词、边框、点亮）** · 红 `#D9483B`（只用于否定：红章）· 绿 `#4CC38A`（免费）· 橙 `#F0A030`（付费 / 部分付费）· 卡面 `#14120E` → `#0B0A08` · 便签纸 `#F7F2E8` · 灵动岛 `#050506`。便签胶带可以用一组低饱和色（`#E08E6D #8FB3C9 #B48EAD #E4A55C #9DBF8A #6FB7A8`），一样东西一种色，全片不换。

**版式**

| 元素 | 位置 | 字 |
|---|---|---|
| 字幕 | 底部居中，y≈948 | 黑体 Heavy 58，白；`{词}` 金色发光；金句 70 全金；不出英文行 |
| 章节标 | 左上 (110, 100) | 等宽 26 金色编号 + 黑体 46 白字标题，下面一根 490px 细金线 |
| 组名药丸 | 左上 (110, 200) | 黑体 36 亮金，深色底金边胶囊 |
| 标题卡 | 正中偏上，约 1000×700 | 小标 30 / 大字 124 金渐变 / 副题 34 / 分隔线 / 问题药丸 34 |
| 内容卡 | 一排居中，y≈520，2 张 640 宽、3 张 520、4 张 410 | 名字 ≤54 / 一句话 24 / 费用标 24 |
| 便签 | 左半 (400, 375)，340×410 | 宋体 Heavy 44 标题 + 等宽 13 英文小标 |
| 要点列表 | 便签右边 x≈700，从 y≈215 往下 | 标题 48 金色 + 等宽英文；要点黑体 30，前面一颗彩色圆点，`{词}` 亮金 |
| 品牌角标 | 右上 | 同 ledo（`L.brand`） |
| 字幕区 | y 840 以下 | 只属于字幕 |

**字体**：中文思源黑体（`sansh` 粗、`sans` 常规）；便签标题思源宋体；英文小标 JetBrains Mono；数字可以用 Cormorant。

---

## 四、件（`VKCard`，详见 `references/engine.md`）

| 件 | 做什么 |
|---|---|
| `beat({ B 或 bpm, db0 })` | 下拍表：`DB(n)` `BT(n, i)` `SN(n)` `E8` `BAR` `snap(x)` |
| `voice(T)` | 读 `window.VOICE_LINES`：`VL(i)` 第 i 句起止、`wordAt(i, 词)` 说到这个词的时刻、`at(i)` 吸到拍上的起点 |
| `span(t, t0, t1)` | 一段的透明度：进 0.3 s，**在 t1 前 0.1 s 完全消失**（换章、换组都用它） |
| `face(key, w, h)` → `{ c, x }` | 卡面离屏画布（2 倍分辨率） |
| `card(fr, face, { c: at(x, y, z), w, h, rx, ry, a })` | 3D 卡：圆角阴影 + plane3 贴图 + 金框辉光，返回卡面坐标 → 屏幕的函数 |
| `frameFace` `divider` `pill` `txt` `goldG` `stampFace` | 卡面画法：金框、分隔线、发光药丸、字（`maxW` 自动缩）、金渐变、卡面上的红章 |
| `webCard(x, { name, line, img, crop, fee, feeKind })` | 截图卡；`repoCard` 开源仓库卡 |
| `deal(fr, t, { t0, t1, n, w, h, step, y, draw })` | 发牌：一拍一张进、到 t1 整组往左撤 + 淡出 |
| `note(x, { title, en, tape, art })` `scrap(x, w, h, o, fn)` `torn` | 褶皱便签、撕纸剪贴、撕纸路径 |
| `island(fr, t, { label, value, pb })` | 灵动岛滑块：弹开、侧仰、边拖边摆正 |
| `stage(fr, t, [[t0, img], …])` `pattern(fr, t, icon)` | 底：模糊照片按章换；很淡的平铺小图标 |
| `chapterHead` `tag` `track` | 章节标、组名药丸、关键帧轨迹 |
| `subs(fr, t, VOICE_SUBS)` | 居中字幕（黑晕 + 白字 + `{金}`） |

---

## 五、结构

| 段 | 时长 | 做法 |
|---|---|---|
| 钩子 | 0 – 第一个鼓点 | 第 0 帧就有：大字问题（"你会花{几万块}…吗？"）+ 灵动岛滑块拖数字；第二句"不一定"= 红章砸下 |
| 标题卡 | 鼓点起约 3 小节 | 白场 + 3D 标题卡转正；三个问题药丸一拍一个出来，旁白说到时点亮；可以加作者贴纸（"我当年…"）建立可信度 |
| 每章 | 按旁白 | 章节标 + 本章的件：流程用一条金线时间轴 + 撕纸道具；"哪个重要"用便签 + 要点 + 排序；"工具"用发牌 |
| 揭晓 | 配乐最满那一拍 | 金色大字 + 白场 + 涟漪 + bloom/thud |
| 收尾 | 最后 2–3 小节 | 一个把全片串起来的"汇总动作"（东西落进容器、分成几堆、每堆一个标签）+ 一句祝福 / 互动（评论区见） |

---

## 六、卡点：画面跟着人声

1. **先配音，再定画面时刻。** `scripts/card_voice.py` 按 `narration.json` 把每一句排进下拍表，产出 `voice_subs.js`（`VOICE_SUBS` 字幕、`VOICE_LINES` 每句起止）。画面里所有时刻都写成 `V.at(i)`、`T.snap(V.wordAt(i, '词'))`、`T.DB(n)`，不手写秒数——改一句旁白，后面的画面自己跟着挪。
2. **要卡死的时刻用 anchor**：例如揭晓那句 `anchor: '科研'`，让这个词正好落在配乐最满的那一拍。
3. 改文案时先 `--estimate`（不调 TTS，按平均语速占位），定了再真配。**TTS 额度很少：只有用户说要配音时才调**，每分钟最多 8～9 次。
4. 一句话分两截出字幕用 `|`；画面上已经有的句子用 `nosub`；想让某句更平静用 `style_add`。

---

## 七、动效语法

- **进**：卡从右下 +260/+160 飞进、0.85 → 1 倍、歪 0.12 → 几乎正（各张随机 ±0.025）；3D 卡从屏幕外侧着推进、转正；便签从左边甩进来带 −0.4 的旋转；贴纸从下面弹上来（outBack）。
- **停**：到位就停。卡片最多极轻微地浮（±5px、±0.02 rad 的正弦），**贴纸、便签、抠像都不抖**（"定格抖动"试过，用户不要）。
- **出**：整组往左撤 600px + 淡出，或往后退（z −260）+ 淡出；**在下一组开始前 0.1 s 完全消失**（`span`、`deal` 已经这样做）。
- **点亮**：药丸 / 关键词发金光，过 0.5 s 回落到 45%；当前讲的那一项最亮。
- **揭晓**：大字从 1.4 倍落到 1 倍 + 白场（峰值 0.5–0.6）+ 金色涟漪。
- **钩子滑块**：`rx .32 / ry .9 → 0`，和数字一起在 2 秒左右走完。

---

## 八、旁白、字幕和声音

- **旁白** `scripts/card_voice.py <工程>`：Gemini TTS，一句一调、按文字 + 语气的哈希缓存（插一句不会重配别的句子），全片统一 `tempo`（1.2 左右）和句间停顿 `gap`（0.3 s）。
- **字幕** = 旁白按标点切成 ≤18 字一段，按字数比例分时间；整段出、不逐字。
- **混音**：配乐原样（只在结尾的下拍切掉、最后 30 ms 淡出），整体 −14 dB 常数增益；人声在上；提示音在人声峰值下 9 dB，只在会削波的几毫秒局部压低提示音。交付：完整版 mp4、仅画面 + 提示音 mp4/wav（给剪辑软件自己配）、旁白 wav + SRT。
- 出片时可以对亮度轻微锐化（`unsharp=5:5:0.45:5:5:0`，CRF 12），前景字更清楚，模糊的背景基本不受影响。

---

## 九、坑（都是真踩过的）

- **透明度要相乘**：卡面里临时调透明度一定要 `x.globalAlpha = pa * .5 … x.globalAlpha = pa`，不能直接设 `.5` / `1`——否则外面的淡出失效，旧卡的截图还压在新卡上（"卡片重叠"返工了两次）。
- **换章重叠**：上一章的淡出要在下一章开始**之前**结束（t1 − 0.5 → t1 − 0.1），不是在下一章开始之后再淡。
- **标题卡退场别往镜头冲**（z 变大会糊、像重影），往后退着淡出。
- `addColorStop` 的位置要夹在 0..1（扫光的位置会越界报错）。
- 3D 卡的阴影 plane3 自带的是方的：关掉它，用 `card()` 里按圆角画的阴影。
- 装在容器里的东西（漏斗里的钞票等）要服从容器的透视：半径不超过口径的 0.8，越往里越小。
- 截图（网页、别人的文书案例）的使用范围要写进素材清单；仓库是公开的，截图和用户的照片不进 skill。

---

## 十、返工话术

| 用户说 | 改什么 |
|---|---|
| 卡片重叠了 / 旧卡还在 | 查 `globalAlpha` 是不是乘了外面的；查出场是不是在下一组前 0.1 s 结束 |
| 换章的时候叠在一起 | 用 `span(t, t0, t1)`，上一章 t1 = 下一章 t0 |
| 有点糊 | bloom 0.35 → 0.2；出片加亮度锐化 |
| 贴纸在抖 | 去掉定格抖动，到位就停 |
| 字幕底下有条黑影 | 不用黑带，只用黑晕 + 投影 |
| 语气太激动 | 那一句加 `style_add`（平稳、少重音），只重配这一句 |
| 这段太快 | 给那几句加 `gap`，或在下一句前留一小节；不改配乐 |
