import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { stopsForWorld } from "../config/legacyAssets.js";
import { artworksForScene } from "../config/sceneCollections.js";
import { withTimeout } from "./withTimeout.js";

const DOWN = new THREE.Vector3(0, -1, 0);
const FRAME_BOUNDS_INSET = 1;
const PATH_BOUNDS_INSET = 0.65;
const MIN_ARTWORK_SEPARATION = 2;
const MIN_ARTWORK_VIEW_DISTANCE = 2.2;
const WALL_FRAME_GAP = 0.04;
const MAX_WALL_FRAME_GAP = 0.1;
const SIGHTLINE_TARGET_EPSILON = 0.005;
const ACTIVE_ARTWORK_SCALE = 1.025;

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
    this.groundReference = null;
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
    this.layoutArtworks(world);
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
    const stop = stopsForWorld(world.id)[0];
    const collection = artworksForScene(world.sceneId);
    const textures = await Promise.all(collection.map(async (artwork) => {
      return artwork.image
        ? await withTimeout(this.textureLoader.loadAsync(artwork.image), this.artworkTimeoutMs, "artwork_timeout", {
          onLateResolve: (lateTexture) => lateTexture?.dispose?.()
        }).catch(() => null)
        : null;
    }));
    if (token !== this.buildToken) {
      for (const texture of textures) texture?.dispose?.();
      return;
    }

    collection.forEach((artwork, index) => {
      const texture = textures[index];
      if (token !== this.buildToken) {
        texture?.dispose?.();
        return;
      }
      if (texture) {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(16, this.renderer?.capabilities?.getMaxAnisotropy?.() || 4);
      }
      const aspect = artworkAspect(texture);
      const canvasWidth = aspect >= 1
        ? Math.min(1.5, 1.18 * aspect)
        : Math.min(1.5, 1.18 / aspect) * aspect;
      const canvasHeight = aspect >= 1
        ? canvasWidth / aspect
        : Math.min(1.5, 1.18 / aspect);
      const frame = new THREE.Group();
      const key = index === 0 ? stop.id : artwork.id;
      frame.name = `artwork-${artwork.id}`;
      frame.userData.stopId = index === 0 ? stop.id : null;
      frame.userData.artwork = artwork;

      const border = new THREE.Mesh(
        new THREE.BoxGeometry(canvasWidth + 0.24, canvasHeight + 0.24, 0.07),
        new THREE.MeshBasicMaterial({ color: 0x4a3322, toneMapped: false })
      );
      border.position.set(0, 1.48, 0.04);
      const mat = new THREE.Mesh(
        new THREE.PlaneGeometry(canvasWidth + 0.14, canvasHeight + 0.14),
        new THREE.MeshBasicMaterial({ color: 0xf3efe6, toneMapped: false })
      );
      mat.position.set(0, 1.48, 0.081);
      const picture = new THREE.Mesh(
        new THREE.PlaneGeometry(canvasWidth, canvasHeight),
        new THREE.MeshBasicMaterial({ map: texture, color: texture ? 0xffffff : world.palette.accent, toneMapped: false })
      );
      picture.position.set(0, 1.48, 0.086);
      picture.userData.artwork = artwork;
      frame.add(border, mat, picture);
      this.artworkGroup.add(frame);
      this.artworks.set(key, { key, index, stopId: index === 0 ? stop.id : null, artwork, frame, picture, border, mat });
      if (index === 0) this.onArtworkReady(stop.id, frame);
    });
    this.layoutArtworks(world);
  }

  layoutArtworks(world) {
    const ordered = [...this.artworks.values()].sort((left, right) => left.index - right.index);
    const occupied = [];
    for (const record of ordered) {
      let placement;
      try {
        placement = this.resolveArtworkPlacement(
          world,
          record.index,
          ordered.length,
          occupied,
          artworkVisibilityProbe(record.border)
        );
      } catch (error) {
        if (!String(error?.message || "").startsWith("artwork_placement_unavailable:")) throw error;
        record.frame.visible = false;
        record.frame.userData.placementError = error.message;
        continue;
      }
      record.frame.visible = true;
      delete record.frame.userData.placementError;
      record.frame.position.set(placement.x, placement.groundY, placement.z);
      record.frame.rotation.y = placement.yaw;
      record.frame.userData.guideAnchor = placement.guideAnchor;
      record.frame.userData.lookAt = placement.lookAt;
      if (!record.frame.userData.supports) {
        const left = artworkSupport();
        const right = artworkSupport();
        left.position.set(-0.42, 0.64, 0);
        right.position.set(0.42, 0.64, 0);
        record.frame.add(left, right);
        record.frame.userData.supports = [left, right];
      }
      for (const support of record.frame.userData.supports) support.visible = placement.freestanding;
      record.frame.updateMatrixWorld(true);
      occupied.push(placement);
    }
  }

  resolveArtworkPlacement(world, index, count = 4, occupied = [], visibilityProbe = defaultVisibilityProbe()) {
    const profile = world.profile;
    const bounds = profile.bounds;
    const initialForward = new THREE.Vector3(Math.sin(profile.yaw), 0, -Math.cos(profile.yaw));
    const forwardTravel = distanceToBounds(profile.spawn, initialForward, bounds, PATH_BOUNDS_INSET);
    const reverseTravel = distanceToBounds(profile.spawn, initialForward.clone().negate(), bounds, PATH_BOUNDS_INSET);
    const forward = forwardTravel < 12 && reverseTravel > forwardTravel
      ? initialForward.negate()
      : initialForward;
    const maxTravel = distanceToBounds(profile.spawn, forward, bounds, PATH_BOUNDS_INSET);
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    const sideDirection = right.multiplyScalar(index % 2 === 0 ? -1 : 1);
    const lateral = Math.min(3.2, Math.max(1.35, Math.min(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) * 0.16));
    const end = Math.max(2.4, Math.min(21, maxTravel - PATH_BOUNDS_INSET));
    const start = 1.6;
    const interval = count > 1 ? Math.max(0, end - start) / (count - 1) : 0;
    const planned = start + interval * index;
    const nudge = Math.max(0.8, interval * 0.38);
    const sampledReaches = [];
    for (let reach = 1.6; reach <= end + 0.01; reach += 0.5) sampledReaches.push(reach);
    const reaches = [planned, planned + nudge, planned - nudge, planned + nudge * 2, planned - nudge * 2, ...sampledReaches]
      .map((value) => clamp(value, 1.6, Math.min(maxTravel, end)))
      .filter((value, candidateIndex, values) => values.findIndex((other) => Math.abs(other - value) < 0.01) === candidateIndex)
      .sort((left, rightValue) => Math.abs(left - planned) - Math.abs(rightValue - planned));

    let best = null;
    for (const reach of reaches) {
      const pathX = profile.spawn.x + forward.x * reach;
      const pathZ = profile.spawn.z + forward.z * reach;
      if (!insideBounds(pathX, pathZ, bounds, PATH_BOUNDS_INSET) || !this.hasGroundAt(pathX, pathZ)) continue;
      const placement = this.placementAt(world, pathX, pathZ, forward, sideDirection, lateral, visibilityProbe);
      if (!placement) continue;
      const clearance = minimumPlacementDistance(placement, occupied);
      if (!best || clearance > best.clearance) best = { placement, clearance };
      if (clearance >= MIN_ARTWORK_SEPARATION) return placement;
    }

    if (best?.clearance >= MIN_ARTWORK_SEPARATION) return best.placement;
    return this.fallbackArtworkPlacement(world, planned, forward, sideDirection, occupied, visibilityProbe);
  }

  placementAt(world, pathX, pathZ, forward, sideDirection, lateral, visibilityProbe = defaultVisibilityProbe()) {
    const bounds = world.profile.bounds;
    const directions = [sideDirection.clone(), sideDirection.clone().negate()];
    for (const direction of directions) {
      const mounted = this.wallPlacementAt(world, pathX, pathZ, forward, direction, visibilityProbe);
      if (mounted) return mounted;
    }

    const distances = [...new Set([Math.max(lateral, MIN_ARTWORK_VIEW_DISTANCE), MIN_ARTWORK_VIEW_DISTANCE, 3, 3.8])];
    for (const distance of distances) {
      for (const direction of directions) {
        const x = pathX + direction.x * distance;
        const z = pathZ + direction.z * distance;
        if (!insideBounds(x, z, bounds, FRAME_BOUNDS_INSET) || !this.hasGroundAt(x, z)) continue;
        const groundY = this.groundHeightAt(x, z) + 0.02;
        const placement = {
          x,
          z,
          groundY,
          yaw: Math.atan2(pathX - x, pathZ - z),
          guideAnchor: [pathX, this.groundHeightAt(pathX, pathZ), pathZ],
          lookAt: [x, groundY + 1.48, z],
          freestanding: true
        };
        if (this.placementHasClearSightline(placement, visibilityProbe)) return placement;
      }
    }
    return null;
  }

  wallPlacementAt(world, pathX, pathZ, forward, direction, visibilityProbe = defaultVisibilityProbe()) {
    if (!this.collider) return null;
    const guideGroundY = this.groundHeightAt(pathX, pathZ);
    const maxDistance = Math.hypot(
      world.profile.bounds.maxX - world.profile.bounds.minX,
      world.profile.bounds.maxZ - world.profile.bounds.minZ
    );
    const probes = [[0, 1.48], [0, 0.62], [0, 2.34], [-0.88, 1.48], [0.88, 1.48]];
    const distances = [];
    let centerDistance = null;
    for (const [along, height] of probes) {
      const origin = new THREE.Vector3(pathX + forward.x * along, guideGroundY + height, pathZ + forward.z * along);
      const hit = this.colliderHit(origin, direction, 0.08, maxDistance);
      if (!hit) return null;
      distances.push(hit.distance);
      if (along === 0 && height === 1.48) centerDistance = hit.distance;
    }
    if (!Number.isFinite(centerDistance) || centerDistance < MIN_ARTWORK_VIEW_DISTANCE + WALL_FRAME_GAP) return null;
    if (Math.max(...distances) - Math.min(...distances) > 0.6) return null;

    const offset = centerDistance - WALL_FRAME_GAP;
    const x = pathX + direction.x * offset;
    const z = pathZ + direction.z * offset;
    if (!insideBounds(x, z, world.profile.bounds, FRAME_BOUNDS_INSET) || !this.hasGroundAt(x, z)) return null;
    const groundY = this.groundHeightAt(x, z) + 0.02;
    const placement = {
      x,
      z,
      groundY,
      yaw: Math.atan2(pathX - x, pathZ - z),
      guideAnchor: [pathX, guideGroundY, pathZ],
      lookAt: [x, groundY + 1.48, z],
      freestanding: false
    };
    if (!this.placementHasClearSightline(placement, visibilityProbe)) return null;
    const gap = this.backingWallGap(placement);
    return gap !== null && gap <= MAX_WALL_FRAME_GAP ? placement : null;
  }

  placementHasClearSightline(placement, visibilityProbe = defaultVisibilityProbe()) {
    const guideEye = new THREE.Vector3(...placement.guideAnchor);
    guideEye.y += 1.48;
    const frameCenter = new THREE.Vector3(placement.x, placement.groundY + 1.48, placement.z);
    if (frameCenter.distanceTo(guideEye) < MIN_ARTWORK_VIEW_DISTANCE) return false;
    if (!this.collider) return true;
    const tangent = new THREE.Vector3(1, 0, 0).applyAxisAngle(DOWN, -placement.yaw);
    const targets = [
      [0, 0],
      [-visibilityProbe.halfWidth, visibilityProbe.halfHeight],
      [visibilityProbe.halfWidth, visibilityProbe.halfHeight],
      [-visibilityProbe.halfWidth, -visibilityProbe.halfHeight],
      [visibilityProbe.halfWidth, -visibilityProbe.halfHeight]
    ];
    return targets.every(([horizontal, vertical]) => {
      const target = frameCenter.clone().addScaledVector(tangent, horizontal);
      target.y += vertical;
      const sightline = target.sub(guideEye);
      const distance = sightline.length();
      return !this.colliderHit(guideEye, sightline.normalize(), 0.08, distance - SIGHTLINE_TARGET_EPSILON);
    });
  }

  fallbackArtworkPlacement(world, planned, forward, sideDirection, occupied, visibilityProbe) {
    const bounds = world.profile.bounds;
    const candidates = [];
    const guideOffsets = [planned, planned + 1.5, planned - 1.5, 0];
    const directions = [sideDirection, sideDirection.clone().negate(), forward, forward.clone().negate()];
    for (const guideOffset of guideOffsets) {
      const pathX = clamp(world.profile.spawn.x + forward.x * guideOffset, bounds.minX + PATH_BOUNDS_INSET, bounds.maxX - PATH_BOUNDS_INSET);
      const pathZ = clamp(world.profile.spawn.z + forward.z * guideOffset, bounds.minZ + PATH_BOUNDS_INSET, bounds.maxZ - PATH_BOUNDS_INSET);
      if (!this.hasGroundAt(pathX, pathZ)) continue;
      const guideGroundY = this.groundHeightAt(pathX, pathZ);
      for (const direction of directions) {
        for (const distance of [MIN_ARTWORK_VIEW_DISTANCE, 3, 4.2]) {
          const x = pathX + direction.x * distance;
          const z = pathZ + direction.z * distance;
          if (!insideBounds(x, z, bounds, FRAME_BOUNDS_INSET) || !this.hasGroundAt(x, z)) continue;
          const groundY = this.groundHeightAt(x, z) + 0.02;
          const placement = {
            x,
            z,
            groundY,
            yaw: Math.atan2(pathX - x, pathZ - z),
            guideAnchor: [pathX, guideGroundY, pathZ],
            lookAt: [x, groundY + 1.48, z],
            freestanding: true
          };
          if (!this.placementHasClearSightline(placement, visibilityProbe)) continue;
          const clearance = minimumPlacementDistance(placement, occupied);
          if (clearance >= MIN_ARTWORK_SEPARATION) candidates.push({ placement, clearance });
        }
      }
    }
    candidates.sort((left, right) => right.clearance - left.clearance);
    if (candidates[0]) return candidates[0].placement;
    throw new Error(`artwork_placement_unavailable:${world.id}`);
  }

  backingWallGap(placement) {
    if (!this.collider) return null;
    const guide = new THREE.Vector3(...placement.guideAnchor);
    const frameCenter = new THREE.Vector3(placement.x, placement.groundY + 1.48, placement.z);
    const towardWall = frameCenter.clone().sub(guide).setY(0).normalize();
    return this.colliderHit(frameCenter, towardWall, 0, MAX_WALL_FRAME_GAP)?.distance ?? null;
  }

  colliderHit(origin, direction, near = 0, far = Infinity) {
    this.raycaster.set(origin, direction);
    this.raycaster.near = near;
    this.raycaster.far = far;
    const hit = this.raycaster.intersectObject(this.collider, true)[0];
    this.raycaster.near = 0;
    this.raycaster.far = Infinity;
    return hit;
  }

  hasGroundAt(x, z) {
    if (!this.collider) return true;
    const referenceY = this.groundReferenceY();
    const tolerance = 2.5 * (this.activeWorld?.worldScale || 1);
    return this.groundHitsAt(x, z).some((y) => Math.abs(y - referenceY) <= tolerance);
  }

  stopPose(stopId) {
    const record = this.artworks.get(stopId);
    if (!record) return null;
    return {
      guideAnchor: [...record.frame.userData.guideAnchor],
      lookAt: [...record.frame.userData.lookAt],
      artwork: record.artwork
    };
  }

  highlight(stopId, effect = "focus") {
    for (const [id, artwork] of this.artworks) {
      const active = id === stopId || artwork.stopId === stopId;
      artwork.border.material.color.set(active ? this.activeWorld.palette.accent : 0x4a3322);
      artwork.border.material.opacity = active && effect === "echo" ? 0.82 : 1;
      artwork.border.material.transparent = artwork.border.material.opacity < 1;
      artwork.frame.scale.setScalar(active ? ACTIVE_ARTWORK_SCALE : 1);
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
      this.groundReference = null;
      this.groundCache.clear();
      this.scene.add(collider);
      return true;
    } catch {
      if (token === this.buildToken) this.collider = null;
      return false;
    }
  }

  revealArchive() {
    this.scenery.visible = false;
    this.artworkGroup.visible = true;
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
    const profileGroundY = this.activeWorld?.profile?.groundY || 0;
    if (!this.collider) return profileGroundY;
    const cacheKey = `${Math.round(x * 4)}:${Math.round(z * 4)}`;
    if (this.groundCache.has(cacheKey)) return this.groundCache.get(cacheKey);
    const referenceY = this.groundReferenceY();
    const scale = this.activeWorld?.worldScale || 1;
    const tolerance = 2.5 * scale;
    const candidates = this.groundHitsAt(x, z)
      .filter((y) => Math.abs(y - referenceY) <= tolerance)
      .sort((left, right) => Math.abs(left - referenceY) - Math.abs(right - referenceY));
    const height = candidates[0] ?? referenceY;
    if (this.groundCache.size >= 1_024) this.groundCache.clear();
    this.groundCache.set(cacheKey, height);
    return height;
  }

  groundReferenceY() {
    if (!this.collider) return this.activeWorld?.profile?.groundY || 0;
    if (this.groundReference?.collider === this.collider) return this.groundReference.y;
    const spawn = this.activeWorld?.profile?.spawn;
    const hits = spawn ? this.groundHitsAt(spawn.x, spawn.z) : [];
    const y = hits.length ? Math.min(...hits) : (this.activeWorld?.profile?.groundY || 0);
    this.groundReference = { collider: this.collider, y };
    return y;
  }

  groundHitsAt(x, z) {
    if (!this.collider) return [];
    this.raycaster.set(new THREE.Vector3(x, 300, z), DOWN);
    this.raycaster.far = 600;
    const hits = this.raycaster.intersectObject(this.collider, true).map((hit) => hit.point.y);
    this.raycaster.far = Infinity;
    return hits;
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
    this.groundReference = null;
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

function artworkAspect(texture) {
  const width = Number(texture?.image?.naturalWidth || texture?.image?.width);
  const height = Number(texture?.image?.naturalHeight || texture?.image?.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 1.32;
  return width / height;
}

function artworkVisibilityProbe(border) {
  return {
    halfWidth: Math.max(0.1, Number(border?.geometry?.parameters?.width || 0) / 2 * ACTIVE_ARTWORK_SCALE),
    halfHeight: Math.max(0.1, Number(border?.geometry?.parameters?.height || 0) / 2 * ACTIVE_ARTWORK_SCALE)
  };
}

function defaultVisibilityProbe() {
  return { halfWidth: 0.7, halfHeight: 0.7 };
}

function artworkSupport() {
  return new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 1.28, 0.035),
    new THREE.MeshBasicMaterial({ color: 0x30271f, toneMapped: false })
  );
}

function insideBounds(x, z, bounds, inset = 0) {
  return x >= bounds.minX + inset && x <= bounds.maxX - inset
    && z >= bounds.minZ + inset && z <= bounds.maxZ - inset;
}

function distanceToBounds(origin, direction, bounds, inset = 0) {
  const distances = [];
  if (Math.abs(direction.x) > 0.0001) {
    const edgeX = direction.x > 0 ? bounds.maxX - inset : bounds.minX + inset;
    distances.push((edgeX - origin.x) / direction.x);
  }
  if (Math.abs(direction.z) > 0.0001) {
    const edgeZ = direction.z > 0 ? bounds.maxZ - inset : bounds.minZ + inset;
    distances.push((edgeZ - origin.z) / direction.z);
  }
  const positive = distances.filter((distance) => Number.isFinite(distance) && distance >= 0);
  return positive.length ? Math.min(...positive) : 0;
}

function minimumPlacementDistance(placement, occupied) {
  if (!occupied.length) return Infinity;
  return Math.min(...occupied.map((other) => Math.hypot(placement.x - other.x, placement.z - other.z)));
}

function clamp(value, minimum, maximum) {
  if (minimum > maximum) return (minimum + maximum) / 2;
  return Math.max(minimum, Math.min(maximum, value));
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
