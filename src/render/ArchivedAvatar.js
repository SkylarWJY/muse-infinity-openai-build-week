import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ProceduralAvatar } from "./ProceduralAvatar.js";
import { withTimeout } from "./withTimeout.js";

const MOTION_KEYS = ["leftArmX", "rightArmX", "leftArmZ", "rightArmZ", "leftElbowX", "rightElbowX", "leftLegX", "rightLegX", "leftKneeX", "rightKneeX"];
const ROTATION_UNIFORMS = ["leftArmMatrix", "rightArmMatrix", "leftElbowMatrix", "rightElbowMatrix", "leftLegMatrix", "rightLegMatrix", "leftKneeMatrix", "rightKneeMatrix"];
const LOAD_TIMEOUT_MS = 15_000;

export class ArchivedAvatar {
  constructor({ companion, height = 1.75, onStatus = () => {}, loader = new GLTFLoader(), loadTimeoutMs = LOAD_TIMEOUT_MS } = {}) {
    if (!companion) throw new Error("companion_required");
    this.companion = companion;
    this.height = height;
    this.onStatus = onStatus;
    this.loader = loader;
    this.loadTimeoutMs = loadTimeoutMs;
    this.group = new THREE.Group();
    this.group.name = `archived-avatar-${companion.id}`;
    this.group.userData.actor = companion.fullName;
    this.group.userData.asset = companion.model;
    this.group.userData.motion = "idle";
    this.visual = new THREE.Group();
    this.group.add(this.visual);
    this.fallback = new ProceduralAvatar({ coat: 0x263432, accent: colorNumber(companion.color), skin: 0x8f604d, scale: 0.82, name: companion.fullName });
    this.visual.add(this.fallback.group);
    this.model = null;
    this.ready = false;
    this.speed = 0;
    this.gesture = "open";
    this.phase = Math.random() * Math.PI * 2;
    this.baseY = 0;
    this.pose = resolveArchivedMotionPose();
    const limbMotion = createStaticLimbMotion();
    this.motionAngles = limbMotion.angles;
    this.motionUniforms = limbMotion.uniforms;
    this.loadToken = 0;
    this.disposed = false;
  }

  async load() {
    const token = ++this.loadToken;
    let candidateModel = null;
    try {
      const gltf = await withTimeout(this.loader.loadAsync(this.companion.model), this.loadTimeoutMs, "companion_timeout", {
        onLateResolve: (lateGltf) => disposeAvatarTree(lateGltf?.scene)
      });
      const model = gltf.scene;
      candidateModel = model;
      if (this.disposed || token !== this.loadToken) {
        disposeAvatarTree(model);
        return this;
      }
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      if (!Number.isFinite(size.y) || size.y <= 0) throw new Error("invalid_character_bounds");
      model.scale.setScalar(this.height / size.y);
      model.updateMatrixWorld(true);
      const scaled = new THREE.Box3().setFromObject(model);
      this.baseY = -scaled.min.y;
      model.position.y = this.baseY;
      model.traverse((object) => {
        if (!object.isMesh) return;
        object.castShadow = false;
        object.receiveShadow = false;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          if (!material) continue;
          material.transmission = 0;
          material.transparent = false;
          installMotionShader(material, this.motionUniforms);
          material.needsUpdate = true;
        }
      });
      model.userData.motionRig = "procedural-limbs";
      this.visual.remove(this.fallback.group);
      this.fallback.dispose();
      this.fallback = null;
      this.model = model;
      candidateModel = null;
      this.visual.add(model);
      this.ready = true;
      this.onStatus({ live: true, companion: this.companion });
    } catch (error) {
      disposeAvatarTree(candidateModel);
      if (!this.disposed && token === this.loadToken) this.onStatus({ live: false, companion: this.companion, error });
    }
    return this;
  }

  setMotion(speed, gesture = this.gesture) {
    this.speed = Number(speed) || 0;
    this.gesture = gesture;
    this.group.userData.motion = Math.abs(this.speed) > 0.01
      ? "walk"
      : gesture === "open" ? "idle" : gesture;
    if (!this.ready) this.fallback?.setMotion(this.speed, gesture);
  }

  update(dt, elapsed) {
    if (!this.ready) {
      this.fallback?.update(dt, elapsed);
      return;
    }
    const moving = Math.min(1, Math.abs(this.speed) / 1.8);
    const step = Math.sin(elapsed * archivedGaitCadence(this.speed) + this.phase);
    const targetY = this.baseY + Math.abs(step) * 0.025 * moving + Math.sin(elapsed * 1.4 + this.phase) * 0.006;
    const targetLean = step * 0.008 * moving + (this.gesture === "reflect" ? -0.018 : 0);
    const damping = 1 - Math.exp(-dt * 8);
    this.pose = resolveArchivedMotionPose({ speed: this.speed, gesture: this.gesture, elapsed, phase: this.phase });
    for (const key of MOTION_KEYS) this.motionAngles[key] += (this.pose[key] - this.motionAngles[key]) * damping;
    updateMotionMatrices(this.motionUniforms, this.motionAngles);
    this.model.position.y += (targetY - this.model.position.y) * damping;
    this.model.rotation.z += (targetLean - this.model.rotation.z) * damping;
    this.model.rotation.x += (0 - this.model.rotation.x) * damping;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.loadToken += 1;
    this.ready = false;
    disposeAvatarTree(this.group);
  }
}

function disposeAvatarTree(root) {
  const textures = new Set();
  root?.traverse?.((object) => {
    object.geometry?.dispose?.();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!material) continue;
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      material.dispose?.();
    }
  });
  for (const texture of textures) texture.dispose();
}

export function resolveArchivedMotionPose({ speed = 0, gesture = "open", elapsed = 0, phase = 0 } = {}) {
  const moving = Math.min(1, Math.abs(Number(speed) || 0) / 1.8);
  const cycle = elapsed * archivedGaitCadence(speed) + phase;
  const stride = Math.sin(cycle) * 0.72 * moving;
  const idle = Math.sin(elapsed * 1.7 + phase) * (1 - moving);
  const pose = {
    leftArmX: -stride * 0.72 + idle * 0.045,
    rightArmX: stride * 0.72 - idle * 0.045,
    leftArmZ: -0.04 * (1 - moving),
    rightArmZ: 0.04 * (1 - moving),
    leftElbowX: Math.max(0, stride) * 0.42 + Math.abs(stride) * 0.08,
    rightElbowX: Math.max(0, -stride) * 0.42 + Math.abs(stride) * 0.08,
    leftLegX: stride,
    rightLegX: -stride,
    leftKneeX: Math.max(0, stride) * 0.58,
    rightKneeX: Math.max(0, -stride) * 0.58
  };

  if (moving > 0.01) return pose;
  if (gesture === "point") {
    pose.rightArmX = -1.08 + idle * 0.025;
    pose.rightArmZ = 0.08;
    pose.rightElbowX = 0.12;
  } else if (gesture === "reflect") {
    pose.rightArmX = -0.68 + idle * 0.025;
    pose.rightArmZ = -0.12;
    pose.rightElbowX = -0.48;
    pose.leftArmZ = -0.1;
  } else if (gesture === "listen") {
    pose.leftArmZ = -0.055 - idle * 0.012;
    pose.rightArmZ = 0.055 + idle * 0.012;
    pose.leftElbowX = 0.025;
    pose.rightElbowX = 0.025;
  } else {
    pose.leftArmZ = -0.18 - idle * 0.025;
    pose.rightArmZ = 0.18 + idle * 0.025;
    pose.leftElbowX = 0.08 + Math.max(0, idle) * 0.08;
    pose.rightElbowX = 0.08 + Math.max(0, -idle) * 0.08;
  }
  return pose;
}

export function archivedGaitCadence(speed) {
  return THREE.MathUtils.clamp(Math.abs(Number(speed) || 0) * 4.5, 2.8, 10.5);
}

export function createStaticLimbMotion(profile) {
  const angles = { ...resolveArchivedMotionPose() };
  const uniforms = {
    ...Object.fromEntries(ROTATION_UNIFORMS.map((key) => [key, { value: new THREE.Matrix3() }])),
    legUpperY: { value: 0.035 },
    legBlendWidth: { value: 0.115 },
    footSeparation: { value: 0 }
  };
  configureStaticLimbMotion(uniforms, profile);
  updateMotionMatrices(uniforms, angles);
  return { angles, uniforms };
}

export function configureStaticLimbMotion(uniforms, profile = {}) {
  if (Number.isFinite(profile?.legUpperY)) uniforms.legUpperY.value = profile.legUpperY;
  if (Number.isFinite(profile?.legBlendWidth) && profile.legBlendWidth > 0) uniforms.legBlendWidth.value = profile.legBlendWidth;
  uniforms.footSeparation.value = 0;
}

export function installStaticLimbShader(material, uniforms) {
  installMotionShader(material, uniforms);
}

export function updateStaticLimbMatrices(uniforms, angles) {
  updateMotionMatrices(uniforms, angles);
}

function installMotionShader(material, uniforms) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${motionShaderPars()}`)
      .replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>\n${motionNormalShader()}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n${motionPositionShader()}`);
  };
  material.customProgramCacheKey = () => "muse-archived-avatar-motion-v4";
}

function updateMotionMatrices(uniforms, pose) {
  setCombinedRotation(uniforms.leftArmMatrix.value, pose.leftArmX, pose.leftArmZ);
  setCombinedRotation(uniforms.rightArmMatrix.value, pose.rightArmX, pose.rightArmZ);
  setXRotation(uniforms.leftElbowMatrix.value, pose.leftElbowX);
  setXRotation(uniforms.rightElbowMatrix.value, pose.rightElbowX);
  setXRotation(uniforms.leftLegMatrix.value, pose.leftLegX);
  setXRotation(uniforms.rightLegMatrix.value, pose.rightLegX);
  setXRotation(uniforms.leftKneeMatrix.value, pose.leftKneeX);
  setXRotation(uniforms.rightKneeMatrix.value, pose.rightKneeX);
}

function setCombinedRotation(matrix, xAngle, zAngle) {
  const sx = Math.sin(xAngle);
  const cx = Math.cos(xAngle);
  const sz = Math.sin(zAngle);
  const cz = Math.cos(zAngle);
  matrix.set(cz, -sz * cx, sz * sx, sz, cz * cx, -cz * sx, 0, sx, cx);
}

function setXRotation(matrix, angle) {
  const sine = Math.sin(angle);
  const cosine = Math.cos(angle);
  matrix.set(1, 0, 0, 0, cosine, -sine, 0, sine, cosine);
}

function motionShaderPars() {
  return `
uniform mat3 leftArmMatrix;
uniform mat3 rightArmMatrix;
uniform mat3 leftElbowMatrix;
uniform mat3 rightElbowMatrix;
uniform mat3 leftLegMatrix;
uniform mat3 rightLegMatrix;
uniform mat3 leftKneeMatrix;
uniform mat3 rightKneeMatrix;
uniform float legUpperY;
uniform float legBlendWidth;
uniform float footSeparation;

float museArmMask(float x, float y, float side) {
  float horizontal = smoothstep(0.12, 0.23, x * side);
  float vertical = smoothstep(-0.5, -0.3, y) * (1.0 - smoothstep(0.62, 0.74, y));
  return horizontal * vertical;
}

float museLegMask(float x, float y, float side) {
  float horizontal = smoothstep(-0.035, 0.075, x * side);
  float vertical = 1.0 - smoothstep(legUpperY - legBlendWidth, legUpperY, y);
  return horizontal * vertical;
}
`;
}

function motionNormalShader() {
  return `
float museRightArmNormal = museArmMask(position.x, position.y, 1.0);
float museLeftArmNormal = museArmMask(position.x, position.y, -1.0);
float museRightElbowNormal = museRightArmNormal * (1.0 - smoothstep(0.08, 0.22, position.y));
float museLeftElbowNormal = museLeftArmNormal * (1.0 - smoothstep(0.08, 0.22, position.y));
float museRightLegNormal = museLegMask(position.x, position.y, 1.0);
float museLeftLegNormal = museLegMask(position.x, position.y, -1.0);
float museRightKneeNormal = museRightLegNormal * (1.0 - smoothstep(-0.6, -0.44, position.y));
float museLeftKneeNormal = museLeftLegNormal * (1.0 - smoothstep(-0.6, -0.44, position.y));
if (museRightArmNormal > 0.0) {
  objectNormal = normalize(mix(objectNormal, rightArmMatrix * objectNormal, museRightArmNormal));
  objectNormal = normalize(mix(objectNormal, rightElbowMatrix * objectNormal, museRightElbowNormal));
}
if (museLeftArmNormal > 0.0) {
  objectNormal = normalize(mix(objectNormal, leftArmMatrix * objectNormal, museLeftArmNormal));
  objectNormal = normalize(mix(objectNormal, leftElbowMatrix * objectNormal, museLeftElbowNormal));
}
if (museRightLegNormal > 0.0) {
  objectNormal = normalize(mix(objectNormal, rightLegMatrix * objectNormal, museRightLegNormal));
  objectNormal = normalize(mix(objectNormal, rightKneeMatrix * objectNormal, museRightKneeNormal));
}
if (museLeftLegNormal > 0.0) {
  objectNormal = normalize(mix(objectNormal, leftLegMatrix * objectNormal, museLeftLegNormal));
  objectNormal = normalize(mix(objectNormal, leftKneeMatrix * objectNormal, museLeftKneeNormal));
}
`;
}

function motionPositionShader() {
  return `
float museRightArm = museArmMask(position.x, position.y, 1.0);
float museLeftArm = museArmMask(position.x, position.y, -1.0);
float museRightElbow = museRightArm * (1.0 - smoothstep(0.08, 0.22, position.y));
float museLeftElbow = museLeftArm * (1.0 - smoothstep(0.08, 0.22, position.y));
float museRightLeg = museLegMask(position.x, position.y, 1.0);
float museLeftLeg = museLegMask(position.x, position.y, -1.0);
float museRightKnee = museRightLeg * (1.0 - smoothstep(-0.6, -0.44, position.y));
float museLeftKnee = museLeftLeg * (1.0 - smoothstep(-0.6, -0.44, position.y));

vec3 museRightShoulder = vec3(0.22, 0.48, 0.0);
vec3 museLeftShoulder = vec3(-0.22, 0.48, 0.0);
vec3 museRightHip = vec3(0.11, -0.08, 0.0);
vec3 museLeftHip = vec3(-0.11, -0.08, 0.0);
if (museRightArm > 0.0) {
  vec3 museRightArmPosition = museRightShoulder + rightArmMatrix * (transformed - museRightShoulder);
  transformed = mix(transformed, museRightArmPosition, museRightArm);
  vec3 museRightElbowPivot = museRightShoulder + rightArmMatrix * (vec3(0.28, 0.1, 0.0) - museRightShoulder);
  vec3 museRightForearmPosition = museRightElbowPivot + rightElbowMatrix * (transformed - museRightElbowPivot);
  transformed = mix(transformed, museRightForearmPosition, museRightElbow);
}
if (museLeftArm > 0.0) {
  vec3 museLeftArmPosition = museLeftShoulder + leftArmMatrix * (transformed - museLeftShoulder);
  transformed = mix(transformed, museLeftArmPosition, museLeftArm);
  vec3 museLeftElbowPivot = museLeftShoulder + leftArmMatrix * (vec3(-0.28, 0.1, 0.0) - museLeftShoulder);
  vec3 museLeftForearmPosition = museLeftElbowPivot + leftElbowMatrix * (transformed - museLeftElbowPivot);
  transformed = mix(transformed, museLeftForearmPosition, museLeftElbow);
}
if (museRightLeg > 0.0) {
  vec3 museRightLegPosition = museRightHip + rightLegMatrix * (transformed - museRightHip);
  transformed = mix(transformed, museRightLegPosition, museRightLeg);
  vec3 museRightKneePivot = museRightHip + rightLegMatrix * (vec3(0.11, -0.5, 0.0) - museRightHip);
  vec3 museRightShinPosition = museRightKneePivot + rightKneeMatrix * (transformed - museRightKneePivot);
  transformed = mix(transformed, museRightShinPosition, museRightKnee);
}
if (museLeftLeg > 0.0) {
  vec3 museLeftLegPosition = museLeftHip + leftLegMatrix * (transformed - museLeftHip);
  transformed = mix(transformed, museLeftLegPosition, museLeftLeg);
  vec3 museLeftKneePivot = museLeftHip + leftLegMatrix * (vec3(-0.11, -0.5, 0.0) - museLeftHip);
  vec3 museLeftShinPosition = museLeftKneePivot + leftKneeMatrix * (transformed - museLeftKneePivot);
  transformed = mix(transformed, museLeftShinPosition, museLeftKnee);
}
float museFootMask = 1.0 - smoothstep(-0.72, -0.58, position.y);
transformed.x += (museRightLeg - museLeftLeg) * museFootMask * footSeparation;
`;
}

function colorNumber(value) {
  return Number.parseInt(String(value || "#d8ff42").replace("#", ""), 16);
}
