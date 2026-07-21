import test from "node:test";
import assert from "node:assert/strict";
import { SceneTourSession } from "../src/domain/SceneTourSession.js";

const COMPANIONS = ["frida", "monet", "socrates"];
const STATIONS = ["work-one", "work-two", "work-three", "work-four"];

function startTour(overrides = {}) {
  const tour = new SceneTourSession();
  tour.start({
    sceneId: "garden-of-attention",
    stations: STATIONS,
    companionIds: COMPANIONS,
    ...overrides
  });
  return tour;
}

function evidenceFor(tour, stationNumber) {
  return {
    visitorObservation: `Observation at station ${stationNumber}.`,
    visitorQuestion: `What changes at station ${stationNumber}?`,
    perspectives: tour.speakerOrder.map((companionId) => ({
      companionId,
      text: `${companionId} perspective at station ${stationNumber}.`
    }))
  };
}

test("a scene tour guides three required artworks and rotates independent companion leads", () => {
  const tour = startTour();
  const token = tour.token;

  assert.equal(tour.phase, "scene-walking");
  assert.equal(tour.requiredStationCount, 3);
  assert.equal(tour.focusedArtworkId, null);

  tour.arriveScene(token);
  for (let index = 0; index < 3; index += 1) {
    assert.equal(tour.phase, "station-walking");
    assert.equal(tour.stationIndex, index);
    assert.equal(tour.focusedArtworkId, STATIONS[index]);
    assert.equal(tour.leadCompanionId, COMPANIONS[index]);
    assert.deepEqual(tour.speakerOrder, [
      COMPANIONS[index],
      COMPANIONS[(index + 1) % COMPANIONS.length],
      COMPANIONS[(index + 2) % COMPANIONS.length]
    ]);

    tour.arriveStation(token);
    assert.equal(tour.phase, "station-ready");
    tour.beginDiscussion(token);
    assert.equal(tour.phase, "discussing");
    const evidence = evidenceFor(tour, index + 1);
    tour.recordStationEvidence(evidence, token);
    assert.equal(tour.phase, "station-reflecting");
    assert.deepEqual(tour.stationEvidence[index], {
      artworkId: STATIONS[index],
      ...evidence
    });
    tour.continue(token);
  }

  assert.equal(tour.phase, "scene-reflection");
  assert.equal(tour.focusedArtworkId, null);
  assert.equal(tour.stationEvidence.length, 3);
  assert.deepEqual(tour.stationEvidence.map(({ artworkId }) => artworkId), STATIONS.slice(0, 3));

  const reflection = tour.completeScene(
    "Across the three works, attention shifted from surface detail to shared responsibility.",
    token
  );
  assert.equal(tour.phase, "complete");
  assert.equal(tour.sceneReflection, reflection);
});

test("a four-artwork scene keeps the fourth optional unless explicitly required", () => {
  const optionalFourth = startTour();
  optionalFourth.arriveScene();
  for (let index = 0; index < 3; index += 1) {
    optionalFourth.arriveStation();
    optionalFourth.beginDiscussion();
    optionalFourth.recordStationEvidence(evidenceFor(optionalFourth, index + 1));
    optionalFourth.continue();
  }
  assert.equal(optionalFourth.phase, "scene-reflection");
  assert.equal(optionalFourth.stationEvidence.some(({ artworkId }) => artworkId === STATIONS[3]), false);

  const requiredFourth = startTour({ requiredStationCount: 4 });
  requiredFourth.arriveScene();
  for (let index = 0; index < 4; index += 1) {
    assert.equal(requiredFourth.focusedArtworkId, STATIONS[index]);
    requiredFourth.arriveStation();
    requiredFourth.beginDiscussion();
    requiredFourth.recordStationEvidence(evidenceFor(requiredFourth, index + 1));
    requiredFourth.continue();
  }
  assert.equal(requiredFourth.phase, "scene-reflection");
  assert.equal(requiredFourth.stationEvidence.length, 4);
});

test("scene tour rejects invalid configuration, skipped phases, and incomplete evidence", () => {
  const tour = new SceneTourSession();
  assert.throws(() => tour.start({
    sceneId: "garden",
    stations: STATIONS.slice(0, 2),
    companionIds: COMPANIONS
  }), /scene_tour_requires_three_or_four_stations/);
  assert.throws(() => tour.start({
    sceneId: "garden",
    stations: [STATIONS[0], STATIONS[0], STATIONS[2]],
    companionIds: COMPANIONS
  }), /duplicate_station_artwork/);
  assert.throws(() => tour.start({
    sceneId: "garden",
    stations: STATIONS.slice(0, 3),
    companionIds: []
  }), /scene_tour_requires_companions/);

  tour.start({ sceneId: "garden", stations: STATIONS.slice(0, 3), companionIds: COMPANIONS });
  assert.throws(() => tour.arriveStation(), /cannot_arrive_station_from_scene-walking/);
  tour.arriveScene();
  assert.throws(() => tour.beginDiscussion(), /cannot_begin_discussion_from_station-walking/);
  tour.arriveStation();
  tour.beginDiscussion();
  assert.throws(() => tour.recordStationEvidence({
    visitorObservation: "I noticed the edge.",
    visitorQuestion: "Why does it recede?",
    perspectives: []
  }), /perspectives_must_follow_speaker_order/);
  assert.throws(() => tour.recordStationEvidence({
    visitorObservation: "I noticed the edge.",
    visitorQuestion: "Why does it recede?",
    perspectives: [...tour.speakerOrder].reverse().map((companionId) => ({ companionId, text: "A view." }))
  }), /perspectives_must_follow_speaker_order/);
  assert.equal(tour.phase, "discussing");
  assert.deepEqual(tour.stationEvidence, []);
  assert.throws(() => tour.completeScene("Premature."), /cannot_complete_scene_from_discussing/);
});

test("scene changes and resets invalidate stale asynchronous results", () => {
  const tour = startTour();
  const staleToken = tour.token;
  tour.arriveScene(staleToken);
  tour.arriveStation(staleToken);
  tour.beginDiscussion(staleToken);

  tour.start({
    sceneId: "archive-of-memory",
    stations: ["archive-one", "archive-two", "archive-three"],
    companionIds: COMPANIONS
  });
  assert.notEqual(tour.token, staleToken);
  assert.throws(() => tour.recordStationEvidence({
    visitorObservation: "A late response from the old scene.",
    visitorQuestion: "Should this be ignored?",
    perspectives: COMPANIONS.map((companionId) => ({ companionId, text: "Stale." }))
  }, staleToken), /stale_scene_tour_token/);
  assert.equal(tour.sceneId, "archive-of-memory");
  assert.equal(tour.phase, "scene-walking");
  assert.deepEqual(tour.stationEvidence, []);

  const secondToken = tour.token;
  tour.reset();
  assert.notEqual(tour.token, secondToken);
  assert.throws(() => tour.arriveScene(secondToken), /stale_scene_tour_token/);
  assert.equal(tour.phase, "idle");
});

test("skipped stations resolve the scene without fabricating evidence", () => {
  const tour = startTour();
  tour.arriveScene();

  tour.skipStation();
  assert.equal(tour.phase, "station-reflecting");
  assert.deepEqual(tour.skippedStationIds, [STATIONS[0]]);
  assert.deepEqual(tour.stationEvidence, []);
  assert.deepEqual(tour.metrics, {
    required: 3,
    explored: 0,
    skipped: 1,
    resolved: 1,
    remaining: 2
  });

  tour.continue();
  tour.arriveStation();
  tour.beginDiscussion();
  tour.recordStationEvidence(evidenceFor(tour, 2));
  tour.continue();
  tour.arriveStation();
  tour.beginDiscussion();
  tour.skipStation();
  tour.continue();

  assert.equal(tour.phase, "scene-reflection");
  assert.deepEqual(tour.skippedStationIds, [STATIONS[0], STATIONS[2]]);
  assert.equal(tour.stationEvidence.length, 1);
  assert.deepEqual(tour.metrics, {
    required: 3,
    explored: 1,
    skipped: 2,
    resolved: 3,
    remaining: 0
  });
});

test("the domain can resolve an all-skipped tour while leaving the evidence gate to the caller", () => {
  const tour = startTour();
  tour.arriveScene();
  for (let index = 0; index < 3; index += 1) {
    tour.skipStation();
    tour.continue();
  }

  assert.equal(tour.phase, "scene-reflection");
  assert.equal(tour.stationEvidence.length, 0);
  assert.deepEqual(tour.skippedStationIds, STATIONS.slice(0, 3));
  assert.equal(tour.metrics.resolved, 3);
});
