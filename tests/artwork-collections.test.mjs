import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ALL_EXHIBITION_SCENES, EXHIBITION_SPINE } from "../src/config/exhibitionSpine.js";
import { ARCHIVED_WORLDS } from "../src/config/legacyAssets.js";
import { artworkPlacementsForScene } from "../src/config/artworkPlacements.js";
import { artworksForScene } from "../src/config/sceneCollections.js";
import { WorldLayer } from "../src/render/WorldLayer.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const UP = new THREE.Vector3(0, 1, 0);
const ACTIVE_ARTWORK_SCALE = 1.025;
const MAX_REQUIRED_VIEW_DISTANCE = 4.5;
const MIN_REQUIRED_STATION_TRAVEL = 1.5;
const MIN_EDGE_VIEW_OFFSET = 2.2;
const EXPECTED_BACKED_MOUNTS = 7;
const EXPECTED_EDGE_DISPLAYS = 29;
const REQUIRED_SCENE_IDS = new Set(EXHIBITION_SPINE.map((scene) => scene.id));
const MINIMUM_WALL_MOUNTS = Object.freeze({
  "threshold-conservatory": 1,
  "court-of-light": 2,
  "water-and-light": 1,
  "sunset-frames": 0,
  "burning-sky": 2,
  "petal-transition": 1,
  "living-memory": 0,
  "infinite-repetition": 0,
  "personal-dream-world": 0
});

globalThis.ProgressEvent ??= class ProgressEvent {
  constructor(type, init = {}) { Object.assign(this, { type }, init); }
};

test("every exhibition scene has four distinct local open-access artworks", () => {
  const ids = new Set();
  for (const scene of ALL_EXHIBITION_SCENES) {
    const artworks = artworksForScene(scene.id);
    assert.equal(artworks.length, 4, scene.id);
    for (const artwork of artworks) {
      assert.ok(artwork.id.startsWith("aic-"), `${scene.id}:${artwork.id}`);
      assert.equal(ids.has(artwork.id), false, `duplicate artwork ${artwork.id}`);
      ids.add(artwork.id);
      assert.ok(artwork.title && artwork.artist && artwork.date, artwork.id);
      assert.match(artwork.sourceUrl, /^https:\/\/www\.artic\.edu\/artworks\//);
      assert.match(artwork.image, /^\/assets\/art\/collection\/aic-\d+\.jpg$/);

      const file = path.join(ROOT, artwork.image.slice(1));
      const stat = fs.statSync(file);
      assert.ok(stat.size > 20_000, `${artwork.id} is unexpectedly small`);
      const header = Buffer.alloc(2);
      const descriptor = fs.openSync(file, "r");
      try { fs.readSync(descriptor, header, 0, 2, 0); } finally { fs.closeSync(descriptor); }
      assert.deepEqual([...header], [0xff, 0xd8], `${artwork.id} is not a JPEG`);
    }
  }
  assert.equal(ids.size, ALL_EXHIBITION_SCENES.length * 4);
});

test("all four artworks stay grounded, separated, bounded, and guide-facing in every real collider", async () => {
  const loader = new GLTFLoader();
  let totalMounted = 0;
  let totalEdgeDisplays = 0;
  for (const world of ARCHIVED_WORLDS) {
    const scene = new THREE.Scene();
    const layer = new WorldLayer(scene, {
      textureLoader: {
        loadAsync: async (url) => {
          const dimensions = jpegDimensions(fs.readFileSync(path.join(ROOT, url.slice(1))));
          const texture = new THREE.Texture();
          texture.image = dimensions;
          return texture;
        }
      }
    });
    layer.activeWorld = world;
    layer.collider = await loadCollider(loader, world);
    scene.add(layer.collider);
    const samplePoints = [
      world.profile.spawn,
      world.profile.guideSpawn,
      ...artworkPlacementsForScene(world.sceneId).flatMap((placement) => [
        { x: placement.x, z: placement.z },
        { x: placement.guideAnchor[0], z: placement.guideAnchor[2] }
      ])
    ];
    const raycastGround = samplePoints.map(({ x, z }) => layer.groundHitsAt(x, z).sort((left, right) => left - right));
    layer.buildGroundIndex(layer.collider);
    samplePoints.forEach(({ x, z }, index) => {
      const indexedGround = layer.groundHitsAt(x, z).sort((left, right) => left - right);
      assert.equal(indexedGround.length, raycastGround[index].length,
        `${world.sceneId} indexed ground count changed at ${x},${z}`);
      assert.ok(indexedGround.every((height, heightIndex) => Math.abs(height - raycastGround[index][heightIndex]) < 0.0001),
        `${world.sceneId} indexed ground height changed at ${x},${z}`);
    });
    await layer.buildArtworks(world, layer.buildToken);
    layer.layoutArtworks(world);

    const records = [...layer.artworks.values()].sort((left, right) => left.index - right.index);
    if (REQUIRED_SCENE_IDS.has(world.sceneId)) {
      const required = records.slice(0, 3);
      for (const record of required) {
        const frameCenter = record.frame.position.clone().add(new THREE.Vector3(0, 1.48, 0));
        const guideEye = new THREE.Vector3(...record.frame.userData.guideAnchor).add(new THREE.Vector3(0, 1.48, 0));
        const distance = frameCenter.distanceTo(guideEye);
        assert.ok(distance <= MAX_REQUIRED_VIEW_DISTANCE,
          `${world.sceneId}:${record.artwork.id} is ${distance.toFixed(2)}m from its guide; required stations must be <= ${MAX_REQUIRED_VIEW_DISTANCE.toFixed(1)}m`);
      }
      for (let index = 1; index < required.length; index += 1) {
        const previous = new THREE.Vector3(...required[index - 1].frame.userData.guideAnchor);
        const current = new THREE.Vector3(...required[index].frame.userData.guideAnchor);
        const travel = planarDistance(previous, current);
        assert.ok(travel >= MIN_REQUIRED_STATION_TRAVEL,
          `${world.sceneId} station ${index} -> ${index + 1} travels only ${travel.toFixed(2)}m; expected >= ${MIN_REQUIRED_STATION_TRAVEL.toFixed(1)}m`);
      }
    }
    if (world.sceneId === "personal-dream-world") {
      const right = new THREE.Vector3(Math.cos(world.profile.yaw), 0, Math.sin(world.profile.yaw));
      const player = new THREE.Vector3(world.profile.spawn.x, 0, world.profile.spawn.z).addScaledVector(right, 0.5);
      player.y = layer.groundHeightAt(player.x, player.z);
      const target = player.clone().add(new THREE.Vector3(0, 1.45, 0));
      const pitch = world.profile.cameraPitch ?? -0.14;
      const distance = world.profile.cameraDistance ?? 5.6;
      const cameraYaw = -world.profile.yaw;
      const camera = target.clone().add(new THREE.Vector3(
        Math.sin(cameraYaw) * Math.cos(pitch) * distance,
        1.25 + Math.sin(-pitch) * distance,
        Math.cos(cameraYaw) * Math.cos(pitch) * distance
      ));
      scene.updateMatrixWorld(true);
      const cameraPlanar = camera.clone();
      cameraPlanar.y = player.y;
      const cameraPath = new THREE.Line3(player, cameraPlanar);
      for (const record of records) {
        const bounds = new THREE.Box3().setFromObject(record.frame);
        const center = bounds.getCenter(new THREE.Vector3());
        center.y = player.y;
        const nearest = cameraPath.closestPointToPoint(center, true, new THREE.Vector3());
        const footprint = bounds.getSize(new THREE.Vector3());
        const clearance = Math.hypot(footprint.x, footprint.z) / 2 + 0.35;
        assert.ok(nearest.distanceTo(center) > clearance,
          `personal-dream-world initial camera corridor is blocked by ${record.frame.name || record.artwork.id}`);
      }
    }
    let mountedCount = 0;
    assert.equal(records.length, 4, world.sceneId);
    assert.deepEqual(records.map((record) => record.artwork.id), artworksForScene(world.sceneId).map((artwork) => artwork.id));

    const routeStart = new THREE.Vector3(world.profile.guideSpawn.x, 0, world.profile.guideSpawn.z);
    routeStart.y = layer.groundHeightAt(routeStart.x, routeStart.z);
    const routeTarget = new THREE.Vector3(...records[0].frame.userData.guideAnchor);
    let routeY = routeStart.y;
    for (const fraction of [0.2, 0.4, 0.6, 0.8, 1]) {
      const x = THREE.MathUtils.lerp(routeStart.x, routeTarget.x, fraction);
      const z = THREE.MathUtils.lerp(routeStart.z, routeTarget.z, fraction);
      const groundY = layer.walkableGroundHeightAt(x, z, routeY, 0.35);
      assert.ok(Number.isFinite(groundY), `${world.sceneId} guide route crosses a terrain break at ${fraction}`);
      routeY = groundY;
    }

    for (const record of records) {
      const { frame, border } = record;
      assert.equal(frame.visible, true, `${world.sceneId}:${record.artwork.id} was hidden by placement failure`);
      assert.equal(frame.userData.placementError, undefined, `${world.sceneId}:${record.artwork.id} retained a placement error`);
      const [guideX, guideY, guideZ] = frame.userData.guideAnchor;
      const values = [...frame.position.toArray(), frame.rotation.y, guideX, guideY, guideZ, ...frame.userData.lookAt];
      assert.equal(values.every(Number.isFinite), true, `${world.sceneId}:${record.artwork.id} has non-finite placement data`);
      assert.ok(frame.position.x >= world.profile.bounds.minX + 0.95, `${world.sceneId}:${record.artwork.id} left bound`);
      assert.ok(frame.position.x <= world.profile.bounds.maxX - 0.95, `${world.sceneId}:${record.artwork.id} right bound`);
      assert.ok(frame.position.z >= world.profile.bounds.minZ + 0.95, `${world.sceneId}:${record.artwork.id} near bound`);
      assert.ok(frame.position.z <= world.profile.bounds.maxZ - 0.95, `${world.sceneId}:${record.artwork.id} far bound`);
      assert.equal(layer.hasGroundAt(guideX, guideZ), true, `${world.sceneId}:${record.artwork.id} guide has no ground`);
      assert.ok(Math.abs(guideY - layer.groundHeightAt(guideX, guideZ)) < 0.0001,
        `${world.sceneId}:${record.artwork.id} guide anchor is floating`);

      assert.equal(frame.userData.supports, undefined,
        `${world.sceneId}:${record.artwork.id} must not render freestanding support posts`);
      const freestanding = frame.userData.freestanding === true;
      assert.equal(frame.userData.displayZone, freestanding ? "edge" : "wall",
        `${world.sceneId}:${record.artwork.id} has an inaccurate display-zone label`);
      const localFrameGroundY = freestanding
        ? layer.walkableGroundHeightAt(frame.position.x, frame.position.z, guideY, 0.45)
        : guideY;
      if (freestanding) {
        totalEdgeDisplays += 1;
        const viewOffset = Math.hypot(frame.position.x - guideX, frame.position.z - guideZ);
        assert.ok(viewOffset >= MIN_EDGE_VIEW_OFFSET,
          `${world.sceneId}:${record.artwork.id} sits inside the activity lane at ${viewOffset.toFixed(2)}m`);
        assert.equal(layer.hasGroundAt(frame.position.x, frame.position.z), true, `${world.sceneId}:${record.artwork.id} frame has no ground`);
        assert.ok(Number.isFinite(localFrameGroundY), `${world.sceneId}:${record.artwork.id} frame changed terrain layer`);
        assert.ok(Math.abs(frame.position.y - localFrameGroundY - 0.02) < 0.0001,
          `${world.sceneId}:${record.artwork.id} freestanding frame is floating`);
        assert.ok(Math.abs(frame.position.y - guideY) <= 0.45,
          `${world.sceneId}:${record.artwork.id} freestanding frame crossed a terrain layer`);
      } else {
        mountedCount += 1;
        totalMounted += 1;
        assert.ok(Math.abs(frame.position.y - guideY - 0.02) < 0.0001,
          `${world.sceneId}:${record.artwork.id} wall frame is not aligned to the guide sightline`);
      }

      const facing = new THREE.Vector3(0, 0, 1).applyAxisAngle(UP, frame.rotation.y);
      const towardGuide = new THREE.Vector3(guideX - frame.position.x, 0, guideZ - frame.position.z).normalize();
      assert.ok(facing.dot(towardGuide) > (freestanding ? 0.995 : 0.6), `${world.sceneId}:${record.artwork.id} faces away from its guide`);

      const frameCenter = frame.position.clone();
      frameCenter.y += 1.48;
      const guideEye = new THREE.Vector3(guideX, guideY + 1.48, guideZ);
      const viewingGroundY = localFrameGroundY;
      assert.ok(Math.abs(frameCenter.y - viewingGroundY - 1.5) < 0.0001,
        `${world.sceneId}:${record.artwork.id} center is not at the 1.5m viewing height`);
      const centerSightline = frameCenter.distanceTo(guideEye);
      assert.ok(centerSightline >= 2.2,
        `${world.sceneId}:${record.artwork.id} is only ${centerSightline.toFixed(2)}m from its guide`);
      const halfWidth = Math.max(0.1, Number(border.geometry.parameters.width || 0) / 2 * ACTIVE_ARTWORK_SCALE);
      const halfHeight = Math.max(0.1, Number(border.geometry.parameters.height || 0) / 2 * ACTIVE_ARTWORK_SCALE);
      const tangent = new THREE.Vector3(1, 0, 0).applyAxisAngle(UP, frame.rotation.y);
      for (const [label, horizontal, vertical] of [
        ["center", 0, 0],
        ["top-left", -halfWidth, halfHeight],
        ["top-right", halfWidth, halfHeight],
        ["bottom-left", -halfWidth, -halfHeight],
        ["bottom-right", halfWidth, -halfHeight]
      ]) {
        const target = frameCenter.clone().addScaledVector(tangent, horizontal);
        target.y += vertical;
        const sightline = target.sub(guideEye);
        const sightlineRay = new THREE.Raycaster(guideEye, sightline.clone().normalize(), 0.08, sightline.length() - 0.005);
        const obstruction = sightlineRay.intersectObject(layer.collider, true)[0];
        assert.equal(obstruction, undefined,
          `${world.sceneId}:${record.artwork.id} ${label} is occluded at ${obstruction?.distance?.toFixed(2)}m of ${sightline.length().toFixed(2)}m`);
      }

      if (!freestanding) {
        const backingWallGap = layer.backingWallGap({
          x: frame.position.x,
          z: frame.position.z,
          groundY: frame.position.y,
          yaw: frame.rotation.y,
          guideAnchor: frame.userData.guideAnchor
        }, { halfWidth, halfHeight });
        assert.ok(backingWallGap !== null,
          `${world.sceneId}:${record.artwork.id} hides its supports without full-frame backing within 0.10m`);
      }
    }

    for (let left = 0; left < records.length; left += 1) {
      for (let right = left + 1; right < records.length; right += 1) {
        const distance = planarDistance(records[left].frame.position, records[right].frame.position);
        assert.ok(distance >= 1.99, `${world.sceneId}: artworks ${left}/${right} overlap at ${distance.toFixed(2)}m`);
      }
    }
    assert.ok(mountedCount >= MINIMUM_WALL_MOUNTS[world.sceneId],
      `${world.sceneId} mounted ${mountedCount}/4 artworks; expected at least ${MINIMUM_WALL_MOUNTS[world.sceneId]}`);
    await layer.clear();
  }
  assert.equal(totalMounted, EXPECTED_BACKED_MOUNTS, "strict collider-backed mount count");
  assert.equal(totalEdgeDisplays, EXPECTED_EDGE_DISPLAYS, "support-free activity-edge fallback count");
});

test("portrait artwork geometry preserves the source texture aspect ratio", async () => {
  const textures = [];
  const layer = new WorldLayer(new THREE.Scene(), {
    textureLoader: {
      loadAsync: async () => {
        const texture = new THREE.Texture({ width: 600, height: 1_200 });
        textures.push(texture);
        return texture;
      }
    }
  });
  const source = ARCHIVED_WORLDS[0];
  const world = { ...source, rad: null, splat: null, mesh: null, collider: null };
  await layer.build(world);
  const picture = [...layer.artworks.values()][0].picture;
  assert.equal(textures.length, 4);
  assert.ok(Math.abs(picture.geometry.parameters.width / picture.geometry.parameters.height - 0.5) < 0.0001);
  await layer.clear();
});

test("full-frame sightlines reject collider geometry immediately in front of an outer corner", () => {
  const scene = new THREE.Scene();
  const layer = new WorldLayer(scene);
  const placement = {
    x: 0,
    z: -2.4,
    groundY: 0.02,
    yaw: 0,
    guideAnchor: [0, 0, 0],
    lookAt: [0, 1.5, -2.4],
    freestanding: true
  };
  const guideEye = new THREE.Vector3(0, 1.48, 0);
  const corner = new THREE.Vector3(0.8, 1.48 + 0.02 + 0.8, -2.4);
  const towardCorner = corner.clone().sub(guideEye);
  const blocker = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.04, 0.04),
    new THREE.MeshBasicMaterial()
  );
  blocker.position.copy(guideEye).addScaledVector(towardCorner.clone().normalize(), towardCorner.length() - 0.055);
  blocker.updateMatrixWorld(true);
  layer.collider = blocker;
  scene.add(blocker);

  assert.equal(layer.placementHasClearSightline(placement, { halfWidth: 0.8, halfHeight: 0.8 }), false);
  blocker.geometry.dispose();
  blocker.material.dispose();
});

test("wall placement does not require floor geometry directly underneath a vertical wall", () => {
  const scene = new THREE.Scene();
  const layer = new WorldLayer(scene);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(5, 0.2, 5), new THREE.MeshBasicMaterial());
  floor.position.y = -0.1;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 6, 5), new THREE.MeshBasicMaterial());
  wall.position.set(-3, 3, 0);
  const collider = new THREE.Group();
  collider.add(floor, wall);
  collider.updateMatrixWorld(true);
  layer.collider = collider;
  layer.activeWorld = {
    worldScale: 1,
    profile: {
      spawn: { x: 0, z: 0 },
      groundY: 0,
      bounds: { minX: -4, maxX: 4, minZ: -4, maxZ: 4 }
    }
  };
  scene.add(collider);

  const placement = layer.wallPlacementAt(
    layer.activeWorld,
    0,
    0,
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(-1, 0, 0),
    { halfWidth: 0.6, halfHeight: 0.6 }
  );
  assert.ok(placement);
  assert.equal(placement.freestanding, false);
  assert.ok(Math.abs(placement.groundY - 0.02) < 0.0001);
});

test("an authored wall mount is rejected at runtime when its backing collider disappears", () => {
  const scene = new THREE.Scene();
  const layer = new WorldLayer(scene);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(8, 0.2, 8), new THREE.MeshBasicMaterial());
  floor.position.y = -0.1;
  floor.updateMatrixWorld(true);
  layer.collider = floor;
  layer.activeWorld = {
    id: "changed-gallery",
    profile: {
      groundY: 0,
      bounds: { minX: -4, maxX: 4, minZ: -4, maxZ: 4 }
    }
  };
  scene.add(floor);

  assert.throws(
    () => layer.resolveAuthoredArtworkPlacement({
      x: 0,
      z: -2.4,
      groundY: 0.02,
      yaw: 0,
      guideAnchor: [0, 0, 0],
      lookAt: [0, 1.5, -2.4],
      freestanding: false
    }),
    /artwork_placement_unavailable:changed-gallery/
  );
  floor.geometry.dispose();
  floor.material.dispose();
});

test("an authored wall mount becomes a visible stand until its collider is available", () => {
  const layer = new WorldLayer(new THREE.Scene());
  layer.activeWorld = {
    id: "loading-gallery",
    profile: {
      groundY: 0,
      bounds: { minX: -4, maxX: 4, minZ: -4, maxZ: 4 }
    }
  };

  const placement = layer.resolveAuthoredArtworkPlacement({
    x: 0,
    z: -2.4,
    groundY: 0.02,
    yaw: 0,
    guideAnchor: [0, 0, 0],
    lookAt: [0, 1.5, -2.4],
    freestanding: false
  });

  assert.equal(placement.freestanding, true);
  assert.equal(placement.groundY, 0.02);
});

test("an authored wall mount rejects a nonvertical backing surface", () => {
  const layer = new WorldLayer(new THREE.Scene());
  layer.collider = new THREE.Group();
  layer.colliderHit = () => ({
    face: { normal: new THREE.Vector3(0, 1, 0) },
    object: { matrixWorld: new THREE.Matrix4() },
    distance: 0.04
  });

  const gap = layer.backingWallGap({
    x: 0,
    z: -2.4,
    groundY: 0.02,
    yaw: 0,
    guideAnchor: [0, 0, 0]
  }, { halfWidth: 0.8, halfHeight: 0.8 });

  assert.equal(gap, null);
});

test("an impossible layout fails explicitly instead of returning overlapping fallback coordinates", () => {
  const scene = new THREE.Scene();
  const layer = new WorldLayer(scene);
  const world = {
    id: "impossible-gallery",
    profile: {
      spawn: { x: 0, z: 0 },
      yaw: 0,
      groundY: 0,
      bounds: { minX: -1, maxX: 1, minZ: -1, maxZ: 1 }
    }
  };
  layer.activeWorld = world;

  assert.throws(
    () => layer.resolveArtworkPlacement(world, 0, 4, [{ x: 0, z: 0 }], { halfWidth: 0.8, halfHeight: 0.8 }),
    /artwork_placement_unavailable/
  );
});

async function loadCollider(loader, world) {
  const file = path.join(ROOT, world.collider.slice(1));
  const data = await fs.promises.readFile(file);
  const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const collider = (await loader.parseAsync(arrayBuffer, "")).scene;
  collider.scale.multiplyScalar(world.transform.scale);
  collider.position.y += world.transform.y;
  if (world.transform.rotationX) collider.rotateX(world.transform.rotationX);
  collider.traverse((child) => { if (child.isMesh) child.visible = false; });
  collider.updateMatrixWorld(true);
  return collider;
}

function planarDistance(left, right) {
  return Math.hypot(left.x - right.x, left.z - right.z);
}

function jpegDimensions(buffer) {
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2 || offset + length + 2 > buffer.length) break;
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7)
      };
    }
    offset += length + 2;
  }
  throw new Error("jpeg_dimensions_unavailable");
}
