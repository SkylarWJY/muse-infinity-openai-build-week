import test from "node:test";
import assert from "node:assert/strict";
import { providerPresentation } from "../src/ui/AppView.js";

test("no official key is presented as the deterministic curated fallback", () => {
  const presentation = providerPresentation({ configured: false, openai: false, gateway: "official", model: "gpt-5.6" });

  assert.equal(presentation.label, "GPT-5.6 READY · CURATED FALLBACK ACTIVE");
  assert.equal(presentation.shortLabel, "CURATED DEMO");
  assert.equal(presentation.badge, "CURATED FALLBACK");
});

test("an official key is shown as configured until an API response succeeds", () => {
  const configured = providerPresentation({ configured: true, openai: true, gateway: "official", model: "gpt-5.6" });
  const live = providerPresentation({ configured: true, live: true, openai: true, gateway: "official", model: "gpt-5.6" });

  assert.equal(configured.label, "GPT-5.6 CONFIGURED · OPENAI RESPONSES API");
  assert.equal(configured.badge, "GPT-5.6 · OPENAI READY");
  assert.equal(live.label, "GPT-5.6 LIVE · OPENAI RESPONSES API");
  assert.equal(live.badge, "GPT-5.6 · OPENAI LIVE");
});
