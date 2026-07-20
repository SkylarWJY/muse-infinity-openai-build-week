import test from "node:test";
import assert from "node:assert/strict";
import { createMuseServer } from "../server.mjs";

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

test("no-key lesson endpoint returns curated contract", () => withServer(async (base) => {
  const response = await fetch(`${base}/api/lesson/plan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal: "notice composition" }) });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.live, false);
  assert.equal(body.data.stops.length, 3);
}));

test("static allowlist blocks private project paths", () => withServer(async (base) => {
  for (const target of ["/.env", "/server.mjs", "/services/openai.js", "/tests/server.test.mjs", "/.git/config", "/..%2F.env"]) {
    const response = await fetch(`${base}${target}`);
    assert.equal(response.status, 404, target);
  }
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
