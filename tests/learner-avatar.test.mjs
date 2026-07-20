import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { LEARNER_ASSET, learnerMotionForSpeed, resolveLearnerClips, sanitizeLearnerSkinWeights } from "../src/render/LearnerAvatar.js";

const LEARNER_FILE = new URL(`..${LEARNER_ASSET}`, import.meta.url);
const MANIFEST_FILE = new URL("../assets/generated/learner-v1/manifest.json", import.meta.url);

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
  assert.ok(gltf.skins[0].joints.length >= 40);
  assert.deepEqual(gltf.animations.map((clip) => clip.name), ["preset:idle", "preset:walk"]);
  assert.deepEqual(gltf.extensionsUsed || [], []);

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
  assert.ok(triangles >= 10_000 && triangles <= 25_000, `unexpected learner triangle count: ${triangles}`);
  assert.ok(skinnedPrimitives > 0);
});

test("learner motion selects the baked clips at a stable movement threshold", () => {
  assert.equal(learnerMotionForSpeed(0), "idle");
  assert.equal(learnerMotionForSpeed(0.08), "idle");
  assert.equal(learnerMotionForSpeed(-0.5), "walk");

  const idle = { name: "preset:idle" };
  const walk = { name: "preset:walk" };
  assert.deepEqual(resolveLearnerClips([walk, idle]), { idle, walk });
  assert.deepEqual(resolveLearnerClips([]), { idle: null, walk: null });
});

test("learner skin sanitizer removes stray foot influence from upper-body vertices", () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 1.7, 0, 0, 0.3, 0], 3));
  geometry.setAttribute("skinIndex", new THREE.Uint8BufferAttribute([5, 51, 0, 0, 45, 1, 0, 0], 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute([0.74, 0.26, 0, 0, 0.8, 0.2, 0, 0], 4));
  const mesh = {
    isSkinnedMesh: true,
    geometry,
    skeleton: { bones: Array.from({ length: 52 }, (_, index) => ({ name: index === 51 ? "tripo1_Left_Limb_4" : `bone_${index}` })) }
  };
  const model = { traverse: (visit) => visit(mesh) };

  assert.equal(sanitizeLearnerSkinWeights(model), 1);
  assert.ok(Math.abs(geometry.getAttribute("skinWeight").getX(0) - 1) < 0.0001);
  assert.equal(geometry.getAttribute("skinWeight").getY(0), 0);
  assert.ok(Math.abs(geometry.getAttribute("skinWeight").getX(1) - 0.8) < 0.0001);
});

test("learner generation manifest matches every shipped source and output hash", () => {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf8"));
  const files = [manifest.source_image.sheet, ...manifest.views, manifest.output];

  for (const entry of files) {
    const file = new URL(entry.path, MANIFEST_FILE);
    const data = fs.readFileSync(file);
    assert.equal(createHash("sha256").update(data).digest("hex"), entry.sha256, entry.path);
    if (entry.bytes) assert.equal(data.byteLength, entry.bytes, entry.path);
  }
});
