import test from "node:test";
import assert from "node:assert/strict";
import { createFallbackLesson } from "../shared/contracts.js";
import { LessonSession } from "../src/domain/LessonSession.js";
import { SceneTourSession } from "../src/domain/SceneTourSession.js";

const COMPANIONS = ["monet", "van-gogh", "socrates"];

test("three artwork stations complete before one scene reflection enters the eight-scene digest", () => {
  const lesson = new LessonSession();
  const tour = new SceneTourSession();
  const plan = createFallbackLesson("How does attention change across works?");
  lesson.start(plan);

  for (const [sceneIndex, stop] of plan.stops.entries()) {
    const visitsBeforeScene = lesson.visits.length;
    const token = tour.start({
      sceneId: stop.stop_id,
      stations: stop.stations.map((station) => station.artwork_id),
      companionIds: COMPANIONS
    });
    tour.arriveScene(token);

    for (let stationIndex = 0; stationIndex < 3; stationIndex += 1) {
      const station = stop.stations[stationIndex];
      assert.equal(tour.focusedArtworkId, station.artwork_id);
      assert.deepEqual(tour.speakerOrder, rotate(COMPANIONS, stationIndex));
      tour.arriveStation(token);
      tour.beginDiscussion(token);
      tour.recordStationEvidence({
        visitorObservation: station.choices[0].label,
        visitorQuestion: station.focus_question,
        perspectives: tour.speakerOrder.map((companionId) => ({
          companionId,
          text: `${companionId}: ${station.choices[0].stance}`
        }))
      }, token);

      assert.equal(lesson.phase, "walking");
      assert.equal(lesson.visits.length, visitsBeforeScene);
      tour.continue(token);
    }

    assert.equal(tour.phase, "scene-reflection");
    assert.equal(tour.stationEvidence.length, 3);
    assert.equal(lesson.visits.length, visitsBeforeScene);

    lesson.arrive();
    const sceneChoice = lesson.answer(stop.choices[0].value);
    tour.completeScene(sceneChoice.label, token);
    assert.equal(lesson.visits.length, visitsBeforeScene + 1);
    assert.equal(lesson.visits.at(-1).stop_id, stop.stop_id);
    assert.equal(tour.phase, "complete");

    const next = lesson.continue();
    assert.equal(next?.stop_id || null, plan.stops[sceneIndex + 1]?.stop_id || null);
  }

  assert.equal(lesson.phase, "complete");
  assert.equal(lesson.digest({ companion_ids: COMPANIONS }).visits.length, 8);
});

function rotate(values, offset) {
  return values.map((_, index) => values[(index + offset) % values.length]);
}
