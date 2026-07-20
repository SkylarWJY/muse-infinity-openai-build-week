import test from "node:test";
import assert from "node:assert/strict";
import { createFallbackLesson, createFallbackSalon, createSessionDigest, resolveChoice, validateLessonPlan, validateSalon } from "../shared/contracts.js";

test("fallback lesson satisfies the strict runtime contract", () => {
  const plan = createFallbackLesson("Learn to notice spatial tension");
  const result = validateLessonPlan(plan);
  assert.equal(result.ok, true, result.errors?.join("\n"));
  assert.equal(new Set(plan.stops.map((stop) => stop.stop_id)).size, 3);
});

test("contract rejects model fields and unknown ids", () => {
  const plan = createFallbackLesson();
  plan.stops[0] = { ...plan.stops[0], stop_id: "invented-place", coordinates: [99, 0, 2] };
  const result = validateLessonPlan(plan);
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /unknown stop field|invalid stop id/);
});

test("first observation creates two different embodied routes", () => {
  const plan = createFallbackLesson();
  const quiet = resolveChoice(plan, "water-lilies", "quiet", ["water-lilies"]);
  const motion = resolveChoice(plan, "water-lilies", "motion", ["water-lilies"]);
  assert.equal(quiet.next_stop_id, "bedroom");
  assert.equal(motion.next_stop_id, "grande-jatte");
  assert.notEqual(quiet.effect, motion.effect);
});

test("session digest caps content and retains artwork evidence", () => {
  const digest = createSessionDigest({ learning_goal: "x".repeat(300), visits: Array.from({ length: 7 }, (_, index) => ({ stop_id: "bedroom", detail_id: "tilted-lines", answer: `answer-${index}`, effect: "focus" })) });
  assert.equal(digest.learning_goal.length, 120);
  assert.equal(digest.visits.length, 3);
  assert.equal(digest.visits[0].stop_id, "bedroom");
});

test("salon perspectives cannot cite evidence outside the session", () => {
  const digest = createSessionDigest({ visits: [{ stop_id: "bedroom", detail_id: "tilted-lines", answer: "angles", effect: "focus" }] });
  const valid = createFallbackSalon(digest);
  assert.equal(validateSalon(valid, digest).ok, true);
  valid.perspectives[0].evidence_stop_ids = ["water-lilies"];
  assert.equal(validateSalon(valid, digest).ok, false);
});
