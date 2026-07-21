import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { stopsForWorld } from "../config/legacyAssets.js";
import { artworksForScene } from "../config/sceneCollections.js";
import { artworkPlacementsForScene } from "../config/artworkPlacements.js";
import { withTimeout } from "./withTimeout.js";

const DOWN = new THREE.Vector3(0, -1, 0);
const UP = new THREE.Vector3(0, 1, 0);
const FRAME_BOUNDS_INSET = 1;
const PATH_BOUNDS_INSET = 0.65;
const MIN_ARTWORK_SEPARATION = 2;
const MIN_ARTWORK_VIEW_DISTANCE = 2.2;
const WALL_FRAME_GAP = 0.04;
const MAX_WALL_FRAME_GAP = 0.1;
const SIGHTLINE_TARGET_EPSILON = 0.005;
const ACTIVE_ARTWORK_SCALE = 1.025;
const HORIZONTAL_COLLISION_HEIGHTS = Object.freeze([0.82]);
const MAX_HORIZONTAL_RAY_GAP = 0.01;
const HORIZONTAL_COLLISION_LATERAL_GUARD = 0.15;
const MAX_HORIZONTAL_NORMAL_Y = 0.6;
const HORIZONTAL_COLLISION_LOOKAHEAD = 1.5;
const HORIZONTAL_CACHE_DIRECTION_DOT = 0.998;
const HORIZONTAL_CACHE_LATERAL_TOLERANCE = 0.04;
const SPLAT_PRESENTATION_STABLE_CHECKS = 3;
const PAGED_SPLAT_PRESENTATION_TIMEOUT_MS = 30_000;
const FRAME_FINISHES = Object.freeze({
  "warm-wood": Object.freeze({ color: 0x745746, mat: 0xeee6d8, roughness: 0.78, metalness: 0.03 }),
  "aged-brass": Object.freeze({ color: 0x9a8055, mat: 0xeee6d8, roughness: 0.48, metalness: 0.42 }),
  "warm-white": Object.freeze({ color: 0xc7bba7, mat: 0xf2ebdf, roughness: 0.84, metalness: 0.02 }),
  sage: Object.freeze({ color: 0x66766a, mat: 0xe9e5da, roughness: 0.82, metalness: 0.03 }),
  plum: Object.freeze({ color: 0x725a67, mat: 0xeee3df, roughness: 0.8, metalness: 0.03 })
});
const SCENE_FRAME_FINISHES = Object.freeze({
  "threshold-conservatory": Object.freeze(["sage", "sage", "warm-wood", "aged-brass"]),
  "court-of-light": Object.freeze(["plum", "plum", "warm-white", "aged-brass"]),
  "water-and-light": Object.freeze(["sage", "warm-white", "sage", "aged-brass"]),
  "sunset-frames": Object.freeze(["warm-wood", "aged-brass", "warm-wood", "plum"]),
  "burning-sky": Object.freeze(["aged-brass", "warm-wood", "aged-brass", "plum"]),
  "petal-transition": Object.freeze(["warm-wood", "warm-white", "warm-wood", "aged-brass"]),
  "living-memory": Object.freeze(["plum", "warm-wood", "plum", "aged-brass"]),
  "infinite-repetition": Object.freeze(["plum", "aged-brass", "plum", "warm-wood"]),
  "personal-dream-world": Object.freeze(["warm-white", "aged-brass", "warm-white", "plum"])
});
const DEFAULT_FRAME_FINISHES = Object.freeze(["warm-wood", "aged-brass", "sage", "plum"]);

export function resolveSceneQuality({ mobile = false, mode = "balanced" } = {}) {
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
    : quality(2, 4_320_000, 1, 2, true, 4_718_592, 80);
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
  const mode = ["high", "balanced", "performance"].includes(requested) ? requested : "balanced";
  return resolveSceneQuality({ mobile, mode });
}

export function resolveArtworkFramePalette(world = {}, artworkIndex = 0, artworkId = "") {
  const sceneId = String(world?.sceneId || "");
  const sequence = SCENE_FRAME_FINISHES[sceneId] || DEFAULT_FRAME_FINISHES;
  const index = positiveModulo(Math.trunc(Number(artworkIndex) || 0), sequence.length);
  const family = sequence[index];
  const finish = FRAME_FINISHES[family];
  const environmentColor = validHexColor(world?.palette?.wall, world?.palette?.floor, 0xd8d0c4);
  const environmentMix = [0.07, 0.11, 0.05, 0.09][index];
  const variation = (stableStringHash(`${sceneId}:${artworkId || index}`) % 3 - 1) * 0.012;
  const frameColor = constrainDisplayColor(
    shiftDisplayLightness(mixDisplayColors(finish.color, environmentColor, environmentMix), variation),
    { minLightness: 0.3, maxLightness: 0.7, maxSaturation: 0.42 }
  );
  let matColor = constrainDisplayColor(
    mixDisplayColors(finish.mat, validHexColor(world?.palette?.sky, environmentColor), 0.06),
    { minLightness: 0.84, maxLightness: 0.94, maxSaturation: 0.28 }
  );
  matColor = ensureMatteContrast(frameColor, matColor, 0.18);
  const restrainedAccent = constrainDisplayColor(
    validHexColor(world?.palette?.accent, finish.color),
    { minLightness: 0.32, maxLightness: 0.68, maxSaturation: 0.46 }
  );
  const activeColor = constrainDisplayColor(
    mixDisplayColors(frameColor, restrainedAccent, 0.22),
    { minLightness: 0.32, maxLightness: 0.7, maxSaturation: 0.46 }
  );

  return Object.freeze({
    family,
    frameColor,
    matColor,
    activeColor,
    frameRoughness: finish.roughness,
    frameMetalness: finish.metalness,
    matRoughness: 0.94,
    matMetalness: 0
  });
}

export function resolveSceneBackdrop(world = {}) {
  const sky = validHexColor(world?.palette?.sky, 0x59615e);
  const wall = validHexColor(world?.palette?.wall, world?.palette?.floor, sky);
  return constrainDisplayColor(mixDisplayColors(sky, wall, 0.42), {
    minLightness: 0.14,
    maxLightness: 0.72,
    maxSaturation: 0.22
  });
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
    this.groundIndex = null;
    this.horizontalIndex = null;
    this.horizontalCollisionCache = null;
    this.retirements = new Set();
    this.lastArchiveError = null;
  }

  async build(world) {
    const token = ++this.buildToken;
    this.lastArchiveError = null;
    this.clearCurrent();
    this.groundCache.clear();
    if (token !== this.buildToken) return false;
    this.activeWorld = world;
    this.scene.background = new THREE.Color(resolveSceneBackdrop(world));
    this.scene.fog = new THREE.Fog(world.palette.sky, 22, 72);
    this.buildFloor(world);
    this.buildArchitecture(world);
    this.scenery.visible = false;
    this.artworkGroup.visible = false;

    await this.buildArtworks(world, token);
    if (token !== this.buildToken) return false;

    const hasArchive = Boolean(world.mesh || world.rad || world.splat);
    if (!hasArchive) {
      this.scenery.visible = true;
      this.artworkGroup.visible = true;
      return false;
    }
    this.onStatus({ type: world.render, live: false, pending: true, world, message: `Loading high-fidelity archive · ${world.name}` });
    const [live] = await Promise.all([
      this.loadArchive(world, token),
      this.loadCollider(world, token)
    ]);
    if (token !== this.buildToken) return false;
    this.layoutArtworks(world);
    if (live) {
      this.lastArchiveError = null;
      this.onStatus({ type: this.archive?.type || world.render, live: true, pending: false, world, message: `${world.name} · high-fidelity archive live` });
      return true;
    }
    this.scenery.visible = true;
    this.artworkGroup.visible = true;
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
      const framePalette = resolveArtworkFramePalette(world, index, artwork.id);
      frame.userData.framePalette = framePalette;

      const border = new THREE.Mesh(
        new THREE.BoxGeometry(canvasWidth + 0.24, canvasHeight + 0.24, 0.07),
        new THREE.MeshStandardMaterial({
          color: framePalette.frameColor,
          roughness: framePalette.frameRoughness,
          metalness: framePalette.frameMetalness,
          toneMapped: false
        })
      );
      border.position.set(0, 1.48, 0.04);
      const mat = new THREE.Mesh(
        new THREE.PlaneGeometry(canvasWidth + 0.14, canvasHeight + 0.14),
        new THREE.MeshStandardMaterial({
          color: framePalette.matColor,
          roughness: framePalette.matRoughness,
          metalness: framePalette.matMetalness,
          toneMapped: false
        })
      );
      mat.position.set(0, 1.48, 0.081);
      const picture = new THREE.Mesh(
        new THREE.PlaneGeometry(canvasWidth, canvasHeight),
        new THREE.MeshBasicMaterial({ map: texture, color: texture ? 0xffffff : framePalette.activeColor, toneMapped: false })
      );
      picture.position.set(0, 1.48, 0.086);
      picture.userData.artwork = artwork;
      frame.add(border, mat, picture);
      this.artworkGroup.add(frame);
      this.artworks.set(key, { key, index, stopId: index === 0 ? stop.id : null, artwork, frame, picture, border, mat, palette: framePalette });
      if (index === 0) this.onArtworkReady(stop.id, frame);
    });
    this.layoutArtworks(world);
  }

  layoutArtworks(world) {
    const ordered = [...this.artworks.values()].sort((left, right) => left.index - right.index);
    const authored = artworkPlacementsForScene(world.sceneId);
    const occupied = [];
    for (const record of ordered) {
      let placement;
      const visibilityProbe = artworkVisibilityProbe(record.border);
      try {
        placement = authored?.[record.index]
          ? this.resolveAuthoredArtworkPlacement(authored[record.index], visibilityProbe)
          : this.resolveArtworkPlacement(
              world,
              record.index,
              ordered.length,
              occupied,
              visibilityProbe
            );
        if (minimumPlacementDistance(placement, occupied) < MIN_ARTWORK_SEPARATION) {
          throw new Error(`artwork_placement_unavailable:${world.id}`);
        }
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
      record.frame.userData.guideAnchor = [...placement.guideAnchor];
      record.frame.userData.lookAt = [...placement.lookAt];
      record.frame.userData.freestanding = placement.freestanding;
      record.frame.userData.displayZone = placement.freestanding ? "edge" : "wall";
      record.frame.updateMatrixWorld(true);
      occupied.push(placement);
    }
  }

  setArtworksVisible(visible = true) {
    this.artworkGroup.visible = Boolean(visible);
    return this.artworkGroup.visible;
  }

  resolveAuthoredArtworkPlacement(source, visibilityProbe = defaultVisibilityProbe()) {
    const freestanding = source.freestanding || !this.collider;
    const guideAnchor = [...source.guideAnchor];
    const guideGroundY = this.walkableGroundHeightAt(
      guideAnchor[0],
      guideAnchor[2],
      guideAnchor[1],
      0.45
    );
    if (!Number.isFinite(guideGroundY)) {
      throw new Error(`artwork_placement_unavailable:${this.activeWorld?.id || "unknown"}`);
    }
    guideAnchor[1] = guideGroundY;
    const surfaceY = freestanding
      ? this.walkableGroundHeightAt(source.x, source.z, guideAnchor[1], 0.45)
      : guideAnchor[1];
    if (!Number.isFinite(surfaceY)) throw new Error(`artwork_placement_unavailable:${this.activeWorld?.id || "unknown"}`);
    const groundY = surfaceY + 0.02;
    const placement = {
      ...source,
      freestanding,
      groundY,
      guideAnchor,
      lookAt: [source.x, groundY + 1.48, source.z]
    };
    const bounds = this.activeWorld?.profile?.bounds;
    const validBounds = !bounds || insideBounds(source.x, source.z, bounds, FRAME_BOUNDS_INSET);
    const clearSightline = this.placementHasClearSightline(placement, visibilityProbe);
    const backed = freestanding || this.backingWallGap(placement, visibilityProbe) !== null;
    if (!validBounds || !clearSightline || !backed) {
      throw new Error(`artwork_placement_unavailable:${this.activeWorld?.id || "unknown"}`);
    }
    return placement;
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

    for (const reach of reaches) {
      const pathX = profile.spawn.x + forward.x * reach;
      const pathZ = profile.spawn.z + forward.z * reach;
      if (!insideBounds(pathX, pathZ, bounds, PATH_BOUNDS_INSET) || !this.hasGroundAt(pathX, pathZ)) continue;
      for (const direction of [sideDirection.clone(), sideDirection.clone().negate()]) {
        const mounted = this.wallPlacementAt(world, pathX, pathZ, forward, direction, visibilityProbe);
        if (mounted && minimumPlacementDistance(mounted, occupied) >= MIN_ARTWORK_SEPARATION) return mounted;
      }
    }

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
    const guideGroundY = this.groundHeightAt(pathX, pathZ);
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
        const surfaceY = this.walkableGroundHeightAt(x, z, guideGroundY, 0.45);
        if (!Number.isFinite(surfaceY)) continue;
        const groundY = surfaceY + 0.02;
        const placement = {
          x,
          z,
          groundY,
          yaw: Math.atan2(pathX - x, pathZ - z),
          guideAnchor: [pathX, guideGroundY, pathZ],
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
    const probes = [
      [0, 1.48],
      [0, 1.48 - visibilityProbe.halfHeight],
      [0, 1.48 + visibilityProbe.halfHeight],
      [-visibilityProbe.halfWidth, 1.48],
      [visibilityProbe.halfWidth, 1.48]
    ];
    const distances = [];
    let centerHit = null;
    for (const [along, height] of probes) {
      const origin = new THREE.Vector3(pathX + forward.x * along, guideGroundY + height, pathZ + forward.z * along);
      const hit = this.colliderHit(origin, direction, 0.08, maxDistance);
      if (!hit) return null;
      distances.push(hit.distance);
      if (along === 0 && height === 1.48) centerHit = hit;
    }
    if (!centerHit || centerHit.distance < MIN_ARTWORK_VIEW_DISTANCE + WALL_FRAME_GAP) return null;
    if (Math.max(...distances) - Math.min(...distances) > 1.2) return null;

    const front = worldNormalForHit(centerHit).setY(0);
    if (front.lengthSq() < 0.2) return null;
    front.normalize();
    const towardGuide = new THREE.Vector3(pathX - centerHit.point.x, 0, pathZ - centerHit.point.z);
    if (front.dot(towardGuide) < 0) front.negate();
    const groundY = guideGroundY + 0.02;
    for (const standoff of [WALL_FRAME_GAP, 0.1, 0.18, 0.3, 0.45]) {
      const x = centerHit.point.x + front.x * standoff;
      const z = centerHit.point.z + front.z * standoff;
      if (!insideBounds(x, z, world.profile.bounds, FRAME_BOUNDS_INSET)) continue;
      const placement = {
        x,
        z,
        groundY,
        yaw: Math.atan2(front.x, front.z),
        guideAnchor: [pathX, guideGroundY, pathZ],
        lookAt: [x, groundY + 1.48, z],
        freestanding: false
      };
      if (!this.placementHasClearSightline(placement, visibilityProbe)) continue;
      const gap = this.backingWallGap(placement, visibilityProbe);
      if (gap !== null && gap <= MAX_WALL_FRAME_GAP) return placement;
    }
    return null;
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
          const surfaceY = this.walkableGroundHeightAt(x, z, guideGroundY, 0.45);
          if (!Number.isFinite(surfaceY)) continue;
          const groundY = surfaceY + 0.02;
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

  backingWallGap(placement, visibilityProbe = defaultVisibilityProbe()) {
    if (!this.collider) return null;
    const frameCenter = new THREE.Vector3(placement.x, placement.groundY + 1.48, placement.z);
    const towardWall = new THREE.Vector3(0, 0, -1).applyAxisAngle(UP, placement.yaw).normalize();
    const tangent = new THREE.Vector3(1, 0, 0).applyAxisAngle(UP, placement.yaw).normalize();
    const probes = [
      [0, 0],
      [-visibilityProbe.halfWidth, visibilityProbe.halfHeight],
      [visibilityProbe.halfWidth, visibilityProbe.halfHeight],
      [-visibilityProbe.halfWidth, -visibilityProbe.halfHeight],
      [visibilityProbe.halfWidth, -visibilityProbe.halfHeight]
    ];
    const distances = probes.map(([horizontal, vertical]) => {
      const origin = frameCenter.clone().addScaledVector(tangent, horizontal);
      origin.y += vertical;
      const hit = this.colliderHit(origin, towardWall, 0, MAX_WALL_FRAME_GAP);
      if (!hit || Math.abs(worldNormalForHit(hit).y) > MAX_HORIZONTAL_NORMAL_Y) return null;
      return hit.distance;
    });
    if (distances.some((distance) => distance === null)) return null;
    return Math.max(...distances);
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

  walkableGroundHeightAt(x, z, referenceY, maxDelta = 0.35) {
    const profileGroundY = this.activeWorld?.profile?.groundY || 0;
    if (!this.collider) return Number.isFinite(referenceY) ? referenceY : profileGroundY;
    const reference = Number.isFinite(referenceY) ? referenceY : this.groundReferenceY();
    const cacheKey = `walk:${Math.round(x * 20)}:${Math.round(z * 20)}:${Math.round(reference * 20)}:${Math.round(maxDelta * 20)}`;
    if (this.groundCache.has(cacheKey)) return this.groundCache.get(cacheKey);
    const candidates = this.groundHitsAt(x, z)
      .filter((y) => Math.abs(y - reference) <= maxDelta)
      .sort((left, right) => Math.abs(left - reference) - Math.abs(right - reference));
    const height = candidates[0] ?? null;
    if (this.groundCache.size >= 1_024) this.groundCache.clear();
    this.groundCache.set(cacheKey, height);
    return height;
  }

  buildGroundIndex(collider = this.collider, cellSize = 4) {
    if (!collider) {
      this.groundIndex = null;
      this.disposeHorizontalIndex();
      return null;
    }
    // Index ground and blocking faces once so animation-frame queries stay local.
    collider.updateMatrixWorld(true);
    let capacity = 0;
    collider.traverse((object) => {
      if (!object.isMesh) return;
      capacity += Math.floor((object.geometry.index?.count || object.geometry.attributes.position?.count || 0) / 3);
    });
    const triangles = new Float32Array(capacity * 9);
    const buckets = new Map();
    const large = [];
    const horizontalBuckets = new Map();
    const horizontalLarge = [];
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    let triangleCount = 0;

    collider.traverse((object) => {
      if (!object.isMesh) return;
      const position = object.geometry.attributes.position;
      if (!position) return;
      const index = object.geometry.index;
      const elementCount = index?.count || position.count;
      for (let offset = 0; offset + 2 < elementCount; offset += 3) {
        const ai = index ? index.getX(offset) : offset;
        const bi = index ? index.getX(offset + 1) : offset + 1;
        const ci = index ? index.getX(offset + 2) : offset + 2;
        a.fromBufferAttribute(position, ai).applyMatrix4(object.matrixWorld);
        b.fromBufferAttribute(position, bi).applyMatrix4(object.matrixWorld);
        c.fromBufferAttribute(position, ci).applyMatrix4(object.matrixWorld);
        const projectedArea = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
        const abx = b.x - a.x;
        const aby = b.y - a.y;
        const abz = b.z - a.z;
        const acx = c.x - a.x;
        const acy = c.y - a.y;
        const acz = c.z - a.z;
        const normalX = aby * acz - abz * acy;
        const normalY = abz * acx - abx * acz;
        const normalZ = abx * acy - aby * acx;
        const normalLength = Math.hypot(normalX, normalY, normalZ);
        const minCellX = Math.floor(Math.min(a.x, b.x, c.x) / cellSize);
        const maxCellX = Math.floor(Math.max(a.x, b.x, c.x) / cellSize);
        const minCellZ = Math.floor(Math.min(a.z, b.z, c.z) / cellSize);
        const maxCellZ = Math.floor(Math.max(a.z, b.z, c.z) / cellSize);
        const coveredCells = (maxCellX - minCellX + 1) * (maxCellZ - minCellZ + 1);

        if (normalLength > 1e-8 && Math.abs(normalY / normalLength) <= MAX_HORIZONTAL_NORMAL_Y) {
          const values = [a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z];
          if (coveredCells > 4_096) horizontalLarge.push(...values);
          else {
            for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
              for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
                const key = `${cellX}:${cellZ}`;
                const bucket = horizontalBuckets.get(key);
                if (bucket) bucket.push(...values);
                else horizontalBuckets.set(key, [...values]);
              }
            }
          }
        }

        if (projectedArea >= -1e-8) continue;
        const triangleIndex = triangleCount++;
        const base = triangleIndex * 9;
        triangles.set([a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z], base);
        if (coveredCells > 4_096) {
          large.push(triangleIndex);
          continue;
        }
        for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
          for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
            const key = `${cellX}:${cellZ}`;
            const bucket = buckets.get(key);
            if (bucket) bucket.push(triangleIndex);
            else buckets.set(key, [triangleIndex]);
          }
        }
      }
    });
    this.groundIndex = {
      collider,
      cellSize,
      triangles: triangles.slice(0, triangleCount * 9),
      triangleCount,
      buckets,
      large
    };
    this.disposeHorizontalIndex();
    const horizontalMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const horizontalMeshes = new Map();
    for (const [key, values] of horizontalBuckets) {
      horizontalMeshes.set(key, collisionProxyMesh(values, horizontalMaterial));
    }
    this.horizontalIndex = {
      collider,
      cellSize,
      buckets: horizontalMeshes,
      large: horizontalLarge.length ? collisionProxyMesh(horizontalLarge, horizontalMaterial) : null,
      material: horizontalMaterial
    };
    return this.groundIndex;
  }

  indexedGroundHitsAt(x, z) {
    const index = this.groundIndex;
    if (!index || index.collider !== this.collider) return null;
    const key = `${Math.floor(x / index.cellSize)}:${Math.floor(z / index.cellSize)}`;
    const triangleIndices = [...(index.buckets.get(key) || []), ...index.large];
    const hits = [];
    for (const triangleIndex of triangleIndices) {
      const base = triangleIndex * 9;
      const ax = index.triangles[base];
      const ay = index.triangles[base + 1];
      const az = index.triangles[base + 2];
      const bx = index.triangles[base + 3];
      const by = index.triangles[base + 4];
      const bz = index.triangles[base + 5];
      const cx = index.triangles[base + 6];
      const cy = index.triangles[base + 7];
      const cz = index.triangles[base + 8];
      const denominator = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(denominator) < 1e-8) continue;
      const aWeight = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / denominator;
      const bWeight = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / denominator;
      const cWeight = 1 - aWeight - bWeight;
      if (aWeight < -1e-5 || bWeight < -1e-5 || cWeight < -1e-5) continue;
      hits.push(aWeight * ay + bWeight * by + cWeight * cy);
    }
    return hits;
  }

  horizontalCollisionObjects(origin, direction, far, radius) {
    const index = this.horizontalIndex;
    if (!index || index.collider !== this.collider) return null;
    const endX = origin.x + direction.x * far;
    const endZ = origin.z + direction.z * far;
    const minCellX = Math.floor((Math.min(origin.x, endX) - radius) / index.cellSize);
    const maxCellX = Math.floor((Math.max(origin.x, endX) + radius) / index.cellSize);
    const minCellZ = Math.floor((Math.min(origin.z, endZ) - radius) / index.cellSize);
    const maxCellZ = Math.floor((Math.max(origin.z, endZ) + radius) / index.cellSize);
    const objects = new Set();
    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
        const object = index.buckets.get(`${cellX}:${cellZ}`);
        if (object) objects.add(object);
      }
    }
    if (index.large) objects.add(index.large);
    return [...objects];
  }

  disposeHorizontalIndex() {
    if (!this.horizontalIndex) return;
    for (const mesh of this.horizontalIndex.buckets.values()) mesh.geometry.dispose();
    this.horizontalIndex.large?.geometry.dispose();
    this.horizontalIndex.material.dispose();
    this.horizontalIndex = null;
  }

  resolveHorizontalMove(from, desired, radius = 0.25) {
    if (!this.collider) return desired.clone();
    const movement = desired.clone().sub(from).setY(0);
    const distance = movement.length();
    if (distance <= 0.0001) return desired.clone();

    const collision = this.horizontalCollision(from, movement, radius);
    if (!collision) return desired.clone();
    const direction = movement.clone().normalize();
    const advance = collision.travel;
    const resolved = from.clone().addScaledVector(direction, Math.min(distance, advance));
    const remaining = desired.clone().sub(resolved).setY(0);
    const intoWall = remaining.dot(collision.normal);
    if (intoWall < 0) remaining.addScaledVector(collision.normal, -intoWall);
    if (remaining.lengthSq() <= 0.000001) return resolved;

    const slideCollision = this.horizontalCollision(resolved, remaining, radius);
    if (!slideCollision) return resolved.add(remaining);
    const slideDirection = remaining.clone().normalize();
    const slideAdvance = slideCollision.travel;
    return resolved.addScaledVector(slideDirection, Math.min(remaining.length(), slideAdvance));
  }

  horizontalCollision(origin, movement, radius) {
    const direction = movement.clone().setY(0).normalize();
    const movementLength = movement.length();
    const cached = this.cachedHorizontalCollision(origin, direction, movementLength, radius);
    if (cached.hit) return cached.collision;
    const far = movementLength + HORIZONTAL_COLLISION_LOOKAHEAD;
    const indexedObjects = this.horizontalCollisionObjects(origin, direction, far, radius);
    const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
    const lateralSteps = Math.max(2, Math.ceil((radius * 2) / MAX_HORIZONTAL_RAY_GAP));
    let nearest = null;
    for (const height of HORIZONTAL_COLLISION_HEIGHTS) {
      for (let step = 0; step <= lateralSteps; step += 1) {
        const offset = -radius + (radius * 2 * step) / lateralSteps;
        const rayOrigin = new THREE.Vector3(origin.x, origin.y + height, origin.z).addScaledVector(perpendicular, offset);
        this.raycaster.set(rayOrigin, direction);
        this.raycaster.near = 0.001;
        this.raycaster.far = far;
        const hits = indexedObjects
          ? this.raycaster.intersectObjects(indexedObjects, false)
          : this.raycaster.intersectObject(this.collider, true);
        for (const hit of hits) {
          if (!hit.face) continue;
          const normal = worldNormalForHit(hit);
          if (direction.dot(normal) > 0) normal.negate();
          const approach = -direction.dot(normal);
          if (Math.abs(normal.y) >= MAX_HORIZONTAL_NORMAL_Y || approach <= 0.05) continue;
          const guardedOffset = Math.max(0, Math.abs(offset) - radius * HORIZONTAL_COLLISION_LATERAL_GUARD);
          const forwardRadius = Math.sqrt(Math.max(0, radius ** 2 - guardedOffset ** 2));
          const travel = Math.max(0, hit.distance - forwardRadius / approach - 0.015);
          if (!nearest || travel < nearest.travel) nearest = { distance: hit.distance, normal, travel };
        }
      }
    }
    this.raycaster.near = 0;
    this.raycaster.far = Infinity;
    this.horizontalCollisionCache = {
      collider: this.collider,
      origin: origin.clone(),
      direction: direction.clone(),
      radius,
      scanDistance: far,
      collision: nearest
    };
    return nearest && nearest.travel <= movementLength ? nearest : null;
  }

  cachedHorizontalCollision(origin, direction, movementLength, radius) {
    const cache = this.horizontalCollisionCache;
    if (!cache || cache.collider !== this.collider || Math.abs(cache.radius - radius) > 0.001) return { hit: false };
    if (cache.direction.dot(direction) < HORIZONTAL_CACHE_DIRECTION_DOT) return { hit: false };
    const offset = origin.clone().sub(cache.origin);
    const forward = offset.dot(cache.direction);
    const lateral = offset.addScaledVector(cache.direction, -forward).length();
    if (forward < -0.02 || lateral > HORIZONTAL_CACHE_LATERAL_TOLERANCE) return { hit: false };
    if (cache.collision) {
      const travel = Math.max(0, cache.collision.travel - forward);
      if (travel <= movementLength) return { hit: true, collision: { ...cache.collision, travel } };
    }
    if (cache.scanDistance - forward >= movementLength) return { hit: true, collision: null };
    return { hit: false };
  }

  hasGroundAt(x, z) {
    if (!this.collider) return true;
    const referenceY = this.groundReferenceY();
    const tolerance = 2.5 * (this.activeWorld?.worldScale || 1);
    return this.groundHitsAt(x, z).some((y) => Math.abs(y - referenceY) <= tolerance);
  }

  stopPose(stopId) {
    const record = this.artworks.get(stopId)
      || [...this.artworks.values()].find((candidate) => candidate.artwork.id === stopId || candidate.stopId === stopId);
    if (!record) return null;
    return {
      id: record.artwork.id,
      guideAnchor: [...record.frame.userData.guideAnchor],
      lookAt: [...record.frame.userData.lookAt],
      artwork: record.artwork
    };
  }

  artworkPose(artworkId) {
    const id = String(artworkId || "").trim();
    if (!id) return null;
    const record = [...this.artworks.values()].find((candidate) => candidate.artwork.id === id);
    if (!record) return null;
    return {
      id: record.artwork.id,
      guideAnchor: [...record.frame.userData.guideAnchor],
      lookAt: [...record.frame.userData.lookAt],
      artwork: record.artwork
    };
  }

  artworkAnchorMatrix(artworkId) {
    const id = String(artworkId || "").trim();
    if (!id) return null;
    const record = [...this.artworks.values()].find((candidate) => candidate.artwork.id === id);
    if (!record?.frame || record.frame.visible === false || record.frame.userData.placementError) return null;
    record.frame.updateWorldMatrix(true, false);
    return record.frame.matrixWorld.clone();
  }

  highlight(stopId, effect = "focus") {
    for (const [id, artwork] of this.artworks) {
      const active = id === stopId || artwork.stopId === stopId || artwork.artwork.id === stopId;
      const palette = artwork.palette || resolveArtworkFramePalette(this.activeWorld, artwork.index, artwork.artwork.id);
      artwork.border.material.color.set(active ? palette.activeColor : palette.frameColor);
      artwork.border.material.opacity = active && effect === "echo" ? 0.82 : 1;
      artwork.border.material.transparent = artwork.border.material.opacity < 1;
      artwork.frame.scale.setScalar(active ? ACTIVE_ARTWORK_SCALE : 1);
    }
  }

  async loadArchive(world, token) {
    if (world.render === "mesh" && world.mesh) {
      const meshLive = await this.loadMesh(world, token).catch((error) => {
        this.recordArchiveError(world, token, error);
        return false;
      });
      if (meshLive || token !== this.buildToken || !(world.rad || world.splat)) return meshLive;
    }
    if (world.rad || world.splat) return this.loadSplat(world, token).catch((error) => {
      this.recordArchiveError(world, token, error);
      return false;
    });
    if (world.mesh) return this.loadMesh(world, token).catch((error) => {
      this.recordArchiveError(world, token, error);
      return false;
    });
    return false;
  }

  recordArchiveError(world, token, error) {
    if (token !== this.buildToken) return;
    this.lastArchiveError = {
      worldId: world.id,
      code: String(error?.message || "archive_load_failed"),
      ...(error?.archiveMetrics || {})
    };
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
        paged ? PAGED_SPLAT_PRESENTATION_TIMEOUT_MS : 45_000,
        () => token !== this.buildToken || this.archive !== archived,
        {
          minimumActiveSplats: presentationSplatThreshold(this.quality),
          minimumLoadedSplats: presentationLoadedSplatThreshold(this.quality)
        }
      );
    } catch (error) {
      error.archiveMetrics = {
        activeSplats: Number(spark.activeSplats) || 0,
        loadedSplats: Number(splat.paged?.numSplats || splat.numSplats) || 0,
        requiredActiveSplats: presentationSplatThreshold(this.quality),
        requiredLoadedSplats: presentationLoadedSplatThreshold(this.quality)
      };
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
      this.buildGroundIndex(collider);
      this.groundCache.clear();
      this.horizontalCollisionCache = null;
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
    this.scene.background = new THREE.Color(resolveSceneBackdrop(this.activeWorld));
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
    const indexed = this.indexedGroundHitsAt(x, z);
    if (indexed) return indexed;
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
    this.groundIndex = null;
    this.disposeHorizontalIndex();
    this.horizontalCollisionCache = null;
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

function worldNormalForHit(hit) {
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
  return hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
}

function collisionProxyMesh(values, material) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(values, 3));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.updateMatrixWorld(true);
  return mesh;
}

function safeDispose(value) {
  try { value?.dispose?.(); } catch { /* terminal cleanup must continue */ }
}

export async function waitForSplatFrame(
  spark,
  splat,
  timeoutMs,
  cancelled = () => false,
  { minimumActiveSplats = 1, minimumLoadedSplats = 1 } = {}
) {
  const deadline = Date.now() + timeoutMs;
  let stableChecks = 0;
  while (Date.now() < deadline) {
    if (cancelled()) throw new Error("splat_frame_cancelled");
    if (hasRenderableSplatFrame(spark, splat)) {
      stableChecks = hasPresentationReadySplatFrame(spark, splat, minimumActiveSplats, minimumLoadedSplats)
        ? stableChecks + 1
        : 0;
      if (stableChecks >= SPLAT_PRESENTATION_STABLE_CHECKS) return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  while (hasPresentationReadySplatFrame(spark, splat, minimumActiveSplats, minimumLoadedSplats)) {
    stableChecks += 1;
    if (stableChecks >= SPLAT_PRESENTATION_STABLE_CHECKS) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
    if (cancelled()) throw new Error("splat_frame_cancelled");
  }
  throw new Error(hasRenderableSplatFrame(spark, splat)
    ? "splat_presentation_timeout"
    : "splat_frame_timeout");
}

export function hasRenderableSplatFrame(spark, splat) {
  const instance = spark?.lodInstances?.get?.(splat);
  const loadedSplats = splat?.paged?.numSplats || instance?.numSplats || splat?.numSplats || 0;
  return loadedSplats > 0 && (spark?.activeSplats || 0) > 0;
}

export function hasPresentationReadySplatFrame(spark, splat, minimumActiveSplats = 1, minimumLoadedSplats = 1) {
  const activeThreshold = Math.max(1, Number(minimumActiveSplats) || 1);
  const loadedThreshold = Math.max(1, Number(minimumLoadedSplats) || 1);
  const instance = spark?.lodInstances?.get?.(splat);
  const loadedSplats = splat?.paged?.numSplats || instance?.numSplats || splat?.numSplats || 0;
  return hasRenderableSplatFrame(spark, splat)
    && (spark?.activeSplats || 0) >= activeThreshold
    && loadedSplats >= loadedThreshold;
}

export function presentationSplatThreshold(quality = {}) {
  const target = Math.max(1, Number(quality.lodSplatCount) || 1);
  return Math.round(Math.min(60_000, Math.max(40_000, target * 0.01)));
}

export function presentationLoadedSplatThreshold(quality = {}) {
  const target = Math.max(1, Number(quality.lodSplatCount) || 1);
  return Math.round(Math.min(500_000, Math.max(100_000, target * 0.1)));
}

function validHexColor(...candidates) {
  const match = candidates.find((value) => Number.isInteger(value) && value >= 0 && value <= 0xffffff);
  return match ?? 0x59615e;
}

function mixDisplayColors(left, right, amount) {
  return new THREE.Color(validHexColor(left))
    .lerp(new THREE.Color(validHexColor(right)), clamp(Number(amount) || 0, 0, 1))
    .getHex(THREE.SRGBColorSpace);
}

function constrainDisplayColor(color, {
  minLightness = 0,
  maxLightness = 1,
  maxSaturation = 1
} = {}) {
  const value = new THREE.Color(validHexColor(color));
  const hsl = {};
  value.getHSL(hsl, THREE.SRGBColorSpace);
  value.setHSL(
    hsl.h,
    Math.min(maxSaturation, hsl.s),
    clamp(hsl.l, minLightness, maxLightness),
    THREE.SRGBColorSpace
  );
  return value.getHex(THREE.SRGBColorSpace);
}

function shiftDisplayLightness(color, amount) {
  const value = new THREE.Color(validHexColor(color));
  const hsl = {};
  value.getHSL(hsl, THREE.SRGBColorSpace);
  value.setHSL(hsl.h, hsl.s, clamp(hsl.l + amount, 0, 1), THREE.SRGBColorSpace);
  return value.getHex(THREE.SRGBColorSpace);
}

function ensureMatteContrast(frameColor, matColor, minimumDifference) {
  const frameHsl = {};
  const matHsl = {};
  new THREE.Color(frameColor).getHSL(frameHsl, THREE.SRGBColorSpace);
  const matte = new THREE.Color(matColor);
  matte.getHSL(matHsl, THREE.SRGBColorSpace);
  const targetLightness = Math.max(matHsl.l, Math.min(0.94, frameHsl.l + minimumDifference));
  matte.setHSL(matHsl.h, matHsl.s, targetLightness, THREE.SRGBColorSpace);
  return matte.getHex(THREE.SRGBColorSpace);
}

function stableStringHash(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
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
