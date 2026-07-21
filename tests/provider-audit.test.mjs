import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

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

test("core GPT runtime is fixed to the official OpenAI Platform", () => {
  const files = collect(AUDIT_SURFACES.map((entry) => path.join(ROOT, entry)));
  const source = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  for (const forbidden of [
    "Anthropic",
    "Gemini",
    "MiniMax",
    "speech-2\\.8",
    "LLM_BASE_URL",
    "LLM_API_KEY",
    "api\\.baizhiyuan\\.cloud",
    "MUSE_GPT_GATEWAY_API_KEY",
    "inherited-gpt",
    "request-configured",
    "gateway-response-reported"
  ]) assert.doesNotMatch(source, new RegExp(forbidden, "i"));
  assert.match(source, /gpt-5\.6/);
  assert.match(source, /api\.openai\.com/);
  assert.match(source, /OPENAI_API_KEY/);
  assert.match(source, /\/v1\/responses/);
  assert.match(source, /\/v1\/realtime\/calls/);
  assert.match(source, /\/v1\/audio\/speech/);
  assert.match(source, /realtimeConfigured/);
  assert.match(source, /WorldLabsService/);
  assert.match(source, /world_forge/);
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
