import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { getCompanion } from "../src/config/legacyAssets.js";
import { ArchivedAvatar } from "../src/render/ArchivedAvatar.js";
import {
  MuseumEngine,
  resolveCompanionMetrics,
  resolveGroundedPartyFormation,
  resolveGroundedPartyFormations,
  resolvePartyFormation,
  resolvePreferredPartyFormations
} from "../src/render/MuseumEngine.js";

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

test("grounded party formation rejects decorative height layers and contracts toward continuous terrain", () => {
  const samples = [];
  const target = resolveGroundedPartyFormation(
    { x: 0, y: 0.1, z: 0 },
    0,
    0,
    { minX: -5, maxX: 5, minZ: -5, maxZ: 5 },
    (x, z, referenceY, maxDelta) => {
      samples.push({ x, z, referenceY, maxDelta });
      if (x < -0.75) return null;
      return 0.18;
    }
  );

  assert.ok(samples.length > 1);
  assert.ok(target.x > -0.9, "an unsafe nominal slot should contract toward the visitor");
  assert.equal(target.y, 0.18);
  assert.ok(Math.abs(target.y - 0.1) <= 0.35);
  assert.equal(target.yaw, 0);
});

test("flat terrain resolves a separated pair without exhaustively sampling every candidate", () => {
  let samples = 0;
  const targets = resolveGroundedPartyFormations(
    { x: 0, y: 0, z: 0 },
    0,
    { minX: -5, maxX: 5, minZ: -5, maxZ: 5 },
    () => { samples += 1; return 0; },
    2
  );

  assert.equal(targets.length, 2);
  assert.ok(Math.hypot(targets[0].x - targets[1].x, targets[0].z - targets[1].z) >= 0.65);
  assert.ok(samples <= 20, `flat terrain used ${samples} ground samples`);
});

test("preferred party patterns are rejected when their footprints or paths lose support", () => {
  const centers = new Set(["-0.900:-0.650", "0.900:-0.650"]);
  const preferred = resolvePreferredPartyFormations(
    { x: 0, y: 0, z: 0 },
    0,
    { minX: -5, maxX: 5, minZ: -5, maxZ: 5 },
    (x, z) => centers.has(`${x.toFixed(3)}:${z.toFixed(3)}`) ? 0 : null,
    [{ factor: 1, angleOffset: 0 }, { factor: 1, angleOffset: 0 }]
  );

  assert.equal(preferred, null);
});

test("preferred party patterns validate their footprints and paths with bounded samples", () => {
  let samples = 0;
  const preferred = resolvePreferredPartyFormations(
    { x: 0, y: 0, z: 0 },
    0,
    { minX: -5, maxX: 5, minZ: -5, maxZ: 5 },
    () => { samples += 1; return 0; },
    [{ factor: 1, angleOffset: 0 }, { factor: 1, angleOffset: 0 }]
  );

  assert.equal(preferred.length, 2);
  assert.ok(samples > 2, "the cached formation must validate more than its center points");
  assert.ok(samples <= 20, `preferred formation used ${samples} ground samples`);
});

test("the runtime party cache rejects center-only support near a terrain edge", () => {
  const engine = Object.create(MuseumEngine.prototype);
  engine.activeWorld = {
    id: "edge-world",
    sceneId: "edge-world",
    profile: { bounds: { minX: -5, maxX: 5, minZ: -5, maxZ: 5 } }
  };
  engine.player = { group: new THREE.Group() };
  engine.player.group.position.set(0, 0, 0);
  const actors = [new THREE.Group(), new THREE.Group()];
  actors[0].position.set(-2, 0, -2);
  actors[1].position.set(2, 0, -2);
  engine.partyActors = actors.map((group) => ({ group }));
  engine.partyFormationCache = {
    key: "stale",
    worldId: "edge-world",
    slotCount: 2,
    patterns: [{ factor: 1, angleOffset: 0 }, { factor: 1, angleOffset: 0 }]
  };
  const centerOnly = new Set(["-0.900:-0.650", "0.900:-0.650"]);
  engine.worldLayer = {
    walkableGroundHeightAt: (x, z) => centerOnly.has(`${x.toFixed(3)}:${z.toFixed(3)}`) ? 0 : null
  };

  const targets = engine.groundedPartyTargets();
  assert.deepEqual(targets.map(({ x, y, z }) => [x, y, z]), [
    [-2, 0, -2],
    [2, 0, -2]
  ]);
});

test("impossible terrain returns no party formation instead of overlapping the visitor", () => {
  const targets = resolveGroundedPartyFormations(
    { x: 0, y: 0, z: 0 },
    0,
    { minX: -5, maxX: 5, minZ: -5, maxZ: 5 },
    () => null,
    2
  );
  assert.deepEqual(targets, []);
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

test("the primary guide keeps its current terrain layer while moving", () => {
  const references = [];
  const engine = Object.create(MuseumEngine.prototype);
  engine.guide = { group: new THREE.Group() };
  engine.guide.group.position.set(2, 1, 3);
  engine.worldLayer = {
    groundHeightAt: () => 8,
    walkableGroundHeightAt: (x, z, referenceY, maxDelta) => {
      references.push({ x, z, referenceY, maxDelta });
      return references.length === 1 ? 1.12 : null;
    }
  };

  engine.updateGuideGround();
  assert.equal(engine.guide.group.position.y, 1.12);
  const previous = engine.guide.group.position.clone();
  engine.guide.group.position.set(4, 1.12, 5);
  engine.updateGuideGround(previous);
  assert.deepEqual(engine.guide.group.position.toArray(), previous.toArray(), "an unsupported step must roll back horizontal movement");
  assert.deepEqual(references, [
    { x: 2, z: 3, referenceY: 1, maxDelta: 0.35 },
    { x: 4, z: 5, referenceY: 1.12, maxDelta: 0.35 }
  ]);
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
