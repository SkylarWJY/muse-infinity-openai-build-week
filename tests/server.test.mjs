import test from "node:test";
import assert from "node:assert/strict";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { createFallbackLesson, createMuseServer, loadLocalEnv } from "../server.mjs";
import { createFallbackSalon, createSessionDigest } from "../shared/contracts.js";

async function withServer(run, options = {}) {
  const server = createMuseServer({ env: {}, ...options });
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
  assert.equal(body.data.stops.length, 8);
}));

test("no-key transformation binds the selected contradiction into the final concept", () => withServer(async (base) => {
  const lesson = createFallbackLesson("notice emotion");
  const digest = {
    learning_goal: lesson.learning_goal,
    companion_ids: ["frida", "socrates"],
    visits: lesson.stops.map((stop) => ({
      stop_id: stop.stop_id,
      detail_id: stop.detail_id,
      answer: stop.choices[0].label,
      effect: stop.choices[0].effect
    }))
  };
  const response = await fetch(`${base}/api/salon/transform`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...digest,
      contradiction: "emotion",
      prior_concept: createFallbackSalon(createSessionDigest(digest))
    })
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.live, false);
  assert.equal(body.data.philosophy_axis, "emotion");
  assert.match(body.data.synthesis, /emotion/i);
}));

test("transformation endpoint rejects a missing provisional concept even without credentials", () => withServer(async (base) => {
  const lesson = createFallbackLesson("notice perception");
  const response = await fetch(`${base}/api/salon/transform`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      learning_goal: lesson.learning_goal,
      companion_ids: ["monet"],
      contradiction: "perception",
      visits: lesson.stops.map((stop) => ({
        stop_id: stop.stop_id,
        detail_id: stop.detail_id,
        answer: stop.choices[0].label,
        effect: stop.choices[0].effect
      }))
    })
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.live, false);
  assert.equal(body.reason, "invalid_prior_concept");
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
  const world = await fetch(`${base}/assets/worlds/grand-conservatory.rad`, { method: "HEAD" });
  const companion = await fetch(`${base}/assets/characters/monet.glb`, { method: "HEAD" });
  const learner = await fetch(`${base}/assets/characters/learner.glb`, { method: "HEAD" });
  assert.equal(world.status, 200);
  assert.equal(world.headers.get("content-type"), "application/octet-stream");
  assert.equal(Number(world.headers.get("content-length")), 87_503_680);
  assert.equal(companion.status, 200);
  assert.equal(companion.headers.get("content-type"), "model/gltf-binary");
  assert.ok(Number(companion.headers.get("content-length")) > 1_000_000);
  assert.equal(learner.status, 200);
  assert.equal(learner.headers.get("content-type"), "model/gltf-binary");
  assert.ok(Number(learner.headers.get("content-length")) > 1_000_000);
}));

test("quality RAD worlds stream immutable byte ranges", () => withServer(async (base) => {
  const response = await fetch(`${base}/assets/worlds/grand-conservatory.rad`, {
    headers: { Range: "bytes=0-31" }
  });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get("accept-ranges"), "bytes");
  assert.equal(response.headers.get("content-length"), "32");
  assert.equal(response.headers.get("content-range"), "bytes 0-31/87503680");
  assert.match(response.headers.get("cache-control") || "", /immutable/);
  const body = Buffer.from(await response.arrayBuffer());
  assert.equal(body.length, 32);
  assert.equal(body.toString("ascii", 0, 4), "RAD0");
}));

test("aborting a raw byte-range client closes and detaches the file stream", async () => {
  let streamedFile;
  let resolveSourceClosed;
  const sourceClosed = new Promise((resolve) => { resolveSourceClosed = resolve; });

  await withServer(async (base) => {
    const url = new URL(base);
    await new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: url.hostname, port: Number(url.port) });
      socket.setTimeout(5_000, () => socket.destroy(new Error("raw_client_timeout")));
      socket.once("connect", () => {
        socket.write([
          "GET /assets/worlds/grand-conservatory.rad HTTP/1.1",
          `Host: ${url.host}`,
          "Range: bytes=0-",
          "Connection: keep-alive",
          "",
          ""
        ].join("\r\n"));
      });
      socket.once("data", (chunk) => {
        assert.match(chunk.toString("latin1"), /^HTTP\/1\.1 206 Partial Content/);
        socket.destroy();
        resolve();
      });
      socket.once("error", reject);
    });

    let closeTimer;
    try {
      await Promise.race([
        sourceClosed,
        new Promise((_, reject) => {
          closeTimer = setTimeout(() => reject(new Error("source_close_timeout")), 2_000);
        })
      ]);
    } finally {
      clearTimeout(closeTimer);
    }
    assert.ok(streamedFile);
    assert.equal(streamedFile.destroyed, true);
    assert.equal(streamedFile.closed, true);
    assert.equal(streamedFile.listenerCount("data"), 0);
    assert.equal(streamedFile.listenerCount("error"), 0);
    assert.equal(streamedFile.listenerCount("close"), 0);
  }, {
    staticReadStreamFactory(filePath, options) {
      streamedFile = createReadStream(filePath, { ...options, highWaterMark: 1_024 });
      streamedFile.once("close", resolveSourceClosed);
      return streamedFile;
    }
  });
});

test("final texture mesh supports byte-range delivery", () => withServer(async (base) => {
  const response = await fetch(`${base}/assets/worlds/fantasy-shimmering-spheres-texture-mesh.glb`, {
    headers: { Range: "bytes=0-31" }
  });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get("content-range"), "bytes 0-31/93404352");
  const body = Buffer.from(await response.arrayBuffer());
  assert.equal(body.length, 32);
  assert.equal(body.toString("ascii", 0, 4), "glTF");
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
