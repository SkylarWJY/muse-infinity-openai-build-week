import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ARCHIVED_WORLDS } from "../src/config/legacyAssets.js";
import { resolveGroundedPartyFormations, resolvePartyFormation } from "../src/render/MuseumEngine.js";
import { WorldLayer } from "../src/render/WorldLayer.js";

const FOOTPRINT = 0.18;
const PATH_FRACTIONS = [0.2, 0.4, 0.6, 0.8];

test("all nine real colliders provide two separated, reachable party footprints near the visitor", async () => {
  const loader = new GLTFLoader();
  let unsafeNominalSlots = 0;

  for (const world of ARCHIVED_WORLDS) {
    const scene = new THREE.Scene();
    const layer = new WorldLayer(scene, { textureLoader: { loadAsync: async () => null } });
    layer.activeWorld = world;
    layer.collider = await loadCollider(loader, world);
    scene.add(layer.collider);

    const right = new THREE.Vector3(Math.cos(world.profile.yaw), 0, Math.sin(world.profile.yaw));
    const player = new THREE.Vector3(world.profile.spawn.x, 0, world.profile.spawn.z).addScaledVector(right, 0.5);
    player.y = layer.groundHeightAt(player.x, player.z);
    const yaw = world.profile.yaw + Math.PI;
    const groundAt = (x, z, referenceY, maxDelta) => layer.walkableGroundHeightAt(x, z, referenceY, maxDelta);
    const targets = resolveGroundedPartyFormations(player, yaw, world.profile.bounds, groundAt, 2);

    assert.equal(targets.length, 2, world.sceneId);
    assert.ok(Math.hypot(targets[0].x - targets[1].x, targets[0].z - targets[1].z) >= 0.65,
      `${world.sceneId} party slots overlap`);
    for (const target of targets) {
      assert.ok(Math.abs(target.y - player.y) <= 0.35, `${world.sceneId} party target crosses a terrain layer`);
      for (const [x, z] of [
        [target.x + FOOTPRINT, target.z],
        [target.x - FOOTPRINT, target.z],
        [target.x, target.z + FOOTPRINT],
        [target.x, target.z - FOOTPRINT]
      ]) {
        assert.ok(Number.isFinite(groundAt(x, z, target.y, 0.22)), `${world.sceneId} party footprint is unsupported`);
      }
      for (const fraction of PATH_FRACTIONS) {
        const x = player.x + (target.x - player.x) * fraction;
        const z = player.z + (target.z - player.z) * fraction;
        const referenceY = player.y + (target.y - player.y) * fraction;
        assert.ok(Number.isFinite(groundAt(x, z, referenceY, 0.45)), `${world.sceneId} party route crosses a terrain break`);
      }
    }

    for (const index of [0, 1]) {
      const nominal = resolvePartyFormation(player, yaw, index, world.profile.bounds);
      const nominalY = layer.groundHeightAt(nominal.x, nominal.z);
      if (Math.abs(nominalY - player.y) > 0.4) unsafeNominalSlots += 1;
    }
    await layer.clear();
  }

  assert.ok(unsafeNominalSlots > 0, "fixture must retain the terrain-layer regression that fixed slots cannot handle");
});

async function loadCollider(loader, world) {
  const bytes = await fs.promises.readFile(new URL(`..${world.collider}`, import.meta.url));
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const collider = (await loader.parseAsync(arrayBuffer, "")).scene;
  collider.scale.multiplyScalar(world.transform.scale);
  collider.position.y += world.transform.y;
  if (world.transform.rotationX) collider.rotateX(world.transform.rotationX);
  collider.traverse((child) => { if (child.isMesh) child.visible = false; });
  collider.updateMatrixWorld(true);
  return collider;
}
