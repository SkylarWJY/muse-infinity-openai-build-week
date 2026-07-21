import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DEFAULT_LEARNER_AVATAR_ID, getLearnerAvatar } from "../config/learnerAvatars.js";
import {
  archivedGaitCadence,
  configureStaticLimbMotion,
  createStaticLimbMotion,
  installStaticLimbShader,
  resolveArchivedMotionPose,
  updateStaticLimbMatrices
} from "./ArchivedAvatar.js";
import { ProceduralAvatar } from "./ProceduralAvatar.js";
import { withTimeout } from "./withTimeout.js";

export const LEARNER_ASSET = getLearnerAvatar(DEFAULT_LEARNER_AVATAR_ID).asset;
const WALK_GAIT_SPEED = 0.415;
const LOAD_TIMEOUT_MS = 15_000;

export class LearnerAvatar {
  constructor({ avatarId = DEFAULT_LEARNER_AVATAR_ID, asset, height, onStatus = () => {}, loader = new GLTFLoader(), loadTimeoutMs = LOAD_TIMEOUT_MS } = {}) {
    const configuredAvatar = requireLearnerAvatar(avatarId);
    this.avatar = Object.freeze({
      ...configuredAvatar,
      ...(asset ? { asset } : {}),
      ...(Number.isFinite(height) ? { height } : {})
    });
    this.asset = this.avatar.asset;
    this.height = this.avatar.height;
    this.onStatus = onStatus;
    this.loader = loader;
    this.loadTimeoutMs = loadTimeoutMs;
    this.group = new THREE.Group();
    this.group.name = "learner-avatar";
    this.group.userData.actor = "Learner";
    this.group.userData.avatarId = this.avatar.id;
    this.group.userData.asset = this.avatar.asset;
    this.group.userData.model = this.avatar.model;
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
    this.baseY = 0;
    this.phase = Math.random() * Math.PI * 2;
    const limbMotion = createStaticLimbMotion(this.avatar.motionProfile);
    this.motionAngles = limbMotion.angles;
    this.motionUniforms = limbMotion.uniforms;
    Object.assign(this.motionAngles, resolveLearnerMotionPose({ profile: this.avatar.motionProfile }));
    updateStaticLimbMatrices(this.motionUniforms, this.motionAngles);
    this.loadToken = 0;
    this.disposed = false;
  }

  async load(requestedAvatar = this.avatar) {
    if (this.disposed) return this;
    const token = ++this.loadToken;
    this.loaded = false;
    let candidateModel = null;
    try {
      const gltf = await withTimeout(this.loader.loadAsync(requestedAvatar.asset), this.loadTimeoutMs, "learner_timeout", {
        onLateResolve: (lateGltf) => disposeLearnerTree(lateGltf?.scene)
      });
      const model = gltf.scene;
      candidateModel = model;
      if (this.disposed || token !== this.loadToken) {
        disposeLearnerTree(model);
        return this;
      }
      const prepared = prepareLearnerModel(gltf, requestedAvatar, this.motionUniforms);
      this.releaseModel();
      if (this.fallback) {
        this.visual.remove(this.fallback.group);
        this.fallback.dispose();
        this.fallback = null;
      }
      this.avatar = requestedAvatar;
      this.asset = requestedAvatar.asset;
      this.height = requestedAvatar.height;
      this.model = model;
      this.baseY = prepared.baseY;
      this.mixer = prepared.mixer;
      this.actions = prepared.actions;
      this.activeAction = prepared.activeAction;
      candidateModel = null;
      this.visual.add(model);
      this.ready = true;
      this.group.userData.avatarId = requestedAvatar.id;
      this.group.userData.asset = requestedAvatar.asset;
      this.group.userData.model = requestedAvatar.model;
      this.group.userData.fallback = false;
      this.setMotion(this.speed, this.gesture, true);
      this.onStatus({ live: true, avatar: requestedAvatar, asset: requestedAvatar.asset, clips: model.userData.animationClips });
    } catch (error) {
      disposeLearnerTree(candidateModel);
      if (!this.disposed && token === this.loadToken) {
        if (!this.ready) {
          this.group.userData.model = "refined-procedural-v2";
          this.group.userData.fallback = true;
        }
        this.onStatus({ live: false, avatar: requestedAvatar, asset: requestedAvatar.asset, error });
      }
    } finally {
      if (!this.disposed && token === this.loadToken) this.loaded = true;
    }
    return this;
  }

  async setAvatar(avatarId) {
    const requestedAvatar = requireLearnerAvatar(avatarId);
    if (this.ready && requestedAvatar.id === this.avatar.id) {
      this.loadToken += 1;
      this.loaded = true;
      return this;
    }
    return this.load(requestedAvatar);
  }

  setMotion(speed, gesture = this.gesture, immediate = false) {
    this.speed = Number(speed) || 0;
    this.gesture = gesture;
    const motion = learnerMotionForSpeed(this.speed);
    this.group.userData.motion = motion;
    if (!this.ready) {
      this.fallback?.setMotion(this.speed, gesture);
      return;
    }
    if (this.avatar.motionMode !== "skeletal") return;
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
  }

  update(dt, elapsed) {
    if (!this.ready) {
      this.fallback?.update(dt, elapsed);
      return;
    }
    if (this.avatar.motionMode === "skeletal") {
      this.mixer.update(Math.max(0, dt));
      return;
    }
    const proceduralSpeed = clampLearnerProceduralSpeed(this.speed, this.avatar.motionProfile?.maxSpeed);
    const moving = THREE.MathUtils.clamp(Math.abs(proceduralSpeed) / 1.8, 0, 1);
    this.motionUniforms.footSeparation.value = (this.avatar.motionProfile?.footSeparation || 0) * moving;
    const phase = (Number(elapsed) || 0) * archivedGaitCadence(proceduralSpeed) + this.phase;
    const bobScale = motionProfileScale(this.avatar.motionProfile?.bobScale);
    const leanScale = motionProfileScale(this.avatar.motionProfile?.leanScale);
    const targetY = this.baseY + (Math.abs(Math.sin(phase)) * 0.018 * moving + Math.sin(phase * 0.24) * 0.003) * bobScale;
    const targetLean = Math.sin(phase) * 0.008 * moving * leanScale;
    const damping = 1 - Math.exp(-Math.max(0, dt) * 8);
    const pose = resolveLearnerMotionPose({ speed: proceduralSpeed, gesture: this.gesture, elapsed, phase: this.phase, profile: this.avatar.motionProfile });
    for (const key of Object.keys(this.motionAngles)) {
      this.motionAngles[key] += (pose[key] - this.motionAngles[key]) * damping;
    }
    updateStaticLimbMatrices(this.motionUniforms, this.motionAngles);
    this.model.position.y += (targetY - this.model.position.y) * damping;
    this.model.rotation.z += (targetLean - this.model.rotation.z) * damping;
  }

  releaseModel() {
    if (this.mixer && this.model) {
      this.mixer.stopAllAction();
      this.mixer.uncacheRoot(this.model);
    }
    if (this.model) this.visual.remove(this.model);
    disposeLearnerTree(this.model);
    this.model = null;
    this.mixer = null;
    this.actions = {};
    this.activeAction = null;
    this.ready = false;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.loadToken += 1;
    this.fallback?.dispose();
    this.fallback = null;
    this.releaseModel();
  }
}

function prepareLearnerModel(gltf, avatar, motionUniforms) {
  const model = gltf?.scene;
  if (!model) throw new Error("learner_scene_required");
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  if (!Number.isFinite(size.y) || size.y <= 0) throw new Error("invalid_learner_bounds");

  model.scale.setScalar(avatar.height / size.y);
  model.rotation.y = avatar.rotationY;
  model.updateMatrixWorld(true);
  const scaledBounds = new THREE.Box3().setFromObject(model);
  const baseY = -scaledBounds.min.y;
  model.position.y = baseY;

  let meshes = 0;
  let skinnedMeshes = 0;
  model.traverse((object) => {
    if (!object.isMesh) return;
    meshes += 1;
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
      if (avatar.motionMode === "procedural-limbs") installStaticLimbShader(material, motionUniforms);
      material.needsUpdate = true;
    }
  });
  if (!meshes) throw new Error("learner_mesh_required");

  const animationClips = Array.isArray(gltf.animations) ? gltf.animations : [];
  model.userData.animationClips = animationClips.map((clip) => clip.name);
  model.userData.sourceGradeSkinWeights = Boolean(avatar.sourceGradeSkinWeights);
  if (avatar.motionMode === "procedural-limbs") {
    configureStaticLimbMotion(motionUniforms, avatar.motionProfile);
    model.userData.motionRig = "procedural-limbs";
    return { baseY, mixer: null, actions: {}, activeAction: null };
  }
  if (avatar.motionMode !== "skeletal") throw new Error(`unknown_learner_motion_mode:${avatar.motionMode}`);
  if (!skinnedMeshes) throw new Error("learner_skin_required");
  const clips = resolveLearnerClips(animationClips);
  if (!clips.idle || !clips.walk) throw new Error("learner_idle_walk_required");
  const mixer = new THREE.AnimationMixer(model);
  const actions = {
    idle: prepareAction(mixer.clipAction(clips.idle)),
    walk: prepareAction(mixer.clipAction(clips.walk))
  };
  actions.idle.setEffectiveWeight(1).play();
  actions.walk.setEffectiveWeight(0).play();
  model.userData.motionRig = "skeletal-animation";
  return { baseY, mixer, actions, activeAction: actions.idle };
}

function requireLearnerAvatar(id) {
  const avatar = getLearnerAvatar(id);
  if (!avatar) throw new RangeError(`unknown_learner_avatar:${id}`);
  return avatar;
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

export function clampLearnerProceduralSpeed(speed, maxSpeed = 1.33) {
  const limit = Number.isFinite(maxSpeed) && maxSpeed > 0 ? maxSpeed : 1.33;
  return THREE.MathUtils.clamp(Number(speed) || 0, -limit, limit);
}

export function resolveLearnerMotionPose({ speed = 0, gesture = "open", elapsed = 0, phase = 0, profile = null } = {}) {
  const proceduralSpeed = clampLearnerProceduralSpeed(speed, profile?.maxSpeed);
  const pose = resolveArchivedMotionPose({ speed: proceduralSpeed, gesture, elapsed, phase });
  const armScale = motionProfileScale(profile?.armSwingScale);
  const elbowScale = motionProfileScale(profile?.elbowBendScale);
  const legScale = motionProfileScale(profile?.legSwingScale);
  const kneeScale = motionProfileScale(profile?.kneeBendScale);
  return {
    ...pose,
    leftArmX: scaledMotion(pose.leftArmX, armScale),
    rightArmX: scaledMotion(pose.rightArmX, armScale),
    leftArmZ: scaledMotion(pose.leftArmZ, armScale),
    rightArmZ: scaledMotion(pose.rightArmZ, armScale),
    leftElbowX: scaledMotion(pose.leftElbowX, elbowScale),
    rightElbowX: scaledMotion(pose.rightElbowX, elbowScale),
    leftLegX: scaledMotion(pose.leftLegX, legScale),
    rightLegX: scaledMotion(pose.rightLegX, legScale),
    leftKneeX: scaledMotion(pose.leftKneeX, kneeScale),
    rightKneeX: scaledMotion(pose.rightKneeX, kneeScale)
  };
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

function motionProfileScale(value) {
  return Number.isFinite(value) ? THREE.MathUtils.clamp(value, 0, 1) : 1;
}

function scaledMotion(value, scale) {
  return scale === 0 ? 0 : value * scale;
}
