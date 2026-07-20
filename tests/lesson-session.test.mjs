import test from "node:test";
import assert from "node:assert/strict";
import { LessonSession } from "../src/domain/LessonSession.js";
import { createFallbackLesson } from "../shared/contracts.js";

test("lesson gates answers on arrival and completes three visits", () => {
  const session = new LessonSession();
  session.start(createFallbackLesson());
  assert.throws(() => session.answer("quiet"), /cannot_answer/);
  session.arrive();
  const first = session.answer("quiet");
  assert.equal(first.next_stop_id, "bedroom");
  assert.equal(session.continue().stop_id, "bedroom");
  session.arrive();
  session.answer("angle");
  assert.equal(session.continue().stop_id, "grande-jatte");
  session.arrive();
  session.answer("vision");
  assert.equal(session.continue(), null);
  assert.equal(session.phase, "complete");
  assert.equal(session.digest().visits.length, 3);
});

test("alternate observation changes the second embodied stop", () => {
  const quiet = new LessonSession();
  quiet.start(createFallbackLesson());
  quiet.arrive();
  quiet.answer("quiet");
  const motion = new LessonSession();
  motion.start(createFallbackLesson());
  motion.arrive();
  motion.answer("motion");
  assert.notEqual(quiet.continue().stop_id, motion.continue().stop_id);
});
