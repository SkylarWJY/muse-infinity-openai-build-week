import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { getCompanion } from "../src/config/legacyAssets.js";
import { WORLDS } from "../src/config/scenes.js";
import { ArchivedAvatar } from "../src/render/ArchivedAvatar.js";
import { GuideDirector } from "../src/render/GuideDirector.js";
import {
  MuseumEngine,
  resolveArtworkPartyStages,
  resolveCompanionMetrics,
  resolveGroundedPartyFormation,
  resolveGroundedPartyFormations,
  resolvePartyFormation,
  resolvePreferredPartyFormations
} from "../src/render/MuseumEngine.js";

test("artwork staging gives every companion an independent grounded slot around the work", () => {
  const pose = {
    guideAnchor: [0, 0.1, 0],
    lookAt: [0, 1.58, -3]
  };
  const order = ["frida", "monet", "socrates"];
  const stages = resolveArtworkPartyStages(
    pose,
    order,
    () => 0.12,
    { minX: -5, maxX: 5, minZ: -5, maxZ: 5 }
  );

  assert.deepEqual(stages.map(({ companionId }) => companionId), order);
  assert.deepEqual(stages.map(({ sequenceIndex }) => sequenceIndex), [0, 1, 2]);
  assert.deepEqual(stages.map(({ y }) => y), [0.12, 0.12, 0.12]);
  assert.ok(Math.abs(stages[0].x) < 0.001 && Math.abs(stages[0].z) < 0.001,
    "the lead speaker should own the central evidence position");
  assert.ok(stages[1].x * stages[2].x < 0, "listeners should stage on opposite sides");
  for (let left = 0; left < stages.length; left += 1) {
    for (let right = left + 1; right < stages.length; right += 1) {
      assert.ok(Math.hypot(stages[left].x - stages[right].x, stages[left].z - stages[right].z) >= 0.7);
    }
  }
  assert.ok(stages.every(({ x, z, yaw }) => {
    const facing = { x: Math.sin(yaw), z: Math.cos(yaw) };
    const distance = Math.hypot(-x, -3 - z);
    const towardArtwork = { x: -x / distance, z: (-3 - z) / distance };
    return facing.x * towardArtwork.x + facing.z * towardArtwork.z > 0.999;
  }), "all companions should face the artwork rather than the visitor");
});

test("artwork staging rotates the active speaker without changing the spatial contract", () => {
  const pose = { guideAnchor: [2, 0, 4], lookAt: [5, 1.5, 4] };
  const first = resolveArtworkPartyStages(pose, ["a", "b", "c"], () => 0);
  const second = resolveArtworkPartyStages(pose, ["b", "c", "a"], () => 0);

  assert.deepEqual(first.map(({ companionId }) => companionId), ["a", "b", "c"]);
  assert.deepEqual(second.map(({ companionId }) => companionId), ["b", "c", "a"]);
  assert.deepEqual(
    first.map(({ x, z, sequenceIndex }) => [x, z, sequenceIndex]),
    second.map(({ x, z, sequenceIndex }) => [x, z, sequenceIndex])
  );
});

test("artwork staging rejects unsupported endpoints instead of falling back to a decorative height", () => {
  assert.throws(() => resolveArtworkPartyStages(
    { guideAnchor: [0, 0.2, 0], lookAt: [0, 1.5, -3] },
    ["frida", "monet", "socrates"],
    () => null,
    { minX: -5, maxX: 5, minZ: -5, maxZ: 5 }
  ), /artwork_party_stage_unavailable/);
});

test("company artwork navigation hands off on arrival and gates asking on the visitor", () => {
  const calls = [];
  const events = [];
  const actor = (id) => ({ companion: { id }, group: new THREE.Group(), setMotion() {} });
  const actors = [actor("monet"), actor("frida"), actor("socrates")];
  const directors = new Map(actors.map((entry) => [entry.companion.id, {
    avatar: entry,
    object: entry.group,
    state: "idle",
    goTo(target) {
      this.state = "walking";
      calls.push({ companionId: entry.companion.id, target });
    },
    update() {},
    correspondence() {
      return this.state === "asking"
        ? { distance: 0, facingError: 0, synced: true }
        : { distance: 1, facingError: 45, synced: false };
    }
  }]));
  const engine = Object.create(MuseumEngine.prototype);
  engine.elapsed = 4;
  engine.companyTourToken = 0;
  engine.guide = actors[0];
  engine.partyActors = actors.slice(1);
  engine.companyDirectors = directors;
  engine.director = directors.get("monet");
  engine.player = { group: new THREE.Group() };
  engine.player.group.position.set(8, 0, 8);
  engine.onMetrics = () => {};
  engine.onGuideState = (event) => events.push(event);
  engine.activeWorld = { profile: { bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 } } };
  engine.worldLayer = {
    artworkPose: (id) => id === "work-two" ? {
      id,
      guideAnchor: [0, 0, 0],
      lookAt: [0, 1.5, -3],
      artwork: { id }
    } : null,
    walkableGroundHeightAt: () => 0,
    resolveHorizontalMove: (from, desired) => desired.clone(),
    highlight: (id) => calls.push({ highlight: id })
  };

  const context = engine.navigateCompanyToArtwork("work-two", ["frida", "socrates", "monet"]);
  assert.equal(context.speakerId, "frida");
  assert.strictEqual(engine.director, directors.get("frida"));
  assert.deepEqual(calls.filter(({ companionId }) => companionId).map(({ companionId }) => companionId), ["frida"]);

  directors.get("frida").state = "arriving";
  engine.handleCompanyDirectorState("frida", { state: "arriving", stopId: "work-two" });
  assert.deepEqual(calls.filter(({ companionId }) => companionId).map(({ companionId }) => companionId), ["frida", "socrates"]);
  directors.get("socrates").state = "arriving";
  engine.handleCompanyDirectorState("socrates", { state: "arriving", stopId: "work-two" });
  assert.deepEqual(calls.filter(({ companionId }) => companionId).map(({ companionId }) => companionId), ["frida", "socrates", "monet"]);
  assert.equal(new Set(calls.filter(({ companionId }) => companionId).map(({ target }) => target.guideAnchor.join(","))).size, 3);

  for (const companionId of ["frida", "socrates", "monet"]) {
    directors.get(companionId).state = "asking";
    engine.handleCompanyDirectorState(companionId, { state: "asking", stopId: "work-two" });
  }
  assert.equal(events.some(({ state }) => state === "asking"), false, "the companions must not open a remote discussion");

  engine.player.group.position.set(context.stages[0].x, 0, context.stages[0].z + 1.8);
  engine.updateCompanyTour(0);
  const asking = events.filter(({ state }) => state === "asking");
  assert.equal(asking.length, 1);
  assert.equal(asking[0].companyReady, true);
  assert.equal(asking[0].visitorReady, true);
  assert.deepEqual(asking[0].memberStates, { frida: "asking", socrates: "asking", monet: "asking" });
  engine.updateCompanyTour(0);
  assert.equal(events.filter(({ state }) => state === "asking").length, 1, "business arrival must publish exactly once");
});

test("an intermediate safe waypoint stays with the same actor before handoff", () => {
  const calls = [];
  const director = (companionId) => ({
    state: "idle",
    goTo(target) {
      this.state = "walking";
      calls.push({ companionId, target: [...target.guideAnchor] });
    },
    correspondence: () => ({ distance: 0, facingError: 0, synced: true })
  });
  const engine = Object.create(MuseumEngine.prototype);
  engine.companyTourToken = 4;
  engine.activeSpeakerId = "a";
  engine.companyDirectors = new Map([["a", director("a")], ["b", director("b")]]);
  engine.director = engine.companyDirectors.get("a");
  engine.onMetrics = () => {};
  engine.onGuideState = () => {};
  engine.companyTour = {
    token: 4,
    artworkId: "work",
    speakerOrder: ["a", "b"],
    stages: [
      { companionId: "a", route: [[1, 0, 0], [2, 0, 0]], guideAnchor: [2, 0, 0], lookAt: [2, 1, -2] },
      { companionId: "b", route: [[3, 0, 0]], guideAnchor: [3, 0, 0], lookAt: [2, 1, -2] }
    ],
    launched: new Set(),
    ready: new Set(),
    routeProgress: new Map(),
    memberStates: new Map([["a", "pending"], ["b", "pending"]]),
    businessEventPublished: false
  };

  engine.launchCompanyMember(engine.companyTour, 0);
  assert.deepEqual(calls, [{ companionId: "a", target: [1, 0, 0] }]);
  engine.handleCompanyDirectorState("a", { state: "arriving", stopId: "work" });
  assert.deepEqual(calls, [
    { companionId: "a", target: [1, 0, 0] },
    { companionId: "a", target: [2, 0, 0] }
  ]);
  engine.handleCompanyDirectorState("a", { state: "arriving", stopId: "work" });
  assert.deepEqual(calls.at(-1), { companionId: "b", target: [3, 0, 0] });
});

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
  engine.companyTourToken = 7;
  engine.companyTour = { token: 7, launched: new Set(["monet"]) };
  engine.activeStopId = "old-artwork";
  engine.activeSpeakerId = "monet";
  engine.worldTransitioning = false;
  engine.companionIds = ["monet", "van-gogh"];
  engine.director = new GuideDirector({ avatar: guide });
  engine.director.goTo({ id: "old-artwork", guideAnchor: [2, 0, 2], lookAt: [2, 1, 0] });
  engine.companyDirectors = new Map([
    ["monet", engine.director],
    ["van-gogh", new GuideDirector({ avatar: retiredFollower })]
  ]);
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
    assert.equal(currentFollower.group.visible, false, "a new procedural fallback stays hidden while its archive loads");
    assert.equal(engine.companyTour, null);
    assert.equal(engine.activeStopId, null);
    assert.deepEqual([...engine.companyDirectors.keys()], ["monet", "socrates"]);
    assert.ok([...engine.companyDirectors.values()].every((director) => director.state === "idle"));

    for (const pending of pendingLoads) pending.resolve();
    await Promise.all([first, second]);

    assert.strictEqual(engine.guide, guide);
    assert.deepEqual(engine.partyActors.map((actor) => actor.companion.id), ["socrates"]);
    assert.equal(currentFollower.disposed, false);
    assert.strictEqual(currentFollower.group.parent, engine.scene);
    assert.equal(currentFollower.group.visible, true, "only the latest settled roster becomes visible");
  } finally {
    ArchivedAvatar.prototype.load = originalLoad;
    engine.retireActors(engine.partyActors);
    engine.retireActors([guide]);
  }
});

test("new permanent and salon avatar batches stay hidden until their current loads settle", async () => {
  const originalLoad = ArchivedAvatar.prototype.load;
  const pendingLoads = [];
  ArchivedAvatar.prototype.load = function loadDeferred() {
    return new Promise((resolve) => pendingLoads.push({ actor: this, resolve: () => resolve(this) }));
  };
  const oldGuide = { group: new THREE.Group(), setMotion() {}, dispose() { this.disposed = true; } };
  const engine = Object.create(MuseumEngine.prototype);
  Object.assign(engine, {
    scene: new THREE.Scene(),
    guide: oldGuide,
    partyActors: [],
    salonActors: [],
    salonVisible: false,
    salonToken: 0,
    companionToken: 0,
    companyTourToken: 0,
    companyTour: null,
    activeStopId: null,
    activeSpeakerId: "mira",
    worldTransitioning: false,
    companionIds: [],
    player: { group: new THREE.Group() },
    activeWorld: { profile: { yaw: 0, groundY: 0, bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 } } },
    worldLayer: { groundHeightAt: () => 0, walkableGroundHeightAt: () => 0 },
    onCompanionStatus() {},
    placePartyAtFormation() {}
  });
  engine.scene.add(oldGuide.group);
  engine.director = new GuideDirector({ avatar: oldGuide });
  engine.companyDirectors = new Map([["mira", engine.director]]);

  try {
    const permanent = engine.setCompanions(["monet", "frida"]);
    const permanentActors = [engine.guide, ...engine.partyActors];
    assert.ok(permanentActors.every((actor) => actor.group.visible === false));
    pendingLoads.splice(0).forEach(({ resolve }) => resolve());
    await permanent;
    assert.ok(permanentActors.every((actor) => actor.group.visible === true));

    const salon = engine.showSalonCharacters(true);
    const salonActors = [...engine.salonActors];
    assert.equal(salonActors.length, 2);
    assert.ok(salonActors.every((actor) => actor.group.visible === false));
    let duplicateSettled = false;
    const duplicateSalon = engine.showSalonCharacters(true).then(() => { duplicateSettled = true; });
    await Promise.resolve();
    assert.equal(duplicateSettled, false, "a duplicate salon request must share the in-flight batch");
    pendingLoads.splice(0).forEach(({ resolve }) => resolve());
    await Promise.all([salon, duplicateSalon]);
    assert.ok(salonActors.every((actor) => actor.group.visible === true));
    assert.ok(permanentActors.every((actor) => actor.group.visible === false));
  } finally {
    ArchivedAvatar.prototype.load = originalLoad;
    engine.retireActors(engine.salonActors);
    engine.retireActors(engine.partyActors);
    engine.retireActors([engine.guide]);
  }
});

test("a repeated selection waits for its shared in-flight lead before revealing the latest roster", async () => {
  const originalLoad = ArchivedAvatar.prototype.load;
  const pendingLoads = [];
  ArchivedAvatar.prototype.load = function loadDeferred() {
    return new Promise((resolve) => pendingLoads.push({ actor: this, resolve: () => resolve(this) }));
  };
  const oldGuide = { group: new THREE.Group(), setMotion() {}, dispose() {} };
  const engine = Object.create(MuseumEngine.prototype);
  Object.assign(engine, {
    scene: new THREE.Scene(), guide: oldGuide, partyActors: [], salonActors: [], salonVisible: false,
    salonToken: 0, companionToken: 0, companyTourToken: 0, companyTour: null,
    activeStopId: null, activeSpeakerId: "mira", worldTransitioning: false, companionIds: [],
    player: { group: new THREE.Group() },
    activeWorld: { profile: { groundY: 0, bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 } } },
    worldLayer: { groundHeightAt: () => 0 }, onCompanionStatus() {}, placePartyAtFormation() {}
  });
  engine.scene.add(oldGuide.group);
  engine.director = new GuideDirector({ avatar: oldGuide });
  engine.companyDirectors = new Map([["mira", engine.director]]);

  try {
    const first = engine.setCompanions(["monet"]);
    const lead = engine.guide;
    const second = engine.setCompanions(["monet", "frida"]);
    const follower = engine.partyActors[0];
    let secondSettled = false;
    second.then(() => { secondSettled = true; });
    pendingLoads.find(({ actor }) => actor === follower).resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(secondSettled, false);
    assert.equal(lead.group.visible, false);
    assert.equal(follower.group.visible, false);
    pendingLoads.find(({ actor }) => actor === lead).resolve();
    await Promise.all([first, second]);
    assert.equal(lead.group.visible, true);
    assert.equal(follower.group.visible, true);
  } finally {
    ArchivedAvatar.prototype.load = originalLoad;
    engine.retireActors(engine.partyActors);
    engine.retireActors([engine.guide]);
  }
});

test("company visitor readiness is live and speaker gestures never interrupt walking actors", () => {
  const calls = [];
  const actor = (id) => ({
    companion: { id },
    group: new THREE.Group(),
    setMotion: (speed, gesture) => calls.push({ id, speed, gesture })
  });
  const actors = [actor("monet"), actor("frida"), actor("socrates")];
  const directors = new Map(actors.map((entry, index) => [entry.companion.id, {
    avatar: entry,
    state: index === 2 ? "walking" : "asking"
  }]));
  const engine = Object.create(MuseumEngine.prototype);
  engine.player = { group: new THREE.Group() };
  engine.player.group.position.set(1, 0, 1);
  engine.companyDirectors = directors;
  engine.companyTour = {
    stages: [{ x: 0, y: 0, z: 0 }],
    memberStates: new Map([["monet", "asking"], ["frida", "asking"], ["socrates", "walking"]])
  };

  assert.ok(Math.abs(engine.companyVisitorDistance() - Math.SQRT2) < 0.0001);
  assert.equal(engine.isVisitorReadyForCompany(), true);
  engine.player.group.position.set(5, 0, 0);
  assert.equal(engine.isVisitorReadyForCompany(), false, "walking away after arrival must close the visitor gate");

  assert.equal(engine.setCompanySpeaker("frida", true), true);
  assert.deepEqual(calls, [
    { id: "monet", speed: 0, gesture: "open" },
    { id: "frida", speed: 0, gesture: "point" }
  ]);
  calls.length = 0;
  assert.equal(engine.setCompanySpeaker("frida", false), true);
  assert.deepEqual(calls, [
    { id: "monet", speed: 0, gesture: "open" },
    { id: "frida", speed: 0, gesture: "open" }
  ]);
});

test("init waits for the world, learner, and initial companion assets", async () => {
  const world = deferred();
  const learner = deferred();
  const companions = deferred();
  const engine = Object.create(MuseumEngine.prototype);
  engine.ready = false;
  engine.animate = () => {};
  engine.setWorld = () => world.promise;
  engine.player = { load: () => learner.promise };
  engine.companionIds = ["monet", "frida", "socrates"];
  engine.setCompanions = () => companions.promise;

  let settled = false;
  const pending = engine.init().then((value) => {
    settled = true;
    return value;
  });
  world.resolve({ id: "ready-world" });
  learner.resolve({ ready: true });
  await Promise.resolve();
  assert.equal(settled, false);
  companions.resolve({ ready: true });
  assert.deepEqual(await pending, { id: "ready-world" });
  assert.equal(engine.ready, true);
});

test("setWorld does not hold navigation for optional ambient asset upgrades", async () => {
  const world = WORLDS[0];
  const guide = { companion: { id: "monet" }, group: new THREE.Group(), setMotion() {} };
  const director = new GuideDirector({ avatar: guide });
  director.goTo({ id: "old-artwork", guideAnchor: [3, 0, 3], lookAt: [0, 1, 0] });
  const engine = Object.create(MuseumEngine.prototype);
  engine.worldToken = 0;
  engine.worldTransitioning = false;
  engine.companyTourToken = 2;
  engine.companyTour = { token: 2 };
  engine.activeStopId = "old-artwork";
  engine.activeSpeakerId = "monet";
  engine.guide = guide;
  engine.director = director;
  engine.companyDirectors = new Map([["monet", director]]);
  engine.activeWorld = world;
  engine.showSalonCharacters = async () => {};
  engine.applyWorldProfile = (next) => { engine.activeWorld = next; };
  engine.worldLayer = {
    build: async () => true,
    isLive: (worldId) => worldId === world.id
  };
  let ambientSet = false;
  let ambientReadyChecks = 0;
  engine.ambient = {
    clear() {},
    setWorld(sceneId) { ambientSet = sceneId === world.sceneId; },
    whenReady() {
      ambientReadyChecks += 1;
      return new Promise(() => {});
    }
  };

  const activeWorld = await Promise.race([
    engine.setWorld(world.id),
    new Promise((resolve) => setTimeout(() => resolve("ambient_upgrade_blocked_world"), 10))
  ]);
  assert.strictEqual(activeWorld, world);
  assert.equal(ambientSet, true);
  assert.equal(ambientReadyChecks, 0);
  assert.equal(engine.companyTour, null);
  assert.equal(engine.activeStopId, null);
  assert.equal(director.state, "idle");
  assert.equal(director.paused, false);
  assert.equal(engine.worldTransitioning, false);
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
