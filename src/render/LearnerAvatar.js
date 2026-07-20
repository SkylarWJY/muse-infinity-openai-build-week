import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ProceduralAvatar } from "./ProceduralAvatar.js";

export const LEARNER_ASSET = "/assets/characters/learner.glb";

export class LearnerAvatar {
  constructor({ asset = LEARNER_ASSET, height = 1.76, onStatus = () => {} } = {}) {
    this.asset = asset;
    this.height = height;
    this.onStatus = onStatus;
    this.group = new THREE.Group();
    this.group.name = "learner-avatar";
    this.group.userData.actor = "Learner";
    this.group.userData.asset = asset;
    this.group.userData.model = "gpt-image-2-tripo-rig-v1";
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
  }

  async load() {
    try {
      const gltf = await new GLTFLoader().loadAsync(this.asset);
      const model = gltf.scene;
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
      const correctedWeights = sanitizeLearnerSkinWeights(model);

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
      model.userData.correctedSkinWeights = correctedWeights;
      this.visual.remove(this.fallback.group);
      this.fallback.dispose();
      this.fallback = null;
      this.model = model;
      this.visual.add(model);
      this.ready = true;
      this.group.userData.fallback = false;
      this.setMotion(this.speed, this.gesture, true);
      this.onStatus({ live: true, asset: this.asset, clips: model.userData.animationClips });
    } catch (error) {
      this.group.userData.model = "refined-procedural-v2";
      this.group.userData.fallback = true;
      this.onStatus({ live: false, asset: this.asset, error });
    } finally {
      this.loaded = true;
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
    this.actions.walk.setEffectiveTimeScale(THREE.MathUtils.clamp(Math.abs(this.speed) / 1.9, 0.72, 1.55));
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
    if (this.mixer && this.model) {
      this.mixer.stopAllAction();
      this.mixer.uncacheRoot(this.model);
    }
    this.fallback?.dispose();
    const textures = new Set();
    this.model?.traverse((object) => {
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
}

export function learnerMotionForSpeed(speed) {
  return Math.abs(Number(speed) || 0) > 0.08 ? "walk" : "idle";
}

export function resolveLearnerClips(clips = []) {
  const find = (name) => clips.find((clip) => String(clip?.name || "").toLowerCase().includes(name)) || null;
  return { idle: find("idle"), walk: find("walk") };
}

export function sanitizeLearnerSkinWeights(model) {
  let corrected = 0;
  model.traverse((mesh) => {
    if (!mesh.isSkinnedMesh) return;
    const position = mesh.geometry.getAttribute("position");
    const skinIndex = mesh.geometry.getAttribute("skinIndex");
    const skinWeight = mesh.geometry.getAttribute("skinWeight");
    if (!position || !skinIndex || !skinWeight) return;

    const lowerLimbJoints = new Set();
    mesh.skeleton.bones.forEach((bone, index) => {
      if (/tripo(?:::)?1_(?:right|left)_limb/i.test(bone.name)) lowerLimbJoints.add(index);
    });

    for (let vertex = 0; vertex < position.count; vertex += 1) {
      const y = position.getY(vertex);
      const lateral = Math.abs(position.getZ(vertex));
      if (y <= 1.2 && (y <= 0.55 || lateral <= 0.25)) continue;

      const joints = [skinIndex.getX(vertex), skinIndex.getY(vertex), skinIndex.getZ(vertex), skinIndex.getW(vertex)];
      const weights = [skinWeight.getX(vertex), skinWeight.getY(vertex), skinWeight.getZ(vertex), skinWeight.getW(vertex)];
      let changed = false;
      for (let slot = 0; slot < weights.length; slot += 1) {
        if (lowerLimbJoints.has(joints[slot]) && weights[slot] > 0.02) {
          weights[slot] = 0;
          changed = true;
        }
      }
      if (!changed) continue;
      const total = weights.reduce((sum, value) => sum + value, 0);
      if (total <= 0.0001) continue;
      skinWeight.setXYZW(vertex, ...weights.map((value) => value / total));
      corrected += 1;
    }
    if (corrected) skinWeight.needsUpdate = true;
  });
  return corrected;
}

function prepareAction(action) {
  action.enabled = true;
  action.clampWhenFinished = false;
  action.setLoop(THREE.LoopRepeat, Infinity);
  return action;
}
