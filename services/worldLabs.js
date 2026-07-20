import crypto from "node:crypto";

const WORLDLABS_URL = "https://api.worldlabs.ai/marble/v1";

export class WorldLabsService {
  constructor({ apiKey, adminToken, fetchImpl = fetch, timeoutMs = 30000 } = {}) {
    this.apiKey = apiKey || "";
    this.adminToken = adminToken || "";
    this.fetch = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  get configured() {
    return Boolean(this.apiKey && this.adminToken);
  }

  authorize(token) {
    if (!this.configured || typeof token !== "string") return false;
    const actual = Buffer.from(token);
    const expected = Buffer.from(this.adminToken);
    if (actual.length !== expected.length) return false;
    return crypto.timingSafeEqual(actual, expected);
  }

  async generate(prompt, token) {
    if (!this.authorize(token)) throw Object.assign(new Error("forge_forbidden"), { statusCode: 403 });
    const response = await this.fetch(`${WORLDLABS_URL}/worlds:generate`, {
      method: "POST",
      headers: { "WLT-Api-Key": this.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: "MUSE learner world", world_prompt: { type: "text", text_prompt: prompt }, model: "Marble 0.1-plus" }),
      signal: AbortSignal.timeout(this.timeoutMs)
    });
    if (!response.ok) throw Object.assign(new Error(`worldlabs_http_${response.status}`), { statusCode: response.status });
    return response.json();
  }

  async operation(operationId, token) {
    if (!this.authorize(token)) throw Object.assign(new Error("forge_forbidden"), { statusCode: 403 });
    let decoded;
    try { decoded = decodeURIComponent(operationId); } catch { decoded = ""; }
    const normalized = decoded.replace(/^operations\//, "");
    if (!/^[a-zA-Z0-9._-]{1,120}$/.test(normalized)) throw Object.assign(new Error("invalid_operation"), { statusCode: 400 });
    const response = await this.fetch(`${WORLDLABS_URL}/operations/${encodeURIComponent(normalized)}`, {
      headers: { "WLT-Api-Key": this.apiKey },
      signal: AbortSignal.timeout(this.timeoutMs)
    });
    if (!response.ok) throw Object.assign(new Error(`worldlabs_http_${response.status}`), { statusCode: response.status });
    return response.json();
  }
}
