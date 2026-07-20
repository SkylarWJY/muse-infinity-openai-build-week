import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ALL_EXHIBITION_SCENES } from "../src/config/exhibitionSpine.js";
import { ARCHIVED_WORLDS } from "../src/config/legacyAssets.js";
import { artworksForScene } from "../src/config/sceneCollections.js";
import { WorldLayer } from "../src/render/WorldLayer.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const UP = new THREE.Vector3(0, 1, 0);
const ACTIVE_ARTWORK_SCALE = 1.025;

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
  for (const world of ARCHIVED_WORLDS) {
    const scene = new THREE.Scene();
    const layer = new WorldLayer(scene, { textureLoader: { loadAsync: async () => null } });
    layer.activeWorld = world;
    layer.collider = await loadCollider(loader, world);
    scene.add(layer.collider);
    await layer.buildArtworks(world, layer.buildToken);
    layer.layoutArtworks(world);

    const records = [...layer.artworks.values()].sort((left, right) => left.index - right.index);
    assert.equal(records.length, 4, world.sceneId);
    assert.deepEqual(records.map((record) => record.artwork.id), artworksForScene(world.sceneId).map((artwork) => artwork.id));

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
      assert.equal(layer.hasGroundAt(frame.position.x, frame.position.z), true, `${world.sceneId}:${record.artwork.id} frame has no ground`);
      assert.equal(layer.hasGroundAt(guideX, guideZ), true, `${world.sceneId}:${record.artwork.id} guide has no ground`);
      assert.ok(Math.abs(frame.position.y - layer.groundHeightAt(frame.position.x, frame.position.z) - 0.02) < 0.0001,
        `${world.sceneId}:${record.artwork.id} frame is floating`);
      assert.ok(Math.abs(guideY - layer.groundHeightAt(guideX, guideZ)) < 0.0001,
        `${world.sceneId}:${record.artwork.id} guide anchor is floating`);

      const facing = new THREE.Vector3(0, 0, 1).applyAxisAngle(UP, frame.rotation.y);
      const towardGuide = new THREE.Vector3(guideX - frame.position.x, 0, guideZ - frame.position.z).normalize();
      assert.ok(facing.dot(towardGuide) > 0.995, `${world.sceneId}:${record.artwork.id} faces away from its guide`);

      const frameCenter = frame.position.clone();
      frameCenter.y += 1.48;
      const guideEye = new THREE.Vector3(guideX, guideY + 1.48, guideZ);
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

      const supportsVisible = frame.userData.supports.every((support) => support.visible);
      if (!supportsVisible) {
        const towardWall = frameCenter.clone().sub(guideEye).setY(0).normalize();
        const backingRay = new THREE.Raycaster(frameCenter, towardWall, 0, 0.1);
        const backingWall = backingRay.intersectObject(layer.collider, true)[0];
        assert.ok(backingWall,
          `${world.sceneId}:${record.artwork.id} hides its supports without a backing wall within 0.10m`);
      }
    }

    for (let left = 0; left < records.length; left += 1) {
      for (let right = left + 1; right < records.length; right += 1) {
        const distance = planarDistance(records[left].frame.position, records[right].frame.position);
        assert.ok(distance >= 1.99, `${world.sceneId}: artworks ${left}/${right} overlap at ${distance.toFixed(2)}m`);
      }
    }
    await layer.clear();
  }
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
