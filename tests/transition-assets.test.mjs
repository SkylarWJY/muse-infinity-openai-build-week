import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_EXHIBITION_SCENES } from "../src/config/exhibitionSpine.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("all nine transition posters use the inherited high-resolution scene assets", async () => {
  assert.equal(ALL_EXHIBITION_SCENES.length, 9);
  const paths = new Set();

  for (const scene of ALL_EXHIBITION_SCENES) {
    assert.match(scene.image, /^\/assets\/scenes\/.+\.png$/);
    assert.notEqual(scene.image, scene.thumbnail);
    paths.add(scene.image);
    const buffer = await readFile(path.join(ROOT, scene.image.slice(1)));
    assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG", `${scene.id} poster format`);
    assert.equal(buffer.readUInt32BE(16), 1672, `${scene.id} poster width`);
    assert.equal(buffer.readUInt32BE(20), 941, `${scene.id} poster height`);
  }

  assert.equal(paths.size, 9);
});
