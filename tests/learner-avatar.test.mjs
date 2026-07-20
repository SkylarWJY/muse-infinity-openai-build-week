import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { LEARNER_ASSET, learnerMotionForSpeed, resolveLearnerClips } from "../src/render/LearnerAvatar.js";

const LEARNER_FILE = new URL(`..${LEARNER_ASSET}`, import.meta.url);
const MANIFEST_FILE = new URL("../assets/generated/learner-v2/manifest.json", import.meta.url);
const QA_REPORT_FILE = new URL("../assets/generated/learner-v2/qa-report.json", import.meta.url);

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
