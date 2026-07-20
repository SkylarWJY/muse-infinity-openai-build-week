import test from "node:test";
import assert from "node:assert/strict";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { clientKey, createFallbackLesson, createMuseServer, loadLocalEnv } from "../server.mjs";
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
  assert.equal(body.configured, false);
  assert.equal(body.openai, false);
  assert.equal(body.gateway, "official");
  assert.doesNotMatch(JSON.stringify(body), /key/i);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
}));

test("status identifies the allowlisted inherited GPT gateway without exposing credentials", () => withServer(async (base) => {
  const response = await fetch(`${base}/api/status`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.configured, true);
  assert.equal(body.openai, false);
  assert.equal(body.model, "gpt-5.6");
  assert.equal(body.gateway, "inherited-gpt");
  assert.equal(body.model_source, "request-configured");
  assert.equal(body.realtime, false);
  assert.equal(body.realtime_model, null);
  assert.doesNotMatch(JSON.stringify(body), /secret-value/);
}, {
  env: {
    MUSE_GPT_GATEWAY_API_KEY: "secret-value",
    OPENAI_BASE_URL: "https://api.baizhiyuan.cloud",
    OPENAI_MODEL: "not-an-allowed-model"
  }
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

test("dialogue endpoint grounds the local fallback in the trusted scene collection", () => withServer(async (base) => {
  const response = await fetch(`${base}/api/dialogue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "这幅画的水面为什么看起来不稳定？",
      scene_id: "water-and-light",
      artwork_id: "aic-16568",
      artwork: { title: "Injected title" },
      companion_ids: ["monet"]
    })
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.live, false);
  assert.equal(body.reason, "not_configured");
  assert.deepEqual(body.perspectives.map((item) => item.speakerId), ["monet"]);
  assert.match(body.perspectives[0].text, /Water Lilies/);
  assert.doesNotMatch(JSON.stringify(body), /Injected title/);
}));

test("realtime JSON call uses the trusted scene and artwork context", () => {
  let upstream;
  return withServer(async (base) => {
    const response = await fetch(`${base}/api/realtime/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": "session-voice" },
      body: JSON.stringify({
        sdp: "v=0\r\noffer",
        context: {
          question: "What changes in the water?",
          scene_id: "water-and-light",
          artwork_id: "aic-16568",
          artwork: { title: "Injected title" },
          companion_ids: ["monet"]
        }
      })
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/sdp");
    assert.equal(await response.text(), "v=0\r\nanswer");
    const session = JSON.parse(upstream.body.get("session"));
    assert.match(session.instructions, /Water Lilies/);
    assert.doesNotMatch(session.instructions, /Injected title/);
  }, {
    env: { OPENAI_API_KEY: "test-key" },
    fetchImpl: async (url, options) => {
      upstream = { url, ...options };
      return { ok: true, text: async () => "v=0\r\nanswer" };
    }
  });
});

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

test("client key ignores forwarding headers from untrusted direct clients", () => {
  const request = {
    socket: { remoteAddress: "203.0.113.8" },
    headers: {
      forwarded: "for=198.51.100.10",
      "x-forwarded-for": "198.51.100.11"
    }
  };
  assert.equal(clientKey(request), "203.0.113.8");
});

test("client key gives loopback-proxied clients distinct canonical buckets", () => {
  const first = clientKey({
    socket: { remoteAddress: "::ffff:127.0.0.1" },
    headers: { forwarded: 'for="[2001:0DB8:0:0:0:0:0:1]:443";proto=https' }
  });
  const second = clientKey({
    socket: { remoteAddress: "127.0.0.1" },
    headers: { "x-forwarded-for": "127.0.0.1, 198.51.100.24" }
  });
  assert.equal(first, "2001:db8::1");
  assert.equal(second, "198.51.100.24");
  assert.notEqual(first, second);
});

test("client key prefers the proxy-appended XFF node over an attacker-controlled Forwarded header", () => {
  const request = {
    socket: { remoteAddress: "127.0.0.1" },
    headers: {
      forwarded: "for=192.0.2.44;proto=https",
      "x-forwarded-for": "192.0.2.45, 198.51.100.32"
    }
  };
  assert.equal(clientKey(request), "198.51.100.32");

  delete request.headers["x-forwarded-for"];
  assert.equal(clientKey(request), "192.0.2.44");
});

test("client key falls back to the loopback socket for malformed forwarding values", () => {
  for (const headers of [
    { forwarded: "for=unknown" },
    { forwarded: 'for="[2001:db8::1]:99999"' },
    { "x-forwarded-for": "198.51.100.22, not-an-ip" }
  ]) {
    assert.equal(clientKey({ socket: { remoteAddress: "::1" }, headers }), "::1");
  }
});
