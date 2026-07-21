import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ambientLifeForScene, isApprovedAmbientAsset } from "../config/ambientLife.js";
import { withTimeout } from "./withTimeout.js";

const POINT_KINDS = new Set(["dots", "firefly"]);
const MODES = new Set(["drift", "orbit", "flyby", "float"]);
const TAU = Math.PI * 2;
const PATH_EPSILON = 1 / 120;
const POSITION_EPSILON_SQ = 1e-10;
const ASSET_LOAD_TIMEOUT_MS = 15_000;

export class AmbientLife {
  constructor(scene, { loader = new GLTFLoader(), loadTimeoutMs = ASSET_LOAD_TIMEOUT_MS } = {}) {
    if (!scene?.add || !scene?.remove) throw new TypeError("ambient_scene_required");
    if (!loader?.loadAsync) throw new TypeError("ambient_loader_required");
    this.scene = scene;
    this.loader = loader;
    this.loadTimeoutMs = loadTimeoutMs;
    this.group = new THREE.Group();
    this.group.name = "ambient-life";
    this.scene.add(this.group);
    this.sceneId = null;
    this.bounds = null;
    this.entities = [];
    this.pointFields = [];
    this.geometries = new Map();
    this.materials = new Map();
    this.epoch = null;
    this.lastElapsed = 0;
    this.hasMoved = false;
    this.loadToken = 0;
    this.pendingLoads = new Set();
    this.disposed = false;
  }

  setWorld(sceneId, { specs = ambientLifeForScene(sceneId), bounds = null } = {}) {
    if (this.disposed) throw new Error("ambient_life_disposed");
    this.clear();
    this.sceneId = String(sceneId || "");
    this.bounds = normalizeBounds(bounds);
    const renderableSpecs = approvedSpecs(specs);
    validateSpecs(renderableSpecs, this.bounds);

    for (const spec of renderableSpecs) {
      if (POINT_KINDS.has(spec.kind)) {
        this.buildPointField(spec);
        continue;
      }
      const entities = [];
      for (let index = 0; index < spec.count; index += 1) {
        entities.push(this.buildAssetEntity(spec, index));
      }
      this.queueAssetLoad(spec, entities, this.loadToken, this.sceneId);
    }
    this.placeAtLocalTime(0, false);
    return this.metrics();
  }

  async whenReady() {
    while (this.pendingLoads.size) await Promise.all([...this.pendingLoads]);
    return this.metrics();
  }

  update(elapsed) {
    if (this.disposed || !this.sceneId) return this.metrics();
    const safeElapsed = Number.isFinite(elapsed) ? Math.max(0, elapsed) : this.lastElapsed;
    if (this.epoch === null) this.epoch = safeElapsed;
    this.lastElapsed = Math.max(this.epoch, safeElapsed);
    this.placeAtLocalTime(Math.max(0, this.lastElapsed - this.epoch), true);
    return this.metrics();
  }

  metrics() {
    const readyEntities = this.entities.filter((entity) => entity.root.userData.assetStatus === "ready");
    const kinds = [...new Set([
      ...readyEntities.map((entity) => entity.spec.kind),
      ...this.pointFields.map((field) => field.spec.kind)
    ])];
    const pointCount = this.pointFields.reduce((sum, field) => sum + field.spec.count, 0);
    return {
      sceneId: this.sceneId,
      count: readyEntities.length + pointCount,
      kinds,
      articulatedCount: readyEntities.filter((entity) => entity.mixer).length,
      pointCount,
      moving: this.hasMoved
    };
  }

  clear() {
    this.loadToken += 1;
    for (const entity of this.entities) disposeAssetEntity(entity);
    this.group.clear();
    for (const geometry of this.geometries.values()) geometry.dispose();
    for (const material of this.materials.values()) material.dispose();
    this.geometries.clear();
    this.materials.clear();
    this.entities.length = 0;
    this.pointFields.length = 0;
    this.sceneId = null;
    this.bounds = null;
    this.epoch = null;
    this.lastElapsed = 0;
    this.hasMoved = false;
  }

  dispose() {
    if (this.disposed) return;
    this.clear();
    this.scene.remove(this.group);
    this.disposed = true;
  }

  buildAssetEntity(spec, index) {
    const root = new THREE.Group();
    root.name = `ambient-${spec.kind}-${index + 1}`;
    root.visible = false;
    root.scale.setScalar(spec.scale);
    root.userData.ambientKind = spec.kind;
    root.userData.ambientIndex = index;
    root.userData.asset = spec.asset;
    root.userData.assetStatus = "loading";
    const entity = {
      spec,
      index,
      root,
      loadedModel: null,
      mixer: null,
      animationDuration: 0,
      previous: new THREE.Vector3(),
      sample: {},
      nextSample: {}
    };
    this.entities.push(entity);
    return entity;
  }

  buildPointField(spec) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(spec.count * 3);
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(...spec.volume.center),
      new THREE.Vector3(...spec.volume.extent).length() + spec.scale
    );
    const resourceKey = `points:${spec.kind}:${spec.seed}:${this.pointFields.length}`;
    this.geometries.set(resourceKey, geometry);
    const material = new THREE.PointsMaterial({
      color: spec.color,
      size: spec.scale,
      sizeAttenuation: true,
      transparent: true,
      opacity: spec.kind === "firefly" ? 0.82 : 0.68,
      depthWrite: false,
      blending: spec.kind === "firefly" ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    this.materials.set(resourceKey, material);
    const points = new THREE.Points(geometry, material);
    points.name = `ambient-${spec.kind}-field`;
    points.userData.ambientKind = spec.kind;
    this.group.add(points);
    this.pointFields.push({ spec, points, positions, previous: new Float32Array(positions.length) });
  }

  queueAssetLoad(spec, entities, token, sceneId) {
    let pending;
    pending = this.loadAsset(spec, entities, token, sceneId)
      .catch(() => {})
      .finally(() => this.pendingLoads.delete(pending));
    this.pendingLoads.add(pending);
  }

  async loadAsset(spec, entities, token, sceneId) {
    let template = null;
    let prepared = [];
    try {
      const gltf = await withTimeout(
        this.loader.loadAsync(spec.asset),
        this.loadTimeoutMs,
        "ambient_asset_timeout",
        { onLateResolve: (lateGltf) => disposeAssetTree(lateGltf?.scene) }
      );
      template = gltf?.scene;
      if (!template) throw new Error("ambient_asset_scene_required");
      const clip = findApprovedClip(gltf?.animations, spec.animationClip);
      if (!clip) throw new Error("ambient_asset_animation_required");
      if (this.disposed || token !== this.loadToken || sceneId !== this.sceneId) return;

      prepared = entities.map(() => prepareAssetModel(template, clip, spec.kind));
      if (this.disposed || token !== this.loadToken || sceneId !== this.sceneId) return;
      for (let index = 0; index < entities.length; index += 1) {
        const entity = entities[index];
        const ready = prepared[index];
        entity.root.add(ready.model);
        entity.loadedModel = ready.model;
        entity.mixer = ready.mixer;
        entity.animationDuration = ready.duration;
        entity.root.userData.assetStatus = "ready";
        entity.root.userData.animationClip = spec.animationClip;
        entity.root.visible = entity.sample.visible !== false;
        this.group.add(entity.root);
      }
      prepared = [];
    } catch {
      if (!this.disposed && token === this.loadToken && sceneId === this.sceneId) {
        for (const entity of entities) {
          entity.root.visible = false;
          entity.root.userData.assetStatus = "failed";
        }
      }
    } finally {
      for (const ready of prepared) disposePreparedAsset(ready);
      disposeAssetTree(template);
    }
  }

  placeAtLocalTime(localTime, detectMovement) {
    let movement = false;
    for (const entity of this.entities) {
      entity.previous.copy(entity.root.position);
      sampleAmbientPath(entity.spec, entity.index, localTime, entity.sample);
      sampleAmbientPath(entity.spec, entity.index, localTime + PATH_EPSILON, entity.nextSample);
      applySafeguards(entity.sample, entity.spec.volume, this.bounds);
      applySafeguards(entity.nextSample, entity.spec.volume, this.bounds);
      entity.root.position.set(entity.sample.x, entity.sample.y, entity.sample.z);
      const ready = entity.root.userData.assetStatus === "ready";
      entity.root.visible = ready && entity.sample.visible !== false;
      const dx = entity.nextSample.x - entity.sample.x;
      const dz = entity.nextSample.z - entity.sample.z;
      if (dx * dx + dz * dz > POSITION_EPSILON_SQ) entity.root.rotation.y = Math.atan2(dx, dz);
      if (entity.mixer) entity.mixer.setTime(localTime % entity.animationDuration);
      if (ready && detectMovement && entity.root.position.distanceToSquared(entity.previous) > POSITION_EPSILON_SQ) {
        movement = true;
      }
    }

    for (const field of this.pointFields) {
      field.previous.set(field.positions);
      const position = {};
      for (let index = 0; index < field.spec.count; index += 1) {
        sampleAmbientPath(field.spec, index, localTime, position);
        applySafeguards(position, field.spec.volume, this.bounds);
        const offset = index * 3;
        field.positions[offset] = position.x;
        field.positions[offset + 1] = position.y;
        field.positions[offset + 2] = position.z;
      }
      field.points.geometry.attributes.position.needsUpdate = true;
      if (detectMovement && arraysDiffer(field.positions, field.previous)) movement = true;
    }
    this.hasMoved ||= movement;
  }
}

function approvedSpecs(specs) {
  if (!Array.isArray(specs)) throw new TypeError("ambient_specs_required");
  return specs.filter((spec) => POINT_KINDS.has(spec?.kind) || isApprovedAmbientAsset(spec));
}

function findApprovedClip(animations, name) {
  if (!Array.isArray(animations)) return null;
  const clip = animations.find((candidate) => candidate?.name === name);
  return clip && clip.tracks?.length > 0 && Number.isFinite(clip.duration) && clip.duration > 0 ? clip : null;
}

function prepareAssetModel(template, clip, kind) {
  const model = cloneAssetTree(template);
  try {
    model.name = `${kind}-provider-model`;
    let hasMesh = false;
    model.traverse((object) => {
      if (!object.isMesh) return;
      hasMesh = true;
      object.castShadow = false;
      object.receiveShadow = false;
    });
    if (!hasMesh) throw new Error("ambient_asset_mesh_required");
    const mixer = new THREE.AnimationMixer(model);
    mixer.clipAction(clip).play();
    return { model, mixer, duration: clip.duration };
  } catch (error) {
    disposeAssetTree(model);
    throw error;
  }
}

function disposePreparedAsset({ model, mixer }) {
  mixer.stopAllAction();
  mixer.uncacheRoot(model);
  disposeAssetTree(model);
}

function disposeAssetEntity(entity) {
  if (entity.mixer && entity.loadedModel) {
    entity.mixer.stopAllAction();
    entity.mixer.uncacheRoot(entity.loadedModel);
  }
  disposeAssetTree(entity.loadedModel);
  entity.root.removeFromParent();
  entity.loadedModel = null;
  entity.mixer = null;
  entity.root.visible = false;
}

function cloneAssetTree(source) {
  const root = cloneObjectWithSkeleton(source);
  const geometries = new Map();
  const materials = new Map();
  const textures = new Map();
  root.traverse((object) => {
    if (object.geometry) {
      if (!geometries.has(object.geometry)) geometries.set(object.geometry, object.geometry.clone());
      object.geometry = geometries.get(object.geometry);
    }
    if (!object.material) return;
    const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
    const cloned = sourceMaterials.map((material) => {
      if (!materials.has(material)) materials.set(material, cloneMaterial(material, textures));
      return materials.get(material);
    });
    object.material = Array.isArray(object.material) ? cloned : cloned[0];
  });
  return root;
}

// Keep animated-asset cloning available without requiring a new PM2 vendor route.
function cloneObjectWithSkeleton(source) {
  const sourceLookup = new Map();
  const cloneLookup = new Map();
  const root = source.clone();

  parallelTraverse(source, root, (sourceNode, clonedNode) => {
    sourceLookup.set(clonedNode, sourceNode);
    cloneLookup.set(sourceNode, clonedNode);
  });
  root.traverse((node) => {
    if (!node.isSkinnedMesh) return;
    const sourceMesh = sourceLookup.get(node);
    const sourceBones = sourceMesh.skeleton.bones;
    node.skeleton = sourceMesh.skeleton.clone();
    node.bindMatrix.copy(sourceMesh.bindMatrix);
    node.skeleton.bones = sourceBones.map((bone) => cloneLookup.get(bone));
    node.bind(node.skeleton, node.bindMatrix);
  });
  return root;
}

function parallelTraverse(source, clone, visit) {
  visit(source, clone);
  for (let index = 0; index < source.children.length; index += 1) {
    parallelTraverse(source.children[index], clone.children[index], visit);
  }
}

function cloneMaterial(source, textures) {
  const material = source.clone();
  for (const [key, value] of Object.entries(material)) {
    if (!value?.isTexture) continue;
    if (!textures.has(value)) {
      const texture = value.clone();
      texture.needsUpdate = true;
      textures.set(value, texture);
    }
    material[key] = textures.get(value);
  }
  material.needsUpdate = true;
  return material;
}

function disposeAssetTree(root) {
  if (!root?.traverse) return;
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const skeletons = new Set();
  root.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.skeleton) skeletons.add(object.skeleton);
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of objectMaterials) {
      if (!material || materials.has(material)) continue;
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) texture.dispose();
  for (const skeleton of skeletons) skeleton.dispose();
}

export function sampleAmbientPath(spec, index, elapsed, target = {}) {
  const center = spec.volume.center;
  const extent = spec.volume.extent;
  const time = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  const period = Number.isFinite(spec.period) && spec.period > 0 ? spec.period : 10;
  const phase = phaseFor(spec.seed, index, 1) * TAU;
  const secondary = phaseFor(spec.seed, index, 2) * TAU;
  target.visible = true;

  if (spec.mode === "orbit") {
    const angle = time / period * TAU + phase;
    target.x = center[0] + Math.cos(angle) * extent[0] * 0.82;
    target.y = center[1] + Math.sin(angle * 0.7 + secondary) * extent[1] * 0.42;
    target.z = center[2] + Math.sin(angle) * extent[2] * 0.82;
  } else if (spec.mode === "flyby") {
    const flockOffset = index * 0.035;
    const cycle = positiveModulo(time / period + phaseFor(spec.seed, 0, 3) + flockOffset, 1);
    const activeRatio = 0.68;
    const progress = THREE.MathUtils.clamp(cycle / activeRatio, 0, 1);
    target.visible = cycle <= activeRatio;
    target.x = center[0] - extent[0] + extent[0] * 2 * progress;
    target.y = center[1] + Math.sin(progress * Math.PI + secondary) * extent[1] * 0.32
      + (index - (spec.count - 1) / 2) * Math.min(0.32, extent[1] * 0.16);
    target.z = center[2] + Math.sin(progress * TAU + secondary) * extent[2] * 0.38
      + (index - (spec.count - 1) / 2) * Math.min(0.5, extent[2] * 0.1);
  } else if (spec.mode === "float") {
    const rate = TAU / period;
    target.x = center[0] + Math.sin(time * rate * 0.57 + phase) * extent[0] * (0.3 + phaseFor(spec.seed, index, 4) * 0.62);
    target.y = center[1] + Math.sin(time * rate + secondary) * extent[1] * (0.35 + phaseFor(spec.seed, index, 5) * 0.58);
    target.z = center[2] + Math.cos(time * rate * 0.43 + phase * 0.7) * extent[2] * (0.28 + phaseFor(spec.seed, index, 6) * 0.62);
  } else {
    const rate = TAU / period;
    target.x = center[0] + Math.sin(time * rate * 0.71 + phase) * extent[0] * 0.76;
    target.y = center[1] + Math.sin(time * rate * 1.17 + secondary) * extent[1] * 0.68;
    target.z = center[2] + Math.cos(time * rate * 0.83 + phase * 0.63) * extent[2] * 0.76;
  }
  return target;
}

function validateSpecs(specs, bounds) {
  for (const spec of specs) {
    if (!spec || typeof spec !== "object") throw new TypeError("invalid_ambient_spec");
    if (!POINT_KINDS.has(spec.kind) && !isApprovedAmbientAsset(spec)) {
      throw new Error(`unsupported_ambient_kind:${spec.kind}`);
    }
    if (typeof spec.kind !== "string" || !spec.kind.trim()) throw new TypeError("invalid_ambient_kind");
    if (!MODES.has(spec.mode)) throw new Error(`unsupported_ambient_mode:${spec.mode}`);
    if (!Number.isSafeInteger(spec.count) || spec.count < 1 || spec.count > 24) throw new RangeError("invalid_ambient_count");
    if (!Number.isSafeInteger(spec.seed)) throw new TypeError("invalid_ambient_seed");
    if (!Number.isFinite(spec.scale) || spec.scale <= 0) throw new RangeError("invalid_ambient_scale");
    if (!Number.isFinite(spec.period) || spec.period <= 0) throw new RangeError("invalid_ambient_period");
    const { center, extent } = spec.volume || {};
    if (!finiteVector(center) || !finiteVector(extent) || extent.some((value) => value <= 0)) {
      throw new TypeError("invalid_ambient_volume");
    }
    if (bounds && !volumeWithinBounds(spec.volume, bounds)) throw new RangeError(`ambient_volume_outside_bounds:${spec.kind}`);
  }
}

function normalizeBounds(bounds) {
  if (bounds == null) return null;
  const values = [bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ];
  if (!values.every(Number.isFinite) || bounds.minX >= bounds.maxX || bounds.minZ >= bounds.maxZ) {
    throw new TypeError("invalid_ambient_bounds");
  }
  return { minX: bounds.minX, maxX: bounds.maxX, minZ: bounds.minZ, maxZ: bounds.maxZ };
}

function volumeWithinBounds(volume, bounds) {
  const [x, , z] = volume.center;
  const [extentX, , extentZ] = volume.extent;
  return x - extentX >= bounds.minX && x + extentX <= bounds.maxX
    && z - extentZ >= bounds.minZ && z + extentZ <= bounds.maxZ;
}

function applySafeguards(position, volume, bounds) {
  const [centerX, centerY, centerZ] = volume.center;
  const [extentX, extentY, extentZ] = volume.extent;
  position.x = finiteClamp(position.x, centerX - extentX, centerX + extentX, centerX);
  position.y = finiteClamp(position.y, centerY - extentY, centerY + extentY, centerY);
  position.z = finiteClamp(position.z, centerZ - extentZ, centerZ + extentZ, centerZ);
  if (bounds) {
    position.x = THREE.MathUtils.clamp(position.x, bounds.minX, bounds.maxX);
    position.z = THREE.MathUtils.clamp(position.z, bounds.minZ, bounds.maxZ);
  }
}

function finiteClamp(value, min, max, fallback) {
  return Number.isFinite(value) ? THREE.MathUtils.clamp(value, min, max) : fallback;
}

function finiteVector(value) {
  return Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
}

function phaseFor(seed, index, salt) {
  let value = (seed ^ Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return (value >>> 0) / 0xffffffff;
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function arraysDiffer(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    const delta = left[index] - right[index];
    if (delta * delta > POSITION_EPSILON_SQ) return true;
  }
  return false;
}
