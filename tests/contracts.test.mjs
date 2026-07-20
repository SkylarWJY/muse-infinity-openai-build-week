import test from "node:test";
import assert from "node:assert/strict";
import {
  PROCESS_SCENE_IDS,
  createFallbackLesson,
  createFallbackSalon,
  createFallbackTransformation,
  createSessionDigest,
  resolveChoice,
  validateLessonPlan,
  validateSalon,
  validateTransformation
} from "../shared/contracts.js";

function completedSession(companionIds = ["frida", "socrates"]) {
  const plan = createFallbackLesson("Learn to notice spatial tension");
  return {
    learning_goal: plan.learning_goal,
    companion_ids: companionIds,
    visits: plan.stops.map((stop) => ({
      stop_id: stop.stop_id,
      detail_id: stop.detail_id,
      answer: stop.choices[0].label,
      effect: stop.choices[0].effect
    }))
  };
}

test("fallback lesson satisfies the strict eight-chapter spine", () => {
  const plan = createFallbackLesson("Learn to notice spatial tension");
  const result = validateLessonPlan(plan);
  assert.equal(result.ok, true, result.errors?.join("\n"));
  assert.deepEqual(plan.stops.map((stop) => stop.stop_id), PROCESS_SCENE_IDS);
  assert.equal(plan.start_stop_id, PROCESS_SCENE_IDS[0]);
});

test("contract rejects model fields, unknown ids, reordered scenes and route skipping", () => {
  const unknown = createFallbackLesson();
  unknown.stops[0] = { ...unknown.stops[0], stop_id: "invented-place", coordinates: [99, 0, 2] };
  assert.equal(validateLessonPlan(unknown).ok, false);

  const reordered = createFallbackLesson();
  [reordered.stops[2], reordered.stops[3]] = [reordered.stops[3], reordered.stops[2]];
  assert.match(validateLessonPlan(reordered).errors.join(" "), /ordered stop required/);

  const skipping = createFallbackLesson();
  skipping.stops[0].choices[0].next_stop_id = PROCESS_SCENE_IDS[2];
  assert.match(validateLessonPlan(skipping).errors.join(" "), /canonical next stop/);
});

test("answers change interpretation but never bypass the next embodied world", () => {
  const plan = createFallbackLesson();
  const first = plan.stops[0];
  const a = resolveChoice(plan, first.stop_id, first.choices[0].value, [first.stop_id]);
  const b = resolveChoice(plan, first.stop_id, first.choices[1].value, [first.stop_id]);
  assert.equal(a.next_stop_id, PROCESS_SCENE_IDS[1]);
  assert.equal(b.next_stop_id, PROCESS_SCENE_IDS[1]);
  assert.notEqual(a.effect, b.effect);
});

test("session digest retains all eight scene observations and selected historical company", () => {
  const digest = createSessionDigest({
    ...completedSession(["frida", "socrates", "unknown", "frida"]),
    learning_goal: "x".repeat(300)
  });
  assert.equal(digest.learning_goal.length, 120);
  assert.deepEqual(digest.visits.map((visit) => visit.stop_id), PROCESS_SCENE_IDS);
  assert.deepEqual(digest.companion_ids, ["frida", "socrates"]);
});

test("final concept requires all eight scenes and exactly the selected companion perspectives", () => {
  const digest = createSessionDigest(completedSession());
  const valid = createFallbackSalon(digest);
  assert.equal(validateSalon(valid, digest).ok, true);
  assert.deepEqual(valid.evidence_scene_ids, PROCESS_SCENE_IDS);
  assert.deepEqual(valid.perspectives.map((item) => item.character_id), ["frida", "socrates"]);
  assert.match(valid.synthesis, /Curated demo/i);

  valid.perspectives[0].evidence_stop_ids = ["personal-dream-world"];
  assert.equal(validateSalon(valid, digest).ok, false);

  const incomplete = createSessionDigest({ ...completedSession(), visits: completedSession().visits.slice(0, 7) });
  assert.match(validateSalon(createFallbackSalon(incomplete), incomplete).errors.join(" "), /eight visited scenes/);
});

test("curated synthesis changes with the learner question and recorded observations", () => {
  const first = completedSession();
  const second = completedSession();
  second.learning_goal = "How can private memory become a shared form?";
  second.visits[2].answer = "A reflected doorway brightens beside the water";
  const firstConcept = createFallbackSalon(createSessionDigest(first));
  const secondConcept = createFallbackSalon(createSessionDigest(second));
  assert.notEqual(firstConcept.synthesis, secondConcept.synthesis);
  assert.notEqual(firstConcept.perspectives[0].stance, secondConcept.perspectives[0].stance);
  assert.match(secondConcept.synthesis, /reflected doorway bright/i);
  assert.match(secondConcept.synthesis, /private memory become a shared form/i);
});

test("the chosen contradiction materially rewrites and constrains the final concept", () => {
  const digest = createSessionDigest(completedSession());
  const perception = createFallbackSalon(digest, "perception");
  const emotion = createFallbackSalon(digest, "emotion");
  const invention = createFallbackSalon(digest, "invention");

  assert.equal(emotion.philosophy_axis, "emotion");
  assert.equal(invention.philosophy_axis, "invention");
  assert.notEqual(emotion.world_title, perception.world_title);
  assert.notEqual(invention.principle, perception.principle);
  assert.match(emotion.synthesis, /emotion/i);
  assert.match(invention.synthesis, /invention/i);
  assert.equal(validateSalon(emotion, digest, "emotion").ok, true);
  assert.match(validateSalon(perception, digest, "emotion").errors.join(" "), /chosen contradiction/);

  const transformedPerception = createFallbackTransformation(digest, "perception");
  for (const field of ["world_title", "synthesis", "principle", "visual_prompt"]) {
    assert.notEqual(transformedPerception[field], perception[field], field);
  }
  assert.equal(validateTransformation(transformedPerception, digest, "perception", perception).ok, true);
  assert.match(validateTransformation(perception, digest, "perception", perception).errors.join(" "), /transformation must change/);
});
