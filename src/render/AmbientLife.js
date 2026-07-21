import * as THREE from "three";
import { ambientLifeForScene } from "../config/ambientLife.js";

const POINT_KINDS = new Set(["dots", "firefly"]);
const AVIAN_KINDS = new Set(["bird", "gull", "crow", "tropical-bird"]);
const MODES = new Set(["drift", "orbit", "flyby", "float"]);
const TAU = Math.PI * 2;
const PATH_EPSILON = 1 / 120;
const POSITION_EPSILON_SQ = 1e-10;

export class AmbientLife {
  constructor(scene) {
    if (!scene?.add || !scene?.remove) throw new TypeError("ambient_scene_required");
    this.scene = scene;
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
    this.disposed = false;
  }

  setWorld(sceneId, { specs = ambientLifeForScene(sceneId), bounds = null } = {}) {
    if (this.disposed) throw new Error("ambient_life_disposed");
    this.clear();
    this.sceneId = String(sceneId || "");
    this.bounds = normalizeBounds(bounds);
    validateSpecs(specs, this.bounds);

    for (const spec of specs) {
      if (POINT_KINDS.has(spec.kind)) this.buildPointField(spec);
      else for (let index = 0; index < spec.count; index += 1) this.buildEntity(spec, index);
    }
    this.placeAtLocalTime(0, false);
    return this.metrics();
  }

  update(elapsed) {
    if (this.disposed || !this.sceneId) return this.metrics();
    const safeElapsed = Number.isFinite(elapsed) ? Math.max(0, elapsed) : this.lastElapsed;
    if (this.epoch === null) this.epoch = safeElapsed;
    this.lastElapsed = Math.max(this.epoch, safeElapsed);
    const localTime = Math.max(0, this.lastElapsed - this.epoch);
    this.placeAtLocalTime(localTime, true);
    return this.metrics();
  }

  metrics() {
    const kinds = [...new Set([
      ...this.entities.map((entity) => entity.spec.kind),
      ...this.pointFields.map((field) => field.spec.kind)
    ])];
    const pointCount = this.pointFields.reduce((sum, field) => sum + field.spec.count, 0);
    return {
      sceneId: this.sceneId,
      count: this.entities.length + pointCount,
      kinds,
      articulatedCount: this.entities.length,
      pointCount,
      moving: this.hasMoved
    };
  }

  clear() {
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

  buildEntity(spec, index) {
    const entity = AVIAN_KINDS.has(spec.kind)
      ? this.buildAvian(spec)
      : spec.kind === "butterfly"
        ? this.buildButterfly(spec)
        : spec.kind === "dragonfly"
          ? this.buildDragonfly(spec)
          : spec.kind === "koi"
            ? this.buildKoi(spec)
            : null;
    if (!entity) throw new Error(`unsupported_ambient_kind:${spec.kind}`);
    entity.spec = spec;
    entity.index = index;
    entity.root.name = `ambient-${spec.kind}-${index + 1}`;
    entity.root.userData.ambientKind = spec.kind;
    entity.root.userData.ambientIndex = index;
    entity.root.scale.setScalar(spec.scale);
    entity.previous = new THREE.Vector3();
    entity.sample = {};
    entity.nextSample = {};
    this.group.add(entity.root);
    this.entities.push(entity);
  }

  buildAvian(spec) {
    const root = new THREE.Group();
    const bodyMaterial = this.material(`mesh:${spec.kind}:${spec.color}`, () => standardMaterial(spec.color));
    const accentColor = spec.accent ?? spec.color;
    const accentMaterial = this.material(`mesh:${spec.kind}:accent:${accentColor}`, () => standardMaterial(accentColor));
    const body = new THREE.Mesh(this.geometry("avian-body", () => new THREE.OctahedronGeometry(0.42, 0)), bodyMaterial);
    body.scale.set(0.72, 0.42, 1.25);
    const head = new THREE.Mesh(this.geometry("avian-head", () => new THREE.OctahedronGeometry(0.22, 0)), accentMaterial);
    head.position.set(0, 0.06, 0.48);
    const beak = new THREE.Mesh(this.geometry("avian-beak", () => new THREE.ConeGeometry(0.09, 0.28, 4)), accentMaterial);
    beak.position.set(0, 0.02, 0.72);
    beak.rotation.x = Math.PI / 2;
    const wingLeft = new THREE.Group();
    const wingRight = new THREE.Group();
    wingLeft.position.x = -0.18;
    wingRight.position.x = 0.18;
    const wingGeometry = this.geometry("avian-wing", wingGeometryFactory);
    const leftMesh = new THREE.Mesh(wingGeometry, bodyMaterial);
    const rightMesh = new THREE.Mesh(wingGeometry, bodyMaterial);
    leftMesh.scale.x = -1;
    wingLeft.add(leftMesh);
    wingRight.add(rightMesh);
    root.add(body, head, beak, wingLeft, wingRight);
    return { root, wingLeft, wingRight, flapRate: 5.4, flapAmount: 0.58 };
  }

  buildButterfly(spec) {
    const root = new THREE.Group();
    const bodyMaterial = this.material("mesh:butterfly-body", () => standardMaterial(0x34302c));
    const wingMaterial = this.material(`mesh:butterfly-wing:${spec.color}`, () => standardMaterial(spec.color, true));
    const body = new THREE.Mesh(this.geometry("butterfly-body", () => new THREE.CylinderGeometry(0.08, 0.11, 0.7, 6)), bodyMaterial);
    body.rotation.x = Math.PI / 2;
    const wingLeft = new THREE.Group();
    const wingRight = new THREE.Group();
    wingLeft.position.x = -0.04;
    wingRight.position.x = 0.04;
    const wingGeometry = this.geometry("butterfly-wing", butterflyWingGeometryFactory);
    const leftMesh = new THREE.Mesh(wingGeometry, wingMaterial);
    const rightMesh = new THREE.Mesh(wingGeometry, wingMaterial);
    leftMesh.scale.x = -1;
    wingLeft.add(leftMesh);
    wingRight.add(rightMesh);
    root.add(body, wingLeft, wingRight);
    return { root, wingLeft, wingRight, flapRate: 10.5, flapAmount: 1.05 };
  }

  buildDragonfly(spec) {
    const root = new THREE.Group();
    const bodyMaterial = this.material(`mesh:dragonfly-body:${spec.color}`, () => standardMaterial(spec.color));
    const wingMaterial = this.material("mesh:dragonfly-wing", () => standardMaterial(0xdceae5, true, 0.62));
    const body = new THREE.Mesh(this.geometry("dragonfly-body", () => new THREE.CylinderGeometry(0.045, 0.075, 0.9, 6)), bodyMaterial);
    body.rotation.x = Math.PI / 2;
    const wingLeft = new THREE.Group();
    const wingRight = new THREE.Group();
    const wingGeometry = this.geometry("dragonfly-wing", dragonflyWingGeometryFactory);
    const leftMesh = new THREE.Mesh(wingGeometry, wingMaterial);
    const rightMesh = new THREE.Mesh(wingGeometry, wingMaterial);
    leftMesh.scale.x = -1;
    wingLeft.add(leftMesh);
    wingRight.add(rightMesh);
    root.add(body, wingLeft, wingRight);
    return { root, wingLeft, wingRight, flapRate: 18, flapAmount: 0.42 };
  }

  buildKoi(spec) {
    const root = new THREE.Group();
    const material = this.material(`mesh:koi:${spec.color}`, () => standardMaterial(spec.color));
    const body = new THREE.Mesh(this.geometry("koi-body", () => new THREE.OctahedronGeometry(0.5, 1)), material);
    body.scale.set(0.58, 0.32, 1.05);
    const tail = new THREE.Group();
    tail.position.z = -0.48;
    const tailMesh = new THREE.Mesh(this.geometry("koi-tail", fishTailGeometryFactory), material);
    tail.add(tailMesh);
    root.add(body, tail);
    return { root, tail, flapRate: 5.8, flapAmount: 0.46 };
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

  placeAtLocalTime(localTime, detectMovement) {
    let movement = false;
    for (const entity of this.entities) {
      entity.previous.copy(entity.root.position);
      sampleAmbientPath(entity.spec, entity.index, localTime, entity.sample);
      sampleAmbientPath(entity.spec, entity.index, localTime + PATH_EPSILON, entity.nextSample);
      applySafeguards(entity.sample, entity.spec.volume, this.bounds);
      applySafeguards(entity.nextSample, entity.spec.volume, this.bounds);
      entity.root.position.set(entity.sample.x, entity.sample.y, entity.sample.z);
      entity.root.visible = entity.sample.visible !== false;
      const dx = entity.nextSample.x - entity.sample.x;
      const dz = entity.nextSample.z - entity.sample.z;
      if (dx * dx + dz * dz > POSITION_EPSILON_SQ) entity.root.rotation.y = Math.atan2(dx, dz);
      const phase = phaseFor(entity.spec.seed, entity.index, 7) * TAU;
      const flap = Math.sin(localTime * entity.flapRate + phase) * entity.flapAmount;
      if (entity.wingLeft) entity.wingLeft.rotation.z = flap;
      if (entity.wingRight) entity.wingRight.rotation.z = -flap;
      if (entity.tail) entity.tail.rotation.y = flap;
      if (detectMovement && entity.root.position.distanceToSquared(entity.previous) > POSITION_EPSILON_SQ) movement = true;
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

  geometry(key, create) {
    if (!this.geometries.has(key)) this.geometries.set(key, create());
    return this.geometries.get(key);
  }

  material(key, create) {
    if (!this.materials.has(key)) this.materials.set(key, create());
    return this.materials.get(key);
  }
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
  if (!Array.isArray(specs)) throw new TypeError("ambient_specs_required");
  for (const spec of specs) {
    if (!spec || typeof spec !== "object") throw new TypeError("invalid_ambient_spec");
    if (!POINT_KINDS.has(spec.kind) && !AVIAN_KINDS.has(spec.kind) && !["butterfly", "dragonfly", "koi"].includes(spec.kind)) {
      throw new Error(`unsupported_ambient_kind:${spec.kind}`);
    }
    if (!MODES.has(spec.mode)) throw new Error(`unsupported_ambient_mode:${spec.mode}`);
    if (!Number.isSafeInteger(spec.count) || spec.count < 1 || spec.count > 24) throw new RangeError("invalid_ambient_count");
    if (!Number.isSafeInteger(spec.seed)) throw new TypeError("invalid_ambient_seed");
    if (!Number.isFinite(spec.scale) || spec.scale <= 0) throw new RangeError("invalid_ambient_scale");
    if (!Number.isFinite(spec.period) || spec.period <= 0) throw new RangeError("invalid_ambient_period");
    const { center, extent } = spec.volume || {};
    if (!finiteVector(center) || !finiteVector(extent) || extent.some((value) => value <= 0)) throw new TypeError("invalid_ambient_volume");
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

function standardMaterial(color, transparent = false, opacity = 1) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.74,
    metalness: 0.02,
    side: transparent ? THREE.DoubleSide : THREE.FrontSide,
    transparent,
    opacity,
    depthWrite: !transparent
  });
}

function wingGeometryFactory() {
  return triangleGeometry([0, 0, 0, 0.95, 0.04, -0.08, 0.42, 0, 0.45]);
}

function butterflyWingGeometryFactory() {
  return triangleGeometry([0, 0, 0, 0.85, 0.03, -0.34, 0.68, 0, 0.48]);
}

function dragonflyWingGeometryFactory() {
  return triangleGeometry([0, 0, 0, 1.05, 0.02, -0.16, 0.88, 0, 0.18]);
}

function fishTailGeometryFactory() {
  return triangleGeometry([0, 0, 0, -0.4, 0.18, -0.52, 0.4, -0.18, -0.52]);
}

function triangleGeometry(vertices) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex([0, 1, 2]);
  geometry.computeVertexNormals();
  return geometry;
}
