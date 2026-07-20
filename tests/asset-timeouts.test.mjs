import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { getCompanion } from "../src/config/legacyAssets.js";
import { ArchivedAvatar } from "../src/render/ArchivedAvatar.js";
import { LearnerAvatar } from "../src/render/LearnerAvatar.js";

test("learner loading settles to its procedural body and disposes a late GLB", async () => {
  const pending = deferred();
  const status = [];
  const avatar = new LearnerAvatar({
    loader: { loadAsync: () => pending.promise },
    loadTimeoutMs: 5,
    onStatus: (event) => status.push(event)
  });

  await avatar.load();
  assert.equal(avatar.loaded, true);
  assert.equal(avatar.ready, false);
  assert.equal(avatar.group.userData.fallback, true);
  assert.match(status[0].error.message, /learner_timeout/);

  const late = disposableGltf();
  pending.resolve(late.gltf);
  await nextTask();
  assert.equal(late.disposals, 1);
  avatar.dispose();
});

test("companion loading settles to its procedural body and disposes a late GLB", async () => {
  const pending = deferred();
  const status = [];
  const avatar = new ArchivedAvatar({
    companion: getCompanion("monet"),
    loader: { loadAsync: () => pending.promise },
    loadTimeoutMs: 5,
    onStatus: (event) => status.push(event)
  });

  await avatar.load();
  assert.equal(avatar.ready, false);
  assert.ok(avatar.fallback);
  assert.match(status[0].error.message, /companion_timeout/);

  const late = disposableGltf();
  pending.resolve(late.gltf);
  await nextTask();
  assert.equal(late.disposals, 1);
  avatar.dispose();
});

function deferred() {
  let resolve;
  const promise = new Promise((settle) => { resolve = settle; });
  return { promise, resolve };
}

function disposableGltf() {
  const scene = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  const result = { gltf: { scene }, disposals: 0 };
  mesh.geometry.addEventListener("dispose", () => { result.disposals += 1; });
  scene.add(mesh);
  return result;
}

function nextTask() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
