import test from "node:test";
import assert from "node:assert/strict";
import { PROCESS_SCENE_IDS, createFallbackSalon, createFallbackTransformation, createSessionDigest } from "../shared/contracts.js";
import { DEFAULT_COMPANIONS, JOURNEY_STAGES, JourneySession } from "../src/domain/JourneySession.js";

function completeConcept(companions) {
  return createFallbackSalon(createSessionDigest({
    companion_ids: companions,
    visits: PROCESS_SCENE_IDS.map((stop_id) => ({ stop_id, detail_id: "evidence", answer: "noticed", effect: "focus" }))
  }));
}

test("journey preserves all ten MUSE Infinity narrative stages behind named gates", () => {
  assert.deepEqual(JOURNEY_STAGES, [
    "threshold",
    "life_question",
    "companion_selection",
    "ai_curation",
    "world_exploration",
    "summoning",
    "roundtable",
    "decision",
    "world_transformation",
    "manifesto"
  ]);
  const journey = new JourneySession();
  assert.equal(journey.stage, "threshold");
  assert.deepEqual(journey.companions, DEFAULT_COMPANIONS);

  journey.crossThreshold();
  journey.setQuestion("What makes a life meaningful?");
  journey.setCompanions(["frida", "monet", "frida", "socrates"]);
  assert.deepEqual(journey.companions, ["frida", "monet", "socrates"]);
  assert.equal(journey.beginCuration(), "ai_curation");
  assert.equal(journey.acceptCuration(), "world_exploration");

  for (const sceneId of PROCESS_SCENE_IDS) journey.recordSceneVisit(sceneId);
  assert.equal(journey.beginSummoning(), "summoning");
  assert.equal(journey.openRoundtable(), "roundtable");
  assert.equal(journey.completeRoundtable(completeConcept(journey.companions)), "decision");
  assert.equal(journey.chooseContradiction("emotion"), "world_transformation");
  assert.throws(() => journey.completeTransformation(completeConcept(journey.companions)), /chosen contradiction/);
  const digest = createSessionDigest({
    companion_ids: journey.companions,
    visits: PROCESS_SCENE_IDS.map((stop_id) => ({ stop_id, detail_id: "evidence", answer: "noticed", effect: "focus" }))
  });
  const transformed = createFallbackTransformation(digest, "emotion");
  assert.equal(journey.completeTransformation(transformed), "manifesto");
  assert.equal(journey.finalConcept.philosophy_axis, "emotion");
  journey.publishManifesto("Attention is a practice, not a possession.");
  assert.equal(journey.enterFinalWorld().id, "personal-dream-world");
  assert.equal(journey.finalWorldEntered, true);
  assert.equal(journey.stage, "manifesto");
});

test("same-axis transformation cannot advance with the provisional concept unchanged", () => {
  const journey = new JourneySession();
  journey.crossThreshold();
  journey.setQuestion("How does attention change experience?");
  journey.setCompanions(["monet"]);
  journey.beginCuration();
  journey.acceptCuration();
  for (const sceneId of PROCESS_SCENE_IDS) journey.recordSceneVisit(sceneId);
  journey.beginSummoning();
  journey.openRoundtable();
  const provisional = completeConcept(journey.companions);
  journey.completeRoundtable(provisional);
  journey.chooseContradiction("perception");
  assert.throws(() => journey.completeTransformation(provisional), /transformation must change/);
  const transformed = createFallbackTransformation(createSessionDigest({
    companion_ids: journey.companions,
    visits: PROCESS_SCENE_IDS.map((stop_id) => ({ stop_id, detail_id: "evidence", answer: "noticed", effect: "focus" }))
  }), "perception");
  assert.equal(journey.completeTransformation(transformed), "manifesto");
});

test("journey cannot skip narrative beats, scenes, evidence or manifesto", () => {
  const journey = new JourneySession();
  assert.throws(() => journey.setQuestion("Why?"), /question_requires_life_question/);
  journey.crossThreshold();
  assert.throws(() => journey.setQuestion("  "), /question_required/);
  journey.setQuestion("How does attention change experience?");
  assert.throws(() => journey.setCompanions([]), /companions_required/);
  assert.throws(() => journey.setCompanions(["monet", "van-gogh", "socrates", "frida"]), /too_many_companions/);
  assert.throws(() => journey.setCompanions(["unknown"]), /unknown_companion/);
  journey.setCompanions(["monet"]);
  journey.beginCuration();
  journey.acceptCuration();
  assert.throws(() => journey.recordSceneVisit(PROCESS_SCENE_IDS[1]), /scene_out_of_order/);
  assert.throws(() => journey.beginSummoning(), /complete_eight_scenes_before_summoning/);
  assert.throws(() => journey.enterFinalWorld(), /final_world_requires_manifesto/);
});

test("preparing the answer world never commits entry before its archive is ready", () => {
  const journey = completeJourneyToManifesto();
  journey.publishManifesto("A world where attention changes both sides of the encounter.");

  const scene = journey.prepareFinalWorld();
  assert.equal(scene.id, "personal-dream-world");
  assert.equal(journey.stage, "manifesto");
  assert.equal(journey.finalWorldEntered, false);

  journey.enterFinalWorld();
  assert.equal(journey.finalWorldEntered, true);
});

function completeJourneyToManifesto() {
  const journey = new JourneySession();
  journey.crossThreshold();
  journey.setQuestion("How does attention change a world?");
  journey.setCompanions(["monet", "socrates"]);
  journey.beginCuration();
  journey.acceptCuration();
  for (const id of PROCESS_SCENE_IDS) journey.recordSceneVisit(id);
  journey.beginSummoning();
  journey.openRoundtable();
  const digest = {
    companion_ids: journey.companions,
    visits: PROCESS_SCENE_IDS.map((stop_id) => ({ stop_id, detail_id: "recorded", answer: "recorded", effect: "stillness" }))
  };
  const provisional = createFallbackSalon(digest);
  journey.completeRoundtable(provisional);
  journey.chooseContradiction("emotion");
  journey.completeTransformation(createFallbackTransformation(digest, "emotion"));
  return journey;
}
