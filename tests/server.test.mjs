import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createMuseServer, loadLocalEnv } from "../server.mjs";

async function withServer(run) {
  const server = createMuseServer({ env: {} });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try { await run(`http://127.0.0.1:${port}`); } finally { await new Promise((resolve) => server.close(resolve)); }
}

test("status is bounded and never exposes secrets", () => withServer(async (base) => {
  const response = await fetch(`${base}/api/status`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.model, "gpt-5.6");
  assert.equal(body.openai, false);
  assert.doesNotMatch(JSON.stringify(body), /key/i);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
}));

test("local startup loads an optional env file with Node's native parser", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "muse-env-"));
  const file = path.join(directory, ".env");
  const key = "MUSE_ENV_FILE_TEST";
  const previous = process.env[key];
  delete process.env[key];
  try {
    await fs.writeFile(file, `${key}=loaded\n`);
    assert.equal(loadLocalEnv(file), true);
    assert.equal(process.env[key], "loaded");
    assert.equal(loadLocalEnv(path.join(directory, "missing.env")), false);
  } finally {
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("no-key lesson endpoint returns curated contract", () => withServer(async (base) => {
  const response = await fetch(`${base}/api/lesson/plan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal: "notice composition" }) });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.live, false);
  assert.equal(body.data.stops.length, 3);
}));

test("static allowlist blocks private project paths", () => withServer(async (base) => {
  for (const target of [
    "/.env",
    "/server.mjs",
    "/services/openai.js",
    "/tests/server.test.mjs",
    "/.git/config",
    "/..%2F.env",
    "/assets/%2e%2e%2fserver.mjs",
    "/assets/%2e%2e%2f.git/config",
    "/assets/%2e%2e%5cserver.mjs",
    "/src/%2e%2e%2fserver.mjs",
    "/shared/%2e%2e%2fserver.mjs"
  ]) {
    const response = await fetch(`${base}${target}`);
    assert.equal(response.status, 404, target);
  }
}));

test("archived worlds and companions are served with deployable media types", () => withServer(async (base) => {
  const world = await fetch(`${base}/assets/worlds/bright-gallery.spz`, { method: "HEAD" });
  const companion = await fetch(`${base}/assets/characters/monet.glb`, { method: "HEAD" });
  const learner = await fetch(`${base}/assets/characters/learner.glb`, { method: "HEAD" });
  assert.equal(world.status, 200);
  assert.equal(world.headers.get("content-type"), "application/octet-stream");
  assert.ok(Number(world.headers.get("content-length")) > 1_000_000);
  assert.equal(companion.status, 200);
  assert.equal(companion.headers.get("content-type"), "model/gltf-binary");
  assert.ok(Number(companion.headers.get("content-length")) > 1_000_000);
  assert.equal(learner.status, 200);
  assert.equal(learner.headers.get("content-type"), "model/gltf-binary");
  assert.ok(Number(learner.headers.get("content-length")) > 1_000_000);
}));

test("oversized JSON receives a bounded 413 response", () => withServer(async (base) => {
  const response = await fetch(`${base}/api/lesson/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goal: "x".repeat(170_000) })
  });
  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), { error: "body_too_large" });
}));

test("public model routes have a bounded per-client request budget", () => withServer(async (base) => {
  let response;
  for (let index = 0; index < 31; index += 1) {
    response = await fetch(`${base}/api/lesson/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: `request ${index}` })
    });
  }
  assert.equal(response.status, 429);
  assert.deepEqual(await response.json(), { error: "rate_limited" });
}));
