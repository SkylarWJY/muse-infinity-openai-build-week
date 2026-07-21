import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { OPENAI_ENDPOINTS, resolveOpenAIEndpoints } from "../services/openai.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const AUDIT_SURFACES = [
  "server.mjs",
  "services",
  "shared",
  "src",
  ".env.example",
  "e2e/playwright.config.mjs",
  "README.md",
  "DESIGN.md",
  "THIRD_PARTY_NOTICES.md",
  "docs"
];

test("core GPT runtime is restricted to allowlisted GPT-5.6 provider paths", () => {
  const files = collect(AUDIT_SURFACES.map((entry) => path.join(ROOT, entry)));
  const source = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  for (const forbidden of [
    "Anthropic",
    "Gemini",
    "LLM_BASE_URL",
    "LLM_API_KEY",
    "MUSE_GPT_GATEWAY_API_KEY",
    "inherited-gpt",
    "request-configured",
    "gateway-response-reported"
  ]) assert.doesNotMatch(source, new RegExp(forbidden, "i"));
  assert.match(source, /gpt-5\.6/);
  assert.match(source, /api\.openai\.com/);
  assert.match(source, /ALLOWED_OPENAI_BASE_URLS/);
  assert.match(source, /ALLOWED_REASONING_MODELS/);
  assert.match(source, /OPENAI_API_KEY/);
  assert.match(source, /MUSE_OPENAI_CONFIG/);
  assert.match(source, /allowLocalCodexProvider/);
  assert.equal(OPENAI_ENDPOINTS.responses, "https://api.openai.com/v1/responses");
  assert.equal(OPENAI_ENDPOINTS.realtime, "https://api.openai.com/v1/realtime/calls");
  assert.equal(OPENAI_ENDPOINTS.speech, "https://api.openai.com/v1/audio/speech");
  const local = resolveOpenAIEndpoints("http://127.0.0.1:19090/v1", { allowLocalCodexProvider: true });
  assert.equal(local.local, true);
  assert.equal(local.responses, "http://127.0.0.1:19090/v1/responses");
  assert.match(source, /realtimeConfigured/);
  assert.match(source, /WorldLabsService/);
  assert.match(source, /world_forge/);
});

test("MiniMax is isolated to speech rendering and cannot provide language reasoning", () => {
  const source = fs.readFileSync(path.join(ROOT, "services/minimax.js"), "utf8");
  assert.match(source, /\/v1\/t2a_v2/);
  assert.match(source, /speech-2\.8-turbo/);
  assert.match(source, /createNarration/);
  for (const forbidden of [
    "createLesson",
    "createDialogue",
    "createSalon",
    "createTransformation",
    "/v1/responses",
    "OPENAI_MODEL"
  ]) assert.doesNotMatch(source, new RegExp(forbidden, "i"));
});

function collect(entries) {
  const files = [];
  for (const entry of entries) {
    if (!fs.existsSync(entry)) continue;
    const stat = fs.lstatSync(entry);
    assert.equal(stat.isSymbolicLink(), false, `symlink is not allowed: ${entry}`);
    if (stat.isDirectory()) files.push(...collect(fs.readdirSync(entry).map((name) => path.join(entry, name))));
    else if (/\.(?:js|mjs|md)$/.test(entry) || path.basename(entry) === ".env.example") files.push(entry);
  }
  return files;
}
