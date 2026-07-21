import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as THREE from "three";
import { AMBIENT_LIFE_BY_SCENE, AMBIENT_SCENE_IDS, ambientLifeForScene } from "../src/config/ambientLife.js";
import { AmbientLife, sampleAmbientPath } from "../src/render/AmbientLife.js";
import { ARCHIVED_WORLDS } from "../src/config/legacyAssets.js";

const EXPECTED = Object.freeze({
  "threshold-conservatory": Object.freeze({ butterfly: 2, bird: 1 }),
  "court-of-light": Object.freeze({ butterfly: 2 }),
  "water-and-light": Object.freeze({ koi: 3, dragonfly: 1 }),
  "sunset-frames": Object.freeze({ gull: 2 }),
  "burning-sky": Object.freeze({ crow: 3 }),
  "petal-transition": Object.freeze({ dragonfly: 2, bird: 1 }),
  "living-memory": Object.freeze({ "tropical-bird": 1, butterfly: 2 }),
  "infinite-repetition": Object.freeze({ dots: 24 }),
  "personal-dream-world": Object.freeze({ firefly: 24 })
});
const POND_SURFACE_Y = 0.095;

test("all nine canonical scenes declare the restrained ambient cast", () => {
  assert.deepEqual(AMBIENT_SCENE_IDS, ARCHIVED_WORLDS.map((world) => world.sceneId));
  assert.deepEqual(Object.keys(AMBIENT_LIFE_BY_SCENE), Object.keys(EXPECTED));

  for (const [sceneId, expected] of Object.entries(EXPECTED)) {
    const specs = ambientLifeForScene(sceneId);
    const actual = Object.fromEntries(specs.map((spec) => [spec.kind, spec.count]));
    assert.deepEqual(actual, expected, sceneId);
    assert.equal(Object.isFrozen(specs), true, sceneId);
    for (const spec of specs) {
      assert.equal(Object.isFrozen(spec), true, `${sceneId}:${spec.kind}`);
      assert.equal(Object.isFrozen(spec.volume), true, `${sceneId}:${spec.kind}:volume`);
      assert.equal(Object.hasOwn(spec, "asset"), false, `${sceneId}:${spec.kind}`);
    }
  }

  assert.deepEqual(ambientLifeForScene("missing-scene"), []);
  assert.deepEqual(ambientLifeForScene("infinite-repetition").map((spec) => spec.kind), ["dots"]);
  assert.deepEqual(ambientLifeForScene("personal-dream-world").map((spec) => spec.kind), ["firefly"]);
});

test("authored activity volumes are finite and contained by their world bounds", () => {
  for (const world of ARCHIVED_WORLDS) {
    for (const spec of ambientLifeForScene(world.sceneId)) {
      const { center, extent } = spec.volume;
      assert.equal(center.length, 3);
      assert.equal(extent.length, 3);
      assert.ok(center.every(Number.isFinite), `${world.sceneId}:${spec.kind}:center`);
      assert.ok(extent.every((value) => Number.isFinite(value) && value > 0), `${world.sceneId}:${spec.kind}:extent`);
      assert.ok(center[0] - extent[0] >= world.profile.bounds.minX, `${world.sceneId}:${spec.kind}:minX`);
      assert.ok(center[0] + extent[0] <= world.profile.bounds.maxX, `${world.sceneId}:${spec.kind}:maxX`);
      assert.ok(center[2] - extent[2] >= world.profile.bounds.minZ, `${world.sceneId}:${spec.kind}:minZ`);
      assert.ok(center[2] + extent[2] <= world.profile.bounds.maxZ, `${world.sceneId}:${spec.kind}:maxZ`);
    }
  }

  const water = ambientLifeForScene("water-and-light");
  const koi = water.find((spec) => spec.kind === "koi");
  const dragonfly = water.find((spec) => spec.kind === "dragonfly");
  assert.ok(koi.volume.center[1] + koi.volume.extent[1] <= POND_SURFACE_Y,
    "koi volume stays under the measured pond surface");
  assert.ok(dragonfly.volume.center[1] - dragonfly.volume.extent[1] >= 0.5,
    "dragonfly volume remains visibly above the measured pond surface");
});

test("complete koi geometry remains below the measured pond surface", () => {
  const water = worldFor("water-and-light");
  const life = new AmbientLife(new THREE.Scene());
  life.setWorld(water.sceneId, { bounds: water.profile.bounds });
  const koi = life.entities.filter((entity) => entity.spec.kind === "koi");
  assert.equal(koi.length, 3);

  for (let elapsed = 0; elapsed <= 120; elapsed += 0.25) {
    life.update(elapsed);
    for (const entity of koi) {
      const bounds = new THREE.Box3().setFromObject(entity.root, true);
      assert.ok(bounds.max.y <= POND_SURFACE_Y + 1e-9,
        `koi ${entity.index + 1} breaches the pond at ${elapsed}s: ${bounds.max.y}`);
    }
  }
  life.dispose();
});

test("path sampling is deterministic, bounded and frame-rate independent", () => {
  const spec = ambientLifeForScene("sunset-frames")[0];
  for (let index = 0; index < spec.count; index += 1) {
    for (const elapsed of [0, 0.25, 1, 8.75, 1_000_000]) {
      const first = sampleAmbientPath(spec, index, elapsed, {});
      const second = sampleAmbientPath(spec, index, elapsed, {});
      assert.deepEqual(first, second);
      assertInsideVolume(first, spec.volume);
    }
  }

  const world = worldFor("threshold-conservatory");
  const direct = new AmbientLife(new THREE.Scene());
  const stepped = new AmbientLife(new THREE.Scene());
  direct.setWorld(world.sceneId, { bounds: world.profile.bounds });
  stepped.setWorld(world.sceneId, { bounds: world.profile.bounds });
  direct.update(100);
  stepped.update(100);
  direct.update(102);
  stepped.update(100.5);
  stepped.update(101.25);
  stepped.update(102);
  assert.deepEqual(snapshot(direct), snapshot(stepped));
  direct.dispose();
  stepped.dispose();
});

test("articulated creatures move, face their tangent and flap wings or tails", () => {
  const scene = new THREE.Scene();
  const life = new AmbientLife(scene);
  const threshold = worldFor("threshold-conservatory");
  life.setWorld(threshold.sceneId, { bounds: threshold.profile.bounds });
  const butterfly = life.entities.find((entity) => entity.spec.kind === "butterfly");
  const startPosition = butterfly.root.position.clone();
  const startWing = butterfly.wingLeft.rotation.z;
  life.update(50);
  life.update(51.2);
  assert.ok(butterfly.root.position.distanceTo(startPosition) > 0.01);
  assert.notEqual(butterfly.wingLeft.rotation.z, startWing);
  assert.equal(butterfly.wingLeft.rotation.z, -butterfly.wingRight.rotation.z);
  assert.equal(life.metrics().moving, true);

  const localTime = 1.2;
  const here = sampleAmbientPath(butterfly.spec, butterfly.index, localTime, {});
  const ahead = sampleAmbientPath(butterfly.spec, butterfly.index, localTime + 1 / 120, {});
  const expectedYaw = Math.atan2(ahead.x - here.x, ahead.z - here.z);
  assert.ok(Math.abs(shortestAngle(butterfly.root.rotation.y - expectedYaw)) < 1e-10);

  const water = worldFor("water-and-light");
  life.setWorld(water.sceneId, { bounds: water.profile.bounds });
  const koi = life.entities.find((entity) => entity.spec.kind === "koi");
  const startTail = koi.tail.rotation.y;
  life.update(80);
  life.update(80.8);
  assert.notEqual(koi.tail.rotation.y, startTail);
  assert.ok(life.entities.every((entity) => finiteObject(entity.root)));
  life.dispose();
});

test("dots and fireflies use one efficient point field per scene", () => {
  const scene = new THREE.Scene();
  const life = new AmbientLife(scene);
  const infinity = worldFor("infinite-repetition");
  const initial = life.setWorld(infinity.sceneId, { bounds: infinity.profile.bounds });
  assert.deepEqual(initial, {
    sceneId: "infinite-repetition",
    count: 24,
    kinds: ["dots"],
    articulatedCount: 0,
    pointCount: 24,
    moving: false
  });
  assert.equal(life.entities.length, 0);
  assert.equal(life.pointFields.length, 1);
  assert.equal(life.pointFields[0].points.isPoints, true);
  assert.equal(life.pointFields[0].positions.length, 72);
  const fieldBounds = life.pointFields[0].points.geometry.boundingSphere;
  assert.ok(fieldBounds, "dynamic point field declares a stable authored bounding sphere");
  for (let index = 0; index < life.pointFields[0].spec.count; index += 1) {
    for (const elapsed of [0, 5, 25, 100]) {
      const position = sampleAmbientPath(life.pointFields[0].spec, index, elapsed, {});
      assert.ok(fieldBounds.containsPoint(new THREE.Vector3(position.x, position.y, position.z)));
    }
  }
  const before = [...life.pointFields[0].positions];
  life.update(10);
  life.update(11);
  assert.notDeepEqual([...life.pointFields[0].positions], before);
  assert.equal(life.metrics().moving, true);

  const finalWorld = worldFor("personal-dream-world");
  life.setWorld(finalWorld.sceneId, { bounds: finalWorld.profile.bounds });
  assert.deepEqual(life.metrics().kinds, ["firefly"]);
  assert.equal(life.metrics().count, 24);
  assert.equal(life.pointFields.length, 1);
  life.dispose();
});

test("duplicate point-field specs retain and dispose every resource", () => {
  const scene = new THREE.Scene();
  const life = new AmbientLife(scene);
  const world = worldFor("personal-dream-world");
  const spec = ambientLifeForScene(world.sceneId)[0];
  life.setWorld("duplicate-fields", { specs: [spec, { ...spec }], bounds: world.profile.bounds });
  const resources = trackedResources(life.group);
  assert.equal(resources.length, 4);
  const disposeCounts = new Map(resources.map((resource) => [resource, 0]));
  for (const resource of resources) {
    resource.addEventListener("dispose", () => disposeCounts.set(resource, disposeCounts.get(resource) + 1));
  }

  life.clear();
  assert.ok(resources.every((resource) => disposeCounts.get(resource) === 1));
  life.dispose();
});

test("world switches dispose each shared resource exactly once", () => {
  const scene = new THREE.Scene();
  const life = new AmbientLife(scene);
  const threshold = worldFor("threshold-conservatory");
  life.setWorld(threshold.sceneId, { bounds: threshold.profile.bounds });
  const firstResources = trackedResources(life.group);
  assert.ok(firstResources.length > 0);

  const counts = new Map(firstResources.map((resource) => [resource, 0]));
  for (const resource of firstResources) {
    resource.addEventListener("dispose", () => counts.set(resource, counts.get(resource) + 1));
  }

  const court = worldFor("court-of-light");
  life.setWorld(court.sceneId, { bounds: court.profile.bounds });
  assert.ok(firstResources.every((resource) => counts.get(resource) === 1));
  assert.equal(scene.children.includes(life.group), true);
  assert.equal(life.metrics().count, 2);

  life.clear();
  life.clear();
  assert.ok(firstResources.every((resource) => counts.get(resource) === 1));
  assert.deepEqual(life.metrics(), {
    sceneId: null,
    count: 0,
    kinds: [],
    articulatedCount: 0,
    pointCount: 0,
    moving: false
  });
  life.dispose();
  life.dispose();
  assert.equal(scene.children.includes(life.group), false);
  assert.throws(() => life.setWorld(threshold.sceneId), /ambient_life_disposed/);
});

test("every scene remains finite under hostile elapsed input", () => {
  const life = new AmbientLife(new THREE.Scene());
  for (const world of ARCHIVED_WORLDS) {
    life.setWorld(world.sceneId, { bounds: world.profile.bounds });
    for (const elapsed of [Number.NaN, Number.POSITIVE_INFINITY, -100, 0, 1e12]) life.update(elapsed);
    for (const entity of life.entities) {
      assert.equal(finiteObject(entity.root), true, `${world.sceneId}:${entity.spec.kind}`);
      assert.ok(Number.isFinite(entity.root.rotation.y), `${world.sceneId}:${entity.spec.kind}:yaw`);
    }
    for (const field of life.pointFields) {
      assert.ok([...field.positions].every(Number.isFinite), `${world.sceneId}:${field.spec.kind}`);
    }
  }
  life.dispose();
});

test("ambient implementation has no network, external model or nondeterministic random path", () => {
  const configSource = fs.readFileSync(new URL("../src/config/ambientLife.js", import.meta.url), "utf8");
  const rendererSource = fs.readFileSync(new URL("../src/render/AmbientLife.js", import.meta.url), "utf8");
  const source = `${configSource}\n${rendererSource}`;
  assert.doesNotMatch(source, /Math\.random/);
  assert.doesNotMatch(source, /GLTFLoader|loadAsync|fetch\s*\(/);
  assert.doesNotMatch(configSource, /https?:|\/assets\/|\.gl(?:b|tf)/i);
});

function worldFor(sceneId) {
  const world = ARCHIVED_WORLDS.find((item) => item.sceneId === sceneId);
  assert.ok(world, sceneId);
  return world;
}

function assertInsideVolume(position, volume) {
  for (let axis = 0; axis < 3; axis += 1) {
    assert.ok(position[["x", "y", "z"][axis]] >= volume.center[axis] - volume.extent[axis] - 1e-12);
    assert.ok(position[["x", "y", "z"][axis]] <= volume.center[axis] + volume.extent[axis] + 1e-12);
  }
  assert.equal(typeof position.visible, "boolean");
}

function snapshot(life) {
  return {
    entities: life.entities.map((entity) => ({
      kind: entity.spec.kind,
      index: entity.index,
      position: entity.root.position.toArray(),
      yaw: entity.root.rotation.y,
      visible: entity.root.visible,
      wingLeft: entity.wingLeft?.rotation.z ?? null,
      wingRight: entity.wingRight?.rotation.z ?? null,
      tail: entity.tail?.rotation.y ?? null
    })),
    fields: life.pointFields.map((field) => ({ kind: field.spec.kind, positions: [...field.positions] })),
    metrics: life.metrics()
  };
}

function trackedResources(root) {
  const resources = new Set();
  root.traverse((object) => {
    if (object.geometry) resources.add(object.geometry);
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) if (material) resources.add(material);
  });
  return [...resources];
}

function finiteObject(object) {
  return object.position.toArray().every(Number.isFinite)
    && object.rotation.toArray().slice(0, 3).every(Number.isFinite)
    && object.scale.toArray().every(Number.isFinite);
}

function shortestAngle(value) {
  return Math.atan2(Math.sin(value), Math.cos(value));
}
