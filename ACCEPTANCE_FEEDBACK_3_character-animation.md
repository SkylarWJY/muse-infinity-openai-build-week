# MUSE (4175) 角色动画说明 — 为什么姿势不能自然改变，怎么做到

写给编码 agent：本文解释"别人场景里恐龙/角色能自然摆各种姿势，我们的历史人物却僵硬"的**根本原因**，
并给出分档的实现路线。所有结论都有实测证据（GLB 内部结构 + 代码引用），不是猜测。

---

## 一句话答案
别人的角色能自然改姿势，是因为那些模型是**带骨骼(skeleton/skin)+动画片段(animation clips)的 rigged 模型**，
用 `AnimationMixer` 播放骨骼动画就能连续变换姿态。
而我们的 **8 个历史人物 GLB 是没有骨骼、没有动画、单节点的静态网格（static mesh）**——
它们物理上就没有"关节"可以动，所以只能靠一段顶点着色器**假装**摆手摆腿，姿势必然僵硬、无法自然变化。

**这不是调参能解决的，是资产本身缺骨骼。要自然动，必须换成 rigged 模型。**

---

## 实测证据

### 证据 1：learner（会走路的那个）vs 8 个历史人物（僵硬的）
用脚本读每个 GLB 的内部结构（`skins`=骨骼绑定，`animations`=动画片段）：

| 模型 | nodes | skins(骨骼) | animations(动画) | 能否真骨骼动画 |
|---|---|---|---|---|
| **learner.glb** | 43 | **1** | **2** [biped:wait, biped:walk] | ✅ 能 |
| monet.glb | 1 | 0 | 0 | ❌ 不能 |
| van-gogh.glb | 1 | 0 | 0 | ❌ 不能 |
| socrates.glb | 1 | 0 | 0 | ❌ 不能 |
| frida / picasso / freud / qi-baishi / yayoi-kusama | 1 | 0 | 0 | ❌ 不能 |

- learner 有 43 个节点（=骨架的骨头）、1 个 skin（蒙皮绑定）、2 段动画 → 真正的 rigged 角色。
- 8 个历史人物都是 **1 个节点、0 骨骼、0 动画、0 morph target** → 就是一坨静态网格，像一尊雕像。

### 证据 2：代码里两条完全不同的路径
- **learner 走真骨骼动画**（`src/render/LearnerAvatar.js`）：
  - `:82` 强制要求 `skinnedMeshes>0`（没蒙皮就报错 fallback）
  - `:83-92` 取出 idle/walk 两段 clip，建 `AnimationMixer`，`clipAction().play()`
  - `:149` 每帧 `mixer.update(dt)` → 骨骼驱动网格，姿势平滑连续
  - `setMotion`（:120-142）用 `crossFadeTo` 在 idle↔walk 之间平滑过渡

- **8 个历史人物走"顶点着色器假动作"**（`src/render/ArchivedAvatar.js`）：
  - 它们没骨骼，所以 `ArchivedAvatar` 注入一段自定义 shader（`installMotionShader` :174-183，
    `motionPositionShader` :262-305），在 GPU 里**按顶点的 x/y 位置猜哪块是胳膊/腿**，
    然后用固定的旋转矩阵去掰那些顶点（`museArmMask`/`museLegMask` :221-229）。
  - 这是"用数学硬掰一块静态网格"，只能做预设的摆手/摆腿/指向三种（`resolveArchivedMotionPose` :137-172），
    掰多了会撕裂网格。**本质是障眼法，不是动画，所以僵硬、不能自然变姿势。**

---

## 为什么会这样（资产管线的差异）
- learner 是用 `gpt-image-2 → Tripo v3.1 biped v2` 生成的（见 `LearnerAvatar.js:21`），
  Tripo 这类工具会自动**绑骨骼 + 附带 idle/walk 动画**，导出的 GLB 自带 rig。
- 8 个历史人物大概率是从图片/照片直接生成的**静态 3D 网格**（photogrammetry 或 image-to-3D 的无骨版本），
  没经过绑骨(auto-rig)这一步，所以是雕像。
- 别人的"恐龙能各种姿势"，是因为他们的恐龙模型本身就是 rigged 的（有脊椎/四肢/尾巴骨骼），
  换个动画 clip 或用 IK 就能摆姿势。**差别 100% 在资产，不在渲染代码。**

---

## 怎么做（三档，按投入从低到高）

### 档位 1（最快见效）：给 8 个历史人物做 auto-rig + 套用 learner 的动画
思路：把静态人物网格自动绑上人形骨架，再复用 learner 已有的 idle/walk（以及可加的 gesture 动画）。
1. **auto-rig**：用 Tripo/Meshy/Mixamo/Rokoko 这类工具给每个人物 GLB 自动绑骨。
   - Mixamo 免费：上传 GLB/FBX → 自动绑人形骨 → 直接下载带一堆动画（idle/walk/talk/point/think）的 FBX，
     再转 GLB。因为都是标准人形骨架，**一套动画可套用到所有人物**。
   - 若要和 learner 骨架完全一致以便共享 clip，就用生成 learner 的同一条 Tripo biped 管线重绑。
2. **改代码走 learner 那条路**：让 `ArchivedAvatar` 也检测 `skinnedMeshes>0`——
   有骨骼就建 `AnimationMixer` 播 clip（照抄 `LearnerAvatar.js:82-92,120-150` 的逻辑），
   没骨骼才退回现在的 shader 假动作。这样新老资产都能用，渐进替换。
3. **删/降级顶点 shader 假动作**：一旦人物有真骨骼，`ArchivedAvatar.js` 的 `installMotionShader`
   及整套 `motionPositionShader`（:174-305）就不再需要，可以关掉，姿势立刻自然。

### 档位 2（更丰富）：加手势/情绪动画库，按对话状态切换
有了骨骼后，姿势可以跟着"讲解者在说话/思考/指画"变化：
1. 给每个人物准备一组标准 clip：`idle / walk / talk / point / think / greet`（Mixamo 直接有）。
2. 在 `GuideDirector`（`src/render/GuideDirector.js`，已有 `walking/pointing/asking/reflecting` 状态机）
   的状态切换里，调 `avatar.playClip('point')` 等，用 `crossFadeTo(0.2s)` 平滑过渡（learner 已有范式）。
3. 说话时可叠加轻微的 additive idle（呼吸/重心晃动），让站立时也不僵。

### 档位 3（最自然）：程序化 IK / 看向 / 物理次级动作
真正"像活的"再往上加：
- **看向(LookAt)**：让头/眼随 visitor 或画作转（`THREE` 可用骨骼 quaternion slerp 或简单 bone lookAt）。
- **IK**：脚踩地面对齐（配合另一份报告里 groundHeightAt 的落地问题，用 IK 让脚贴地不悬空）、
  手指向画作。可用 `three-ik` 或自写两段式 IK。
- **次级动作**：衣摆/头发用简单弹簧骨骼(spring bones)随走动摆动。
这一档工作量大，建议先做档 1/2 拿到"能自然摆姿势"的效果，再按需加。

---

## 给这个项目的最小可行建议（推荐先做档 1）
1. 选 1 个人物（如 monet）先跑通：Mixamo auto-rig → 导出带 idle/walk/talk/point 的 GLB → 替换 `assets/characters/monet.glb`。
2. 改 `ArchivedAvatar.js`：`load()` 里检测 `object.isSkinnedMesh`，有骨骼就走 `AnimationMixer`（照抄 learner），
   `update(dt)` 里 `this.mixer?.update(dt)`；无骨骼保留现有 shader 兜底。
3. 验证 monet 姿势自然后，把其余 7 个人物同样重绑替换。
4. 全部替换后，移除 `installMotionShader`/`motionPositionShader` 那套假动作代码。

**关键认知**：现在的僵硬 100% 是因为 8 个人物 GLB 没骨骼(skins=0/animations=0)。
渲染代码没错、参数也调不好这个——**必须换成 rigged 模型**。learner 已经证明"有骨骼就能自然动"，
照它的路子把历史人物也变成 rigged 即可。

---
交接语：8 个历史人物僵硬是因为它们的 GLB 是静态网格（实测 skins=0 / animations=0 / 单节点），
只能靠 `src/render/ArchivedAvatar.js:174-305` 的顶点着色器假装摆手摆腿；而会走路的 learner.glb 有骨骼
(skins=1)+2 段动画、走 `src/render/LearnerAvatar.js:82-149` 的 `AnimationMixer` 真骨骼动画。要让人物能自然
改姿势，必须给这 8 个模型 auto-rig（Mixamo/Tripo 绑人形骨+套 idle/walk/talk/point 动画）替换掉静态版，
并让 `ArchivedAvatar` 在检测到 skinnedMesh 时改走 learner 那套 AnimationMixer 逻辑——这是资产问题，不是调参能解决的。
