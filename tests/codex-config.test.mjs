import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadCodexOpenAIEnv } from "../services/codex.js";
import { createMuseServer } from "../server.mjs";

async function createCodexHome({
  apiKey = "codex-current-key",
  config = [
    'model = "gpt-5.6-sol"',
    'model_provider = "OpenAI"',
    "",
    "[model_providers.OpenAI]",
    'base_url = "http://127.0.0.1:19090/v1"',
    'wire_api = "responses"',
    "requires_openai_auth = true"
  ].join("\n"),
  authMode = 0o600
} = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "muse-codex-"));
  await fs.writeFile(path.join(directory, "auth.json"), JSON.stringify({ OPENAI_API_KEY: apiKey }), { mode: authMode });
  await fs.writeFile(path.join(directory, "config.toml"), config);
  return directory;
}

test("explicit Codex mode replaces stale project OpenAI settings", async () => {
  const codexHome = await createCodexHome();
  const env = {
    MUSE_OPENAI_CONFIG: "codex",
    OPENAI_API_KEY: "stale-project-key",
    OPENAI_BASE_URL: "https://api.openai.com",
    OPENAI_MODEL: "gpt-5.6"
  };
  try {
    const result = await loadCodexOpenAIEnv({ env, codexHome });
    assert.deepEqual(result, { loaded: true, allowLocalProvider: true });
    assert.equal(env.OPENAI_API_KEY, "codex-current-key");
    assert.equal(env.OPENAI_BASE_URL, "http://127.0.0.1:19090/v1");
    assert.equal(env.OPENAI_MODEL, "gpt-5.6-sol");
  } finally {
    await fs.rm(codexHome, { recursive: true, force: true });
  }
});

test("Codex auth is opt-in and leaves project settings untouched by default", async () => {
  const codexHome = await createCodexHome();
  try {
    const fallbackEnv = {};
    assert.deepEqual(await loadCodexOpenAIEnv({ env: fallbackEnv, codexHome }), {
      loaded: false,
      allowLocalProvider: false
    });
    assert.equal(Object.hasOwn(fallbackEnv, "OPENAI_API_KEY"), false);

    const explicitEnv = { OPENAI_API_KEY: "project-key", OPENAI_BASE_URL: "https://api.openai.com" };
    assert.deepEqual(await loadCodexOpenAIEnv({ env: explicitEnv, codexHome }), {
      loaded: false,
      allowLocalProvider: false
    });
    assert.equal(explicitEnv.OPENAI_API_KEY, "project-key");
    assert.equal(explicitEnv.OPENAI_BASE_URL, "https://api.openai.com");
  } finally {
    await fs.rm(codexHome, { recursive: true, force: true });
  }
});

test("explicit Codex mode replaces the complete provider tuple instead of retaining stale values", async () => {
  const codexHome = await createCodexHome({ config: "" });
  const env = {
    MUSE_OPENAI_CONFIG: "codex",
    OPENAI_BASE_URL: "https://api.baizhiyuan.cloud",
    OPENAI_MODEL: "stale-model"
  };
  try {
    assert.deepEqual(await loadCodexOpenAIEnv({ env, codexHome }), {
      loaded: true,
      allowLocalProvider: false
    });
    assert.equal(env.OPENAI_API_KEY, "codex-current-key");
    assert.equal(Object.hasOwn(env, "OPENAI_BASE_URL"), false);
    assert.equal(Object.hasOwn(env, "OPENAI_MODEL"), false);
  } finally {
    await fs.rm(codexHome, { recursive: true, force: true });
  }
});

test("IPv6 loopback Codex providers remain local and cannot enable speech APIs", async () => {
  const codexHome = await createCodexHome({
    config: [
      'model = "gpt-5.6-sol"',
      'model_provider = "Local"',
      "",
      "[model_providers.Local]",
      'base_url = "http://[::1]:19090/v1"',
      'wire_api = "responses"',
      "requires_openai_auth = true"
    ].join("\n")
  });
  const env = { MUSE_OPENAI_CONFIG: "codex" };
  try {
    assert.deepEqual(await loadCodexOpenAIEnv({ env, codexHome }), {
      loaded: true,
      allowLocalProvider: true
    });
    const server = createMuseServer({ env, allowLocalCodexProvider: true });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const { port } = server.address();
      const status = await (await fetch(`http://127.0.0.1:${port}/api/status`)).json();
      assert.equal(status.gateway, "codex-local");
      assert.equal(status.realtime, false);
      assert.equal(status.narration, false);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    await fs.rm(codexHome, { recursive: true, force: true });
  }
});

test("forced Codex mode rejects an auth file readable by other users", async () => {
  const codexHome = await createCodexHome({ authMode: 0o644 });
  try {
    await assert.rejects(
      () => loadCodexOpenAIEnv({ env: { MUSE_OPENAI_CONFIG: "codex" }, codexHome }),
      /codex_auth_permissions/
    );
  } finally {
    await fs.rm(codexHome, { recursive: true, force: true });
  }
});

test("forced Codex mode rejects providers that do not use Responses with OpenAI auth", async () => {
  const codexHome = await createCodexHome({
    config: [
      'model = "gpt-5.6-sol"',
      'model_provider = "Unsafe"',
      "",
      "[model_providers.Unsafe]",
      'base_url = "http://127.0.0.1:19090/v1"',
      'wire_api = "chat"',
      "requires_openai_auth = false"
    ].join("\n")
  });
  try {
    await assert.rejects(
      () => loadCodexOpenAIEnv({ env: { MUSE_OPENAI_CONFIG: "codex" }, codexHome }),
      /codex_provider_incompatible/
    );
  } finally {
    await fs.rm(codexHome, { recursive: true, force: true });
  }
});

test("the server reports a loaded local Codex provider without enabling speech APIs", async () => {
  const server = createMuseServer({
    env: {
      OPENAI_API_KEY: "codex-current-key",
      OPENAI_BASE_URL: "http://127.0.0.1:19090/v1",
      OPENAI_MODEL: "gpt-5.6-sol"
    },
    allowLocalCodexProvider: true
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const { port } = server.address();
    const status = await (await fetch(`http://127.0.0.1:${port}/api/status`)).json();
    assert.equal(status.configured, true);
    assert.equal(status.gateway, "codex-local");
    assert.equal(status.model_source, "codex-config");
    assert.equal(status.model, "gpt-5.6-sol");
    assert.equal(status.realtime, false);
    assert.equal(status.narration, false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
