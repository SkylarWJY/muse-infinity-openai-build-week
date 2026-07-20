import test from "node:test";
import assert from "node:assert/strict";
import { providerPresentation } from "../src/ui/AppView.js";

test("a configured inherited gateway is not presented as a live response", () => {
  const presentation = providerPresentation({
    configured: true,
    live: false,
    gateway: "inherited-gpt",
    model: "gpt-5.6",
    model_source: "request-configured"
  });

  assert.equal(presentation.label, "GPT-5.6 CONFIGURED · INHERITED GATEWAY · MODEL REQUESTED");
  assert.equal(presentation.shortLabel, "GPT-5.6 · GATEWAY · REQUEST");
  assert.equal(presentation.badge, "GPT-5.6 · GATEWAY READY");
  assert.doesNotMatch(`${presentation.label} ${presentation.badge}`, /LIVE/);
});

test("a successful inherited response is presented as live with reported model evidence", () => {
  const presentation = providerPresentation({
    configured: true,
    live: true,
    gateway: "inherited-gpt",
    model: "gpt-5.6",
    model_source: "gateway-response-reported"
  });

  assert.equal(presentation.label, "GPT-5.6 LIVE · INHERITED GATEWAY · MODEL RESPONSE REPORTED");
  assert.equal(presentation.shortLabel, "GPT-5.6 · GATEWAY · RESPONSE");
  assert.equal(presentation.badge, "GPT-5.6 · GATEWAY LIVE");
});

test("an official key is shown as configured until an API response succeeds", () => {
  const configured = providerPresentation({ configured: true, openai: true, gateway: "official", model: "gpt-5.6" });
  const live = providerPresentation({ configured: true, live: true, openai: true, gateway: "official", model: "gpt-5.6" });

  assert.equal(configured.label, "GPT-5.6 CONFIGURED · OPENAI RESPONSES API");
  assert.equal(configured.badge, "GPT-5.6 · OPENAI READY");
  assert.equal(live.label, "GPT-5.6 LIVE · OPENAI RESPONSES API");
  assert.equal(live.badge, "GPT-5.6 · OPENAI LIVE");
});
