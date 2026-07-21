import test from "node:test";
import assert from "node:assert/strict";
import {
  MINIMAX_NARRATION_MAX_HEX_LENGTH,
  MINIMAX_NARRATION_MODEL,
  MINIMAX_NARRATION_TEXT_LIMIT,
  MINIMAX_NARRATION_TIMEOUT_MS,
  MINIMAX_T2A_ENDPOINT,
  MiniMaxService
} from "../services/minimax.js";

function speechResponse(audio = "494433", statusCode = 0) {
  return new Response(JSON.stringify({
    data: { audio, status: 2 },
    base_resp: { status_code: statusCode, status_msg: statusCode ? "failed" : "success" }
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

test("MiniMax narration uses the fixed T2A endpoint, model and allowlisted cast voice", async () => {
  let request;
  const service = new MiniMaxService({
    apiKey: "minimax-test-key",
    endpoint: "https://example.com/ignored",
    model: "ignored-model",
    fetchImpl: async (url, options) => {
      request = { url, options, body: JSON.parse(options.body) };
      return speechResponse();
    }
  });
  const controller = new AbortController();
  const result = await service.createNarration({
    speakerId: "van-gogh",
    text: `  ${"x".repeat(MINIMAX_NARRATION_TEXT_LIMIT + 100)}  `
  }, "session-not-forwarded", { signal: controller.signal });

  assert.equal(service.configured, true);
  assert.equal(service.provider, "minimax");
  assert.equal(service.model, MINIMAX_NARRATION_MODEL);
  assert.equal(service.timeoutMs, MINIMAX_NARRATION_TIMEOUT_MS);
  assert.equal(request.url, MINIMAX_T2A_ENDPOINT);
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.headers.Authorization, "Bearer minimax-test-key");
  assert.equal(request.body.model, "speech-2.8-turbo");
  assert.equal(request.body.text.length, MINIMAX_NARRATION_TEXT_LIMIT);
  assert.equal(request.body.stream, false);
  assert.equal(request.body.language_boost, "auto");
  assert.equal(request.body.output_format, "hex");
  assert.deepEqual(request.body.voice_setting, {
    voice_id: "English_PassionateWarrior",
    speed: 1.08,
    vol: 1,
    pitch: 0
  });
  assert.deepEqual(request.body.audio_setting, {
    sample_rate: 32_000,
    bitrate: 128_000,
    format: "mp3",
    channel: 1
  });
  assert.doesNotMatch(JSON.stringify(request.body), /minimax-test-key|session-not-forwarded/);
  assert.equal(request.options.signal.aborted, false);
  assert.equal(result.contentType, "audio/mpeg");
  assert.deepEqual([...result.bytes], [73, 68, 51]);
});

test("MiniMax validates speaker and text before checking configuration", async () => {
  let calls = 0;
  const service = new MiniMaxService({
    fetchImpl: async () => { calls += 1; throw new Error("must_not_run"); }
  });

  await assert.rejects(
    () => service.createNarration({ speakerId: "custom-cloned-voice", text: "Speak this." }),
    (error) => error.message === "invalid_narration_speaker" && error.statusCode === 400
  );
  await assert.rejects(
    () => service.createNarration({ speakerId: "mira", text: "" }),
    (error) => error.message === "narration_text_required" && error.statusCode === 400
  );
  await assert.rejects(
    () => service.createNarration({ speakerId: "mira", text: "Speak this." }),
    (error) => error.message === "narration_not_configured" && error.statusCode === 503
  );
  assert.equal(service.configured, false);
  assert.equal(calls, 0);
});

test("Mira is always rendered with an explicitly female system voice", async () => {
  let body;
  const service = new MiniMaxService({
    apiKey: "test-key",
    fetchImpl: async (_url, options) => {
      body = JSON.parse(options.body);
      return speechResponse();
    }
  });
  await service.createNarration({ speakerId: "mira", text: "Welcome to MUSE." });
  assert.equal(body.voice_setting.voice_id, "English_ConfidentWoman");
});

test("MiniMax accepts only a successful response carrying non-empty even-length hex audio", async (t) => {
  const cases = [
    ["empty audio", speechResponse("")],
    ["odd-length audio", speechResponse("0")],
    ["non-hex audio", speechResponse("not-hex")],
    ["provider error", speechResponse("494433", 1001)],
    ["invalid JSON", new Response("not-json", { status: 200 })]
  ];
  for (const [name, response] of cases) {
    await t.test(name, async () => {
      const service = new MiniMaxService({ apiKey: "test-key", fetchImpl: async () => response.clone() });
      await assert.rejects(
        () => service.createNarration({ speakerId: "frida", text: "Notice the frame." }),
        (error) => error.statusCode === 502
      );
    });
  }
});

test("MiniMax rejects oversized hex audio before allocating the decoded buffer", async () => {
  const oversizedAudio = "00".repeat((MINIMAX_NARRATION_MAX_HEX_LENGTH / 2) + 1);
  const service = new MiniMaxService({
    apiKey: "test-key",
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        data: { audio: oversizedAudio },
        base_resp: { status_code: 0, status_msg: "success" }
      })
    })
  });

  await assert.rejects(
    () => service.createNarration({ speakerId: "mira", text: "Keep this bounded." }),
    (error) => error.message === "invalid_narration_audio" && error.statusCode === 502
  );
});

test("MiniMax propagates an external abort to the in-flight request", async () => {
  let upstreamSignal;
  const service = new MiniMaxService({
    apiKey: "test-key",
    fetchImpl: (_url, options) => {
      upstreamSignal = options.signal;
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true });
      });
    }
  });
  const controller = new AbortController();
  const request = service.createNarration(
    { speakerId: "mira", text: "Stop this line." },
    "session",
    { signal: controller.signal }
  );
  controller.abort(new Error("caller_cancelled"));

  await assert.rejects(request, /caller_cancelled/);
  assert.equal(upstreamSignal.aborted, true);
});

test("MiniMax bounds upstream narration at thirty seconds", async () => {
  let upstreamSignal;
  const service = new MiniMaxService({
    apiKey: "test-key",
    timeoutMs: 15,
    fetchImpl: (_url, options) => {
      upstreamSignal = options.signal;
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true });
      });
    }
  });

  await assert.rejects(
    () => service.createNarration({ speakerId: "monet", text: "A bounded line." }),
    (error) => error.message === "narration_timeout" && error.statusCode === 504
  );
  assert.equal(upstreamSignal.aborted, true);
  assert.ok(service.timeoutMs <= MINIMAX_NARRATION_TIMEOUT_MS);
});
