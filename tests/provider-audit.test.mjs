import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const RUNTIME_DIRS = ["server.mjs", "services", "shared", "src"];

test("runtime has no alternate model family and uses explicit origin boundaries", () => {
  const files = collect(RUNTIME_DIRS.flatMap((entry) => [path.join(ROOT, entry)]));
  const source = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  for (const forbidden of ["Anthropic", "Gemini", "MiniMax", "LLM_BASE_URL", "LLM_API_KEY"]) assert.doesNotMatch(source, new RegExp(forbidden, "i"));
  assert.match(source, /gpt-5\.6/);
  assert.match(source, /api\.openai\.com/);
  assert.match(source, /api\.baizhiyuan\.cloud/);
  assert.match(source, /TRUSTED_OPENAI_BASE_URLS/);
  assert.match(source, /MUSE_GPT_GATEWAY_API_KEY/);
  assert.match(source, /realtimeConfigured/);
  assert.match(source, /request-configured/);
  assert.match(source, /gateway-response-reported/);
  assert.match(source, /untrusted_openai_base_url/);
});

function collect(entries) {
  const files = [];
  for (const entry of entries) {
    if (!fs.existsSync(entry)) continue;
    const stat = fs.lstatSync(entry);
    assert.equal(stat.isSymbolicLink(), false, `symlink is not allowed: ${entry}`);
    if (stat.isDirectory()) files.push(...collect(fs.readdirSync(entry).map((name) => path.join(entry, name))));
    else if (/\.(?:js|mjs)$/.test(entry)) files.push(entry);
  }
  return files;
}
