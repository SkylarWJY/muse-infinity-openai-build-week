import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { getWorld, stopsForWorld } from "../src/config/legacyAssets.js";
import {
  WorldLayer,
  hasPendingSparkWork,
  hasPresentationReadySplatFrame,
  hasRenderableSplatFrame,
  presentationSplatThreshold,
  retireSparkArchive,
  waitForSplatFrame
} from "../src/render/WorldLayer.js";

test("paged RAD readiness uses pager splats instead of the non-paged LOD map", () => {
  const splat = { paged: { numSplats: 241_870 } };
  const spark = { activeSplats: 46_010, lodInstances: new Map() };
  assert.equal(hasRenderableSplatFrame(spark, splat), true);
  spark.activeSplats = 0;
  assert.equal(hasRenderableSplatFrame(spark, splat), false);
});

test("presentation readiness rejects an early sparse RAD frame without hard-locking quality tiers", () => {
  const splat = { paged: { numSplats: 241_870 } };
  const spark = { activeSplats: 46_010, lodInstances: new Map() };
  assert.equal(hasRenderableSplatFrame(spark, splat), true);
  assert.equal(hasPresentationReadySplatFrame(spark, splat, 129_600), false);
  spark.activeSplats = 135_000;
  assert.equal(hasPresentationReadySplatFrame(spark, splat, 129_600), true);
  assert.equal(presentationSplatThreshold({ lodSplatCount: 4_320_000 }), 129_600);
  assert.equal(presentationSplatThreshold({ lodSplatCount: 750_000 }), 40_000);
  assert.equal(presentationSplatThreshold({ lodSplatCount: 9_000_000 }), 135_000);
});

test("presentation readiness fails honestly when a RAD remains sparse for its whole budget", async () => {
  const splat = { paged: { numSplats: 240_000 } };
  const spark = { activeSplats: 48_000, lodInstances: new Map() };
  await assert.rejects(
    waitForSplatFrame(spark, splat, 40, () => false, { minimumActiveSplats: 129_600 }),
    /splat_presentation_timeout/
  );
});

test("presentation readiness samples a RAD that reaches the quality gate at the deadline", async () => {
  const splat = { paged: { numSplats: 586_063 } };
  const spark = { activeSplats: 0, lodInstances: new Map() };
  setTimeout(() => { spark.activeSplats = 437_883; }, 5);

  await waitForSplatFrame(spark, splat, 10, () => false, { minimumActiveSplats: 129_600 });
});

test("large meshes and small colliders keep separate bounded load budgets", async () => {
  const defaults = new WorldLayer(new THREE.Scene(), { textureLoader: { loadAsync: async () => null } });
  assert.equal(defaults.meshTimeoutMs, 90_000);
  assert.equal(defaults.colliderTimeoutMs, 45_000);
  await defaults.clear();

  const injected = new WorldLayer(new THREE.Scene(), {
    textureLoader: { loadAsync: async () => null },
    archiveTimeoutMs: 5
  });
  assert.equal(injected.meshTimeoutMs, 5);
  assert.equal(injected.colliderTimeoutMs, 5);
  await injected.clear();
});

test("stale artwork textures cannot populate a newer archived world", async () => {
  const pending = [];
  const ready = [];
  const textureLoader = {
    loadAsync: (url) => new Promise((resolve) => pending.push({ url, resolve }))
  };
  const layer = new WorldLayer(new THREE.Scene(), {
    textureLoader,
    onArtworkReady: (id) => ready.push(id)
  });

  const firstWorld = { ...getWorld("grand-conservatory-with-lush-gardens"), rad: null, splat: null, collider: null };
  const secondWorld = { ...getWorld("elegant-floral-palace-interior"), rad: null, splat: null, collider: null };
  const first = layer.build(firstWorld);
  await waitUntil(() => pending.length === 4);
  const second = layer.build(secondWorld);
  await waitUntil(() => pending.length === 8);

  let staleTexturesDisposed = 0;
  pending.forEach((request, index) => {
    const texture = new THREE.Texture();
    if (index < 4) texture.addEventListener("dispose", () => { staleTexturesDisposed += 1; });
    request.resolve(texture);
  });
  await Promise.all([first, second]);

  assert.equal(layer.activeWorld.id, secondWorld.id);
  assert.equal(staleTexturesDisposed, 4);
  assert.equal(layer.artworkGroup.children.length, 4);
  assert.deepEqual(ready, ["court-of-light"]);
  for (const stop of stopsForWorld(secondWorld.id)) {
    const pose = layer.stopPose(stop.id);
    assert.ok(pose);
    assert.equal(pose.artwork.id.startsWith("aic-"), true);
  }
  await layer.clear();
});

test("a stalled artwork settles to the spatial fallback and its late texture is disposed", async () => {
  let resolveTexture;
  const pendingTexture = new Promise((resolve) => { resolveTexture = resolve; });
  const layer = new WorldLayer(new THREE.Scene(), {
    textureLoader: { loadAsync: () => pendingTexture },
    artworkTimeoutMs: 5
  });
  const world = {
    ...getWorld("grand-conservatory-with-lush-gardens"),
    rad: null,
    splat: null,
    mesh: null,
    collider: null
  };

  const startedAt = Date.now();
  assert.equal(await layer.build(world), false);
  assert.ok(Date.now() - startedAt < 250);
  assert.equal(layer.scenery.visible, true);
  assert.equal(layer.artworkGroup.visible, true);
  assert.equal(layer.artworkGroup.children.length, 4);
  assert.equal(layer.artworks.values().next().value.picture.material.map, null);

  const texture = new THREE.Texture();
  let disposals = 0;
  texture.addEventListener("dispose", () => { disposals += 1; });
  resolveTexture(texture);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(disposals, 4);
  await layer.clear();
});

test("artwork supports own their render resources and dispose them exactly once", async () => {
  const layer = new WorldLayer(new THREE.Scene(), {
    textureLoader: { loadAsync: async () => null }
  });
  const world = {
    ...getWorld("grand-conservatory-with-lush-gardens"),
    rad: null,
    splat: null,
    mesh: null,
    collider: null
  };

  assert.equal(await layer.build(world), false);
  const supports = [...layer.artworks.values()].flatMap((record) => record.frame.userData.supports);
  const geometries = new Set(supports.map((support) => support.geometry));
  const materials = new Set(supports.map((support) => support.material));
  const geometryDisposals = new Map([...geometries].map((geometry) => [geometry, 0]));
  const materialDisposals = new Map([...materials].map((material) => [material, 0]));

  for (const geometry of geometries) {
    geometry.addEventListener("dispose", () => geometryDisposals.set(geometry, geometryDisposals.get(geometry) + 1));
  }
  for (const material of materials) {
    material.addEventListener("dispose", () => materialDisposals.set(material, materialDisposals.get(material) + 1));
  }

  assert.equal(supports.length, 8);
  assert.equal(geometries.size, supports.length);
  assert.equal(materials.size, supports.length);
  await layer.clear();
  assert.deepEqual([...geometryDisposals.values()], Array(supports.length).fill(1));
  assert.deepEqual([...materialDisposals.values()], Array(supports.length).fill(1));
});

test("stale mesh and collider loads are disposed before the next world becomes resident", async () => {
  const pending = [];
  const gltfLoader = {
    loadAsync: (url) => new Promise((resolve) => pending.push({ url, resolve }))
  };
  const scene = new THREE.Scene();
  const layer = new WorldLayer(scene, {
    gltfLoader,
    textureLoader: { loadAsync: async () => null }
  });
  const firstWorld = getWorld("fantasy-realm-of-shimmering-spheres");
  const secondWorld = getWorld("yellow-polka-dot-infinity-room");

  const first = layer.build(firstWorld);
  await waitUntil(() => pending.length === 2);
  const second = layer.build(secondWorld);
  await waitUntil(() => pending.length === 4);

  const stale = [makeGltf(), makeGltf()];
  let staleDisposals = 0;
  for (const gltf of stale) {
    gltf.scene.traverse((object) => object.geometry?.addEventListener("dispose", () => { staleDisposals += 1; }));
  }
  pending[0].resolve(stale[0]);
  pending[1].resolve(stale[1]);
  pending[2].resolve(makeGltf());
  pending[3].resolve(makeGltf());
  await Promise.all([first, second]);

  assert.equal(staleDisposals, 2);
  assert.equal(layer.archive.type, "mesh");
  assert.equal(layer.archive.worldId, secondWorld.id);
  assert.equal(layer.collider.name, `world-collider-${secondWorld.id}`);
  assert.equal(layer.isLive(secondWorld.id), true);
  assert.equal(layer.artworkGroup.visible, true);
  assert.equal(scene.children.some((child) => child.userData.archivedWorld === firstWorld.id), false);
  await layer.clear();
  assert.equal(layer.artworkGroup.visible, true);
});

test("stalled mesh and collider loads settle once and dispose both late GLBs", async () => {
  const pending = [];
  const gltfLoader = {
    loadAsync: (url) => new Promise((resolve) => pending.push({ url, resolve }))
  };
  const layer = new WorldLayer(new THREE.Scene(), {
    gltfLoader,
    textureLoader: { loadAsync: async () => null },
    archiveTimeoutMs: 5
  });
  const world = getWorld("fantasy-realm-of-shimmering-spheres");

  const startedAt = Date.now();
  assert.equal(await layer.build(world), false);
  assert.ok(Date.now() - startedAt < 250);
  assert.equal(pending.length, 2);
  assert.equal(layer.archive, null);
  assert.equal(layer.collider, null);

  let disposals = 0;
  for (const request of pending) {
    const gltf = makeGltf();
    gltf.scene.traverse((object) => object.geometry?.addEventListener("dispose", () => { disposals += 1; }));
    request.resolve(gltf);
  }
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(disposals, 2);
  await layer.clear();
});

test("collider raycasts ground the visitor on real terrain", () => {
  const scene = new THREE.Scene();
  const layer = new WorldLayer(scene, { textureLoader: { loadAsync: async () => null } });
  layer.activeWorld = getWorld("grand-conservatory-with-lush-gardens");
  const collider = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 4), new THREE.MeshBasicMaterial());
  collider.position.y = 2;
  collider.visible = false;
  collider.updateMatrixWorld(true);
  layer.collider = collider;
  scene.add(collider);
  assert.ok(Math.abs(layer.groundHeightAt(0, 0) - 2.1) < 0.0001);
});

test("continuous ground sampling ignores a raised decorative layer and rejects abrupt ledges", () => {
  const scene = new THREE.Scene();
  const layer = new WorldLayer(scene, { textureLoader: { loadAsync: async () => null } });
  layer.activeWorld = getWorld("grand-conservatory-with-lush-gardens");
  const floor = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 4), new THREE.MeshBasicMaterial());
  floor.position.y = -0.1;
  const decoration = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 1), new THREE.MeshBasicMaterial());
  decoration.position.y = 1;
  const collider = new THREE.Group();
  collider.add(floor, decoration);
  collider.updateMatrixWorld(true);
  layer.collider = collider;
  scene.add(collider);

  assert.ok(Math.abs(layer.walkableGroundHeightAt(0, 0, 0, 0.35)) < 0.0001);
  assert.equal(layer.walkableGroundHeightAt(0, 0, 0.55, 0.2), null);
});

test("continuous ground sampling reuses a five-centimeter movement cell", () => {
  const layer = new WorldLayer(new THREE.Scene(), { textureLoader: { loadAsync: async () => null } });
  layer.activeWorld = getWorld("grand-conservatory-with-lush-gardens");
  layer.collider = new THREE.Group();
  let samples = 0;
  layer.groundHitsAt = () => {
    samples += 1;
    return [0.1];
  };

  assert.equal(layer.walkableGroundHeightAt(0, 0, 0.1, 0.35), 0.1);
  assert.equal(layer.walkableGroundHeightAt(0.02, 0.02, 0.1, 0.35), 0.1);
  assert.equal(samples, 1);
});

test("the collider ground index preserves raycast heights without per-step mesh traversal", () => {
  const scene = new THREE.Scene();
  const layer = new WorldLayer(scene, { textureLoader: { loadAsync: async () => null } });
  layer.activeWorld = getWorld("grand-conservatory-with-lush-gardens");
  const floor = new THREE.Mesh(new THREE.BoxGeometry(8, 0.2, 8), new THREE.MeshBasicMaterial());
  floor.position.y = -0.1;
  const platform = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 2), new THREE.MeshBasicMaterial());
  platform.position.y = 1.9;
  const collider = new THREE.Group();
  collider.add(floor, platform);
  collider.updateMatrixWorld(true);
  layer.collider = collider;
  scene.add(collider);

  const raycastHeights = layer.groundHitsAt(0, 0).sort((left, right) => left - right);
  layer.buildGroundIndex(collider, 1);
  layer.raycaster.intersectObject = () => { throw new Error("unexpected_raycast"); };
  const indexedHeights = layer.groundHitsAt(0, 0).sort((left, right) => left - right);
  assert.equal(indexedHeights.length, raycastHeights.length);
  assert.ok(indexedHeights.every((height, index) => Math.abs(height - raycastHeights[index]) < 0.0001));
});

test("horizontal movement stops at vertical collider faces without treating the floor as a wall", () => {
  const scene = new THREE.Scene();
  const layer = new WorldLayer(scene, { textureLoader: { loadAsync: async () => null } });
  layer.activeWorld = getWorld("grand-conservatory-with-lush-gardens");
  const floor = new THREE.Mesh(new THREE.BoxGeometry(8, 0.2, 8), new THREE.MeshBasicMaterial());
  floor.position.y = -0.1;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3, 8), new THREE.MeshBasicMaterial());
  wall.position.set(0, 1.5, 0);
  const collider = new THREE.Group();
  collider.add(floor, wall);
  collider.updateMatrixWorld(true);
  layer.collider = collider;
  scene.add(collider);

  const openMove = layer.resolveHorizontalMove(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(-0.8, 0, 0), 0.25);
  assert.ok(Math.abs(openMove.x + 0.8) < 0.0001);
  const blockedMove = layer.resolveHorizontalMove(new THREE.Vector3(-0.31, 0, 0), new THREE.Vector3(-0.2, 0, 0), 0.25);
  assert.ok(Math.abs(blockedMove.x + 0.31) < 0.0001);
  const slideMove = layer.resolveHorizontalMove(new THREE.Vector3(-0.31, 0, 0), new THREE.Vector3(0.2, 0, 1), 0.25);
  assert.ok(slideMove.x < -0.28, "the visitor capsule must remain outside the wall");
  assert.ok(slideMove.z > 0.2, "the unblocked component should slide along the wall");
  const awayMove = layer.resolveHorizontalMove(new THREE.Vector3(-0.31, 0, 0), new THREE.Vector3(-0.8, 0, 0), 0.25);
  assert.ok(Math.abs(awayMove.x + 0.8) < 0.0001);
});

test("horizontal movement catches narrow obstacles inside the visitor radius", () => {
  const scene = new THREE.Scene();
  const layer = new WorldLayer(scene, { textureLoader: { loadAsync: async () => null } });
  layer.activeWorld = getWorld("grand-conservatory-with-lush-gardens");
  const floor = new THREE.Mesh(new THREE.BoxGeometry(8, 0.2, 8), new THREE.MeshBasicMaterial());
  floor.position.y = -0.1;
  const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 3, 0.02), new THREE.MeshBasicMaterial());
  pillar.position.set(0, 1.5, 0);
  const collider = new THREE.Group();
  collider.add(floor, pillar);
  collider.updateMatrixWorld(true);
  layer.collider = collider;
  scene.add(collider);

  for (const lateralOffset of [-0.24, -0.205, -0.14, -0.075, -0.015, 0.015, 0.075, 0.14, 0.205, 0.24]) {
    pillar.position.z = lateralOffset;
    pillar.updateMatrixWorld(true);
    layer.horizontalCollisionCache = null;
    const blocked = layer.resolveHorizontalMove(
      new THREE.Vector3(-0.5, 0, 0),
      new THREE.Vector3(0.5, 0, 0),
      0.25
    );
    assert.ok(blocked.x < 0,
      `the visitor radius passed beside the pillar at offset ${lateralOffset}`);
  }
});

test("indexed horizontal collision avoids traversing the full inherited collider", () => {
  const scene = new THREE.Scene();
  const layer = new WorldLayer(scene, { textureLoader: { loadAsync: async () => null } });
  layer.activeWorld = getWorld("grand-conservatory-with-lush-gardens");
  const floor = new THREE.Mesh(new THREE.BoxGeometry(8, 0.2, 8), new THREE.MeshBasicMaterial());
  floor.position.y = -0.1;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3, 8), new THREE.MeshBasicMaterial());
  wall.position.set(0, 1.5, 0);
  const collider = new THREE.Group();
  collider.add(floor, wall);
  collider.updateMatrixWorld(true);
  layer.collider = collider;
  layer.buildGroundIndex(collider, 1);
  wall.raycast = () => { throw new Error("unexpected_full_collider_raycast"); };
  scene.add(collider);

  const blocked = layer.resolveHorizontalMove(
    new THREE.Vector3(-0.31, 0, 0),
    new THREE.Vector3(-0.2, 0, 0),
    0.25
  );
  assert.ok(Math.abs(blocked.x + 0.31) < 0.0001);
});

test("horizontal clearance is reused across short same-direction steps", () => {
  const scene = new THREE.Scene();
  const layer = new WorldLayer(scene, { textureLoader: { loadAsync: async () => null } });
  layer.activeWorld = getWorld("grand-conservatory-with-lush-gardens");
  const floor = new THREE.Mesh(new THREE.BoxGeometry(20, 0.2, 20), new THREE.MeshBasicMaterial());
  floor.position.y = -0.1;
  floor.updateMatrixWorld(true);
  layer.collider = floor;
  scene.add(floor);
  const intersectObject = layer.raycaster.intersectObject.bind(layer.raycaster);
  let raycasts = 0;
  layer.raycaster.intersectObject = (...args) => {
    raycasts += 1;
    return intersectObject(...args);
  };

  let position = new THREE.Vector3(-2, 0, 0);
  let initialRaycasts = 0;
  for (let step = 0; step < 10; step += 1) {
    const desired = position.clone().add(new THREE.Vector3(0.05, 0, 0));
    position = layer.resolveHorizontalMove(position, desired, 0.25);
    if (step === 0) assert.ok(raycasts > 0, "the first movement must scan the collider");
    if (step === 0) initialRaycasts = raycasts;
  }
  assert.equal(raycasts, initialRaycasts,
    `same-direction clearance repeated its initial ${initialRaycasts} raycasts`);
});

test("Spark retirement remains tracked through pager work and disposes after it settles", async () => {
  const pending = deferred();
  const pager = sparkPager();
  const fetchPromise = pending.promise.finally(() => { pager.fetchers.length = 0; });
  pager.fetchers.push({ promise: fetchPromise });
  const archived = fakeSparkArchive(pager);
  const scene = new THREE.Scene();
  scene.add(archived.spark, archived.splat);
  const layer = new WorldLayer(scene, {
    textureLoader: { loadAsync: async () => null },
    sparkRetirementOptions: { initialTimeoutMs: 5, terminalTimeoutMs: 100, intervalMs: 1, terminalIntervalMs: 1 }
  });

  const retirement = layer.retireSpark(archived);
  assert.equal(layer.retirements.size, 1);
  assert.equal(hasPendingSparkWork(archived), true);
  await new Promise((resolve) => setTimeout(resolve, 12));
  assert.equal(layer.retirements.size, 1);
  assert.equal(archived.disposals.splat, 0);

  pending.resolve();
  assert.equal(await retirement, true);
  assert.equal(layer.retirements.size, 0);
  assert.deepEqual(archived.disposals, { splat: 1, spark: 1, pager: 1 });
  assert.equal(scene.children.includes(archived.spark), false);
});

test("rejected Spark initialization does not hold retirement open after tracked work settles", async () => {
  const archived = fakeSparkArchive(sparkPager());
  archived.splat.isInitialized = false;
  archived.work = [{ pending: false }];
  const scene = new THREE.Scene();
  scene.add(archived.spark, archived.splat);

  assert.equal(hasPendingSparkWork(archived), false);
  assert.equal(await retireSparkArchive(scene, archived, {
    initialTimeoutMs: 20,
    terminalTimeoutMs: 100,
    intervalMs: 1,
    terminalIntervalMs: 1
  }), true);
  assert.deepEqual(archived.disposals, { splat: 1, spark: 1, pager: 1 });
});

test("Spark retirement terminally disposes work that never reports idle", async () => {
  const pager = sparkPager();
  pager.fetchers.push({ promise: new Promise(() => {}) });
  const archived = fakeSparkArchive(pager);
  const scene = new THREE.Scene();
  scene.add(archived.spark, archived.splat);

  assert.equal(await retireSparkArchive(scene, archived, {
    initialTimeoutMs: 2,
    terminalTimeoutMs: 4,
    intervalMs: 1,
    terminalIntervalMs: 1
  }), false);
  assert.deepEqual(archived.disposals, { splat: 1, spark: 1, pager: 1 });
  assert.equal(pager.autoDrive, false);
  assert.equal(pager.numFetchers, 0);
});

test("terminal Spark retirement silences only the worker RPCs it must terminate", async () => {
  const archived = fakeSparkArchive(sparkPager());
  let rejected = 0;
  let terminated = 0;
  const worker = {
    queue: null,
    messages: {
      rpc: { reject: () => { rejected += 1; } }
    },
    dispose() {
      terminated += 1;
      const messages = Object.values(this.messages);
      this.messages = {};
      for (const message of messages) message.reject(new Error("Worker terminate"));
    }
  };
  archived.spark.sortWorker = worker;
  archived.spark.sorting = true;
  archived.spark.dispose = function dispose() {
    archived.disposals.spark += 1;
    this.sortWorker?.dispose();
    this.pager?.dispose();
    this.pager = undefined;
  };
  const scene = new THREE.Scene();
  scene.add(archived.spark, archived.splat);

  assert.equal(await retireSparkArchive(scene, archived, {
    initialTimeoutMs: 2,
    terminalTimeoutMs: 4,
    intervalMs: 1,
    terminalIntervalMs: 1
  }), false);
  assert.equal(terminated, 1);
  assert.equal(rejected, 0);
  assert.deepEqual(worker.messages, {});
  assert.deepEqual(archived.disposals, { splat: 1, spark: 1, pager: 1 });
});

function makeGltf() {
  const scene = new THREE.Group();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
  return { scene };
}

function deferred() {
  let resolve;
  const promise = new Promise((settle) => { resolve = settle; });
  return { promise, resolve };
}

function sparkPager() {
  return {
    autoDrive: true,
    numFetchers: 3,
    fetchPriority: [{}],
    fetchers: [],
    fetched: [],
    newUploads: [],
    readyUploads: [],
    lodTreeUpdates: [],
    driveFetchers() {},
    processFetched() {},
    dispose() {}
  };
}

function fakeSparkArchive(pager) {
  const disposals = { splat: 0, spark: 0, pager: 0 };
  pager.dispose = () => { disposals.pager += 1; };
  const spark = new THREE.Group();
  Object.assign(spark, {
    pager,
    autoUpdate: true,
    enableDriveLod: true,
    enableLodFetching: true,
    sorting: false,
    updateTimeoutId: -1,
    sortTimeoutId: -1,
    sortWorker: { messages: {} },
    lodWorker: { queue: null, messages: {} },
    dispose() {
      disposals.spark += 1;
      this.pager?.dispose();
      this.pager = undefined;
    }
  });
  const splat = new THREE.Group();
  splat.isInitialized = true;
  splat.paged = { pager };
  splat.dispose = () => { disposals.splat += 1; };
  return { type: "splat", spark, splat, work: [], retirePromise: null, disposals };
}

async function waitUntil(predicate) {
  const deadline = Date.now() + 1_000;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error("wait_timeout");
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
