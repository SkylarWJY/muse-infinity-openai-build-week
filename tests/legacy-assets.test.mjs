import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SpzReader } from "@sparkjsdev/spark";
import { ARCHIVED_WORLDS, COMPANIONS, getCompanion, getWorld, stopsForWorld } from "../src/config/legacyAssets.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const EXPECTED_WORLDS = [
  "grand-conservatory-with-lush-gardens",
  "elegant-floral-palace-interior",
  "enchanted-water-garden-sanctuary",
  "dreamlike-coastal-villa-gardens",
  "van-gogh-inspired-gallery-interior",
  "sunlit-palace-gardens",
  "mexican-courtyard-bedroom-fantasy",
  "yellow-polka-dot-infinity-room",
  "fantasy-realm-of-shimmering-spheres"
];

test("nine archived worlds preserve the canonical MUSE Infinity order and spatial profiles", () => {
  assert.deepEqual(ARCHIVED_WORLDS.map((world) => world.id), EXPECTED_WORLDS);
  for (const world of ARCHIVED_WORLDS) {
    assert.match(world.thumb, /^\/assets\/thumbs\/.+\.jpg$/);
    assert.match(world.collider, /^\/assets\/worlds\/.+-collider\.glb$/);
    assert.ok(Number.isFinite(world.transform.scale));
    assert.equal(world.transform.rotationX, 0, `${world.id} SPZ/mesh frame is already y-up`);
    assert.ok(Number.isFinite(world.profile.groundY));
    assert.ok(world.profile.bounds.minX < world.profile.bounds.maxX);
    assert.equal(stopsForWorld(world.id).length, 1);
    assert.equal(stopsForWorld(world.id)[0].id, world.sceneId);
    for (const url of [world.rad, world.splat, world.mesh, world.collider, world.thumb].filter(Boolean)) assertDeployable(url);
  }
  assert.deepEqual(getWorld(EXPECTED_WORLDS[0]).profile.spawn, { x: -2.72, z: -8.16 });
  assert.equal(getWorld(EXPECTED_WORLDS[0]).profile.cameraFar, 680);
  assert.deepEqual(getWorld(EXPECTED_WORLDS[8]).profile.spawn, { x: 0.216, z: 1.494 });
  assert.equal(getWorld("missing").id, EXPECTED_WORLDS[0]);
});

test("the infinity and answer worlds prefer archived 8K texture meshes", () => {
  const infinity = getWorld("yellow-polka-dot-infinity-room");
  assert.equal(infinity.render, "mesh");
  assert.equal(infinity.mesh, "/assets/worlds/yellow-infinity-room-texture-mesh.glb");
  assert.equal(infinity.splat, "/assets/worlds/yellow-infinity-room.spz");
  assert.deepEqual(infinity.profile.spawn, { x: -5.52, z: 1 });
  assert.equal(infinity.profile.cameraPitch, 0.2);
  assert.equal(infinity.profile.cameraDistance, 6.8);
  assert.equal(infinity.companionBoost, undefined);
  const answer = getWorld("fantasy-realm-of-shimmering-spheres");
  assert.equal(answer.render, "mesh");
  assert.equal(answer.mesh, "/assets/worlds/fantasy-shimmering-spheres-texture-mesh.glb");
  assert.equal(answer.splat, undefined);
});

test("process worlds deploy streamable quality RAD archives and preserve the scene-8 SPZ fallback", async () => {
  for (const world of ARCHIVED_WORLDS.slice(0, 7)) {
    assert.match(world.rad, /^\/assets\/worlds\/.+\.rad$/);
    const fileBytes = fs.readFileSync(path.join(ROOT, world.rad.slice(1)));
    assert.equal(fileBytes.readUInt32LE(0), 809_779_538, `${world.id} RAD magic`);
    assert.ok(fileBytes.length < 100_000_000, `${world.id} exceeds GitHub's regular file limit`);
  }
  for (const world of ARCHIVED_WORLDS.filter((item) => item.splat)) {
    const fileBytes = fs.readFileSync(path.join(ROOT, world.splat.slice(1)));
    const reader = new SpzReader({ fileBytes });
    await reader.parseHeader();
    assert.equal(reader.numSplats, world.sourceSplats, world.id);
    assert.equal(world.deployedSplats, world.sourceSplats, world.id);
    assert.equal(reader.flagLod, false, `${world.id} is the mesh fallback source archive`);
  }
});

test("all eight muse-infinity companions are selectable and deployable", () => {
  assert.equal(COMPANIONS.length, 8);
  for (const companion of COMPANIONS) {
    assert.match(companion.model, /^\/assets\/characters\/.+\.glb$/);
    assert.match(companion.portrait, /^\/assets\/portraits\/.+\.jpg$/);
    assertDeployable(companion.model);
    assertDeployable(companion.portrait);
    const portrait = fs.readFileSync(path.join(ROOT, companion.portrait.slice(1)));
    const dimensions = jpegDimensions(portrait);
    assert.ok(dimensions.height > dimensions.width * 1.15,
      `${companion.id} companion card must use a portrait crop, received ${dimensions.width}x${dimensions.height}`);
  }
  assert.equal(getCompanion("van-gogh").fullName, "Vincent van Gogh");
  assert.equal(getCompanion("yayoi-kusama").fullName, "Yayoi Kusama");
  assert.equal(getCompanion("missing"), null);
});

function assertDeployable(url) {
  const localPath = path.join(ROOT, url.slice(1));
  const stat = fs.lstatSync(localPath);
  assert.equal(stat.isSymbolicLink(), false, `asset must not be a symlink: ${url}`);
  assert.equal(stat.isFile(), true, `asset must be a file: ${url}`);
  assert.ok(stat.size > 1024, `asset is unexpectedly small: ${url}`);
}

function jpegDimensions(bytes) {
  assert.deepEqual([...bytes.subarray(0, 2)], [0xff, 0xd8]);
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
