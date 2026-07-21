import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { ArchivedAvatar, archivedGaitCadence, resolveArchivedMotionPose } from "../src/render/ArchivedAvatar.js";
import { ProceduralAvatar, resolveProceduralMotionPose } from "../src/render/ProceduralAvatar.js";

test("procedural learner gait articulates opposing shoulders, hips, elbows and knees", () => {
  const pose = resolveProceduralMotionPose({ speed: 2.9, elapsed: 0.2, phase: 0 });

  assert.equal(Math.sign(pose.leftHipX), -Math.sign(pose.rightHipX));
  assert.equal(Math.sign(pose.leftShoulderX), -Math.sign(pose.rightShoulderX));
  assert.ok(pose.leftKneeX > 0 || pose.rightKneeX > 0);
  assert.ok(pose.leftElbowX > 0 || pose.rightElbowX > 0);
});

test("procedural learner weight shift does not overwrite its world height", () => {
  const avatar = new ProceduralAvatar();
  avatar.group.position.y = 1.25;
  avatar.setMotion(2.9);
  avatar.update(1 / 60, 0.2);

  assert.equal(avatar.group.position.y, 1.25);
  assert.notEqual(avatar.bodyRoot.position.y, 0);
});

test("procedural avatar releases its render geometry", () => {
  const avatar = new ProceduralAvatar();
  let disposed = 0;
  avatar.group.traverse((object) => object.geometry?.addEventListener("dispose", () => { disposed += 1; }));

  avatar.dispose();

  assert.ok(disposed > 0);
});

test("archived avatar gait drives opposing arms and legs with joint flex", () => {
  const pose = resolveArchivedMotionPose({ speed: 2.25, elapsed: 0.22, phase: 0 });

  assert.ok(Math.abs(pose.leftLegX) > 0.25);
  assert.equal(Math.sign(pose.leftLegX), -Math.sign(pose.rightLegX));
  assert.equal(Math.sign(pose.leftArmX), -Math.sign(pose.rightArmX));
  assert.ok(pose.leftKneeX > 0 || pose.rightKneeX > 0);
  assert.ok(pose.leftElbowX > 0 || pose.rightElbowX > 0);
});

test("archived avatar gait cadence follows its actual locomotion speed", () => {
  assert.ok(archivedGaitCadence(0.65) < archivedGaitCadence(1.6));
  assert.ok(archivedGaitCadence(1.6) < archivedGaitCadence(3.65));
  assert.equal(archivedGaitCadence(99), 10.5);
});

test("archived avatar body rise stays synchronized with its speed-coupled gait", () => {
  const avatar = new ArchivedAvatar({
    companion: { id: "test", fullName: "Test", model: "/test.glb", color: "#fff" }
  });
  avatar.ready = true;
  avatar.phase = 0;
  avatar.baseY = 0;
  avatar.model = new THREE.Group();
  avatar.visual.add(avatar.model);
  avatar.setMotion(0.65);

  const elapsed = 0.4;
  avatar.update(10, elapsed);
  const moving = 0.65 / 1.8;
  const step = Math.sin(elapsed * archivedGaitCadence(0.65));
  const expectedY = Math.abs(step) * 0.025 * moving + Math.sin(elapsed * 1.4) * 0.006;
  assert.ok(Math.abs(avatar.model.position.y - expectedY) < 1e-10);
  assert.equal(avatar.group.userData.motion, "walk");
  avatar.dispose();
});

test("archived avatar gestures resolve to distinct arm poses at rest", () => {
  const open = resolveArchivedMotionPose({ gesture: "open", elapsed: 0.5, phase: 0 });
  const listen = resolveArchivedMotionPose({ gesture: "listen", elapsed: 0.5, phase: 0 });
  const point = resolveArchivedMotionPose({ gesture: "point", elapsed: 0.5, phase: 0 });
  const reflect = resolveArchivedMotionPose({ gesture: "reflect", elapsed: 0.5, phase: 0 });

  assert.ok(open.leftArmZ < 0 && open.rightArmZ > 0);
  assert.ok(Math.abs(listen.rightArmZ) < Math.abs(open.rightArmZ));
  assert.ok(point.rightArmX < open.rightArmX - 0.7);
  assert.ok(reflect.rightElbowX < point.rightElbowX - 0.25);
});

test("archived avatar retires an in-flight model and all of its textures", async () => {
  let resolveLoad;
  const loader = { loadAsync: () => new Promise((resolve) => { resolveLoad = resolve; }) };
  const avatar = new ArchivedAvatar({
    companion: { id: "test", fullName: "Test", model: "/test.glb", color: "#fff" },
    loader
  });
  const textures = [new THREE.Texture(), new THREE.Texture(), new THREE.Texture()];
  const material = new THREE.MeshStandardMaterial({ map: textures[0], normalMap: textures[1], roughnessMap: textures[2] });
  const model = new THREE.Group();
  model.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material));
  let disposedTextures = 0;
  for (const texture of textures) texture.addEventListener("dispose", () => { disposedTextures += 1; });

  const loading = avatar.load();
  avatar.dispose();
  resolveLoad({ scene: model });
  await loading;

  assert.equal(avatar.ready, false);
  assert.equal(avatar.model, null);
  assert.equal(disposedTextures, 3);
  avatar.dispose();
  assert.equal(disposedTextures, 3);
});
