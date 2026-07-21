import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { artworkPlacementsForScene } from "../src/config/artworkPlacements.js";
import { ARCHIVED_WORLDS } from "../src/config/legacyAssets.js";
import { MuseumEngine, resolveArtworkPartyStages } from "../src/render/MuseumEngine.js";
import { WorldLayer } from "../src/render/WorldLayer.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const COMPANIONS = ["monet", "frida", "socrates"];

globalThis.ProgressEvent ??= class ProgressEvent {
  constructor(type, init = {}) { Object.assign(this, { type }, init); }
};

test("all shipped galleries resolve three independent collider-safe artwork routes", async () => {
  const loader = new GLTFLoader();
  const failures = [];
  let transitionCount = 0;

  for (const world of ARCHIVED_WORLDS) {
    const layer = await colliderLayer(loader, world);
    try {
      let origins = initialCompanyOrigins(world, layer);
      const placements = artworkPlacementsForScene(world.sceneId).slice(0, 3);
      for (const [stationIndex, placement] of placements.entries()) {
        const order = rotate(COMPANIONS, stationIndex);
        const guideY = layer.walkableGroundHeightAt(
          placement.guideAnchor[0],
          placement.guideAnchor[2],
          placement.guideAnchor[1],
          0.45
        );
        try {
          const stages = resolveArtworkPartyStages(
            {
              guideAnchor: [placement.guideAnchor[0], guideY, placement.guideAnchor[2]],
              lookAt: placement.lookAt
            },
            order,
            (x, z, referenceY, maxDelta) => layer.walkableGroundHeightAt(x, z, referenceY, maxDelta),
            world.profile.bounds,
            {
              origins,
              pathIsClear: (from, target, radius) => horizontalPathIsClear(layer, from, target, radius)
            }
          );
          assert.deepEqual(stages.map(({ companionId }) => companionId), order);
          assertSeparated(stages);
          for (const stage of stages) {
            assert.ok(Number.isFinite(layer.walkableGroundHeightAt(stage.x, stage.z, stage.y, 0.35)));
          }
          origins = new Map(stages.map((stage) => [stage.companionId, stage]));
          transitionCount += stages.length;
        } catch (error) {
          failures.push(`${world.sceneId}:station-${stationIndex + 1}:${error.message}`);
          break;
        }
      }
    } finally {
      layer.disposeHorizontalIndex();
      disposeTree(layer.collider);
    }
  }

  assert.deepEqual(failures, [], failures.join("\n"));
  assert.equal(transitionCount, ARCHIVED_WORLDS.length * 3 * COMPANIONS.length);
});

async function colliderLayer(loader, world) {
  const bytes = await fs.promises.readFile(path.join(ROOT, world.collider.slice(1)));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const collider = (await loader.parseAsync(buffer, "")).scene;
  collider.scale.multiplyScalar(world.transform.scale);
  collider.position.y += world.transform.y;
  if (world.transform.rotationX) collider.rotateX(world.transform.rotationX);
  collider.updateMatrixWorld(true);
  const layer = new WorldLayer(new THREE.Scene());
  layer.activeWorld = world;
  layer.collider = collider;
  layer.buildGroundIndex(collider);
  return layer;
}

function initialCompanyOrigins(world, layer) {
  const right = new THREE.Vector3(Math.cos(world.profile.yaw), 0, Math.sin(world.profile.yaw));
  const player = new THREE.Group();
  player.position.set(world.profile.spawn.x, world.profile.groundY, world.profile.spawn.z).addScaledVector(right, 0.5);
  player.position.y = layer.groundHeightAt(player.position.x, player.position.z);
  player.rotation.y = world.profile.yaw + Math.PI;
  const partyActors = [0, 1].map(() => ({ group: new THREE.Group(), setMotion() {} }));
  const engine = Object.create(MuseumEngine.prototype);
  Object.assign(engine, {
    activeWorld: world,
    player: { group: player },
    partyActors,
    partyFormationCache: null,
    worldLayer: layer
  });
  engine.placePartyAtFormation(true);
  const guide = {
    x: world.profile.guideSpawn.x,
    y: layer.groundHeightAt(world.profile.guideSpawn.x, world.profile.guideSpawn.z),
    z: world.profile.guideSpawn.z
  };
  return new Map([
    [COMPANIONS[0], guide],
    [COMPANIONS[1], partyActors[0].group.position.clone()],
    [COMPANIONS[2], partyActors[1].group.position.clone()]
  ]);
}

function horizontalPathIsClear(layer, from, target, radius) {
  const origin = new THREE.Vector3(from.x, from.y, from.z);
  const desired = new THREE.Vector3(target.x, target.y, target.z);
  layer.horizontalCollisionCache = null;
  const resolved = layer.resolveHorizontalMove(origin, desired, radius);
  return Math.hypot(resolved.x - desired.x, resolved.z - desired.z) <= 0.04;
}

function assertSeparated(stages) {
  for (let left = 0; left < stages.length; left += 1) {
    for (let right = left + 1; right < stages.length; right += 1) {
      assert.ok(Math.hypot(stages[left].x - stages[right].x, stages[left].z - stages[right].z) >= 0.72);
    }
  }
}

function rotate(values, offset) {
  return values.map((_, index) => values[(index + offset) % values.length]);
}

function disposeTree(root) {
  root?.traverse((object) => {
    object.geometry?.dispose?.();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) material?.dispose?.();
  });
}
