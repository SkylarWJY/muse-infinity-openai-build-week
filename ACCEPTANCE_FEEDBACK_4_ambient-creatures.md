# MUSE (4175) 氛围生物动画说明 — 让每个世界"有生命"（主题贴合，不突兀）

写给编码 agent：目标是给每个世界加入**会动的氛围生物**（鸟飞、蝶舞、鱼游等），纯背景点缀、玩家不互动。
关键要求：**每个世界选的生物必须贴合该世界的艺术家/主题，不能随便乱放**。
本文给出：为什么现在没有 → 通用实现类 → 每个世界配什么生物（含理由）→ 精确接入点(file:line) → 性能与验收。

---

## 前提认知（和角色动画同源）
会飞的鸟/会游的鱼要"自然动"，同样需要**带骨骼+动画的 GLB**（见 FEEDBACK_3）。
现在项目里除了 learner.glb，没有任何带动画的资产。所以这件事分两半：
(1) **拿到主题贴合的 rigged animated 生物 GLB**（资产）；(2) **写一个通用"生物群"系统循环播放+沿路径移动**（代码）。

免费带动画动物 GLB 来源（都能拿到 fly/swim/walk 动画）：
- **Quaternius**（quaternius.com，CC0 完全免费）：Animated Birds、Animated Fish、Butterflies、farm animals。
- **Poly Pizza**（poly.pizza）：搜 bird/butterfly/fish/koi/dragonfly，很多带动画、CC 授权。
- **Sketchfab**：筛选 Downloadable + Animated + CC，搜对应物种。
- 找不到现成的就用 **Tripo/Meshy** 生成再 auto-rig（同 FEEDBACK_3 的绑骨流程）。

---

## 每个世界配什么生物（主题贴合，这是重点）

原则：只选**该艺术家画里/该场景现实里真实会出现**的小生物，数量少、体量小、在中远景，不抢主体。

| # | 世界 | 主题 | 建议生物（贴合理由） | 运动方式 |
|---|---|---|---|---|
| 01 | Grand Conservatory 温室花园 | 温室/植物 | **蝴蝶 2-3 只 + 远处小鸟掠过** | 蝶：小范围随机悬停；鸟：偶尔横掠一次 |
| 02 | Elegant Floral Palace 花厅 | 华丽室内花卉 | **蝴蝶 2 只**（室内不宜放鸟，怕突兀） | 沿花丛低速游走 |
| 03 | Enchanted Water Garden 水园（莫奈睡莲） | 莫奈·水与光 | **锦鲤/鱼 3-4 条在水面下 + 蜻蜓 1-2 只贴水面** | 鱼：水下环形巡游；蜻蜓：贴水面点掠 |
| 04 | Dreamlike Coastal Villa 海岸别墅 | 海岸/地中海 | **海鸥 2-3 只在天上盘旋** | 高空大圈盘旋（贝塞尔环线） |
| 05 | Van Gogh Gallery 梵高麦田/星夜 | 梵高·《麦田群鸦》 | **乌鸦 3-5 只飞过**（梵高最标志性的意象） | 成群斜掠过天空，1 次/若干秒 |
| 06 | Sunlit Palace Gardens 阳光宫花园 | 齐白石·花鸟草虫 | **蜻蜓/小虫 + 1 只小鸟**（齐白石正是画草虫的） | 蜻蜓点掠、小鸟枝头跳 |
| 07 | Mexican Courtyard 墨西哥庭院（弗里达） | 弗里达·热带/动物 | **鹦鹉/热带鸟 1-2 只 + 蝴蝶**（弗里达画里常有鸟兽） | 鸟：庭院内短距飞行落枝；蝶：游走 |
| 08 | Yellow Infinity Room 无限镜屋（草间弥生） | 波点/抽象 | **不放写实生物**——改用**漂浮发光圆点/球粒**缓慢升降 | 粒子式上下漂浮（贴合波点主题） |
| 09 | Fantasy Shimmering Spheres 梦境答案世界 | 超现实梦境 | **发光萤火/光点 + 可选梦幻飞鸟剪影** | 缓慢漂浮的光点群 |

要点：
- **室内/抽象世界（02/08）不放写实动物**，否则突兀；08 用波点粒子最贴主题。
- **05 梵高放乌鸦**是点睛之笔——《麦田群鸦》是他最著名的画，观众一眼就懂。
- **03 莫奈水园放锦鲤+蜻蜓**直接呼应睡莲池。
- 数量克制：每世界 2-5 只小生物即可，多了掉帧也俗气。

---

## 通用实现：一个 `AmbientCreatures` 系统

### 1. 新建 `src/render/AmbientCreatures.js`
职责：加载该世界声明的生物 GLB → 建 AnimationMixer 循环播放 → 每帧沿预设路径移动/朝向 → 世界切换时清理。
结构（照抄 learner 的 mixer 用法 `src/render/LearnerAvatar.js:83-92,149`）：
```js
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { withTimeout } from "./withTimeout.js";

export class AmbientCreatures {
  constructor(scene, { loader = new GLTFLoader() } = {}) {
    this.scene = scene; this.loader = loader;
    this.group = new THREE.Group(); this.group.name = "ambient-creatures";
    this.scene.add(this.group);
    this.creatures = []; // {model, mixer, path, speed, phase, mode}
    this.token = 0;
  }

  async setWorld(worldId, specs = []) {           // specs 来自世界配置
    const token = ++this.token;
    this.clear();
    for (const spec of specs) {
      const gltf = await withTimeout(this.loader.loadAsync(spec.asset), 15000, "creature_timeout").catch(() => null);
      if (!gltf || token !== this.token) continue;
      const model = gltf.scene;
      model.scale.setScalar(spec.scale ?? 1);
      const mixer = new THREE.AnimationMixer(model);
      const clip = gltf.animations.find(c => new RegExp(spec.clip || "fly|swim|walk|idle", "i").test(c.name)) || gltf.animations[0];
      if (clip) mixer.clipAction(clip).play();
      // 生成 spec.count 个实例，各给不同 phase / 路径偏移
      for (let i = 0; i < (spec.count ?? 1); i++) {
        const inst = i === 0 ? model : THREE.SkeletonUtils.clone(model); // 多实例需 SkeletonUtils.clone
        const m = i === 0 ? mixer : new THREE.AnimationMixer(inst);
        if (i > 0 && clip) m.clipAction(clip).play();
        this.group.add(inst);
        this.creatures.push({ model: inst, mixer: m, spec, phase: Math.random() * Math.PI * 2 });
      }
    }
  }

  update(dt, elapsed) {
    for (const c of this.creatures) {
      c.mixer.update(dt);
      moveAlongPath(c, elapsed);   // 见下：按 mode 计算位置+朝向
    }
  }

  clear() { /* remove + dispose 所有 creature，参照 LearnerAvatar.dispose 的 dispose 逻辑 */ }
}
```
运动模式 `moveAlongPath`（按 spec.mode）：
- `"circle"`（海鸥/乌鸦盘旋、鱼巡游）：绕中心点画圆，`pos = center + R*(cos,sin)`，朝向=切线方向。
- `"drift"`（蝴蝶/蜻蜓/光点）：低速随机游走（用 elapsed 驱动的 sin 噪声在小 bbox 内漂）。
- `"flyby"`（鸟横掠）：每隔 T 秒从 bounds 一侧飞到另一侧，飞完停到下次触发。
- `"float"`（波点/萤火）：只在 Y 上正弦升降 + 微小水平漂。
所有位置都 clamp 在 `world.profile.bounds` 内、Y 用固定高度（鸟高空、鱼在 groundY 附近水下、蝶在 1~2m）。

### 2. 世界配置里声明生物
在 `src/config/legacyAssets.js` 每个世界对象加可选字段 `creatures`（没有就不生成）：
```js
// World 05 van-gogh 例：
creatures: [
  { asset: "/assets/creatures/crow.glb", clip: "fly", count: 4, scale: 0.5,
    mode: "flyby", height: 6, interval: 7 }
],
// World 03 water-garden 例：
creatures: [
  { asset: "/assets/creatures/koi.glb", clip: "swim", count: 4, scale: 0.4, mode: "circle", radius: 3, height: -0.2 },
  { asset: "/assets/creatures/dragonfly.glb", clip: "fly", count: 2, scale: 0.2, mode: "drift", height: 0.4 }
],
// World 08 infinity-room：不用 GLB，用粒子波点
creatures: [{ mode: "float", particle: "dots", count: 30, color: 0xffd43b }],
```
生物资产放 `assets/creatures/`。

### 3. 接进引擎（精确接入点）
`src/render/MuseumEngine.js`：
- **构造**：`:104-105` setupLights 之后加 `this.ambient = new AmbientCreatures(this.scene);`
- **世界切换**：在 `setWorld`/`applyWorldProfile` 加载世界后调
  `this.ambient.setWorld(world.id, world.creatures || []);`（world.creatures 来自配置）。
- **每帧更新**：`animate()` 的 :534 附近（`for (const actor of this.partyActors) actor.update(...)` 那几行）后加
  `this.ambient.update(dt.visual, this.elapsed);`
- **清理**：`AmbientCreatures.setWorld` 内部 `clear()` 已处理旧世界生物的 remove+dispose，切世界自动干净。

多实例注意：three 的骨骼模型克隆要用 `three/addons/utils/SkeletonUtils.js` 的 `clone()`，
普通 `.clone()` 不复制骨骼绑定。importmap 里加一条 `"three/addons/utils/SkeletonUtils.js"` 映射（照 index.html:15 的写法）。

---

## 性能与"不突兀"的分寸
- **总数控制**：每世界 GLB 生物 ≤ 6 个实例；波点/萤火用 `Points`/instancing 可到 30-50。
- **低多边形**：氛围生物用 low-poly（Quaternius 的都是），单个 <5k 面，别用高模。
- **中远景 + 小体量**：鸟在 5-8m 高空、鱼在水下、蝶体长按真实比例（scale 很小），不要糊在镜头前。
- **朝向要对**：移动时模型朝速度方向（`lookAt(pos+velocity)`），否则鸟"倒着飞"很出戏。
- **频率克制**：flyby 类 5-10 秒来一次就够，不要一直刷屏。
- **贴世界光照**：生物用 `MeshStandardMaterial` 受场景光照，别用 unlit，否则和世界脱节。

## 验收（console 自检，逐世界）
```js
const amb = window.__MUSE_APP__.engine.ambient;
console.log({ world: window.__MUSE_APP__.engine.activeWorld.id,
  creatureCount: amb?.creatures?.length,
  allAnimated: amb?.creatures?.every(c => c.mixer) });
```
目标：进对应世界后 creatureCount>0、allAnimated=true；切到别的世界后自动清零重建；帧率(`window.__MUSE_METRICS__.medianFps`)不明显下降。

---

## 分步落地建议（先做一个跑通）
1. 先做 **World 05 梵高 + 乌鸦**（主题最鲜明、最出效果）：下 1 个带 fly 动画的 crow GLB 放 `assets/creatures/crow.glb`。
2. 写 `AmbientCreatures.js`，只实现 `flyby` 模式，接进 MuseumEngine 三个点。
3. 验证乌鸦在梵高世界天空飞掠、切世界后消失。
4. 再补 `circle`/`drift`/`float` 模式，按上表给 03(锦鲤)、04(海鸥)、01(蝴蝶)、08(波点) 逐个配。
5. 02/07 室内世界少量点缀，谨慎放。

---
交接语：想在世界里加"鸟飞/鱼游"这类氛围生物，需要(1)主题贴合的带动画 GLB（Quaternius/Poly Pizza 免费，
梵高世界放乌鸦、莫奈水园放锦鲤+蜻蜓、海岸放海鸥、无限镜屋用波点粒子而非写实动物），
(2)新建 `src/render/AmbientCreatures.js` 用 AnimationMixer 循环播放+沿 circle/drift/flyby/float 路径移动（照抄
learner 的 mixer 用法 LearnerAvatar.js:83-92,149，多实例用 SkeletonUtils.clone），(3)接进 MuseumEngine：
构造在 :105 后 new、setWorld 里按 world.creatures 生成、animate() :534 后调 ambient.update、切世界自动 clear。
生物在 `src/config/legacyAssets.js` 每个世界加可选 `creatures:[...]` 声明；数量克制、低多边形、中远景，先做梵高乌鸦跑通再推广。
