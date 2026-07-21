import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { ARCHIVED_WORLDS } from "../src/config/legacyAssets.js";
import { artworksForScene } from "../src/config/sceneCollections.js";
import {
  WorldLayer,
  resolveArtworkFramePalette,
  resolveSceneBackdrop
} from "../src/render/WorldLayer.js";

const FRAME_FAMILIES = new Set(["warm-wood", "aged-brass", "warm-white", "sage", "plum"]);

test("all nine worlds receive deterministic, coordinated, non-neon artwork frames", () => {
  assert.equal(ARCHIVED_WORLDS.length, 9);
  const worldSignatures = new Set();
  const usedFamilies = new Set();

  for (const world of ARCHIVED_WORLDS) {
    const artworks = artworksForScene(world.sceneId);
    const palettes = artworks.map((artwork, index) => {
      const palette = resolveArtworkFramePalette(world, index, artwork.id);
      assert.deepEqual(palette, resolveArtworkFramePalette(world, index, artwork.id), `${world.sceneId}:${artwork.id}`);
      assert.equal(FRAME_FAMILIES.has(palette.family), true, `${world.sceneId}:${palette.family}`);
      usedFamilies.add(palette.family);

      for (const key of ["frameColor", "matColor", "activeColor"]) {
        assertValidDisplayColor(palette[key], `${world.sceneId}:${artwork.id}:${key}`);
        const hsl = displayHsl(palette[key]);
        assert.ok(hsl.s <= 0.461, `${world.sceneId}:${artwork.id}:${key} is too saturated (${hsl.s})`);
      }

      const frameHsl = displayHsl(palette.frameColor);
      const matHsl = displayHsl(palette.matColor);
      assert.ok(matHsl.l - frameHsl.l >= 0.179,
        `${world.sceneId}:${artwork.id} matte does not separate from its frame`);
      return palette;
    });

    assert.ok(new Set(palettes.map((palette) => palette.frameColor)).size >= 2,
      `${world.sceneId} should have controlled variation instead of one repeated frame`);
    worldSignatures.add(palettes.map((palette) => palette.frameColor).join(":"));
  }

  assert.equal(worldSignatures.size, ARCHIVED_WORLDS.length, "each world should have a distinct frame treatment");
  assert.deepEqual(usedFamilies, FRAME_FAMILIES, "the collection should use every curated material family");
});

test("archive reveals use a restrained scene-derived backdrop instead of flashing black", () => {
  const scene = new THREE.Scene();
  const layer = new WorldLayer(scene, { textureLoader: { loadAsync: async () => null } });
  const signatures = new Set();

  for (const world of ARCHIVED_WORLDS) {
    const backdrop = resolveSceneBackdrop(world);
    assert.equal(backdrop, resolveSceneBackdrop(world), `${world.sceneId} backdrop must be deterministic`);
    assertValidDisplayColor(backdrop, `${world.sceneId}:backdrop`);
    const hsl = displayHsl(backdrop);
    assert.ok(hsl.l >= 0.139, `${world.sceneId} backdrop is too close to black (${hsl.l})`);
    assert.ok(hsl.s <= 0.231, `${world.sceneId} backdrop is too saturated (${hsl.s})`);

    layer.activeWorld = world;
    layer.revealArchive();
    assert.equal(scene.background.getHex(THREE.SRGBColorSpace), backdrop, `${world.sceneId} reveal backdrop`);
    signatures.add(backdrop);
  }

  assert.ok(signatures.size >= 6, "backdrops should follow the worlds rather than use one global color");
});

test("artwork highlights return to their own frame finish without using raw world accents", async () => {
  const source = ARCHIVED_WORLDS.find((world) => world.sceneId === "infinite-repetition");
  const world = { ...source, rad: null, splat: null, mesh: null, collider: null };
  const layer = new WorldLayer(new THREE.Scene(), { textureLoader: { loadAsync: async () => null } });
  layer.activeWorld = world;
  await layer.buildArtworks(world, layer.buildToken);
  const records = [...layer.artworks.values()].sort((left, right) => left.index - right.index);

  assert.equal(records.length, 4);
  for (const record of records) {
    assert.equal(record.border.material.isMeshStandardMaterial, true);
    assert.equal(record.mat.material.isMeshStandardMaterial, true);
    assert.equal(record.border.material.color.getHex(THREE.SRGBColorSpace), record.palette.frameColor);
    assert.notEqual(record.palette.activeColor, world.palette.accent);
  }

  layer.highlight(records[0].key);
  assert.equal(records[0].border.material.color.getHex(THREE.SRGBColorSpace), records[0].palette.activeColor);
  layer.highlight("not-an-artwork");
  for (const record of records) {
    assert.equal(record.border.material.color.getHex(THREE.SRGBColorSpace), record.palette.frameColor);
  }
  await layer.clear();
});

function assertValidDisplayColor(color, label) {
  assert.equal(Number.isInteger(color), true, `${label} is not an integer color`);
  assert.ok(color >= 0 && color <= 0xffffff, `${label} is outside RGB range`);
  const channels = [(color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff];
  assert.ok(channels.reduce((sum, channel) => sum + channel, 0) >= 90, `${label} is effectively black`);
}

function displayHsl(color) {
  const hsl = {};
  new THREE.Color(color).getHSL(hsl, THREE.SRGBColorSpace);
  return hsl;
}
