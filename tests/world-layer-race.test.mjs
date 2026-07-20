import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { getWorld, stopsForWorld } from "../src/config/legacyAssets.js";
import { WorldLayer } from "../src/render/WorldLayer.js";

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

  const first = layer.build({ ...getWorld("van-gogh-gallery"), splat: null });
  await waitUntil(() => pending.length === 3);
  const second = layer.build({ ...getWorld("infinity-room"), splat: null });
  await waitUntil(() => pending.length === 6);

  let staleTexturesDisposed = 0;
  pending.forEach((request, index) => {
    const texture = new THREE.Texture();
    if (index < 3) texture.addEventListener("dispose", () => { staleTexturesDisposed += 1; });
    request.resolve(texture);
  });
  await Promise.all([first, second]);

  assert.equal(layer.activeWorld.id, "infinity-room");
  assert.equal(staleTexturesDisposed, 3);
  assert.equal(layer.artworkGroup.children.length, 3);
  assert.deepEqual(ready.sort(), ["bedroom", "grande-jatte", "water-lilies"]);
  for (const stop of stopsForWorld("infinity-room")) {
    assert.deepEqual(layer.artworks.get(stop.id).frame.position.toArray(), stop.artworkPosition);
  }
  await layer.clear();
});

async function waitUntil(predicate) {
  const deadline = Date.now() + 1000;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error("wait_timeout");
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
