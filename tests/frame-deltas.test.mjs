import test from "node:test";
import assert from "node:assert/strict";
import { frameDeltas } from "../src/render/MuseumEngine.js";

test("frame deltas preserve real timing while bounding visual and navigation steps", () => {
  assert.deepEqual(frameDeltas(1 / 60), {
    raw: 1 / 60,
    visual: 1 / 60,
    movement: 1 / 60,
    navigation: 1 / 60
  });
  assert.deepEqual(frameDeltas(0.8), {
    raw: 0.8,
    visual: 0.05,
    movement: 0.1,
    navigation: 0.25
  });
});

test("frame deltas reject invalid clock values", () => {
  assert.deepEqual(frameDeltas(Number.NaN), { raw: 0, visual: 0, movement: 0, navigation: 0 });
  assert.deepEqual(frameDeltas(-1), { raw: 0, visual: 0, movement: 0, navigation: 0 });
});
