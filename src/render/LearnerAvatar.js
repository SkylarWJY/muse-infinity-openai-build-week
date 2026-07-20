import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ProceduralAvatar } from "./ProceduralAvatar.js";
import { withTimeout } from "./withTimeout.js";

export const LEARNER_ASSET = "/assets/characters/learner.glb";
const WALK_GAIT_SPEED = 0.415;
const LOAD_TIMEOUT_MS = 15_000;

export class LearnerAvatar {
  constructor({ asset = LEARNER_ASSET, height = 1.76, onStatus = () => {}, loader = new GLTFLoader(), loadTimeoutMs = LOAD_TIMEOUT_MS } = {}) {
    this.asset = asset;
    this.height = height;
    this.onStatus = onStatus;
    this.loader = loader;
    this.loadTimeoutMs = loadTimeoutMs;
    this.group = new THREE.Group();
    this.group.name = "learner-avatar";
    this.group.userData.actor = "Learner";
    this.group.userData.asset = asset;
    this.group.userData.model = "gpt-image-2-tripo-v31-biped-v2";
    this.group.userData.motion = "idle";
    this.group.userData.fallback = true;

    this.visual = new THREE.Group();
    this.group.add(this.visual);
    this.fallback = new ProceduralAvatar({ coat: 0xe7e2d7, accent: 0xff6b4a, skin: 0x704737, scale: 0.78, name: "Learner" });
    this.visual.add(this.fallback.group);

    this.model = null;
    this.mixer = null;
    this.actions = {};
    this.activeAction = null;
    this.ready = false;
    this.loaded = false;
    this.speed = 0;
    this.gesture = "open";
    this.loadToken = 0;
    this.disposed = false;
  }

  async load() {
    const token = ++this.loadToken;
    let candidateModel = null;
    try {
      const gltf = await withTimeout(this.loader.loadAsync(this.asset), this.loadTimeoutMs, "learner_timeout", {
        onLateResolve: (lateGltf) => disposeLearnerTree(lateGltf?.scene)
      });
      const model = gltf.scene;
      candidateModel = model;
      if (this.disposed || token !== this.loadToken) {
        disposeLearnerTree(model);
        return this;
      }
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      if (!Number.isFinite(size.y) || size.y <= 0) throw new Error("invalid_learner_bounds");

      model.scale.setScalar(this.height / size.y);
      // Tripo exports this rig facing +X; the museum locomotion contract uses local +Z.
      model.rotation.y = -Math.PI / 2;
      model.updateMatrixWorld(true);
      const scaledBounds = new THREE.Box3().setFromObject(model);
      model.position.y = -scaledBounds.min.y;

      let skinnedMeshes = 0;
      model.traverse((object) => {
        if (!object.isMesh) return;
        if (object.isSkinnedMesh) skinnedMeshes += 1;
        object.castShadow = false;
        object.receiveShadow = false;
        object.frustumCulled = false;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          if (!material) continue;
          if ("transmission" in material) material.transmission = 0;
          material.transparent = false;
          material.depthWrite = true;
          material.needsUpdate = true;
        }
      });
      if (!skinnedMeshes) throw new Error("learner_skin_required");
      const clips = resolveLearnerClips(gltf.animations);
      if (!clips.idle || !clips.walk) throw new Error("learner_idle_walk_required");
      this.mixer = new THREE.AnimationMixer(model);
      this.actions = {
        idle: prepareAction(this.mixer.clipAction(clips.idle)),
        walk: prepareAction(this.mixer.clipAction(clips.walk))
      };
      this.actions.idle.setEffectiveWeight(1).play();
      this.actions.walk.setEffectiveWeight(0).play();
      this.activeAction = this.actions.idle;

      model.userData.motionRig = "skeletal-animation";
      model.userData.animationClips = gltf.animations.map((clip) => clip.name);
      model.userData.sourceGradeSkinWeights = true;
      this.visual.remove(this.fallback.group);
      this.fallback.dispose();
      this.fallback = null;
      this.model = model;
      candidateModel = null;
      this.visual.add(model);
      this.ready = true;
      this.group.userData.fallback = false;
      this.setMotion(this.speed, this.gesture, true);
      this.onStatus({ live: true, asset: this.asset, clips: model.userData.animationClips });
    } catch (error) {
      disposeLearnerTree(candidateModel);
      if (!this.disposed && token === this.loadToken) {
        this.group.userData.model = "refined-procedural-v2";
        this.group.userData.fallback = true;
        this.onStatus({ live: false, asset: this.asset, error });
      }
    } finally {
      if (!this.disposed && token === this.loadToken) this.loaded = true;
    }
    return this;
  }

  setMotion(speed, gesture = this.gesture, immediate = false) {
    this.speed = Number(speed) || 0;
    this.gesture = gesture;
    if (!this.ready) {
      this.fallback?.setMotion(this.speed, gesture);
      return;
    }

    const motion = learnerMotionForSpeed(this.speed);
    const next = this.actions[motion];
    this.actions.walk.setEffectiveTimeScale(THREE.MathUtils.clamp(Math.abs(this.speed) / WALK_GAIT_SPEED, 0.8, 4.2));
    if (next !== this.activeAction) {
      next.reset().setEffectiveWeight(1).play();
      if (immediate) {
        this.activeAction.stop();
        next.setEffectiveWeight(1);
      } else {
        this.activeAction.crossFadeTo(next, 0.22, true);
      }
      this.activeAction = next;
    }
    this.group.userData.motion = motion;
  }

  update(dt, elapsed) {
    if (!this.ready) {
      this.fallback?.update(dt, elapsed);
      return;
    }
    this.mixer.update(Math.max(0, dt));
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.loadToken += 1;
    if (this.mixer && this.model) {
      this.mixer.stopAllAction();
      this.mixer.uncacheRoot(this.model);
    }
    this.fallback?.dispose();
    this.fallback = null;
    disposeLearnerTree(this.model);
    this.model = null;
  }
}

function disposeLearnerTree(root) {
  const textures = new Set();
  root?.traverse?.((object) => {
    object.geometry?.dispose?.();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!material) continue;
      for (const value of Object.values(material)) {
        if (value?.isTexture) textures.add(value);
      }
      material.dispose?.();
    }
  });
  for (const texture of textures) texture.dispose();
}

export function learnerMotionForSpeed(speed) {
  return Math.abs(Number(speed) || 0) > 0.08 ? "walk" : "idle";
}

export function resolveLearnerClips(clips = []) {
  const find = (name) => clips.find((clip) => String(clip?.name || "").toLowerCase().includes(name)) || null;
  return {
    idle: find("idle") || find("biped:wait") || find("standing_relax"),
    walk: find("walk")
  };
}

function prepareAction(action) {
  action.enabled = true;
  action.clampWhenFinished = false;
  action.setLoop(THREE.LoopRepeat, Infinity);
  return action;
}
