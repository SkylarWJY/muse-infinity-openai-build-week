import test from "node:test";
import assert from "node:assert/strict";
import {
  AI_INTERPRETIVE_LENSES,
  HISTORICAL_COMPANIONS,
  LESSON_CONTRACT_VERSION,
  LESSON_JSON_SCHEMA,
  PROCESS_SCENE_IDS,
  SCENE_MANIFEST,
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
  assert.equal(plan.contract_version, LESSON_CONTRACT_VERSION);
  assert.equal(LESSON_CONTRACT_VERSION, "3.0");
  for (const stop of plan.stops) {
    const manifestStop = SCENE_MANIFEST.stops.find((item) => item.stop_id === stop.stop_id);
    assert.equal(stop.stations.length, 3, stop.stop_id);
    assert.equal(stop.choices.length, 3, `${stop.stop_id}: scene reflection choices`);
    assert.equal(new Set(stop.stations.map((station) => station.choices[0].value)).size, 3, `${stop.stop_id}: station progression`);
    assert.deepEqual(
      stop.stations.map((station) => station.artwork_id),
      manifestStop.artworks.slice(0, 3).map((artwork) => artwork.artwork_id),
      stop.stop_id
    );
    for (const station of stop.stations) {
      assert.ok(station.station_id.startsWith(`${stop.stop_id}:`));
      assert.ok(station.focus_question.length > 40);
      assert.equal("lead_companion_id" in station, false);
      assert.equal(station.choices.length, 3);
      assert.equal(new Set(station.choices.map((choice) => choice.value)).size, 3);
      for (const choice of station.choices) {
        assert.ok(choice.label);
        assert.ok(choice.stance.length > 30);
        assert.ok(choice.evidence_prompt.length > 30);
        assert.ok(choice.effect);
      }
    }
  }
});

test("fallback prompts carry the learner's original question through every scene and station", () => {
  const question = "How can uncertainty become a form of attention?";
  const plan = createFallbackLesson(question);

  assert.equal(plan.learning_goal, question);
  assert.ok(plan.stops.every((stop) => stop.prompt.includes(question)));
  assert.ok(plan.stops.flatMap((stop) => stop.stations)
    .every((station) => station.focus_question.includes(question)));
});

test("scene manifest exposes four canonical artworks with bounded catalog facts", () => {
  for (const stop of SCENE_MANIFEST.stops) {
    assert.equal(stop.artworks.length, 4, stop.stop_id);
    assert.equal(new Set(stop.artworks.map((artwork) => artwork.artwork_id)).size, 4);
    for (const artwork of stop.artworks) {
      assert.match(artwork.artwork_id, /^aic-\d+$/);
      assert.ok(artwork.title && artwork.artist && artwork.date);
      assert.equal(artwork.visual_facts.length, 3);
      for (const fact of artwork.visual_facts) {
        assert.ok(fact.id.startsWith(`${artwork.artwork_id}:catalog-`));
        assert.equal(fact.kind, "catalog_metadata");
        assert.ok(fact.text.length <= 240);
      }
    }
  }
});

test("legacy v2 lesson shape upgrades to v3 stations without changing scene reflection fields", () => {
  const current = createFallbackLesson("Keep the old scene summary behavior");
  const legacy = {
    ...current,
    contract_version: "2.0",
    stops: current.stops.map(({ stations: _stations, ...stop }) => ({ ...stop, choices: stop.choices.slice(0, 2) }))
  };
  const result = validateLessonPlan(legacy);

  assert.equal(result.ok, true, result.errors?.join("\n"));
  assert.equal(result.value.contract_version, "3.0");
  assert.equal(result.value.stops[0].stations.length, 3);
  assert.deepEqual(result.value.stops[0].choices, legacy.stops[0].choices);
  assert.equal(resolveChoice(result.value, PROCESS_SCENE_IDS[0], legacy.stops[0].choices[0].value).next_stop_id, PROCESS_SCENE_IDS[1]);
});

test("early v3 lead assignments remain readable but are removed from the executable contract", () => {
  const earlyV3 = createFallbackLesson("Read an early v3 plan");
  for (const stop of earlyV3.stops) {
    for (const station of stop.stations) station.lead_companion_id = "frida";
  }
  const result = validateLessonPlan(earlyV3);

  assert.equal(result.ok, true, result.errors?.join("\n"));
  assert.ok(result.value.stops.every((stop) => stop.stations.every((station) => !("lead_companion_id" in station))));
  const stationSchema = LESSON_JSON_SCHEMA.properties.stops.items.properties.stations.items;
  assert.equal(stationSchema.required.includes("lead_companion_id"), false);
  assert.equal("lead_companion_id" in stationSchema.properties, false);
});

test("accepted live station aliases normalize to the canonical 24 evidence keys", () => {
  const live = createFallbackLesson("Normalize model-generated station aliases");
  for (const [sceneIndex, stop] of live.stops.entries()) {
    stop.stations.forEach((station, stationIndex) => {
      station.station_id = `${stop.stop_id}:model-${sceneIndex + 1}-${stationIndex + 1}`;
    });
  }
  const result = validateLessonPlan(live);
  assert.equal(result.ok, true, result.errors?.join("\n"));
  assert.deepEqual(
    result.value.stops.flatMap((stop) => stop.stations.map((station) => station.station_id)),
    PROCESS_SCENE_IDS.flatMap((sceneId) => [1, 2, 3].map((index) => `${sceneId}:station-${index}`))
  );

  const firstSourceStation = live.stops[0].stations[0];
  const digest = createSessionDigest({
    ...completedSession(),
    station_evidence: [{
      scene_id: live.stops[0].stop_id,
      station_id: firstSourceStation.station_id,
      artwork_id: firstSourceStation.artwork_id,
      visitor_question: firstSourceStation.focus_question,
      choice: firstSourceStation.choices[0]
    }]
  });
  assert.equal(digest.station_evidence.length, 1);
  assert.equal(digest.station_evidence[0].station_id, `${live.stops[0].stop_id}:station-1`);
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

  const inventedArtwork = createFallbackLesson();
  inventedArtwork.stops[0].stations[0].artwork_id = "invented-artwork";
  assert.match(validateLessonPlan(inventedArtwork).errors.join(" "), /canonical artwork/);

  const shallowStation = createFallbackLesson();
  shallowStation.stops[0].stations[0].choices.pop();
  assert.match(validateLessonPlan(shallowStation).errors.join(" "), /exactly three station choices/);
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

test("session digest retains all eight scene observations and selected AI interpretive lenses", () => {
  const digest = createSessionDigest({
    ...completedSession(["frida", "socrates", "unknown", "frida"]),
    learning_goal: "x".repeat(300)
  });
  assert.equal(digest.learning_goal.length, 120);
  assert.deepEqual(digest.visits.map((visit) => visit.stop_id), PROCESS_SCENE_IDS);
  assert.deepEqual(digest.companion_ids, ["frida", "socrates"]);
  assert.deepEqual(digest.station_evidence, []);
});

test("the living-artist compatibility id resolves only to a non-person lens", () => {
  assert.equal(HISTORICAL_COMPANIONS, AI_INTERPRETIVE_LENSES);
  const infinityLens = AI_INTERPRETIVE_LENSES.find((item) => item.id === "yayoi-kusama");
  assert.deepEqual(infinityLens, {
    id: "yayoi-kusama",
    name: "Infinity & Repetition Lens",
    lens: "Repetition can dissolve the boundary of the self."
  });
  assert.doesNotMatch(`${infinityLens.name} ${infinityLens.lens}`, /Yayoi|KUSAMA/iu);
  assert.equal(SCENE_MANIFEST.stops.at(-1).artist, "Infinity & Repetition Lens");
  assert.equal(SCENE_MANIFEST.stops.at(-1).guide, "Infinity & Repetition Lens");
  assert.doesNotMatch(createFallbackLesson().stops.at(-1).guide_line, /Yayoi|KUSAMA/iu);
});

test("session digest retains 24 canonical station records without treating selected stances as observations", () => {
  const plan = createFallbackLesson("Keep inquiry distinct from observation");
  const stationEvidence = plan.stops.flatMap((stop) => {
    const manifestStop = SCENE_MANIFEST.stops.find((item) => item.stop_id === stop.stop_id);
    return stop.stations.map((station, stationIndex) => {
      const choice = station.choices[0];
      return {
        scene_id: stop.stop_id,
        station_id: station.station_id,
        artwork_id: station.artwork_id,
        focus_question: station.focus_question,
        visitor_observation: choice.label,
        choice,
        evidence_fact_ids: [
          "forged:catalog-title",
          manifestStop.artworks[stationIndex].visual_facts[0].id,
          manifestStop.artworks[stationIndex].visual_facts[2].id
        ],
        perspectives: [
          { speaker_id: "frida", text: `Frida inquiry for ${station.artwork_id}` },
          { speaker_id: "unknown", text: "Forged speaker" },
          { speaker_id: "monet", text: "Not in the selected company" }
        ]
      };
    });
  }).reverse();
  stationEvidence.push({
    ...stationEvidence[0],
    scene_id: PROCESS_SCENE_IDS[0],
    station_id: "forged:station",
    artwork_id: "forged-artwork"
  });

  const digest = createSessionDigest({
    ...completedSession(["frida", "socrates"]),
    station_evidence: stationEvidence
  });

  assert.equal(digest.station_evidence.length, 24);
  assert.deepEqual(digest.station_evidence.map((item) => [item.scene_order, item.station_order]),
    Array.from({ length: 24 }, (_, index) => [Math.floor(index / 3) + 1, (index % 3) + 1]));
  assert.equal(digest.station_evidence[0].scene_id, PROCESS_SCENE_IDS[0]);
  assert.equal(digest.station_evidence[0].visitor_observation, "");
  assert.equal(digest.station_evidence[0].inquiry, plan.stops[0].stations[0].choices[0].evidence_prompt);
  assert.equal(digest.station_evidence[0].evidence_kind, "inquiry");
  assert.ok(digest.station_evidence.every((item) => item.evidence_fact_ids.every((id) => id.startsWith(`${item.artwork_id}:catalog-`))));
  assert.ok(digest.station_evidence.every((item) => item.perspectives.every((perspective) => perspective.companion_id === "frida")));
  assert.match(createFallbackSalon(digest).synthesis, /No visitor-authored visual observation was recorded/i);
});

test("station digest keeps an explicit observation attributed and separate from its inquiry", () => {
  const plan = createFallbackLesson();
  const station = plan.stops[0].stations[0];
  const digest = createSessionDigest({
    ...completedSession(),
    stationEvidence: [{
      stationId: station.station_id,
      artworkId: station.artwork_id,
      visitorObservation: "The reflected edge changes as I move.",
      visitorQuestion: "Does the edge belong to the image or my position?",
      choice: { ...station.choices[0], value: "free-observation" }
    }]
  });

  assert.equal(digest.station_evidence[0].visitor_observation, "The reflected edge changes as I move.");
  assert.equal(digest.station_evidence[0].inquiry, "Does the edge belong to the image or my position?");
  assert.equal(digest.station_evidence[0].evidence_kind, "observation_and_inquiry");
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
