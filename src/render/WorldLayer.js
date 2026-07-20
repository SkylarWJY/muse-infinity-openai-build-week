import * as THREE from "three";
import { stopsForWorld } from "../config/legacyAssets.js";

export class WorldLayer {
  constructor(scene, { renderer, textureLoader = new THREE.TextureLoader(), onArtworkReady = () => {}, onStatus = () => {} } = {}) {
    this.scene = scene;
    this.renderer = renderer;
    this.textureLoader = textureLoader;
    this.onArtworkReady = onArtworkReady;
    this.onStatus = onStatus;
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
    this.splat = null;
    this.buildToken = 0;
  }

  async build(world) {
    const token = ++this.buildToken;
    await this.clear();
    if (token !== this.buildToken) return;
    this.activeWorld = world;
    this.scene.background = new THREE.Color(world.palette.sky);
    this.scene.fog = new THREE.Fog(world.palette.sky, 22, 72);
    this.buildFloor(world);
    this.buildArchitecture(world);
    await this.buildArtworks(world, token);
    if (token !== this.buildToken) return;
    if (world.splat) {
      this.onStatus({ type: "splat", live: false, pending: true, message: `Loading archived scene · ${world.name}` });
      this.loadSplat(world, token)
        .then((live) => { if (live && token === this.buildToken) this.onStatus({ type: "splat", live: true, pending: false, world, message: `${world.name} · archived scene live` }); })
        .catch(() => { if (token === this.buildToken) this.onStatus({ type: "splat", live: false, pending: false, world, message: "Archived scene unavailable; spatial fallback retained" }); });
    }
  }

  buildFloor(world) {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(42, 42), new THREE.MeshStandardMaterial({ color: world.palette.floor, roughness: 0.92 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scenery.add(floor);
    const grid = new THREE.GridHelper(42, 28, 0x77807a, 0x9da39e);
    grid.material.opacity = 0.12;
    grid.material.transparent = true;
    grid.position.y = 0.006;
    this.scenery.add(grid);
  }

  buildArchitecture(world) {
    const wallMat = new THREE.MeshStandardMaterial({ color: world.palette.wall, roughness: 0.84 });
    const trimMat = new THREE.MeshStandardMaterial({ color: world.palette.accent, roughness: 0.55 });
    const back = new THREE.Mesh(new THREE.BoxGeometry(22, 5.5, 0.25), wallMat);
    back.position.set(0, 2.75, -11.35);
    back.receiveShadow = true;
    this.scenery.add(back);
    for (const x of [-8.4, 8.4]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.25, 5.5, 12.5), wallMat);
      wing.position.set(x, 2.75, -5.2);
      wing.receiveShadow = true;
      this.scenery.add(wing);
    }
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(21.6, 0.08, 0.08), trimMat);
    ribbon.position.set(0, 4.95, -11.16);
    this.scenery.add(ribbon);
    for (const x of [-5.5, 0, 5.5]) {
      const light = new THREE.SpotLight(0xfff3dd, 55, 18, Math.PI / 5, 0.55, 1.4);
      light.position.set(x, 5.2, -2.5);
      light.target.position.set(x, 1.5, -9);
      this.scenery.add(light, light.target);
    }
  }

  async buildArtworks(world, token) {
    await Promise.all(stopsForWorld(world.id).map(async (stop) => {
      const texture = await this.textureLoader.loadAsync(stop.image).catch(() => null);
      if (token !== this.buildToken) {
        texture?.dispose?.();
        return;
      }
      if (texture) {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
      }
      const frame = new THREE.Group();
      frame.name = `artwork-${stop.id}`;
      const width = stop.id === "grande-jatte" ? 1.7 : 1.45;
      const height = stop.id === "grande-jatte" ? 0.96 : 1.12;
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

  async loadSplat(world, token) {
    const timeout = () => new Promise((_, reject) => setTimeout(() => reject(new Error("splat_timeout")), 20000));
    const modulePromise = import("@sparkjsdev/spark");
    const { SparkRenderer, SplatMesh } = await Promise.race([modulePromise, timeout()]);
    if (token !== this.buildToken) return false;
    const mobile = window.matchMedia("(max-width: 700px)").matches;
    const spark = new SparkRenderer({
      renderer: this.renderer,
      enableLod: true,
      lodSplatCount: mobile ? 80000 : 130000,
      lodRenderScale: 2,
      lodRaycast: 0,
      minSortIntervalMs: 250
    });
    const splat = new SplatMesh({
      url: world.splat,
      lod: true,
      lodScale: 1,
      editable: false,
      raycastable: false
    });
    splat.name = `archived-world-${world.id}`;
    splat.userData.archivedWorld = world.id;
    splat.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), world.transform.rotationX);
    splat.scale.setScalar(world.transform.scale);
    splat.position.y = world.transform.y;
    const archived = { spark, splat, retirePromise: null };
    this.scene.add(spark, splat);
    this.splat = archived;
    try {
      await Promise.race([splat.initialized, timeout()]);
    } catch (error) {
      if (this.splat === archived) this.splat = null;
      await retireSparkArchive(this.scene, archived);
      throw error;
    }
    if (token !== this.buildToken) {
      if (this.splat === archived) {
        this.splat = null;
        await retireSparkArchive(this.scene, archived);
      }
      return false;
    }
    this.scenery.visible = false;
    this.scene.background = new THREE.Color(0x080a09);
    this.scene.fog = null;
    return true;
  }

  async clear() {
    this.scenery.visible = true;
    for (const container of [this.scenery, this.artworkGroup]) {
      for (const child of [...container.children]) {
        container.remove(child);
        disposeTree(child);
      }
    }
    this.artworks.clear();
    const archived = this.splat;
    this.splat = null;
    if (!archived) return;

    await retireSparkArchive(this.scene, archived);
  }
}

function retireSparkArchive(scene, archived) {
  if (archived.retirePromise) return archived.retirePromise;
  suspendSparkUpdates(archived.spark);
  scene.remove(archived.spark, archived.splat);
  archived.retirePromise = waitForSparkIdle(archived.spark).then((idle) => {
    const dispose = () => {
      archived.splat?.dispose?.();
      archived.spark?.dispose?.();
      archived.spark?.geometry?.dispose?.();
      const materials = Array.isArray(archived.spark?.material) ? archived.spark.material : [archived.spark?.material];
      for (const material of materials) material?.dispose?.();
    };
    if (idle) dispose();
    else waitForSparkIdle(archived.spark, 60000, 250).then((settled) => { if (settled) dispose(); });
  });
  return archived.retirePromise;
}

function suspendSparkUpdates(spark) {
  spark.autoUpdate = false;
  spark.enableDriveLod = false;
  spark.sortDirty = false;
  spark.lodDirty = false;
  for (const key of ["updateTimeoutId", "sortTimeoutId"]) {
    if (spark[key] !== -1) clearTimeout(spark[key]);
    spark[key] = -1;
  }
}

async function waitForSparkIdle(spark, timeoutMs = 10000, intervalMs = 25) {
  const deadline = performance.now() + timeoutMs;
  let stableChecks = 0;
  while (performance.now() < deadline) {
    stableChecks = hasPendingSparkWork(spark) ? 0 : stableChecks + 1;
    if (stableChecks >= 2) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

function hasPendingSparkWork(spark) {
  const workers = [spark.sortWorker, spark.lodWorker];
  return spark.sorting
    || spark.updateTimeoutId !== -1
    || spark.sortTimeoutId !== -1
    || (spark.lodWorker && spark.lodWorker.queue !== null)
    || workers.some((worker) => Object.keys(worker?.messages || {}).length > 0);
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
