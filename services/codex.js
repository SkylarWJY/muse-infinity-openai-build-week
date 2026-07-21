import fs from "node:fs/promises";
import { constants } from "node:fs";
import os from "node:os";
import path from "node:path";

const MAX_AUTH_FILE_BYTES = 64 * 1024;
const MAX_CONFIG_FILE_BYTES = 256 * 1024;
const REMOTE_PROVIDER_ORIGINS = new Set([
  "https://api.openai.com",
  "https://api.baizhiyuan.cloud"
]);

export async function loadCodexOpenAIEnv({ env = process.env, codexHome } = {}) {
  const enabled = String(env.MUSE_OPENAI_CONFIG || "").trim().toLowerCase() === "codex";
  if (!enabled) {
    return { loaded: false, allowLocalProvider: false };
  }

  const home = codexHome || env.CODEX_HOME || path.join(os.homedir(), ".codex");
  try {
    const auth = await readSecureAuth(path.join(home, "auth.json"));
    const apiKey = nonEmpty(auth.OPENAI_API_KEY);
    if (!apiKey) throw new Error("codex_api_key_missing");

    const config = await readCodexConfig(path.join(home, "config.toml"));
    const provider = resolveConfiguredProvider(config);

    delete env.OPENAI_BASE_URL;
    delete env.OPENAI_MODEL;
    env.OPENAI_API_KEY = apiKey;
    if (provider.baseUrl) env.OPENAI_BASE_URL = provider.baseUrl;
    if (config.model) env.OPENAI_MODEL = config.model;

    return { loaded: true, allowLocalProvider: provider.local };
  } catch (error) {
    throw error;
  }
}

async function readSecureAuth(file) {
  return JSON.parse(await readVerifiedFile(file, {
    label: "codex_auth",
    maxBytes: MAX_AUTH_FILE_BYTES,
    prohibitedMode: 0o077
  }));
}

async function readCodexConfig(file) {
  try {
    return parseCodexConfig(await readVerifiedFile(file, {
      label: "codex_config",
      maxBytes: MAX_CONFIG_FILE_BYTES,
      prohibitedMode: 0o022
    }));
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
}

async function readVerifiedFile(file, { label, maxBytes, prohibitedMode }) {
  let handle;
  try {
    const before = await fs.lstat(file);
    if (!before.isFile() || before.isSymbolicLink()) throw new Error(`${label}_not_regular_file`);
    handle = await fs.open(file, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
    const stat = await handle.stat();
    if (!stat.isFile() || stat.dev !== before.dev || stat.ino !== before.ino) {
      throw new Error(`${label}_changed_during_read`);
    }
    if (stat.size > maxBytes) throw new Error(`${label}_too_large`);
    if (typeof process.getuid === "function" && stat.uid !== process.getuid()) {
      throw new Error(`${label}_owner`);
    }
    if ((stat.mode & prohibitedMode) !== 0) throw new Error(`${label}_permissions`);
    const source = await handle.readFile("utf8");
    if (Buffer.byteLength(source) > maxBytes) throw new Error(`${label}_too_large`);
    return source;
  } catch (error) {
    if (error?.code === "ELOOP") throw new Error(`${label}_not_regular_file`);
    throw error;
  } finally {
    await handle?.close();
  }
}

function parseCodexConfig(source) {
  const root = {};
  const providers = new Map();
  let providerName = null;

  for (const rawLine of String(source || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const table = line.match(/^\[\s*model_providers\.([^\]]+)\s*\]$/);
    if (table) {
      providerName = parseTomlKey(table[1]);
      if (providerName && !providers.has(providerName)) providers.set(providerName, {});
      continue;
    }
    if (line.startsWith("[")) {
      providerName = null;
      continue;
    }

    const assignment = line.match(/^([A-Za-z0-9_-]+)\s*=\s*(.+)$/);
    if (!assignment) continue;
    const value = parseTomlValue(assignment[2]);
    if (value === undefined) continue;
    if (providerName) providers.get(providerName)[assignment[1]] = value;
    else root[assignment[1]] = value;
  }

  return {
    model: typeof root.model === "string" ? root.model : "",
    providerName: typeof root.model_provider === "string" ? root.model_provider : "",
    providers
  };
}

function parseTomlKey(value) {
  const parsed = parseTomlValue(value.trim());
  return typeof parsed === "string" ? parsed : value.trim();
}

function parseTomlValue(value) {
  const source = value.trim();
  if (source.startsWith('"')) {
    const match = source.match(/^"(?:\\.|[^"\\])*"/);
    if (!match) return undefined;
    try { return JSON.parse(match[0]); } catch { return undefined; }
  }
  if (/^(?:true|false)(?:\s*#.*)?$/.test(source)) return source.startsWith("true");
  return undefined;
}

function resolveConfiguredProvider(config) {
  if (!config.providerName) return { baseUrl: "", local: false };
  const provider = config.providers.get(config.providerName);
  if (!provider
    || provider.wire_api !== "responses"
    || provider.requires_openai_auth !== true
    || typeof provider.base_url !== "string") {
    throw new Error("codex_provider_incompatible");
  }

  const resolved = resolveProviderUrl(provider.base_url);
  if (!resolved) throw new Error("codex_provider_incompatible");
  return resolved;
}

function resolveProviderUrl(value) {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash) return null;
    const pathName = url.pathname.replace(/\/$/, "");
    const loopback = url.hostname === "127.0.0.1" || url.hostname === "[::1]";
    if (loopback && ["http:", "https:"].includes(url.protocol) && pathName === "/v1") {
      return { baseUrl: `${url.origin}/v1`, local: true };
    }
    if (url.protocol === "https:"
      && REMOTE_PROVIDER_ORIGINS.has(url.origin.toLowerCase())
      && ["", "/v1"].includes(pathName)) {
      return { baseUrl: url.origin.toLowerCase(), local: false };
    }
    return null;
  } catch {
    return null;
  }
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}
