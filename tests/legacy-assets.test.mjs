import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SpzReader } from "@sparkjsdev/spark";
import { ARCHIVED_WORLDS, COMPANIONS, getCompanion, getWorld, stopsForWorld } from "../src/config/legacyAssets.js";

const ROOT = path.resolve(import.meta.dirname, "..");

test("archived worlds are primary deployable MUSE assets with spatial profiles", () => {
  assert.equal(ARCHIVED_WORLDS.length, 3);
  assert.equal(ARCHIVED_WORLDS[0].id, "bright-gallery");
  for (const world of ARCHIVED_WORLDS) {
    assert.match(world.splat, /^\/assets\/worlds\/.+\.spz$/);
    assert.match(world.thumb, /^\/assets\/thumbs\/.+\.jpg$/);
    assert.ok(Number.isFinite(world.transform.scale));
    assert.ok(world.sourceSplats >= world.deployedSplats);
    assert.equal(world.deployedSplats, 500000);
    assert.ok(Number.isFinite(world.profile.groundY));
    assert.ok(world.profile.bounds.minX < world.profile.bounds.maxX);
    assert.equal(stopsForWorld(world.id).length, 3);
    for (const url of [world.splat, world.thumb]) assertDeployable(url);
  }
  assert.equal(getWorld("missing").id, "bright-gallery");
});

test("deployed SPZ headers match the archived asset manifest", async () => {
  for (const world of ARCHIVED_WORLDS) {
    const fileBytes = fs.readFileSync(path.join(ROOT, world.splat.slice(1)));
    const reader = new SpzReader({ fileBytes });
    await reader.parseHeader();
    assert.equal(reader.numSplats, world.deployedSplats, world.id);
    assert.equal(reader.flagLod, false, `${world.id} should build adaptive LOD at runtime`);
  }
});

test("five optimized muse-infinity characters are selectable and deployable", () => {
  assert.equal(COMPANIONS.length, 5);
  for (const companion of COMPANIONS) {
    assert.match(companion.model, /^\/assets\/characters\/.+\.glb$/);
    assert.match(companion.portrait, /^\/assets\/portraits\/.+\.jpg$/);
    assertDeployable(companion.model);
    assertDeployable(companion.portrait);
  }
  assert.equal(getCompanion("van-gogh").fullName, "Vincent van Gogh");
  assert.equal(getCompanion("missing"), null);
});

function assertDeployable(url) {
  const localPath = path.join(ROOT, url.slice(1));
  const stat = fs.lstatSync(localPath);
  assert.equal(stat.isSymbolicLink(), false, `asset must not be a symlink: ${url}`);
  assert.equal(stat.isFile(), true, `asset must be a file: ${url}`);
  assert.ok(stat.size > 1024, `asset is unexpectedly small: ${url}`);
}
