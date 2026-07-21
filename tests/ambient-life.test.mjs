import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as THREE from "three";
import { AMBIENT_LIFE_BY_SCENE, AMBIENT_SCENE_IDS, WHITE_DOVE_ASSET, ambientLifeForScene } from "../src/config/ambientLife.js";
import { AmbientLife, sampleAmbientPath } from "../src/render/AmbientLife.js";
import { ARCHIVED_WORLDS } from "../src/config/legacyAssets.js";

const EXPECTED = Object.freeze({
  "threshold-conservatory": Object.freeze({ butterfly: 2, "white-dove": 1 }),
  "court-of-light": Object.freeze({ butterfly: 2 }),
  "water-and-light": Object.freeze({ koi: 3, dragonfly: 1 }),
  "sunset-frames": Object.freeze({ "white-dove": 2 }),
  "burning-sky": Object.freeze({ crow: 3 }),
  "petal-transition": Object.freeze({ dragonfly: 2, "white-dove": 1 }),
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
      if (spec.kind === "white-dove") assert.equal(spec.asset, WHITE_DOVE_ASSET, `${sceneId}:${spec.kind}`);
      else assert.equal(Object.hasOwn(spec, "asset"), false, `${sceneId}:${spec.kind}`);
    }
  }

  assert.deepEqual(ambientLifeForScene("missing-scene"), []);
  assert.deepEqual(ambientLifeForScene("infinite-repetition").map((spec) => spec.kind), ["dots"]);
  assert.deepEqual(ambientLifeForScene("personal-dream-world").map((spec) => spec.kind), ["firefly"]);
});

test("the authored white dove is a valid local web GLB", () => {
  assert.equal(WHITE_DOVE_ASSET, "/assets/creatures/white-dove.glb");
  const file = new URL(`..${WHITE_DOVE_ASSET}`, import.meta.url);
  const buffer = fs.readFileSync(file);
  assert.equal(buffer.toString("ascii", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  assert.equal(buffer.readUInt32LE(8), buffer.length);

  const jsonLength = buffer.readUInt32LE(12);
  const gltf = JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength).replace(/\0+$/, "").trim());
  assert.equal(gltf.meshes.length, 1);
  assert.equal(gltf.materials.length, 1);
  assert.equal(gltf.textures.length, 3);
  assert.deepEqual(gltf.skins || [], []);
  assert.deepEqual(gltf.animations || [], []);
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
  const life = createLife();
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
  const direct = createLife();
  const stepped = createLife();
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
  const life = createLife(scene);
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
  const life = createLife(scene);
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
  const life = createLife(scene);
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
  const life = createLife(scene);
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
  const life = createLife();
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

test("white-dove asset clones are independent and deterministic flight motion survives replacement", async () => {
  const pending = deferred();
  const loader = queuedLoader(pending);
  const life = new AmbientLife(new THREE.Scene(), { loader, loadTimeoutMs: 1_000 });
  const world = worldFor("sunset-frames");
  life.setWorld(world.sceneId, { bounds: world.profile.bounds });
  const doves = life.entities.filter((entity) => entity.spec.kind === "white-dove");
  assert.equal(doves.length, 2);
  assert.deepEqual(loader.calls, [WHITE_DOVE_ASSET]);
  assert.ok(doves.every((entity) => entity.root.userData.fallback === true));

  const source = disposableDoveGltf("source-template");
  pending.resolve(source.gltf);
  await life.whenReady();
  assert.ok([...source.disposeCounts.values()].every((count) => count === 1));
  assert.ok(doves.every((entity) => entity.root.userData.fallback === false));
  assert.ok(doves.every((entity) => entity.loadedModel?.parent === entity.flightVisual));
  assert.ok(doves.every((entity) => entity.loadedMotion?.active === true));
  assert.ok(doves.every((entity) => entity.loadedMotion?.mode === "shader-wing-deformation"));
  assert.ok(doves.every((entity) => entity.root.userData.articulation === "shader-wing-deformation"));
  assert.equal(life.metrics().articulatedCount, 2);

  const first = trackedModelResources(doves[0].loadedModel);
  const second = trackedModelResources(doves[1].loadedModel);
  assert.notEqual(first.geometry, second.geometry);
  assert.notEqual(first.material, second.material);
  assert.notEqual(first.texture, second.texture);
  assert.notEqual(doves[0].loadedMotion.uniforms[0], doves[1].loadedMotion.uniforms[0]);
  assert.equal(first.material.isMeshStandardMaterial, true);
  assert.equal(first.material.map, first.texture);
  assert.equal(first.material.userData.museWingMotion, "muse-white-dove-wing-v1");
  assert.equal(source.mesh.material.userData.museWingMotion, undefined,
    "the disposable GLB template remains undecorated");

  const shader = {
    uniforms: {},
    vertexShader: "#include <beginnormal_vertex>\n#include <begin_vertex>"
  };
  first.material.onBeforeCompile(shader, {});
  assert.equal(shader.uniforms.uMuseDoveWingFlap, doves[0].loadedMotion.uniforms[0]);
  assert.match(shader.vertexShader, /MUSE_DOVE_AXIS = vec3\(0\.0, 1\.0, 0\.0\)/);
  assert.match(shader.vertexShader, /MUSE_DOVE_SIDE_AXIS = vec3\(0\.0, 0\.0, 1\.0\)/);
  assert.match(shader.vertexShader, /smoothstep\(MUSE_DOVE_CORE_SPAN/);
  assert.match(shader.vertexShader, /museRotateAroundAxis\(objectNormal/);
  assert.match(shader.vertexShader, /transformed = MUSE_DOVE_CENTER/);

  life.update(40);
  const startPitch = doves[0].flightVisual.rotation.x;
  const startBank = doves[0].flightVisual.rotation.z;
  const startFlap = doves[0].loadedMotion.uniforms[0].value;
  const untouchedPositions = [...first.geometry.attributes.position.array];
  life.update(40.6);
  assert.notEqual(doves[0].flightVisual.rotation.x, startPitch);
  assert.notEqual(doves[0].flightVisual.rotation.z, startBank);
  assert.notEqual(doves[0].loadedMotion.uniforms[0].value, startFlap);
  assert.ok(Math.abs(doves[0].loadedMotion.uniforms[0].value) <= 0.22);
  assert.deepEqual([...first.geometry.attributes.position.array], untouchedPositions,
    "the shader motion leaves owned CPU geometry and PBR attributes intact");

  const owned = doves.flatMap((entity) => trackedResources(entity.loadedModel));
  const motions = doves.map((entity) => entity.loadedMotion);
  const motionUniforms = motions.map((motion) => motion.uniforms[0]);
  const counts = new Map(owned.map((resource) => [resource, 0]));
  for (const resource of owned) resource.addEventListener("dispose", () => counts.set(resource, counts.get(resource) + 1));
  life.clear();
  assert.ok(owned.every((resource) => counts.get(resource) === 1));
  assert.ok(motions.every((motion) => motion.active === false && motion.uniforms.length === 0));
  assert.ok(motionUniforms.every((uniform) => uniform.value === 0));
  life.dispose();
});

test("a late white-dove load cannot contaminate a newer world", async () => {
  const stale = deferred();
  const current = deferred();
  const loader = queuedLoader(stale, current);
  const life = new AmbientLife(new THREE.Scene(), { loader, loadTimeoutMs: 1_000 });

  const threshold = worldFor("threshold-conservatory");
  life.setWorld(threshold.sceneId, { bounds: threshold.profile.bounds });
  const sunset = worldFor("sunset-frames");
  life.setWorld(sunset.sceneId, { bounds: sunset.profile.bounds });
  assert.deepEqual(loader.calls, [WHITE_DOVE_ASSET, WHITE_DOVE_ASSET]);

  const currentSource = disposableDoveGltf("current-template");
  current.resolve(currentSource.gltf);
  await flushMicrotasks();
  const staleSource = disposableDoveGltf("stale-template");
  stale.resolve(staleSource.gltf);
  await life.whenReady();

  assert.equal(life.sceneId, "sunset-frames");
  assert.equal(life.entities.length, 2);
  assert.ok(life.entities.every((entity) => entity.loadedModel?.getObjectByName("current-template")));
  assert.ok(life.entities.every((entity) => !entity.loadedModel?.getObjectByName("stale-template")));
  assert.ok(life.entities.every((entity) => entity.loadedMotion?.active === true));
  assert.equal(life.metrics().articulatedCount, 2);
  assert.ok([...currentSource.disposeCounts.values()].every((count) => count === 1));
  assert.ok([...staleSource.disposeCounts.values()].every((count) => count === 1));
  life.dispose();
});

test("white-dove load failure keeps the articulated procedural fallback", async () => {
  const loader = { calls: [], loadAsync(asset) { this.calls.push(asset); return Promise.reject(new Error("offline")); } };
  const life = new AmbientLife(new THREE.Scene(), { loader, loadTimeoutMs: 1_000 });
  const world = worldFor("threshold-conservatory");
  life.setWorld(world.sceneId, { bounds: world.profile.bounds });
  await life.whenReady();

  const dove = life.entities.find((entity) => entity.spec.kind === "white-dove");
  assert.deepEqual(loader.calls, [WHITE_DOVE_ASSET]);
  assert.equal(dove.loadedModel, null);
  assert.equal(dove.root.userData.fallback, true);
  assert.equal(dove.fallbackRoot.userData.model, "procedural-white-dove");
  assert.equal(life.metrics().articulatedCount, 3);
  const startWing = dove.wingLeft.rotation.z;
  life.update(60);
  life.update(60.4);
  assert.notEqual(dove.wingLeft.rotation.z, startWing);
  life.dispose();
});

test("a timed-out white-dove load disposes its late GLB without replacing the fallback", async () => {
  const pending = deferred();
  const loader = queuedLoader(pending);
  const life = new AmbientLife(new THREE.Scene(), { loader, loadTimeoutMs: 5 });
  const world = worldFor("threshold-conservatory");
  life.setWorld(world.sceneId, { bounds: world.profile.bounds });
  await life.whenReady();

  const dove = life.entities.find((entity) => entity.spec.kind === "white-dove");
  assert.equal(dove.root.userData.assetStatus, "fallback");
  assert.equal(dove.root.userData.fallback, true);
  const late = disposableDoveGltf("late-template");
  pending.resolve(late.gltf);
  await flushMicrotasks();
  assert.ok([...late.disposeCounts.values()].every((count) => count === 1));
  assert.equal(dove.loadedModel, null);
  life.dispose();
});

test("ambient implementation keeps local asset loading and deterministic paths", () => {
  const configSource = fs.readFileSync(new URL("../src/config/ambientLife.js", import.meta.url), "utf8");
  const rendererSource = fs.readFileSync(new URL("../src/render/AmbientLife.js", import.meta.url), "utf8");
  const source = `${configSource}\n${rendererSource}`;
  assert.doesNotMatch(source, /Math\.random/);
  assert.doesNotMatch(source, /fetch\s*\(/);
  assert.match(rendererSource, /GLTFLoader|loadAsync/);
  assert.doesNotMatch(configSource, /https?:/i);
  assert.doesNotMatch(configSource, /life\("(?:bird|gull)"/);
});

function createLife(scene = new THREE.Scene()) {
  return new AmbientLife(scene, {
    loader: { loadAsync: async () => { throw new Error("test_asset_unavailable"); } },
    loadTimeoutMs: 1_000
  });
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

function queuedLoader(...requests) {
  return {
    calls: [],
    loadAsync(asset) {
      this.calls.push(asset);
      const request = requests.shift();
      if (!request) return Promise.reject(new Error("unexpected_asset_load"));
      return request.promise;
    }
  };
}

function disposableDoveGltf(name) {
  const texture = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({ map: texture, normalMap: texture });
  const geometry = new THREE.BoxGeometry(0.2, 0.5, 1);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  const scene = new THREE.Group();
  scene.add(mesh);
  const resources = [texture, material, geometry];
  const disposeCounts = new Map(resources.map((resource) => [resource, 0]));
  for (const resource of resources) resource.addEventListener("dispose", () => disposeCounts.set(resource, disposeCounts.get(resource) + 1));
  return { gltf: { scene, animations: [] }, disposeCounts, mesh };
}

function trackedModelResources(root) {
  const mesh = root.getObjectByProperty("isMesh", true);
  return { geometry: mesh.geometry, material: mesh.material, texture: mesh.material.map };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

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
