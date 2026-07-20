import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_COMPANIONS, JOURNEY_STAGES, JourneySession } from "../src/domain/JourneySession.js";

test("journey preserves the museum arc in a compact stage sequence", () => {
  assert.deepEqual(JOURNEY_STAGES, ["threshold", "company", "curation", "walk", "salon", "rewrite"]);
  const journey = new JourneySession();
  assert.equal(journey.stage, "threshold");
  assert.deepEqual(journey.companions, DEFAULT_COMPANIONS);

  journey.setQuestion("What makes a life meaningful?");
  assert.equal(journey.stage, "company");
  journey.setCompanions(["frida", "monet", "frida", "socrates"]);
  assert.deepEqual(journey.companions, ["frida", "monet", "socrates"]);
  assert.equal(journey.advance(), "curation");
  assert.equal(journey.advance(), "walk");
  assert.equal(journey.advance(), "salon");
  journey.chooseRewrite("van-gogh-gallery");
  assert.equal(journey.stage, "rewrite");
  assert.equal(journey.rewriteWorldId, "van-gogh-gallery");
});

test("journey requires a question and one to three known companions", () => {
  const journey = new JourneySession();
  assert.throws(() => journey.setQuestion("  "), /question_required/);
  journey.setQuestion("How does attention change experience?");
  assert.throws(() => journey.chooseRewrite("van-gogh-gallery"), /rewrite_requires_salon/);
  assert.throws(() => journey.setCompanions([]), /companions_required/);
  assert.throws(() => journey.setCompanions(["monet", "van-gogh", "socrates", "frida"]), /too_many_companions/);
  assert.throws(() => journey.setCompanions(["unknown"]), /unknown_companion/);
});
