# MUSE (4175) 全流程 QA 反馈 — 第 1 轮

服务器已验证：served `/src/main.js` md5 == disk，cwd = /Users/expansioai/project/muse（服务的是最新代码）。
流程完整走通：入口 → 生命问题 → 选伴 → GPT 策展 → 8 个过程世界 → 学习地图 → 召唤记录 → 圆桌 → 面对矛盾 → 宣言 → 第 9 答案世界。GPT-5.6 LIVE，无 JS 报错。

> 本轮含「深挖实测」：用浏览器里 `window.__MUSE_APP__.engine` 遍历每个同伴渲染后的世界坐标包围盒，
> 得到硬数据，**推翻了纯靠截图得出的三条假设**（苏格拉底并不矮、world 08 没有巨人模型、身高其实都对）。
> 请以「深挖实测结论」为准。

## 结论速览

| 检查项 | 结果 |
|---|---|
| 端到端流程可走通 | ✅ |
| GPT-5.6 实时对话 / 圆桌 / 宣言 | ✅ 内容扎实、带「AI interpretation」免责 |
| 6 个抽屉工具（Atlas/Forge/Salon/Room/Profile/Evidence） | ✅ 全部可开、内容正确 |
| 走动不穿模（world 01 实测按住 W） | ✅ 未穿墙 |
| 讲解者名字随场景切换 | ❌ 永远显示 MONET（确定性，已定位 file:line） |
| 选伴卡三张肖像 | ❌ 是 3D 转身图，不是头像（确定性，已定位文件） |
| 同伴模型身高一致 | ✅ 实测 H≈1.74m，全部一致（含苏格拉底 1.746） |
| 同伴脚踩地面 | ❌ **落地高度不均**：同队形各人命中地面差 ~0.4m（真根因） |
| world 08「巨人」 | ⚠️ **透视错觉**：monet 尺寸正常，是相机贴脸+边缘站位（非缩放 bug） |
| world 06 画质 | ❌ 严重糊/涂抹，同伴竖排不成队 |
| 画作挂墙 | ⚠️ 部分落地/斜立（wallPlacement 命中失败即 fallback 落地画架） |

---

## 深挖实测结论（本轮新增，覆盖旧假设）

方法：`window.__MUSE_APP__.engine` 遍历 `guide`/`partyActors`/`player` 的 group 几何，
算世界坐标包围盒高度 H、脚底 y、以及各自 `worldLayer.groundHeightAt(x,z)` 命中的地面高度。

### A. 同伴身高完全正确，问题是「落地高度不均」（覆盖旧 bug #3 苏格拉底矮）
World 01 实测（groundY=1.53，但注意各人命中地面差异极大）：

| 角色 | 模型高 H | 脚底 footY | 命中地面 ground | 脚离地 gap |
|---|---|---|---|---|
| guide monet | 1.745 | 0.101 | 0.096 | +0.005 ✅ |
| party van-gogh | 1.737 | 0.080 | 0.079 | 0.000 ✅ |
| party socrates | 1.746 | 0.470 | 0.472 | -0.002 ✅ |
| learner | 1.757 | 0.253 | 0.250 | +0.003 ✅ |

- **关键**：四人模型高度都 ≈1.74m，苏格拉底 1.746 一点都不矮。之前「显矮」是错觉——
  苏格拉底站在 y≈0.47 的地面补丁上（比 monet 的 0.10 高了 ~0.37m），且在队形后排，
  透视下头顶更低 → 看起来矮。
- **真根因**：`groundHeightAt(x,z)`（`src/render/WorldLayer.js:653-667`）对**几乎相同的 x/z**
  返回相差 0.4m 的地面高度。同一房间的地面本应齐平，说明 collider mesh 在这些采样点有
  夹层/装饰面/凹凸，raycast 命中了错误的一层。`groundHitsAt` 用 `referenceY ± tolerance(2.5*scale)`
  过滤（:660-662），tolerance 太宽，把高出 0.37m 的面也当合法地面选中。
- **建议**：(1) 收紧 `groundHeightAt` 的候选面筛选——优先选最接近「同伴当前脚下连续地面」的一层，
  而不是最接近 referenceY 的任意一层；(2) 或在 `placePartyAtFormation`（MuseumEngine.js:251-257）
  落位后，把整队 y 统一到 guide 的地面高度（同房间地面视为齐平），避免队内高差。

### B. World 08「巨人」是相机透视错觉，不是缩放 bug（覆盖旧 bug #5）
World 08 实测（worldScale=2）：

| 角色 | 模型高 H | modelScale | 相机水平距 |
|---|---|---|---|
| guide monet | 1.745 | 1.791 | **3.92** ← 太近 |
| party van-gogh | 1.722 | 1.783 | 6.20 |
| party socrates | 1.749 | 1.790 | 6.20 |
| learner | 1.745 | 0.978 | 5.49 |

- monet 模型高 1.745、scale 1.79，跟其他人**完全一致**，根本没有巨人模型。
- 相机在 (-0.03, 1.3, 0.5)，monet 在 (-3.92, ?, 1.0)，水平距仅 **3.92**（相机配置 distance=5.6）。
  monet 被挤到画面边缘又离相机最近 → 透视放大占半屏。
- **真根因**：world 08 的 `guideSpawn`/`spawn`（profile: `profile(-2.76,0.5,0,-4.43,8.48,-2.68,5.45,-π/2,200,0.2)`
  经 worldScale=2 缩放）让 guide 落在离相机 3.9 的位置，配合 `cameraDistance` 与该世界 yaw，
  guide 进了近裁剪透视区。
- **建议**：对该世界调 `guideSpawn` 偏移或 `cameraDistance`，保证 guide 与相机保持 ≥5 的距离且不贴边。
  这是**单世界站位参数**问题，非全局缩放。

### C. `companionBoost: true` 是死配置
`companionBoost`（`src/config/legacyAssets.js:117`）全项目仅此一处，**代码从未读取**。
若原意是给 world 08 同伴放大/补光，则从未生效；建议要么实现要么删掉，避免误导。

### D. 角色 GLB 用了 KHR_mesh_quantization
9 个角色 GLB 的 POSITION accessor 是量化坐标（±32767），真实尺寸在 node 变换里。
运行时 `ArchivedAvatar`（`src/render/ArchivedAvatar.js:53-60`）用 `Box3().setFromObject` 归一化到
height=1.75，实测归一化后确实都 ≈1.74m ✅——**归一化逻辑本身没问题**，所以 #3 不能怪模型。

---

## 必修 bug（按优先级，已用实测校正）

### 1. 讲解者名字永远卡在 MONET（确定性）
- 现象：每个世界对话框标题、问题都随场景更新（如 "The Court of Light · Sigmund Freud"），
  但左上讲解者徽章始终是 MONET，直到第 9 世界都不变。
- 根因：`view.setSpeaker(...)` 只在 `src/main.js:85` 和 `:162` 用 `companions[0]` 调过一次；
  `activateProcessScene`（`src/main.js:208`）切场景时从不调用 `setSpeaker`。
- 建议：在 `activateProcessScene` 里按 `scene.guideId` 取对应 companion 调 `view.setSpeaker`
  （scene 01 guide=Mira，02 Freud，04 Picasso，05 Van Gogh，06 Qi Baishi，07 Frida，08 Yayoi
  ——见 `src/config/exhibitionSpine.js`）。`setSpeaker` 定义在 `src/ui/AppView.js:560`。

### 2. 三张肖像是 3D 转身图，不是头像（确定性）
- 现象：选伴界面下排 Freud / Qi Baishi / Yayoi 卡片显示成白底上一排小小的全身 3D 模型（正/侧/背四视图）。
- 根因：`assets/portraits/freud.jpg`、`qi-baishi.jpg`、`yayoi-kusama.jpg` 尺寸都是 1672×941 横图
  （角色 turnaround sheet），时间戳同为 05:14；而 monet/van-gogh/socrates/frida/picasso 是正常竖版头像
  （800×1200、951×1200 等）。三张同尺寸+同时间戳=批量渲染导出误当头像的典型特征。
- 建议：用真实头像替换这三张（`companion()` 的 `portrait: /assets/portraits/${id}.jpg`，
  见 `src/config/legacyAssets.js:241`）。

### 3. 同伴落地高度不均（覆盖旧「苏格拉底矮」）
- 见「深挖实测 A」。真根因是 `groundHeightAt` 在同房间返回相差 ~0.4m 的地面，非模型身高。
- 建议：收紧 `src/render/WorldLayer.js:653-667` 的候选面筛选，或落位后把整队 y 对齐到 guide 地面高度。

### 4. 梵高悬空 / world 07 踩水面
- 现象：world 01/03/04/final 梵高脚离地悬浮；world 07 三人脚停在水池表面。
- 根因：同 #3 一族——`groundHeightAt` / `hasGroundAt` 把水面/装饰面当合法地面命中
  （raycast 未排除非地面几何）。实测 world 01 走动后 van-gogh footGap 已到 +0.019 并在漂移。
- 建议：落地 raycast 只命中真实地面 collider（给地面 mesh 打 tag，或按法线朝上+连续性过滤水面/装饰面）。

### 5. world 08 guide 贴脸放大（覆盖旧「巨人」）
- 见「深挖实测 B」。非缩放 bug，是单世界站位/相机距参数。
- 建议：调 world 08 的 `guideSpawn` 或 `cameraDistance`，保证 guide 距相机 ≥5 且不贴画面边缘。

### 6. world 06（Sunlit Palace Gardens）严重糊 + 同伴竖排
- 现象：世界呈放射状涂抹/失焦（像开放低质 splat），非清晰封闭展厅；三名同伴竖排一列不成队形；画作斜立画架。
- 建议：该世界画质明显低于 01–05/07；建议重刷资产或降权，别作为默认。竖排队形叠加了 #3 的地面高差。

### 7. 画作未齐眼挂墙（多世界）
- 现象：多处画作落地斜立、或半空浮着（world 04 浮在水池上、final 立在杆子上）。
- 根因：`placementAt`（`src/render/WorldLayer.js:318`）先试 `wallPlacementAt` 挂墙，
  探针 `[0,1.48]/[0,0.62]/[0,2.34]/...`（:355）需 5 点全部命中墙且距离一致（:365-366）才算挂墙成功；
  命中失败就 fallback 到 `freestanding:true`（:340）落地画架（加支腿 :265-269）。
  开放/水面/无墙世界里挂墙必然失败 → 全变落地画架。
- 建议：放宽墙面探针容差、或对无墙世界给「立牌高度对齐齐眼(~1.5m)」而非落地；优先真实墙面 raycast。

## 次要问题
- 陈述阶段页脚步骤号残留 "WORLD EXPLORATION / 04"（学习地图/圆桌页仍显示旧步号）。
- 第 9 世界对话框标题残留上一场景 "The Infinite Repetition Chamber · Yayoi Kusama"，
  应为 "Your Dream World"（顶栏世界名已正确切换）——update 早触发/off-by-one，与 #1 同族。
- 入口面板 eyebrow（"01 / LIFE QUESTION" 等）与左侧 LEARNING PATH 07/08 行有轻微重叠。
- 同伴在多数世界 spawn 时背对相机。
- world 05 第 4 个同伴被裁在左上边缘（follow 展开过宽，PARTY_FORMATION_SLOTS side=±0.9）。
- 答案建议按钮发起的第一次 Ask 未渲染回复（inquiry-thread 空约 12s）；但 ASK 输入框正常
  （三位同伴 gpt-5.6 LIVE 实时、扣题、正确署名回复）——排查答案建议按钮那条提交路径。

## 做得好的地方（勿动）
- 全流程叙事闭环、GPT 实时对话扣题、圆桌带免责声明、宣言可编辑、第 9 世界明亮沉浸。
- world 01–05、07 渲染明亮、封闭、墙面挂画基本正常；走动不穿模。
- 角色 GLB 归一化到 1.75m 的逻辑正确，9 个模型身高一致。

---
交接语：讲解者名字全程卡 MONET，因为 `src/main.js:208 activateProcessScene` 切场景时从不调用
`view.setSpeaker`（只在 :85/:162 用 companions[0] 调过一次）——请按 `scene.guideId`（exhibitionSpine.js）
在切场景时调 `setSpeaker`。另：实测证明同伴身高其实都对(≈1.74m)、world 08 也没有巨人模型——真正的空间 bug 是
`src/render/WorldLayer.js:653-667 groundHeightAt` 在同一房间返回相差~0.4m 的地面高度（tolerance 2.5*scale 太宽），
导致同伴落地高低不齐/踩水面；请收紧候选地面面的筛选或落位后把整队 y 对齐 guide 的地面高度。
另把 `assets/portraits/{freud,qi-baishi,yayoi-kusama}.jpg`（1672×941 转身图）换成真头像。
