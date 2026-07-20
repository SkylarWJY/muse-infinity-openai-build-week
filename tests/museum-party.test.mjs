import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { getCompanion } from "../src/config/legacyAssets.js";
import { ArchivedAvatar } from "../src/render/ArchivedAvatar.js";
import { MuseumEngine, resolveCompanionMetrics, resolvePartyFormation } from "../src/render/MuseumEngine.js";

test("party formation keeps the second and third companions in stable left and right slots", () => {
  const player = { x: 4, z: 2 };
  const left = resolvePartyFormation(player, 0, 0);
  const right = resolvePartyFormation(player, 0, 1);

  assert.deepEqual(left, { x: 3.1, z: 2 - 0.65, yaw: 0 });
  assert.deepEqual(right, { x: 4.9, z: 2 - 0.65, yaw: 0 });

  const turnedLeft = resolvePartyFormation(player, Math.PI / 2, 0);
  const turnedRight = resolvePartyFormation(player, Math.PI / 2, 1);
  assert.ok(turnedLeft.z > player.z);
  assert.ok(turnedRight.z < player.z);
  assert.equal(turnedLeft.x, turnedRight.x);
});

test("party formation clamps followers inside the active world bounds", () => {
  const bounds = { minX: -2, maxX: 2, minZ: -3, maxZ: 3 };
  const target = resolvePartyFormation({ x: -1.9, z: -2.9 }, 0, 0, bounds);
  assert.equal(target.x, -1.65);
  assert.equal(target.z, -2.65);
  assert.throws(() => resolvePartyFormation({}, 0, 2), /unknown_party_slot/);
});

test("companion metrics count only the visible party and list every loaded archive", () => {
  const actor = (id, { ready = true, visible = true } = {}) => ({
    companion: { id },
    ready,
    group: { visible }
  });
  const guide = actor("monet");
  const partyActors = [actor("frida"), actor("socrates", { ready: false })];
  const salonActors = [actor("monet"), actor("frida"), actor("socrates")];

  assert.deepEqual(resolveCompanionMetrics({ guide, partyActors, salonActors }), {
    actors: 4,
    archivedCompanion: "monet",
    archivedCompanions: ["monet", "frida"]
  });
  guide.group.visible = false;
  for (const actor of partyActors) actor.group.visible = false;
  assert.deepEqual(resolveCompanionMetrics({ guide, partyActors, salonActors, salonVisible: true }), {
    actors: 4,
    archivedCompanion: "monet",
    archivedCompanions: ["monet", "frida", "socrates"]
  });
  assert.deepEqual(resolveCompanionMetrics(), {
    actors: 1,
    archivedCompanion: null,
    archivedCompanions: []
  });
});

test("party followers walk toward formation, follow collider height, then idle in place", () => {
  const motion = [];
  const follower = {
    group: new THREE.Group(),
    setMotion: (speed, gesture) => motion.push({ speed, gesture })
  };
  follower.group.position.set(-5, 0, -5);

  const engine = Object.create(MuseumEngine.prototype);
  engine.salonVisible = false;
  engine.activeWorld = { profile: { groundY: 0, bounds: { minX: -20, maxX: 20, minZ: -20, maxZ: 20 } } };
  engine.player = { group: new THREE.Group() };
  engine.player.group.position.set(0, 0, 0);
  engine.player.group.rotation.y = 0;
  engine.partyActors = [follower];
  engine.worldLayer = { groundHeightAt: () => 1.75 };

  engine.updateParty(0.1);
  assert.ok(follower.group.position.x > -5);
  assert.ok(follower.group.position.z > -5);
  assert.equal(follower.group.position.y, 1.75);
  assert.ok(motion.at(-1).speed > 0);
  assert.equal(motion.at(-1).gesture, "open");

  engine.placePartyAtFormation(true);
  engine.updateParty(0.1);
  assert.equal(follower.group.position.y, 1.75);
  assert.equal(motion.at(-1).speed, 0);
});

test("salon staging can hide and restore the permanent party without duplicate visible actors", () => {
  const stopped = [];
  const engine = Object.create(MuseumEngine.prototype);
  engine.guide = { group: new THREE.Group() };
  engine.partyActors = [0, 1].map((index) => ({
    group: new THREE.Group(),
    setMotion: (speed, gesture) => stopped.push({ index, speed, gesture })
  }));

  engine.setPermanentPartyVisible(false);
  assert.equal(engine.guide.group.visible, false);
  assert.ok(engine.partyActors.every((actor) => actor.group.visible === false));
  assert.deepEqual(stopped, [
    { index: 0, speed: 0, gesture: "open" },
    { index: 1, speed: 0, gesture: "open" }
  ]);

  engine.setPermanentPartyVisible(true);
  assert.equal(engine.guide.group.visible, true);
  assert.ok(engine.partyActors.every((actor) => actor.group.visible === true));
});

test("setCompanions keeps an unchanged guide while the latest follower roster wins a load race", async () => {
  const originalLoad = ArchivedAvatar.prototype.load;
  const pendingLoads = [];
  ArchivedAvatar.prototype.load = function loadDeferred() {
    return new Promise((resolve) => pendingLoads.push({ actor: this, resolve: () => resolve(this) }));
  };

  const engine = Object.create(MuseumEngine.prototype);
  const guide = new ArchivedAvatar({ companion: getCompanion("monet") });
  const retiredFollower = new ArchivedAvatar({ companion: getCompanion("van-gogh") });
  engine.scene = new THREE.Scene();
  engine.scene.add(guide.group, retiredFollower.group);
  engine.guide = guide;
  engine.partyActors = [retiredFollower];
  engine.salonActors = [];
  engine.salonVisible = false;
  engine.salonToken = 0;
  engine.companionToken = 0;
  engine.companionIds = ["monet", "van-gogh"];
  engine.director = { setAvatar: () => assert.fail("the unchanged primary guide must not be replaced") };
  engine.player = { group: new THREE.Group() };
  engine.activeWorld = { profile: { groundY: 0, bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 } } };
  engine.worldLayer = { groundHeightAt: () => 0 };
  engine.onCompanionStatus = () => {};

  try {
    const first = engine.setCompanions(["monet", "frida"]);
    const staleFollower = engine.partyActors[0];
    const second = engine.setCompanions(["monet", "socrates"]);
    const currentFollower = engine.partyActors[0];

    assert.strictEqual(engine.guide, guide);
    assert.equal(retiredFollower.disposed, true);
    assert.equal(staleFollower.disposed, true);
    assert.equal(staleFollower.group.parent, null);
    assert.equal(currentFollower.companion.id, "socrates");

    for (const pending of pendingLoads) pending.resolve();
    await Promise.all([first, second]);

    assert.strictEqual(engine.guide, guide);
    assert.deepEqual(engine.partyActors.map((actor) => actor.companion.id), ["socrates"]);
    assert.equal(currentFollower.disposed, false);
    assert.strictEqual(currentFollower.group.parent, engine.scene);
  } finally {
    ArchivedAvatar.prototype.load = originalLoad;
    engine.retireActors(engine.partyActors);
    engine.retireActors([guide]);
  }
});
