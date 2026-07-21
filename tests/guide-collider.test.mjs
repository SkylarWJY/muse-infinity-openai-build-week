import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ARCHIVED_WORLDS, stopsForWorld } from "../src/config/legacyAssets.js";
import { GuideDirector } from "../src/render/GuideDirector.js";
import { MuseumEngine } from "../src/render/MuseumEngine.js";
import { ProceduralAvatar } from "../src/render/ProceduralAvatar.js";
import { WorldLayer } from "../src/render/WorldLayer.js";

globalThis.ProgressEvent ??= class ProgressEvent {
  constructor(type, init = {}) { Object.assign(this, { type }, init); }
};

test("all eight process guides ground their targets to real colliders and reach asking", async () => {
  const loader = new GLTFLoader();
  for (const world of ARCHIVED_WORLDS.slice(0, 8)) {
    const scene = new THREE.Scene();
    const layer = new WorldLayer(scene, { textureLoader: { loadAsync: async () => null } });
    layer.activeWorld = world;
    layer.collider = await loadCollider(loader, world);
    scene.add(layer.collider);
    layer.buildGroundIndex(layer.collider);
    await layer.buildArtworks(world, layer.buildToken);
    layer.layoutArtworks(world);

    const avatar = new ProceduralAvatar();
    avatar.group.position.set(world.profile.guideSpawn.x, world.profile.groundY, world.profile.guideSpawn.z);
    avatar.group.position.y = layer.groundHeightAt(avatar.group.position.x, avatar.group.position.z);
    const director = new GuideDirector({ avatar });
    const engine = Object.create(MuseumEngine.prototype);
    engine.activeWorld = world;
    engine.worldLayer = layer;
    engine.director = director;
    engine.guide = avatar;
    engine.activeStopId = null;

    const stop = stopsForWorld(world.id)[0];
    const pose = layer.stopPose(stop.id);
    assert.ok(pose, `${world.id}: production artwork pose must exist`);
    engine.navigateTo(stop.id);
    const expectedGround = layer.walkableGroundHeightAt(
      pose.guideAnchor[0],
      pose.guideAnchor[2],
      pose.guideAnchor[1],
      0.35
    );
    assert.ok(Number.isFinite(expectedGround), `${world.id}: production guide pose must use a walkable collider layer`);
    assert.ok(Math.abs(director.target.y - expectedGround) < 0.0001, `${world.id}: target must use collider ground`);

    for (let frame = 0; frame < 1_200 && director.state !== "asking"; frame += 1) {
      const previous = avatar.group.position.clone();
      director.update(1 / 60);
      engine.updateGuideGround(previous);
    }
    const correspondence = director.correspondence();
    assert.equal(director.state, "asking", `${world.id}: guide did not finish arrival`);
    assert.equal(correspondence.synced, true, `${world.id}: ${JSON.stringify(correspondence)}`);
    assert.ok(correspondence.distance <= 0.6, `${world.id}: distance ${correspondence.distance}`);

    avatar.dispose();
    await layer.clear();
  }
});

async function loadCollider(loader, world) {
  const file = new URL(`..${world.collider}`, import.meta.url);
  const data = await fs.readFile(file);
  const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const collider = (await loader.parseAsync(arrayBuffer, "")).scene;
  collider.scale.multiplyScalar(world.transform.scale);
  collider.position.y += world.transform.y;
  if (world.transform.rotationX) collider.rotateX(world.transform.rotationX);
  collider.traverse((child) => { if (child.isMesh) child.visible = false; });
  collider.updateMatrixWorld(true);
  return collider;
}
