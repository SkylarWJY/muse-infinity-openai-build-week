import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as THREE from "three";
import {
  AMBIENT_ASSET_PIPELINE,
  AMBIENT_LIFE_BY_SCENE,
  AMBIENT_SCENE_IDS,
  ambientLifeForScene,
  isApprovedAmbientAsset
} from "../src/config/ambientLife.js";
import { AmbientLife, sampleAmbientPath } from "../src/render/AmbientLife.js";
import { ARCHIVED_WORLDS } from "../src/config/legacyAssets.js";

const EXPECTED = Object.freeze({
  "threshold-conservatory": Object.freeze({}),
  "court-of-light": Object.freeze({}),
  "water-and-light": Object.freeze({}),
  "sunset-frames": Object.freeze({}),
  "burning-sky": Object.freeze({}),
  "petal-transition": Object.freeze({}),
  "living-memory": Object.freeze({}),
  "infinite-repetition": Object.freeze({ dots: 24 }),
  "personal-dream-world": Object.freeze({ firefly: 24 })
});

test("all nine scenes expose only honest abstract ambient fields", () => {
  assert.deepEqual(AMBIENT_SCENE_IDS, ARCHIVED_WORLDS.map((world) => world.sceneId));
  assert.deepEqual(Object.keys(AMBIENT_LIFE_BY_SCENE), Object.keys(EXPECTED));

  for (const [sceneId, expected] of Object.entries(EXPECTED)) {
    const specs = ambientLifeForScene(sceneId);
    assert.deepEqual(Object.fromEntries(specs.map((spec) => [spec.kind, spec.count])), expected, sceneId);
    assert.equal(Object.isFrozen(specs), true, sceneId);
    for (const spec of specs) {
      assert.ok(["dots", "firefly"].includes(spec.kind), `${sceneId}:${spec.kind}`);
      assert.equal(Object.hasOwn(spec, "asset"), false, `${sceneId}:${spec.kind}`);
      assert.equal(Object.isFrozen(spec), true, `${sceneId}:${spec.kind}`);
      assert.equal(Object.isFrozen(spec.volume), true, `${sceneId}:${spec.kind}:volume`);
    }
  }

  assert.deepEqual(ambientLifeForScene("missing-scene"), []);
  assert.deepEqual(ambientLifeForScene("infinite-repetition").map((spec) => spec.kind), ["dots"]);
  assert.deepEqual(ambientLifeForScene("personal-dream-world").map((spec) => spec.kind), ["firefly"]);
});

test("provider GLBs require the complete approval, provenance, animation and visual-QA contract", () => {
  const approved = providerSpec();
  assert.equal(isApprovedAmbientAsset(approved), true);

  const rejected = [
    { ...approved, approved: false },
    { ...approved, asset: "https://cdn.example/koi.glb" },
    { ...approved, asset: "/assets/../private/koi.glb" },
    { ...approved, asset: "/assets/generated/koi.obj" },
    { ...approved, animationClip: "" },
    { ...approved, pipeline: { ...approved.pipeline, reference: "other-model" } },
    { ...approved, pipeline: { ...approved.pipeline, multiview: false } },
    { ...approved, pipeline: { ...approved.pipeline, subjectProvider: "marble" } },
    { ...approved, pipeline: { ...approved.pipeline, animation: "procedural-primitive" } },
    { ...approved, pipeline: { ...approved.pipeline, visualQa: "pending" } }
  ];
  for (const spec of rejected) assert.equal(isApprovedAmbientAsset(spec), false, JSON.stringify(spec));

  assert.deepEqual(AMBIENT_ASSET_PIPELINE, {
    reference: "gpt-image-2",
    multiview: true,
    subjectProvider: "tripo",
    animation: "embedded-clip",
    visualQa: "approved"
  });
  assert.equal(Object.isFrozen(AMBIENT_ASSET_PIPELINE), true);
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
});

test("path sampling is deterministic, bounded and frame-rate independent", () => {
  const spec = ambientLifeForScene("personal-dream-world")[0];
  for (let index = 0; index < spec.count; index += 1) {
    for (const elapsed of [0, 0.25, 1, 8.75, 1_000_000]) {
      const first = sampleAmbientPath(spec, index, elapsed, {});
      const second = sampleAmbientPath(spec, index, elapsed, {});
      assert.deepEqual(first, second);
      assertInsideVolume(first, spec.volume);
    }
  }

  const world = worldFor("personal-dream-world");
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

test("dots and fireflies use one efficient point field per scene", () => {
  const scene = new THREE.Scene();
  const life = createLife(scene);
  const infinity = worldFor("infinite-repetition");
  assert.deepEqual(life.setWorld(infinity.sceneId, { bounds: infinity.profile.bounds }), {
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

  const finale = worldFor("personal-dream-world");
  life.setWorld(finale.sceneId, { bounds: finale.profile.bounds });
  assert.deepEqual(life.metrics().kinds, ["firefly"]);
  assert.equal(life.metrics().count, 24);
  assert.equal(life.pointFields.length, 1);
  life.dispose();
});

test("unapproved spectacles are neither loaded nor made visible", async () => {
  const loader = recordingLoader();
  const life = new AmbientLife(new THREE.Scene(), { loader, loadTimeoutMs: 1_000 });
  const candidate = providerSpec({ approved: false });
  assert.deepEqual(life.setWorld("candidate", { specs: [candidate] }), emptyMetrics("candidate"));
  await life.whenReady();

  assert.deepEqual(loader.calls, []);
  assert.equal(life.entities.length, 0);
  assert.equal(life.group.children.length, 0);
  assert.equal(visibleMeshes(life.group).length, 0);
  life.dispose();
});

test("a missing approved asset stays hidden without a primitive fallback", async () => {
  const loader = recordingLoader(Promise.reject(new Error("missing")));
  const life = new AmbientLife(new THREE.Scene(), { loader, loadTimeoutMs: 1_000 });
  const spec = providerSpec();
  assert.deepEqual(life.setWorld("approved", { specs: [spec] }), emptyMetrics("approved"));
  assert.equal(life.entities.length, 1);
  assert.equal(life.entities[0].root.visible, false);
  assert.equal(life.group.children.length, 0);

  await life.whenReady();
  assert.deepEqual(loader.calls, [spec.asset]);
  assert.equal(life.entities[0].root.userData.assetStatus, "failed");
  assert.equal(life.entities[0].root.visible, false);
  assert.equal(life.entities[0].loadedModel, null);
  assert.equal(life.group.children.length, 0);
  assert.equal(visibleMeshes(life.group).length, 0);
  assert.deepEqual(life.metrics(), emptyMetrics("approved"));
  life.dispose();
});

test("a provider GLB without the approved animation clip stays hidden", async () => {
  const source = disposableGltf("static-template", []);
  const loader = recordingLoader(Promise.resolve(source.gltf));
  const life = new AmbientLife(new THREE.Scene(), { loader, loadTimeoutMs: 1_000 });
  life.setWorld("static", { specs: [providerSpec()] });
  await life.whenReady();

  assert.ok([...source.disposeCounts.values()].every((count) => count === 1));
  assert.equal(life.entities[0].root.userData.assetStatus, "failed");
  assert.equal(life.entities[0].root.visible, false);
  assert.equal(life.group.children.length, 0);
  assert.deepEqual(life.metrics(), emptyMetrics("static"));
  life.dispose();
});

test("an approved animated provider GLB appears only after successful loading", async () => {
  const pending = deferred();
  const loader = recordingLoader(pending.promise);
  const life = new AmbientLife(new THREE.Scene(), { loader, loadTimeoutMs: 1_000 });
  const spec = providerSpec({ count: 2 });
  assert.deepEqual(life.setWorld("approved", { specs: [spec] }), emptyMetrics("approved"));
  assert.equal(life.group.children.length, 0);
  assert.ok(life.entities.every((entity) => entity.root.visible === false));

  const source = disposableGltf("animated-template", [ambientClip()]);
  pending.resolve(source.gltf);
  await life.whenReady();
  assert.ok([...source.disposeCounts.values()].every((count) => count === 1));
  assert.equal(life.group.children.length, 2);
  assert.ok(life.entities.every((entity) => entity.root.userData.assetStatus === "ready"));
  assert.ok(life.entities.every((entity) => entity.root.visible === true));
  assert.ok(life.entities.every((entity) => entity.loadedModel?.parent === entity.root));
  assert.ok(life.entities.every((entity) => entity.mixer?.getRoot() === entity.loadedModel));
  assert.notEqual(life.entities[0].loadedModel, life.entities[1].loadedModel);
  assert.notEqual(
    life.entities[0].loadedModel.getObjectByProperty("isMesh", true).geometry,
    life.entities[1].loadedModel.getObjectByProperty("isMesh", true).geometry
  );
  assert.deepEqual(life.metrics(), {
    sceneId: "approved",
    count: 2,
    kinds: ["koi"],
    articulatedCount: 2,
    pointCount: 0,
    moving: false
  });

  const start = life.entities[0].root.position.clone();
  life.update(10);
  life.update(10.5);
  assert.ok(life.entities[0].root.position.distanceToSquared(start) > 0);
  assert.equal(life.metrics().moving, true);

  const owned = life.entities.flatMap((entity) => trackedResources(entity.loadedModel));
  const counts = new Map(owned.map((resource) => [resource, 0]));
  for (const resource of owned) resource.addEventListener("dispose", () => counts.set(resource, counts.get(resource) + 1));
  life.clear();
  assert.ok(owned.every((resource) => counts.get(resource) === 1));
  assert.equal(life.group.children.length, 0);
  life.dispose();
});

test("a late provider load cannot contaminate a newer scene", async () => {
  const pending = deferred();
  const loader = recordingLoader(pending.promise);
  const life = new AmbientLife(new THREE.Scene(), { loader, loadTimeoutMs: 1_000 });
  life.setWorld("stale", { specs: [providerSpec()] });
  const finale = worldFor("personal-dream-world");
  life.setWorld(finale.sceneId, { bounds: finale.profile.bounds });

  const source = disposableGltf("stale-template", [ambientClip()]);
  pending.resolve(source.gltf);
  await life.whenReady();
  assert.ok([...source.disposeCounts.values()].every((count) => count === 1));
  assert.equal(life.sceneId, finale.sceneId);
  assert.equal(life.entities.length, 0);
  assert.equal(life.pointFields.length, 1);
  assert.equal(life.group.getObjectByName("stale-template"), undefined);
  life.dispose();
});

test("duplicate point fields retain and dispose every resource", () => {
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

test("every configured scene remains finite under hostile elapsed input", () => {
  const life = createLife();
  for (const world of ARCHIVED_WORLDS) {
    life.setWorld(world.sceneId, { bounds: world.profile.bounds });
    for (const elapsed of [Number.NaN, Number.POSITIVE_INFINITY, -100, 0, 1e12]) life.update(elapsed);
    for (const field of life.pointFields) {
      assert.ok([...field.positions].every(Number.isFinite), `${world.sceneId}:${field.spec.kind}`);
    }
  }
  life.dispose();
});

test("ambient implementation contains no concrete-creature primitive fallback", () => {
  const configSource = fs.readFileSync(new URL("../src/config/ambientLife.js", import.meta.url), "utf8");
  const rendererSource = fs.readFileSync(new URL("../src/render/AmbientLife.js", import.meta.url), "utf8");
  const source = `${configSource}\n${rendererSource}`;
  assert.doesNotMatch(source, /Math\.random/);
  assert.doesNotMatch(source, /fetch\s*\(/);
  assert.match(rendererSource, /GLTFLoader|loadAsync/);
  assert.doesNotMatch(rendererSource, /three\/addons\/utils\/SkeletonUtils\.js/);
  assert.doesNotMatch(configSource, /https?:/i);
  assert.doesNotMatch(configSource, /white-dove|butterfly|dragonfly|tropical-bird|crow|koi|deer|dinosaur/i);
  assert.doesNotMatch(rendererSource, /new\s+THREE\.Mesh\s*\(/);
  assert.doesNotMatch(rendererSource, /SphereGeometry|OctahedronGeometry|ConeGeometry|CylinderGeometry/);
  assert.doesNotMatch(rendererSource, /procedural-white-dove|shader-wing-deformation|fallbackRoot/);
});

function providerSpec(overrides = {}) {
  return {
    kind: "koi",
    mode: "orbit",
    count: 1,
    seed: 3101,
    volume: { center: [0, 1, 0], extent: [2, 1, 2] },
    period: 10,
    scale: 0.8,
    asset: "/assets/generated/ambient-spectacles-v1/koi.glb",
    animationClip: "Ambient",
    approved: true,
    pipeline: { ...AMBIENT_ASSET_PIPELINE },
    ...overrides
  };
}

function emptyMetrics(sceneId) {
  return { sceneId, count: 0, kinds: [], articulatedCount: 0, pointCount: 0, moving: false };
}

function createLife(scene = new THREE.Scene()) {
  return new AmbientLife(scene, {
    loader: { loadAsync: async () => { throw new Error("test_asset_unavailable"); } },
    loadTimeoutMs: 1_000
  });
}

function recordingLoader(result) {
  return {
    calls: [],
    loadAsync(asset) {
      this.calls.push(asset);
      return result ?? Promise.reject(new Error("unexpected_asset_load"));
    }
  };
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

function ambientClip() {
  return new THREE.AnimationClip("Ambient", 1, [
    new THREE.NumberKeyframeTrack(".rotation[y]", [0, 1], [0, Math.PI * 2])
  ]);
}

function disposableGltf(name, animations) {
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
  return { gltf: { scene, animations }, disposeCounts };
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
    fields: life.pointFields.map((field) => ({ kind: field.spec.kind, positions: [...field.positions] })),
    metrics: life.metrics()
  };
}

function trackedResources(root) {
  const resources = new Set();
  root.traverse((object) => {
    if (object.geometry) resources.add(object.geometry);
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!material) continue;
      resources.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
    }
  });
  return [...resources];
}

function visibleMeshes(root) {
  const meshes = [];
  root.traverseVisible((object) => {
    if (object.isMesh) meshes.push(object);
  });
  return meshes;
}
