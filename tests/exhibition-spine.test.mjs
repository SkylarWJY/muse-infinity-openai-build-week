import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EXHIBITION_SPINE, FINAL_SCENE } from "../src/config/exhibitionSpine.js";
import { resolveSceneQuality } from "../src/render/WorldLayer.js";

const EXPECTED_SCENES = [
  ["threshold-conservatory", "grand-conservatory-with-lush-gardens"],
  ["court-of-light", "elegant-floral-palace-interior"],
  ["water-and-light", "enchanted-water-garden-sanctuary"],
  ["sunset-frames", "dreamlike-coastal-villa-gardens"],
  ["burning-sky", "van-gogh-inspired-gallery-interior"],
  ["petal-transition", "sunlit-palace-gardens"],
  ["living-memory", "mexican-courtyard-bedroom-fantasy"],
  ["infinite-repetition", "yellow-polka-dot-infinity-room"]
];

test("canonical exhibition keeps eight ordered process worlds and one gated answer world", () => {
  assert.deepEqual(EXHIBITION_SPINE.map(({ id, worldId }) => [id, worldId]), EXPECTED_SCENES);
  assert.equal(FINAL_SCENE.id, "personal-dream-world");
  assert.equal(FINAL_SCENE.worldId, "fantasy-realm-of-shimmering-spheres");
  assert.equal(FINAL_SCENE.chapter, "09 / ANSWER");
  assert.equal(FINAL_SCENE.isFinal, true);
  assert.equal(EXHIBITION_SPINE.some((scene) => scene.id === FINAL_SCENE.id), false);
});

test("every canonical scene declares a deployable high-fidelity archive", () => {
  for (const scene of [...EXHIBITION_SPINE, FINAL_SCENE]) {
    for (const asset of scene.assets) {
      const path = fileURLToPath(new URL(`..${asset.path}`, import.meta.url));
      const stat = fs.lstatSync(path);
      assert.equal(stat.isSymbolicLink(), false, asset.path);
      assert.equal(stat.isFile(), true, asset.path);
      assert.equal(stat.size, asset.bytes, asset.path);
    }
  }
});

test("desktop scene quality restores the source-detail budget", () => {
  assert.deepEqual(resolveSceneQuality({ mobile: false, mode: "high" }), {
    devicePixelRatioCap: 2,
    enableLod: true,
    lod: true,
    lodSplatCount: 2_500_000,
    lodRenderScale: 1,
    lodScale: 2,
    pagedExtSplats: true,
    maxPagedSplats: 4_194_304,
    minSortIntervalMs: 80
  });
  const mobile = resolveSceneQuality({ mobile: true, mode: "high" });
  assert.equal(mobile.devicePixelRatioCap, 1.5);
  assert.ok(mobile.lodSplatCount >= 300_000);
  assert.equal(mobile.lodRenderScale, 1);
  assert.equal(mobile.pagedExtSplats, false);
  assert.ok(mobile.maxPagedSplats >= mobile.lodSplatCount);
});

test("answer-world meshes preserve 8K texture detail below GitHub's file limit", () => {
  const expected = new Map([
    ["/assets/worlds/yellow-infinity-room-texture-mesh.glb", 598_495],
    ["/assets/worlds/fantasy-shimmering-spheres-texture-mesh.glb", 593_231]
  ]);
  for (const [assetPath, triangleCount] of expected) {
    const path = fileURLToPath(new URL(`..${assetPath}`, import.meta.url));
    const bytes = fs.readFileSync(path);
    assert.ok(bytes.length < 100_000_000, `${assetPath} exceeds GitHub's regular file limit`);
    const { json, binaryOffset } = parseGlb(bytes);
    const primitive = json.meshes[0].primitives[0];
    assert.equal(json.accessors[primitive.indices].count / 3, triangleCount, assetPath);
    const image = json.images[0];
    assert.equal(image.mimeType, "image/jpeg", assetPath);
    const view = json.bufferViews[image.bufferView];
    const dimensions = jpegDimensions(bytes.subarray(
      binaryOffset + (view.byteOffset || 0),
      binaryOffset + (view.byteOffset || 0) + view.byteLength
    ));
    assert.deepEqual(dimensions, { width: 8192, height: 8192 }, assetPath);
  }
});

function parseGlb(bytes) {
  assert.equal(bytes.toString("ascii", 0, 4), "glTF");
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8").trimEnd());
  const binaryHeader = 20 + jsonLength;
  assert.equal(bytes.readUInt32LE(binaryHeader + 4), 0x004e4942);
  return { json, binaryOffset: binaryHeader + 8 };
}

function jpegDimensions(bytes) {
  assert.equal(bytes[0], 0xff);
  assert.equal(bytes[1], 0xd8);
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = bytes.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  throw new Error("jpeg_dimensions_not_found");
}
