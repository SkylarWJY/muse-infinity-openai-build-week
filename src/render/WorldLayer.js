import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { stopsForWorld } from "../config/legacyAssets.js";
import { withTimeout } from "./withTimeout.js";

const DOWN = new THREE.Vector3(0, -1, 0);

export function resolveSceneQuality({ mobile = false, mode = "high" } = {}) {
  if (mode === "balanced") {
    return mobile
      ? quality(1.25, 400_000, 1.25, 1.5, false, 1_048_576, 150)
      : quality(1.5, 1_000_000, 1.15, 1.75, false, 2_097_152, 120);
  }
  if (mode === "performance") {
    return mobile
      ? quality(1, 300_000, 1.5, 1, false, 786_432, 250)
      : quality(1.25, 650_000, 1.35, 1.25, false, 1_572_864, 180);
  }
  return mobile
    ? quality(1.5, 750_000, 1, 2, false, 1_572_864, 120)
    : quality(2, 2_500_000, 1, 2, true, 4_194_304, 80);
}

function quality(devicePixelRatioCap, lodSplatCount, lodRenderScale, lodScale, pagedExtSplats, maxPagedSplats, minSortIntervalMs) {
  return {
    devicePixelRatioCap,
    enableLod: true,
    lod: true,
    lodSplatCount,
    lodRenderScale,
    lodScale,
    pagedExtSplats,
    maxPagedSplats,
    minSortIntervalMs
  };
}

export function currentSceneQuality() {
  const mobile = typeof window !== "undefined" && window.matchMedia?.("(max-width: 700px)").matches === true;
  const requested = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("quality")
    : null;
  const mode = ["high", "balanced", "performance"].includes(requested) ? requested : "high";
  return resolveSceneQuality({ mobile, mode });
}

export class WorldLayer {
  constructor(scene, {
    renderer,
    textureLoader = new THREE.TextureLoader(),
    gltfLoader = new GLTFLoader(),
    quality = currentSceneQuality(),
    onArtworkReady = () => {},
    onStatus = () => {},
    artworkTimeoutMs = 12_000,
    archiveTimeoutMs,
    meshTimeoutMs = archiveTimeoutMs ?? 90_000,
    colliderTimeoutMs = archiveTimeoutMs ?? 45_000,
    sparkRetirementOptions = {}
  } = {}) {
    this.scene = scene;
    this.renderer = renderer;
    this.textureLoader = textureLoader;
    this.gltfLoader = gltfLoader;
    this.quality = quality;
    this.onArtworkReady = onArtworkReady;
    this.onStatus = onStatus;
    this.artworkTimeoutMs = artworkTimeoutMs;
    this.meshTimeoutMs = meshTimeoutMs;
    this.colliderTimeoutMs = colliderTimeoutMs;
    this.sparkRetirementOptions = sparkRetirementOptions;
    this.group = new THREE.Group();
    this.group.name = "world-layer";
    this.scenery = new THREE.Group();
    this.scenery.name = "procedural-scenery";
    this.artworkGroup = new THREE.Group();
    this.artworkGroup.name = "artwork-anchors";
    this.group.add(this.scenery, this.artworkGroup);
    this.scene.add(this.group);
    this.artworks = new Map();
    this.activeWorld = null;
    this.archive = null;
    this.splat = null;
    this.mesh = null;
    this.collider = null;
    this.buildToken = 0;
    this.raycaster = new THREE.Raycaster();
    this.groundCache = new Map();
    this.retirements = new Set();
  }

  async build(world) {
    const token = ++this.buildToken;
    this.clearCurrent();
    this.groundCache.clear();
    if (token !== this.buildToken) return false;
    this.activeWorld = world;
    this.scene.background = new THREE.Color(world.palette.sky);
    this.scene.fog = new THREE.Fog(world.palette.sky, 22, 72);
    this.buildFloor(world);
    this.buildArchitecture(world);

    await this.buildArtworks(world, token);
    if (token !== this.buildToken) return false;

    const hasArchive = Boolean(world.mesh || world.rad || world.splat);
    if (!hasArchive) return false;
    this.onStatus({ type: world.render, live: false, pending: true, world, message: `Loading high-fidelity archive · ${world.name}` });
    const [live] = await Promise.all([
      this.loadArchive(world, token),
      this.loadCollider(world, token)
    ]);
    if (token !== this.buildToken) return false;
    if (live) {
      this.onStatus({ type: this.archive?.type || world.render, live: true, pending: false, world, message: `${world.name} · high-fidelity archive live` });
      return true;
    }
    this.onStatus({ type: world.render, live: false, pending: false, world, message: "Archive unavailable; spatial fallback retained" });
    return false;
  }

  buildFloor(world) {
    const shell = new THREE.Group();
    shell.position.set(world.profile.spawn.x, 0, world.profile.spawn.z);
    shell.rotation.y = world.profile.yaw;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(42, 42), new THREE.MeshStandardMaterial({ color: world.palette.floor, roughness: 0.92 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = world.profile.groundY;
    floor.receiveShadow = true;
    shell.add(floor);
    const grid = new THREE.GridHelper(42, 28, 0x77807a, 0x9da39e);
    grid.material.opacity = 0.12;
    grid.material.transparent = true;
    grid.position.y = world.profile.groundY + 0.006;
    shell.add(grid);
    this.scenery.add(shell);
  }

  buildArchitecture(world) {
    const shell = new THREE.Group();
    shell.position.set(world.profile.spawn.x, world.profile.groundY, world.profile.spawn.z);
    shell.rotation.y = world.profile.yaw;
    const wallMat = new THREE.MeshStandardMaterial({ color: world.palette.wall, roughness: 0.84 });
    const trimMat = new THREE.MeshStandardMaterial({ color: world.palette.accent, roughness: 0.55 });
    const back = new THREE.Mesh(new THREE.BoxGeometry(22, 5.5, 0.25), wallMat);
    back.position.set(0, 2.75, -11.35);
    shell.add(back);
    for (const x of [-8.4, 8.4]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.25, 5.5, 12.5), wallMat);
      wing.position.set(x, 2.75, -5.2);
      shell.add(wing);
    }
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(21.6, 0.08, 0.08), trimMat);
    ribbon.position.set(0, 4.95, -11.16);
    shell.add(ribbon);
    for (const x of [-5.5, 0, 5.5]) {
      const light = new THREE.SpotLight(0xfff3dd, 55, 18, Math.PI / 5, 0.55, 1.4);
      light.position.set(x, 5.2, -2.5);
      light.target.position.set(x, 1.5, -9);
      shell.add(light, light.target);
    }
    this.scenery.add(shell);
  }

  async buildArtworks(world, token) {
    await Promise.all(stopsForWorld(world.id).map(async (stop) => {
      const texture = stop.image
        ? await withTimeout(this.textureLoader.loadAsync(stop.image), this.artworkTimeoutMs, "artwork_timeout", {
          onLateResolve: (lateTexture) => lateTexture?.dispose?.()
        }).catch(() => null)
        : null;
      if (token !== this.buildToken) {
        texture?.dispose?.();
        return;
      }
      if (texture) {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(16, this.renderer?.capabilities?.getMaxAnisotropy?.() || 4);
      }
      const frame = new THREE.Group();
      frame.name = `artwork-${stop.id}`;
      const width = 1.58;
      const height = 1.05;
      const border = new THREE.Mesh(new THREE.BoxGeometry(width + 0.14, height + 0.14, 0.09), new THREE.MeshStandardMaterial({ color: 0x171a18, roughness: 0.35 }));
      const picture = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, color: texture ? 0xffffff : world.palette.accent, toneMapped: false }));
      picture.position.z = 0.052;
      frame.add(border, picture);
      frame.position.fromArray(stop.artworkPosition);
      frame.rotation.y = stop.artworkYaw;
      frame.userData.stopId = stop.id;
      this.artworkGroup.add(frame);
      this.artworks.set(stop.id, { frame, picture, border });
      this.onArtworkReady(stop.id, frame);
    }));
  }

  highlight(stopId, effect = "focus") {
    for (const [id, artwork] of this.artworks) {
      const active = id === stopId;
      artwork.border.material.emissive = new THREE.Color(active ? this.activeWorld.palette.accent : 0x000000);
      artwork.border.material.emissiveIntensity = active ? (effect === "echo" ? 0.8 : 0.45) : 0;
      artwork.frame.scale.setScalar(active ? 1.025 : 1);
    }
  }

  async loadArchive(world, token) {
    if (world.render === "mesh" && world.mesh) {
      const meshLive = await this.loadMesh(world, token).catch(() => false);
      if (meshLive || token !== this.buildToken || !(world.rad || world.splat)) return meshLive;
    }
    if (world.rad || world.splat) return this.loadSplat(world, token).catch(() => false);
    if (world.mesh) return this.loadMesh(world, token).catch(() => false);
    return false;
  }

  async loadMesh(world, token) {
    const gltf = await withTimeout(this.gltfLoader.loadAsync(world.mesh), this.meshTimeoutMs, "mesh_timeout", {
      onLateResolve: (lateGltf) => disposeTree(lateGltf?.scene)
    });
    const object = gltf.scene;
    if (token !== this.buildToken) {
      disposeTree(object);
      return false;
    }
    object.name = `archived-world-${world.id}`;
    object.userData.archivedWorld = world.id;
    object.userData.archiveType = "mesh";
    object.scale.multiplyScalar(world.transform.scale);
    object.position.y += world.transform.y;
    if (world.transform.rotationX) object.rotateX(world.transform.rotationX);
    object.traverse((child) => {
      if (!child.isMesh) return;
      child.frustumCulled = true;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (!material) continue;
        material.toneMapped = false;
        material.fog = false;
        if (material.map) material.map.anisotropy = Math.min(16, this.renderer?.capabilities?.getMaxAnisotropy?.() || 4);
      }
    });
    object.updateMatrixWorld(true);
    const archived = { type: "mesh", object, worldId: world.id, live: true };
    this.archive = archived;
    this.mesh = archived;
    this.scene.add(object);
    this.revealArchive();
    return true;
  }

  async loadSplat(world, token) {
    const { SparkRenderer, SplatMesh } = await withTimeout(import("@sparkjsdev/spark"), 20_000, "spark_import_timeout");
    if (token !== this.buildToken) return false;
    const paged = Boolean(world.rad);
    const spark = new SparkRenderer({
      renderer: this.renderer,
      enableLod: this.quality.enableLod,
      lodSplatCount: this.quality.lodSplatCount,
      lodRenderScale: this.quality.lodRenderScale,
      pagedExtSplats: paged && this.quality.pagedExtSplats,
      maxPagedSplats: this.quality.maxPagedSplats,
      lodRaycast: 0,
      minSortIntervalMs: this.quality.minSortIntervalMs
    });
    const splat = new SplatMesh({
      url: world.rad || world.splat,
      ...(paged ? { paged: true } : { lod: this.quality.lod }),
      enableLod: this.quality.enableLod,
      lodScale: this.quality.lodScale,
      editable: false,
      raycastable: false
    });
    splat.name = `archived-world-${world.id}`;
    splat.userData.archivedWorld = world.id;
    splat.userData.archiveType = "splat";
    splat.userData.archiveFormat = paged ? "rad" : "spz";
    splat.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), world.transform.rotationX);
    splat.scale.setScalar(world.transform.scale);
    splat.position.y = world.transform.y;
    const archived = {
      type: "splat",
      spark,
      splat,
      worldId: world.id,
      live: false,
      retirePromise: null,
      work: [trackAsyncWork(splat.initialized), trackAsyncWork(splat.paged?.radMetaPromise)].filter(Boolean)
    };
    this.archive = archived;
    this.splat = archived;
    this.scene.add(spark, splat);
    try {
      await withTimeout(splat.initialized, 45_000, "splat_timeout");
      await waitForSplatFrame(
        spark,
        splat,
        paged ? 15_000 : 45_000,
        () => token !== this.buildToken || this.archive !== archived
      );
    } catch (error) {
      if (this.archive === archived) {
        this.archive = null;
        this.splat = null;
      }
      this.retireSpark(archived);
      throw error;
    }
    if (token !== this.buildToken || this.archive !== archived) {
      if (this.archive === archived) {
        this.archive = null;
        this.splat = null;
      }
      this.retireSpark(archived);
      return false;
    }
    archived.live = true;
    this.revealArchive();
    return true;
  }

  async loadCollider(world, token) {
    if (!world.collider) return false;
    try {
      const gltf = await withTimeout(this.gltfLoader.loadAsync(world.collider), this.colliderTimeoutMs, "collider_timeout", {
        onLateResolve: (lateGltf) => disposeTree(lateGltf?.scene)
      });
      const collider = gltf.scene;
      if (token !== this.buildToken) {
        disposeTree(collider);
        return false;
      }
      collider.name = `world-collider-${world.id}`;
      collider.scale.multiplyScalar(world.transform.scale);
      collider.position.y += world.transform.y;
      if (world.transform.rotationX) collider.rotateX(world.transform.rotationX);
      collider.traverse((child) => {
        if (child.isMesh) child.visible = false;
      });
      collider.updateMatrixWorld(true);
      this.collider = collider;
      this.scene.add(collider);
      return true;
    } catch {
      if (token === this.buildToken) this.collider = null;
      return false;
    }
  }

  revealArchive() {
    this.scenery.visible = false;
    this.artworkGroup.visible = false;
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = null;
    if (this.renderer) {
      this.renderer.toneMapping = THREE.NoToneMapping;
      this.renderer.toneMappingExposure = 1;
    }
  }

  isLive(worldId = this.activeWorld?.id) {
    if (!this.archive || this.archive.worldId !== worldId) return false;
    return this.archive.live === true;
  }

  groundHeightAt(x, z) {
    const groundY = this.activeWorld?.profile?.groundY || 0;
    if (!this.collider) return groundY;
    const cacheKey = `${Math.round(x * 4)}:${Math.round(z * 4)}`;
    if (this.groundCache.has(cacheKey)) return this.groundCache.get(cacheKey);
    this.raycaster.set(new THREE.Vector3(x, groundY + 300, z), DOWN);
    this.raycaster.far = 600;
    const hits = this.raycaster.intersectObject(this.collider, true);
    this.raycaster.far = Infinity;
    const scale = this.activeWorld?.worldScale || 1;
    let best = null;
    let nearest = null;
    for (const hit of hits) {
      const y = hit.point.y;
      if (nearest === null || Math.abs(y - groundY) < Math.abs(nearest - groundY)) nearest = y;
      if (y < groundY - 2 * scale || y > groundY + Math.min(1.2 * scale, 0.6)) continue;
      if (best === null || y > best) best = y;
    }
    const height = best ?? nearest ?? groundY;
    if (this.groundCache.size >= 1_024) this.groundCache.clear();
    this.groundCache.set(cacheKey, height);
    return height;
  }

  groundAt(x, z) {
    return this.groundHeightAt(x, z);
  }

  clearCurrent() {
    this.scenery.visible = true;
    this.artworkGroup.visible = true;
    for (const container of [this.scenery, this.artworkGroup]) {
      for (const child of [...container.children]) {
        container.remove(child);
        disposeTree(child);
      }
    }
    this.artworks.clear();
    const archived = this.archive;
    this.archive = null;
    this.splat = null;
    this.mesh = null;
    if (archived?.type === "splat") this.retireSpark(archived);
    else if (archived?.type === "mesh") {
      this.scene.remove(archived.object);
      disposeTree(archived.object);
    }
    if (this.collider) {
      this.scene.remove(this.collider);
      disposeTree(this.collider);
      this.collider = null;
    }
    this.groundCache.clear();
  }

  retireSpark(archived) {
    const retirement = retireSparkArchive(this.scene, archived, this.sparkRetirementOptions);
    this.retirements.add(retirement);
    retirement.then(
      () => this.retirements.delete(retirement),
      () => this.retirements.delete(retirement)
    );
    return retirement;
  }

  async clear() {
    this.buildToken += 1;
    this.clearCurrent();
    this.activeWorld = null;
    await Promise.allSettled([...this.retirements]);
  }
}

export function retireSparkArchive(scene, archived, {
  initialTimeoutMs = 10_000,
  terminalTimeoutMs = 60_000,
  intervalMs = 25,
  terminalIntervalMs = 250
} = {}) {
  if (archived.retirePromise) return archived.retirePromise;
  suspendSparkUpdates(archived);
  scene.remove(archived.spark, archived.splat);
  archived.retirePromise = (async () => {
    let idle = false;
    try {
      idle = await waitForSparkIdle(archived, initialTimeoutMs, intervalMs);
      if (!idle) idle = await waitForSparkIdle(archived, terminalTimeoutMs, terminalIntervalMs);
      return idle;
    } finally {
      disposeSparkArchive(archived, { watchLate: !idle });
    }
  })();
  return archived.retirePromise;
}

function suspendSparkUpdates(archived) {
  const { spark, splat } = archived;
  spark.autoUpdate = false;
  spark.enableDriveLod = false;
  spark.enableLodFetching = false;
  spark.sortDirty = false;
  spark.lodDirty = false;
  for (const key of ["updateTimeoutId", "sortTimeoutId"]) {
    if (spark[key] !== -1) clearTimeout(spark[key]);
    spark[key] = -1;
  }
  const pager = spark.pager || splat?.paged?.pager;
  if (pager) {
    pager.autoDrive = false;
    pager.numFetchers = 0;
    clearArray(pager.fetchPriority);
    clearArray(pager.fetched);
    clearArray(pager.newUploads);
    clearArray(pager.readyUploads);
    clearArray(pager.lodTreeUpdates);
    pager.driveFetchers = () => {};
    pager.processFetched = () => {
      clearArray(pager.fetched);
      clearArray(pager.newUploads);
      clearArray(pager.readyUploads);
      clearArray(pager.lodTreeUpdates);
    };
  }
}

async function waitForSparkIdle(archived, timeoutMs = 10_000, intervalMs = 25) {
  const deadline = performance.now() + timeoutMs;
  let stableChecks = 0;
  while (performance.now() < deadline) {
    stableChecks = hasPendingSparkWork(archived) ? 0 : stableChecks + 1;
    if (stableChecks >= 2) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

export function hasPendingSparkWork(archived) {
  const { spark, splat } = archived;
  const workers = [spark.sortWorker, spark.lodWorker];
  const pager = spark.pager || splat?.paged?.pager;
  return archived.work?.some((work) => work.pending) === true
    || (pager?.fetchers?.length || 0) > 0
    || (pager?.fetched?.length || 0) > 0
    || (pager?.newUploads?.length || 0) > 0
    || (pager?.readyUploads?.length || 0) > 0
    || (pager?.lodTreeUpdates?.length || 0) > 0
    || spark.sorting
    || spark.updateTimeoutId !== -1
    || spark.sortTimeoutId !== -1
    || (spark.lodWorker && spark.lodWorker.queue !== null)
    || workers.some((worker) => Object.keys(worker?.messages || {}).length > 0);
}

function disposeSparkArchive(archived, { watchLate = false } = {}) {
  const { spark, splat } = archived;
  const pager = spark?.pager || splat?.paged?.pager;
  const lateWork = [
    ...(archived.work || []).map((work) => work.settled),
    ...(pager?.fetchers || []).map((fetcher) => fetcher.promise)
  ].filter(Boolean);
  if (splat?.paged) splat.paged.pager = undefined;
  if (watchLate) silenceSparkWorkerTermination(spark);
  safeDispose(splat);
  safeDispose(spark);
  safeDispose(spark?.geometry);
  const materials = Array.isArray(spark?.material) ? spark.material : [spark?.material];
  for (const material of materials) safeDispose(material);
  if (watchLate && lateWork.length) {
    Promise.allSettled(lateWork).then(() => {
      pager?.processFetched?.();
      safeDispose(splat);
    });
  }
}

function silenceSparkWorkerTermination(spark) {
  for (const worker of [spark?.sortWorker, spark?.lodWorker]) {
    for (const message of Object.values(worker?.messages || {})) {
      if (typeof message?.reject === "function") message.reject = () => {};
    }
  }
}

function trackAsyncWork(promise) {
  if (!promise || typeof promise.then !== "function") return null;
  const work = { pending: true, settled: null };
  work.settled = Promise.resolve(promise).then(
    () => { work.pending = false; },
    () => { work.pending = false; }
  );
  return work;
}

function clearArray(value) {
  if (Array.isArray(value)) value.length = 0;
}

function safeDispose(value) {
  try { value?.dispose?.(); } catch { /* terminal cleanup must continue */ }
}

async function waitForSplatFrame(spark, splat, timeoutMs, cancelled = () => false) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (cancelled()) throw new Error("splat_frame_cancelled");
    if (hasRenderableSplatFrame(spark, splat)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("splat_frame_timeout");
}

export function hasRenderableSplatFrame(spark, splat) {
  const instance = spark?.lodInstances?.get?.(splat);
  const loadedSplats = splat?.paged?.numSplats || instance?.numSplats || splat?.numSplats || 0;
  return loadedSplats > 0 && (spark?.activeSplats || 0) > 0;
}

function disposeTree(child) {
  const textures = new Set();
  child.traverse?.((object) => {
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
