import crypto from "node:crypto";
import {
  LESSON_JSON_SCHEMA,
  OPENAI_MODEL,
  REALTIME_MODEL,
  SALON_JSON_SCHEMA,
  SCENE_MANIFEST,
  createFallbackLesson,
  createFallbackSalon,
  createSessionDigest,
  normalizeText,
  validateSalon,
  validateLessonPlan
} from "../shared/contracts.js";

const RESPONSES_URL = "https://api.openai.com/v1/responses";
const REALTIME_URL = "https://api.openai.com/v1/realtime/calls";

export class OpenAIService {
  constructor({ apiKey, model = OPENAI_MODEL, realtimeModel = REALTIME_MODEL, fetchImpl = fetch, timeoutMs = 30000, safetySalt = "muse-build-week" } = {}) {
    this.apiKey = apiKey || "";
    this.model = model === OPENAI_MODEL ? model : OPENAI_MODEL;
    this.realtimeModel = realtimeModel || REALTIME_MODEL;
    this.fetch = fetchImpl;
    this.timeoutMs = timeoutMs;
    this.safetySalt = safetySalt;
  }

  get configured() {
    return Boolean(this.apiKey);
  }

  safetyIdentifier(sessionId) {
    return crypto.createHash("sha256").update(`${this.safetySalt}:${normalizeText(sessionId, 80) || "anonymous"}`).digest("hex").slice(0, 32);
  }

  async createLesson(goal, sessionId) {
    const fallback = createFallbackLesson(goal);
    if (!this.configured) return { data: fallback, live: false, model: "curated-demo", reason: "not_configured" };

    const developerInput = [
      "You are Mira, an embodied museum learning guide. Design a three-stop guided inquiry.",
      "The renderer owns coordinates and behavior. Return only manifest IDs and allowed verbs.",
      "Ask for observation before interpretation. Make the first answer branch to a different second stop.",
      `Scene manifest: ${JSON.stringify(SCENE_MANIFEST)}`
    ].join("\n");
    try {
      const body = {
        model: this.model,
        store: false,
        reasoning: { effort: "low" },
        safety_identifier: this.safetyIdentifier(sessionId),
        input: [
          { role: "developer", content: developerInput },
          { role: "user", content: `Learner goal: ${normalizeText(goal, 120)}` }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "muse_lesson_plan",
            strict: true,
            schema: LESSON_JSON_SCHEMA
          }
        }
      };
      const result = await this.requestJson(RESPONSES_URL, body);
      const candidate = JSON.parse(extractOutputText(result));
      const validated = validateLessonPlan(candidate);
      if (!validated.ok) throw new Error(`invalid_model_contract:${validated.errors.join("|")}`);
      return { data: validated.value, live: true, model: this.model };
    } catch (error) {
      return { data: fallback, live: false, model: "curated-demo", reason: classifyError(error) };
    }
  }

  async createSalon(session) {
    const digest = createSessionDigest(session);
    const fallback = createFallbackSalon(digest);
    if (!this.configured) return { data: fallback, live: false, model: "curated-demo", reason: "not_configured" };
    try {
      const result = await this.requestJson(RESPONSES_URL, {
        model: this.model,
        store: false,
        reasoning: { effort: "low" },
        safety_identifier: this.safetyIdentifier(session?.session_id),
        input: [
          { role: "developer", content: "Return three concise, contrasting museum perspectives grounded only in supplied session evidence. The Maker discusses composition, The Witness discusses the learner's observation, and The Skeptic tests an opposite reading." },
          { role: "user", content: `Session evidence: ${JSON.stringify(digest)}` }
        ],
        text: { format: { type: "json_schema", name: "muse_salon", strict: true, schema: SALON_JSON_SCHEMA } }
      });
      const validated = validateSalon(JSON.parse(extractOutputText(result)), digest);
      if (!validated.ok) throw new Error("invalid_salon_contract");
      return { data: validated.value, live: true, model: this.model };
    } catch (error) {
      return { data: fallback, live: false, model: "curated-demo", reason: classifyError(error) };
    }
  }

  async createRealtimeCall(sdp, sessionId) {
    if (!this.configured) throw Object.assign(new Error("realtime_not_configured"), { statusCode: 503 });
    if (typeof sdp !== "string" || !sdp.startsWith("v=") || sdp.length > 120000) {
      throw Object.assign(new Error("invalid_sdp"), { statusCode: 400 });
    }
    const form = new FormData();
    form.set("sdp", sdp);
    form.set("session", JSON.stringify({
      type: "realtime",
      model: this.realtimeModel,
      instructions: "You are Mira, a concise museum guide. Ask for visual evidence before interpretation.",
      audio: { output: { voice: "marin" } },
      safety_identifier: this.safetyIdentifier(sessionId)
    }));
    const response = await this.fetch(REALTIME_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
      signal: AbortSignal.timeout(this.timeoutMs)
    });
    if (!response.ok) throw Object.assign(new Error(`realtime_http_${response.status}`), { statusCode: response.status });
    return response.text();
  }

  async requestJson(url, body) {
    let lastError;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await this.fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.timeoutMs)
        });
        if (!response.ok) {
          const error = Object.assign(new Error(`openai_http_${response.status}`), { statusCode: response.status });
          if ((response.status === 429 || response.status >= 500) && attempt === 0) {
            lastError = error;
            continue;
          }
          throw error;
        }
        return response.json();
      } catch (error) {
        lastError = error;
        const status = error?.statusCode || 0;
        if (attempt === 0 && (!status || status === 429 || status >= 500)) continue;
        throw error;
      }
    }
    throw lastError || new Error("openai_request_failed");
  }
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  throw new Error("missing_output_text");
}

function classifyError(error) {
  const message = String(error?.message || "request_failed");
  if (message.includes("invalid_model_contract") || message.includes("missing_output_text")) return "invalid_response";
  if (message.includes("Timeout") || message.includes("abort")) return "timeout";
  return "provider_unavailable";
}

export const OPENAI_ENDPOINTS = Object.freeze({ responses: RESPONSES_URL, realtime: REALTIME_URL });
