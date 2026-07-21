import test from "node:test";
import assert from "node:assert/strict";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import {
  MODEL_REQUEST_BUDGET,
  NARRATION_REQUEST_BUDGET,
  clientKey,
  createFallbackLesson,
  createMuseServer,
  loadLocalEnv
} from "../server.mjs";
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
  assert.equal(body.narration, false);
  assert.equal(body.narration_provider, null);
  assert.equal(body.narration_model, null);
  assert.equal(body.narration_fallback_provider, null);
  assert.equal(body.world_forge, false);
  assert.doesNotMatch(JSON.stringify(body), /key/i);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
}));

test("a legacy gateway credential cannot configure the allowlisted language model", () => withServer(async (base) => {
  const response = await fetch(`${base}/api/status`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.configured, false);
  assert.equal(body.openai, false);
  assert.equal(body.model, "gpt-5.6");
  assert.equal(body.gateway, "authorized-openai-compatible");
  assert.equal(body.model_source, "openai-compatible-gateway");
  assert.equal(body.realtime, false);
  assert.equal(body.realtime_model, null);
  assert.equal(body.narration, false);
  assert.equal(body.narration_provider, null);
  assert.equal(body.narration_model, null);
  assert.equal(body.narration_fallback_provider, null);
  assert.equal(body.world_forge, false);
  assert.doesNotMatch(JSON.stringify(body), /secret-value/);
}, {
  env: {
    MUSE_GPT_GATEWAY_API_KEY: "secret-value",
    OPENAI_BASE_URL: "https://api.baizhiyuan.cloud",
    OPENAI_MODEL: "not-an-allowed-model"
  }
}));

test("an explicitly allowlisted OpenAI-compatible gateway is reported and used", () => {
  let upstream;
  return withServer(async (base) => {
    const status = await (await fetch(`${base}/api/status`)).json();
    assert.equal(status.configured, true);
    assert.equal(status.gateway, "authorized-openai-compatible");
    assert.equal(status.model, "gpt-5.6-sol");
    assert.equal(status.model_source, "openai-compatible-gateway");
    assert.equal(status.realtime, false);
    assert.equal(status.narration, false);

    const response = await fetch(`${base}/api/lesson/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: "notice relationships" })
    });
    assert.equal(response.status, 200);
    assert.equal(upstream.url, "https://api.baizhiyuan.cloud/v1/responses");
    assert.equal(upstream.body.model, "gpt-5.6-sol");
  }, {
    env: {
      OPENAI_API_KEY: "authorized-test-key",
      OPENAI_BASE_URL: "https://api.baizhiyuan.cloud",
      OPENAI_MODEL: "gpt-5.6-sol"
    },
    fetchImpl: async (url, options) => {
      upstream = { url, body: JSON.parse(options.body) };
      return new Response(JSON.stringify({ output_text: JSON.stringify(createFallbackLesson("notice relationships")) }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  });
});

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

test("recap distinguishes scene reflections, firsthand observations and inquiry paths", () => withServer(async (base) => {
  const plan = createFallbackLesson("How does attention change across works?");
  const station = plan.stops[0].stations[0];
  const response = await fetch(`${base}/api/lesson/recap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      learning_goal: plan.learning_goal,
      companion_ids: ["monet", "socrates"],
      visits: plan.stops.map((stop) => ({
        stop_id: stop.stop_id,
        detail_id: stop.detail_id,
        answer: stop.choices[0].label,
        effect: stop.choices[0].effect
      })),
      station_evidence: [{
        scene_id: plan.stops[0].stop_id,
        station_id: station.station_id,
        artwork_id: station.artwork_id,
        focus_question: station.focus_question,
        visitor_observation: "The edge brightens beside the darker interval.",
        visitor_question: "Does the contrast hold from another position?",
        choice: station.choices[0]
      }]
    })
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.match(body.data.summary, /8 scene reflections through 1 artwork stations/);
  assert.match(body.data.summary, /1 firsthand observations and 1 inquiry paths/);
  assert.equal(body.data.evidence.length, 8);
  assert.equal(body.data.station_evidence[0].evidence_kind, "observation_and_inquiry");
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

test("dialogue endpoint keeps the carrying question bounded and distinct from the current turn", () => {
  let upstream;
  const carryingQuestion = `How does attention become care? ${"x".repeat(300)}`;
  return withServer(async (base) => {
    const response = await fetch(`${base}/api/dialogue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: "What changes at this artwork?",
        carrying_question: carryingQuestion,
        scene_id: "water-and-light",
        artwork_id: "aic-16568",
        companion_ids: ["monet"]
      })
    });
    const body = await response.json();
    const context = JSON.parse(upstream.body.input[1].content.replace(/^Museum context JSON:\n/, ""));

    assert.equal(response.status, 200);
    assert.equal(context.question, "What changes at this artwork?");
    assert.equal(context.carrying_question, carryingQuestion.slice(0, 160));
    assert.match(body.perspectives[0].connection, /attention become care/i);
  }, {
    env: { OPENAI_API_KEY: "test-key" },
    fetchImpl: async (url, options) => {
      upstream = { url, body: JSON.parse(options.body) };
      return new Response(JSON.stringify({ output_text: "{}" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  });
});

test("dialogue endpoint forwards only bounded station history from the active scene", () => {
  let upstream;
  return withServer(async (base) => {
    const response = await fetch(`${base}/api/dialogue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: "How does this station revise the last one?",
        scene_id: "water-and-light",
        artwork_id: "aic-16568",
        station_id: "water-and-light:station-1",
        focus_question: "Which exact relation in this work changes the claim carried from the prior station?",
        companion_ids: ["monet", "socrates"],
        station_history: [
          {
            station_id: "station-1",
            artwork_id: "aic-111442",
            focus_question: "Injected artwork from another scene",
            visitor_observation: "This should be rejected."
          },
          ...Array.from({ length: 6 }, (_, index) => ({
            station_id: `station-${index + 2}`,
            artwork_id: "aic-16568",
            focus_question: `Question ${index + 2}`,
            visitor_observation: `Observation ${index + 2}`,
            visitor_question: `Visitor question ${index + 2}`,
            choice: {
              value: `choice-${index + 2}`,
              label: `Choice ${index + 2}`,
              stance: `Stance ${index + 2}`,
              evidence_prompt: `Evidence ${index + 2}`
            },
            perspectives: [{ companionId: "monet", text: `Perspective ${index + 2}` }],
            evidence_fact_ids: [
              "aic-16568:catalog-title",
              "aic-16568:catalog-artist",
              "aic-16568:forged-visible-fact",
              "aic-111442:catalog-title"
            ],
            ignored_secret: "do-not-forward"
          }))
        ]
      })
    });
    assert.equal(response.status, 200);
    const context = JSON.parse(upstream.body.input[1].content.replace(/^Museum context JSON:\n/, ""));
    assert.equal(context.artwork.id, "aic-16568");
    assert.equal(context.station_id, "water-and-light:station-1");
    assert.equal(context.scene.prompt, "Which exact relation in this work changes the claim carried from the prior station?");
    assert.equal(context.station_history.length, 4);
    assert.deepEqual(context.station_history.map((item) => item.station_id), Array(4).fill("water-and-light:station-1"));
    assert.ok(context.station_history.every((item) => item.artwork_id === "aic-16568"));
    assert.ok(context.station_history.every((item) => (
      JSON.stringify(item.evidence_fact_ids) === JSON.stringify([
        "aic-16568:catalog-title",
        "aic-16568:catalog-artist"
      ])
    )));
    assert.doesNotMatch(JSON.stringify(context), /ignored_secret|another scene|do-not-forward/);
  }, {
    env: { OPENAI_API_KEY: "test-key" },
    fetchImpl: async (url, options) => {
      upstream = { url, body: JSON.parse(options.body) };
      return new Response(JSON.stringify({ output_text: "{}" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  });
});

test("narration endpoint is bounded and reports an explicit no-key fallback", () => withServer(async (base) => {
  const missing = await fetch(`${base}/api/narration`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ speaker_id: "monet", text: "Look at the reflected light." })
  });
  assert.equal(missing.status, 503);
  assert.deepEqual(await missing.json(), { error: "service_unavailable" });

  const invalid = await fetch(`${base}/api/narration`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ speaker_id: "custom-cloned-voice", text: "Speak this." })
  });
  assert.equal(invalid.status, 400);
  assert.deepEqual(await invalid.json(), { error: "invalid_narration_speaker" });
}));

test("official narration endpoint returns generated speech without exposing credentials", () => {
  let upstream;
  return withServer(async (base) => {
    const status = await (await fetch(`${base}/api/status`)).json();
    assert.equal(status.narration, true);
    assert.equal(status.narration_provider, "openai");
    assert.equal(status.narration_model, "gpt-4o-mini-tts");
    assert.equal(status.narration_fallback_provider, null);

    const response = await fetch(`${base}/api/narration`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": "session-speech" },
      body: JSON.stringify({ speaker_id: "frida", text: "Notice what the frame protects." })
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "audio/mpeg");
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [73, 68, 51]);
    assert.equal(upstream.url, "https://api.openai.com/v1/audio/speech");
    assert.equal(upstream.body.voice, "nova");
    assert.equal(upstream.body.input, "Notice what the frame protects.");
    assert.doesNotMatch(JSON.stringify(upstream.body), /test-key/);
  }, {
    env: { OPENAI_API_KEY: "test-key" },
    fetchImpl: async (url, options) => {
      upstream = { url, headers: options.headers, body: JSON.parse(options.body) };
      return new Response(Uint8Array.from([73, 68, 51]), {
        status: 200,
        headers: { "Content-Type": "audio/mpeg" }
      });
    }
  });
});

test("a MiniMax credential enables narration only, not GPT or Realtime", () => {
  let upstream;
  return withServer(async (base) => {
    const status = await (await fetch(`${base}/api/status`)).json();
    assert.equal(status.configured, false);
    assert.equal(status.openai, false);
    assert.equal(status.dialogue, false);
    assert.equal(status.realtime, false);
    assert.equal(status.narration, true);
    assert.equal(status.narration_provider, "minimax");
    assert.equal(status.narration_model, "speech-2.8-turbo");
    assert.equal(status.narration_fallback_provider, null);

    const response = await fetch(`${base}/api/narration`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ speaker_id: "socrates", text: "What do you see before you name it?" })
    });
    assert.equal(response.status, 200);
    assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [73, 68, 51]);
    assert.equal(upstream.url, "https://api.minimax.io/v1/t2a_v2");
    assert.equal(upstream.body.model, "speech-2.8-turbo");
    assert.equal(upstream.body.voice_setting.voice_id, "English_Deep-VoicedGentleman");
  }, {
    env: { MINIMAX_API_KEY: "minimax-test-key" },
    fetchImpl: async (url, options) => {
      upstream = { url, headers: options.headers, body: JSON.parse(options.body) };
      return new Response(JSON.stringify({
        data: { audio: "494433", status: 2 },
        base_resp: { status_code: 0, status_msg: "success" }
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
  });
});

test("MiniMax is preferred and falls back to official OpenAI TTS", () => {
  const upstreamUrls = [];
  return withServer(async (base) => {
    const status = await (await fetch(`${base}/api/status`)).json();
    assert.equal(status.configured, true);
    assert.equal(status.model, "gpt-5.6");
    assert.equal(status.narration_provider, "minimax");
    assert.equal(status.narration_fallback_provider, "openai");

    const response = await fetch(`${base}/api/narration`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ speaker_id: "frida", text: "Notice what the frame protects." })
    });
    assert.equal(response.status, 200);
    assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [73, 68, 51]);
    assert.deepEqual(upstreamUrls, [
      "https://api.minimax.io/v1/t2a_v2",
      "https://api.openai.com/v1/audio/speech"
    ]);
  }, {
    env: { OPENAI_API_KEY: "openai-test-key", MINIMAX_API_KEY: "minimax-test-key" },
    fetchImpl: async (url) => {
      upstreamUrls.push(url);
      if (url.includes("api.minimax.io")) return new Response("upstream unavailable", { status: 503 });
      return new Response(Uint8Array.from([73, 68, 51]), {
        status: 200,
        headers: { "Content-Type": "audio/mpeg" }
      });
    }
  });
});

test("aborting a narration client cancels the upstream speech request", () => {
  let upstreamSignal;
  let markUpstreamStarted;
  const upstreamStarted = new Promise((resolve) => { markUpstreamStarted = resolve; });
  return withServer(async (base) => {
    const controller = new AbortController();
    const request = fetch(`${base}/api/narration`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ speaker_id: "mira", text: "Cancel this unfinished line." }),
      signal: controller.signal
    }).catch((error) => error);

    await upstreamStarted;
    assert.equal(upstreamSignal.aborted, false);
    controller.abort();
    await request;
    for (let attempt = 0; attempt < 20 && !upstreamSignal.aborted; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal(upstreamSignal.aborted, true);
  }, {
    env: { OPENAI_API_KEY: "test-key" },
    fetchImpl: (_url, options) => {
      upstreamSignal = options.signal;
      markUpstreamStarted();
      return new Promise((_resolve, reject) => {
        upstreamSignal.addEventListener("abort", () => reject(new Error("upstream_aborted")), { once: true });
      });
    }
  });
});

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

test("one complete three-artwork-per-scene journey fits inside bounded provider budgets", () => {
  const requiredModelCost = 1 + (8 * 3 * 2) + 1 + 1;
  const requiredNarrationLines = (8 * 3 * 4) + 8 + 4;
  assert.ok(MODEL_REQUEST_BUDGET >= requiredModelCost);
  assert.ok(NARRATION_REQUEST_BUDGET >= requiredNarrationLines);
  assert.ok(MODEL_REQUEST_BUDGET < 100);
  assert.ok(NARRATION_REQUEST_BUDGET < 200);
});

test("public model routes enforce the full-journey per-client request budget", () => withServer(async (base) => {
  let response;
  for (let index = 0; index <= MODEL_REQUEST_BUDGET; index += 1) {
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
