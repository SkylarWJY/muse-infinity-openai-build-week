import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { DEFAULT_LEARNER_AVATAR_ID, LEARNER_AVATARS, getLearnerAvatar } from "../src/config/learnerAvatars.js";
import {
  LEARNER_ASSET,
  LearnerAvatar,
  clampLearnerProceduralSpeed,
  learnerMotionForSpeed,
  resolveLearnerClips,
  resolveLearnerMotionPose
} from "../src/render/LearnerAvatar.js";

const DEFAULT_AVATAR = getLearnerAvatar(DEFAULT_LEARNER_AVATAR_ID);
const ORIGINAL_AVATAR = getLearnerAvatar("original");
const LEARNER_FILE = new URL(`..${ORIGINAL_AVATAR.asset}`, import.meta.url);
const GIRL_FILE = new URL(`..${DEFAULT_AVATAR.asset}`, import.meta.url);
const MANIFEST_FILE = new URL("../assets/generated/learner-v2/manifest.json", import.meta.url);
const QA_REPORT_FILE = new URL("../assets/generated/learner-v2/qa-report.json", import.meta.url);
const GIRL_MANIFEST_FILE = new URL("../assets/generated/learner-girl/manifest.json", import.meta.url);

test("the learner avatar registry defaults to the switchable little-girl profile", () => {
  assert.equal(DEFAULT_LEARNER_AVATAR_ID, "little-girl");
  assert.equal(LEARNER_ASSET, DEFAULT_AVATAR.asset);
  assert.equal(DEFAULT_AVATAR.motionMode, "procedural-limbs");
  assert.deepEqual(DEFAULT_AVATAR.motionProfile, {
    legUpperY: -0.42,
    legBlendWidth: 0.1,
    legSwingScale: 0.55,
    kneeBendScale: 0.35,
    armSwingScale: 0,
    elbowBendScale: 0,
    bobScale: 0.35,
    leanScale: 0.35,
    footSeparation: 0,
    maxSpeed: 1.33
  });
  assert.equal(Object.isFrozen(DEFAULT_AVATAR.motionProfile), true);
  assert.equal(ORIGINAL_AVATAR.motionMode, "skeletal");
  assert.deepEqual(LEARNER_AVATARS.map((avatar) => avatar.id), ["little-girl", "original"]);
  assert.equal(getLearnerAvatar("missing"), null);
  assert.equal(Object.isFrozen(DEFAULT_AVATAR), true);
});

test("the default little-girl GLB is a browser-sized static mesh with verified provenance", () => {
  const stat = fs.statSync(GIRL_FILE);
  assert.ok(stat.size > 1_000_000 && stat.size < 5_000_000);
  const buffer = fs.readFileSync(GIRL_FILE);
  const gltf = readGlbJson(buffer);
  let vertices = 0;
  let triangles = 0;
  for (const mesh of gltf.meshes) {
    for (const primitive of mesh.primitives) {
      const position = gltf.accessors[primitive.attributes.POSITION];
      const indices = gltf.accessors[primitive.indices];
      vertices += position.count;
      triangles += Math.floor((indices?.count || position.count) / 3);
    }
  }
  assert.equal(gltf.asset.generator, "glTF-Transform v4.4.1");
  assert.equal(gltf.skins, undefined);
  assert.equal(gltf.animations, undefined);
  assert.ok(gltf.extensionsRequired.includes("KHR_mesh_quantization"));
  assert.equal(vertices, 56_770);
  assert.equal(triangles, 88_379);

  const manifest = JSON.parse(fs.readFileSync(GIRL_MANIFEST_FILE, "utf8"));
  assert.equal(manifest.output.path, "../../characters/learner-girl.glb");
  assert.equal(manifest.output.bytes, buffer.byteLength);
  assert.equal(manifest.output.sha256, createHash("sha256").update(buffer).digest("hex"));
});

test("generated learner GLB contains a web-ready skin and idle/walk clips", () => {
  const stat = fs.statSync(LEARNER_FILE);
  assert.equal(stat.isFile(), true);
  assert.ok(stat.size > 1_000_000);
  assert.ok(stat.size < 10_000_000);

  const buffer = fs.readFileSync(LEARNER_FILE);
  assert.equal(buffer.toString("ascii", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  const jsonLength = buffer.readUInt32LE(12);
  const gltf = JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength).replace(/\0+$/, "").trim());

  assert.equal(gltf.asset.version, "2.0");
  assert.match(gltf.asset.generator, /glTF|Tripo/i);
  assert.equal(gltf.skins.length, 1);
  assert.equal(gltf.skins[0].joints.length, 41);
  assert.deepEqual(gltf.animations.map((clip) => clip.name), ["preset:biped:wait", "preset:biped:walk"]);
  assert.deepEqual(gltf.extensionsUsed || [], []);

  const jointNames = new Set(gltf.skins[0].joints.map((index) => gltf.nodes[index].name));
  for (const name of ["Hip", "L_Thigh", "L_Calf", "L_Foot", "R_Thigh", "R_Calf", "R_Foot", "L_Upperarm", "R_Upperarm"]) {
    assert.equal(jointNames.has(name), true, `missing learner joint: ${name}`);
  }

  let triangles = 0;
  let skinnedPrimitives = 0;
  for (const mesh of gltf.meshes) {
    for (const primitive of mesh.primitives) {
      const position = gltf.accessors[primitive.attributes.POSITION];
      const indices = gltf.accessors[primitive.indices];
      triangles += Math.floor((indices?.count || position.count) / 3);
      if (primitive.attributes.JOINTS_0 !== undefined && primitive.attributes.WEIGHTS_0 !== undefined) skinnedPrimitives += 1;
    }
  }
  assert.ok(triangles >= 35_000 && triangles <= 40_000, `unexpected learner triangle count: ${triangles}`);
  assert.ok(skinnedPrimitives > 0);
});

test("learner motion selects the baked clips at a stable movement threshold", () => {
  assert.equal(learnerMotionForSpeed(0), "idle");
  assert.equal(learnerMotionForSpeed(0.08), "idle");
  assert.equal(learnerMotionForSpeed(-0.5), "walk");

  const wait = { name: "preset:biped:wait" };
  const walk = { name: "preset:biped:walk" };
  assert.deepEqual(resolveLearnerClips([walk, wait]), { idle: wait, walk });
  assert.deepEqual(resolveLearnerClips([]), { idle: null, walk: null });
});

test("learner source asset passes dense skin, deformation, and gait QA", () => {
  const report = JSON.parse(fs.readFileSync(QA_REPORT_FILE, "utf8"));
  const asset = fs.readFileSync(LEARNER_FILE);
  assert.equal(report.asset, "assets/characters/learner.glb");
  assert.equal(report.sha256, createHash("sha256").update(asset).digest("hex"));
  assert.equal(report.bytes, asset.byteLength);
  assert.equal(report.pass, true);
  assert.deepEqual(report.hardFindings, []);
  assert.equal(report.geometry.joints, 41);
  assert.equal(report.weights.hardCounts.upper_body_leg_influence, 0);
  assert.equal(report.weights.hardCounts.opposite_leg_influence, 0);
  assert.equal(report.weights.hardCounts.lower_body_arm_influence, 0);
  assert.equal(report.clips["preset:biped:wait"].deformation.hardEdges, 0);
  assert.equal(report.clips["preset:biped:walk"].deformation.hardEdges, 0);
  assert.ok(report.clips["preset:biped:walk"].gait.minFootSeparation > 0.1);
  assert.ok(report.clips["preset:biped:walk"].gait.minKneeSeparation > 0.1);
});

test("learner generation manifest matches every shipped source and output hash", () => {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf8"));
  const files = [manifest.source_image.sheet, ...manifest.views, manifest.qa_report, manifest.output];

  for (const entry of files) {
    const file = new URL(entry.path, MANIFEST_FILE);
    const data = fs.readFileSync(file);
    assert.equal(createHash("sha256").update(data).digest("hex"), entry.sha256, entry.path);
    if (entry.bytes) assert.equal(data.byteLength, entry.bytes, entry.path);
  }
});

test("learner avatars articulate static meshes and can switch to the retained skeletal profile", async () => {
  const requestedAssets = [];
  let girlGeometryDisposals = 0;
  const loader = {
    async loadAsync(asset) {
      requestedAssets.push(asset);
      const scene = new THREE.Group();
      if (asset === DEFAULT_AVATAR.asset) {
        const geometry = new THREE.BoxGeometry(0.5, 1, 0.4);
        geometry.addEventListener("dispose", () => { girlGeometryDisposals += 1; });
        scene.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial()));
        return { scene, animations: [] };
      }
      return skeletalGltf(scene);
    }
  };
  const avatar = new LearnerAvatar({ loader });

  await avatar.load();
  assert.equal(avatar.ready, true);
  assert.equal(avatar.group.userData.avatarId, "little-girl");
  assert.equal(avatar.group.userData.fallback, false);
  assert.equal(avatar.model.userData.motionRig, "procedural-limbs");
  assert.deepEqual(avatar.model.userData.animationClips, []);
  const material = avatar.model.children[0].material;
  assert.equal(material.customProgramCacheKey(), "muse-archived-avatar-motion-v4");
  assert.equal(avatar.motionUniforms.legUpperY.value, -0.42);
  assert.equal(avatar.motionUniforms.legBlendWidth.value, 0.1);
  avatar.phase = 0;
  avatar.setMotion(1);
  const startY = avatar.model.position.y;
  avatar.update(1 / 60, 0.35);
  assert.equal(avatar.group.userData.motion, "walk");
  assert.notEqual(avatar.model.position.y, startY);
  assert.equal(avatar.motionAngles.leftArmX, 0);
  assert.equal(avatar.motionAngles.rightArmX, 0);
  assert.equal(Math.sign(avatar.motionAngles.leftLegX), -Math.sign(avatar.motionAngles.rightLegX));
  assert.ok(avatar.motionAngles.leftKneeX > 0 || avatar.motionAngles.rightKneeX > 0);
  assert.equal(avatar.motionUniforms.footSeparation.value, 0);

  await avatar.setAvatar("original");
  assert.deepEqual(requestedAssets, [DEFAULT_AVATAR.asset, ORIGINAL_AVATAR.asset]);
  assert.equal(girlGeometryDisposals, 1);
  assert.equal(avatar.group.userData.avatarId, "original");
  assert.equal(avatar.group.userData.asset, ORIGINAL_AVATAR.asset);
  assert.equal(avatar.model.userData.motionRig, "skeletal-animation");
  assert.deepEqual(avatar.model.userData.animationClips, ["idle", "walk"]);
  await assert.rejects(avatar.setAvatar("missing"), /unknown_learner_avatar:missing/);
  avatar.dispose();
});

test("procedural learner motion cannot exceed the museum walking envelope", () => {
  assert.equal(clampLearnerProceduralSpeed(1.8), 1.33);
  assert.equal(clampLearnerProceduralSpeed(-4), -1.33);
  assert.equal(clampLearnerProceduralSpeed(0.7), 0.7);
  assert.equal(clampLearnerProceduralSpeed(Number.NaN), 0);
});

test("the static little-girl gait stays inside its conservative visual envelope", () => {
  const atMuseumPeak = resolveLearnerMotionPose({
    speed: 1.33,
    elapsed: 0.262,
    profile: DEFAULT_AVATAR.motionProfile
  });
  const fromExternalOverspeed = resolveLearnerMotionPose({
    speed: 8,
    elapsed: 0.262,
    profile: DEFAULT_AVATAR.motionProfile
  });

  assert.deepEqual(fromExternalOverspeed, atMuseumPeak);
  assert.ok(Math.abs(atMuseumPeak.leftLegX) <= 0.294);
  assert.ok(Math.abs(atMuseumPeak.rightLegX) <= 0.294);
  assert.ok(atMuseumPeak.leftKneeX <= 0.109);
  assert.ok(atMuseumPeak.rightKneeX <= 0.109);
  for (const key of ["leftArmX", "rightArmX", "leftArmZ", "rightArmZ", "leftElbowX", "rightElbowX"]) {
    assert.equal(atMuseumPeak[key], 0, key);
  }
});

test("the last avatar selection wins when an earlier switch resolves late", async () => {
  let resolveOriginal;
  const loader = {
    loadAsync(asset) {
      if (asset === DEFAULT_AVATAR.asset) {
        const scene = new THREE.Group();
        scene.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, 0.4), new THREE.MeshStandardMaterial()));
        return Promise.resolve({ scene, animations: [] });
      }
      return new Promise((resolve) => { resolveOriginal = resolve; });
    }
  };
  const avatar = new LearnerAvatar({ loader });
  await avatar.load();

  const switchingToOriginal = avatar.setAvatar("original");
  await Promise.resolve();
  await avatar.setAvatar("little-girl");
  const lateOriginal = skeletalGltf();
  let lateGeometryDisposals = 0;
  lateOriginal.scene.children[0].geometry.addEventListener("dispose", () => { lateGeometryDisposals += 1; });
  resolveOriginal(lateOriginal);
  await switchingToOriginal;

  assert.equal(avatar.group.userData.avatarId, "little-girl");
  assert.equal(avatar.group.userData.asset, DEFAULT_AVATAR.asset);
  assert.equal(avatar.ready, true);
  assert.equal(avatar.loaded, true);
  assert.equal(lateGeometryDisposals, 1);
  avatar.dispose();
});

function skeletalGltf(scene = new THREE.Group()) {
  const geometry = new THREE.BoxGeometry(0.5, 1, 0.4);
  const vertexCount = geometry.getAttribute("position").count;
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(new Uint16Array(vertexCount * 4), 4));
  const weights = new Float32Array(vertexCount * 4);
  for (let index = 0; index < vertexCount; index += 1) weights[index * 4] = 1;
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(weights, 4));
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial());
  const bone = new THREE.Bone();
  mesh.add(bone);
  mesh.bind(new THREE.Skeleton([bone]));
  scene.add(mesh);
  return {
    scene,
    animations: [new THREE.AnimationClip("idle", 1, []), new THREE.AnimationClip("walk", 1, [])]
  };
}

function readGlbJson(buffer) {
  assert.equal(buffer.toString("ascii", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength).replace(/\0+$/, "").trim());
}
