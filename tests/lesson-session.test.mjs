import test from "node:test";
import assert from "node:assert/strict";
import { PROCESS_SCENE_IDS, createFallbackLesson } from "../shared/contracts.js";
import { LessonSession } from "../src/domain/LessonSession.js";

test("lesson gates answers on physical arrival and completes all eight process worlds", () => {
  const session = new LessonSession();
  const plan = createFallbackLesson();
  session.start(plan);
  assert.throws(() => session.answer(plan.stops[0].choices[0].value), /cannot_answer/);

  for (const [index, stop] of plan.stops.entries()) {
    assert.equal(session.currentStopId, PROCESS_SCENE_IDS[index]);
    session.arrive();
    const answer = session.answer(stop.choices[0].value);
    assert.equal(answer.next_stop_id, PROCESS_SCENE_IDS[index + 1] || null);
    const next = session.continue();
    assert.equal(next?.stop_id || null, PROCESS_SCENE_IDS[index + 1] || null);
  }

  assert.equal(session.phase, "complete");
  assert.deepEqual(session.digest().visits.map((visit) => visit.stop_id), PROCESS_SCENE_IDS);
});

test("an invalidated question can retry the same physical arrival without recording evidence", () => {
  const session = new LessonSession();
  session.start(createFallbackLesson());
  session.arrive();

  const stop = session.retryArrival();
  assert.equal(session.phase, "walking");
  assert.equal(stop.stop_id, PROCESS_SCENE_IDS[0]);
  assert.deepEqual(session.visits, []);
  assert.throws(() => session.retryArrival(), /cannot_retry_arrival_from_walking/);
});

test("interpretive answers differ without changing the canonical world order", () => {
  const plan = createFallbackLesson();
  const first = plan.stops[0];
  const sessions = first.choices.slice(0, 2).map((choice) => {
    const session = new LessonSession();
    session.start(plan);
    session.arrive();
    session.answer(choice.value);
    return session;
  });
  assert.equal(sessions[0].continue().stop_id, PROCESS_SCENE_IDS[1]);
  assert.equal(sessions[1].continue().stop_id, PROCESS_SCENE_IDS[1]);
  assert.notEqual(sessions[0].visits[0].effect, sessions[1].visits[0].effect);
});

test("a free observation becomes grounded evidence without changing the route", () => {
  const session = new LessonSession();
  session.start(createFallbackLesson());
  session.arrive();
  assert.throws(() => session.answerObservation("   "), /observation_required/);
  const observation = session.answerObservation("  The reflected doorway seems brighter when I step beside the water.  ");
  assert.equal(observation.label, "The reflected doorway seems brighter when I step beside the water.");
  assert.equal(observation.next_stop_id, PROCESS_SCENE_IDS[1]);
  assert.equal(session.visits[0].answer, observation.label);
  assert.equal(session.digest().visits[0].answer, observation.label);
  assert.equal(session.continue().stop_id, PROCESS_SCENE_IDS[1]);
});
