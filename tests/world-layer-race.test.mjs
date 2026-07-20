import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { getWorld, stopsForWorld } from "../src/config/legacyAssets.js";
import { WorldLayer, hasPendingSparkWork, hasRenderableSplatFrame, retireSparkArchive } from "../src/render/WorldLayer.js";

test("paged RAD readiness uses pager splats instead of the non-paged LOD map", () => {
  const splat = { paged: { numSplats: 241_870 } };
  const spark = { activeSplats: 46_010, lodInstances: new Map() };
  assert.equal(hasRenderableSplatFrame(spark, splat), true);
  spark.activeSplats = 0;
  assert.equal(hasRenderableSplatFrame(spark, splat), false);
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

  const firstWorld = { ...getWorld("grand-conservatory-with-lush-gardens"), splat: null, collider: null };
  const secondWorld = { ...getWorld("elegant-floral-palace-interior"), splat: null, collider: null };
  const first = layer.build(firstWorld);
  await waitUntil(() => pending.length === 1);
  const second = layer.build(secondWorld);
  await waitUntil(() => pending.length === 2);

  let staleTexturesDisposed = 0;
  pending.forEach((request, index) => {
    const texture = new THREE.Texture();
    if (index === 0) texture.addEventListener("dispose", () => { staleTexturesDisposed += 1; });
    request.resolve(texture);
  });
  await Promise.all([first, second]);

  assert.equal(layer.activeWorld.id, secondWorld.id);
  assert.equal(staleTexturesDisposed, 1);
  assert.equal(layer.artworkGroup.children.length, 1);
  assert.deepEqual(ready, ["court-of-light"]);
  for (const stop of stopsForWorld(secondWorld.id)) {
    assert.deepEqual(layer.artworks.get(stop.id).frame.position.toArray(), stop.artworkPosition);
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
  assert.equal(layer.artworkGroup.children.length, 1);
  assert.equal(layer.artworks.values().next().value.picture.material.map, null);

  const texture = new THREE.Texture();
  let disposals = 0;
  texture.addEventListener("dispose", () => { disposals += 1; });
  resolveTexture(texture);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(disposals, 1);
  await layer.clear();
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
  assert.equal(layer.artworkGroup.visible, false);
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
