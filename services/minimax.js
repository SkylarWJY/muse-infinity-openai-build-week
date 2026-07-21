import { normalizeText } from "../shared/contracts.js";

export const MINIMAX_T2A_ENDPOINT = "https://api.minimax.io/v1/t2a_v2";
export const MINIMAX_NARRATION_MODEL = "speech-2.8-turbo";
export const MINIMAX_NARRATION_TIMEOUT_MS = 30_000;
export const MINIMAX_NARRATION_TEXT_LIMIT = 600;
export const MINIMAX_NARRATION_MAX_HEX_LENGTH = 20_000_000;

const VOICE_CAST = new Map([
  ["mira", { voiceId: "English_ConfidentWoman", speed: 1.0 }],
  ["monet", { voiceId: "English_MaturePartner", speed: 0.98 }],
  ["van-gogh", { voiceId: "English_PassionateWarrior", speed: 1.08 }],
  ["socrates", { voiceId: "English_Deep-VoicedGentleman", speed: 0.95 }],
  ["frida", { voiceId: "English_ConfidentWoman", speed: 1.0 }],
  ["picasso", { voiceId: "English_Debator", speed: 1.02 }],
  ["freud", { voiceId: "English_Deep-VoicedGentleman", speed: 0.92 }],
  ["qi-baishi", { voiceId: "English_MaturePartner", speed: 0.94 }],
  ["yayoi-kusama", { voiceId: "English_Wiselady", speed: 0.97 }]
]);

export class MiniMaxService {
  constructor({ apiKey, fetchImpl = fetch, timeoutMs = MINIMAX_NARRATION_TIMEOUT_MS } = {}) {
    this.apiKey = apiKey || "";
    this.fetch = fetchImpl;
    this.timeoutMs = Math.min(
      Math.max(1, Number(timeoutMs) || MINIMAX_NARRATION_TIMEOUT_MS),
      MINIMAX_NARRATION_TIMEOUT_MS
    );
    this.model = MINIMAX_NARRATION_MODEL;
    this.provider = "minimax";
  }

  get configured() {
    return Boolean(this.apiKey);
  }

  async createNarration({ speakerId, text } = {}, _sessionId, { signal } = {}) {
    const voice = VOICE_CAST.get(normalizeText(speakerId, 48).toLowerCase());
    if (!voice) throw serviceError("invalid_narration_speaker", 400);
    const input = normalizeText(text, MINIMAX_NARRATION_TEXT_LIMIT);
    if (!input) throw serviceError("narration_text_required", 400);
    if (!this.configured) throw serviceError("narration_not_configured", 503);

    const timeoutSignal = AbortSignal.timeout(this.timeoutMs);
    let response;
    try {
      response = await this.fetch(MINIMAX_T2A_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: MINIMAX_NARRATION_MODEL,
          text: input,
          stream: false,
          language_boost: "auto",
          output_format: "hex",
          voice_setting: {
            voice_id: voice.voiceId,
            speed: voice.speed,
            vol: 1.0,
            pitch: 0
          },
          audio_setting: {
            sample_rate: 32_000,
            bitrate: 128_000,
            format: "mp3",
            channel: 1
          }
        }),
        signal: combineSignals(signal, timeoutSignal)
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      if (timeoutSignal.aborted) throw serviceError("narration_timeout", 504);
      throw serviceError("narration_upstream_unavailable", 502);
    }

    if (!response.ok) {
      try { await response.body?.cancel?.(); } catch {}
      throw serviceError(`narration_http_${response.status}`, 502);
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw serviceError("invalid_narration_response", 502);
    }
    if (payload?.base_resp?.status_code !== 0) {
      throw serviceError("narration_provider_error", 502);
    }
    const audioHex = payload?.data?.audio;
    if (
      typeof audioHex !== "string"
      || !audioHex.length
      || audioHex.length > MINIMAX_NARRATION_MAX_HEX_LENGTH
      || audioHex.length % 2 !== 0
      || !/^[0-9a-f]+$/i.test(audioHex)
    ) {
      throw serviceError("invalid_narration_audio", 502);
    }
    const bytes = Buffer.from(audioHex, "hex");
    if (!bytes.length) throw serviceError("invalid_narration_audio", 502);
    return { bytes, contentType: "audio/mpeg" };
  }
}

function combineSignals(external, timeout) {
  if (!external) return timeout;
  return typeof AbortSignal.any === "function" ? AbortSignal.any([external, timeout]) : external;
}

function serviceError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}
