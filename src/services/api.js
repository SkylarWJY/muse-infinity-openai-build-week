export const MUSE_API_TIMEOUT_MS = 32000;

export class MuseApi {
  constructor({ sessionId } = {}) {
    this.sessionId = sessionId || crypto.randomUUID();
  }

  status() { return this.request("/api/status", { timeout: 5000 }); }
  lesson(goal) { return this.request("/api/lesson/plan", { method: "POST", body: { goal, session_id: this.sessionId } }); }
  recap(digest) { return this.request("/api/lesson/recap", { method: "POST", body: digest }); }
  salon(digest) { return this.request("/api/salon", { method: "POST", body: digest }); }
  createRoom(display_name) { return this.request("/api/rooms", { method: "POST", body: { display_name } }); }
  joinRoom(roomId, display_name) { return this.request(`/api/rooms/${encodeURIComponent(roomId)}/join`, { method: "POST", body: { display_name } }); }
  roomEvents(roomId, cursor = 0) { return this.request(`/api/rooms/${encodeURIComponent(roomId)}/events?cursor=${cursor}`, { timeout: 5000 }); }
  postRoomEvent(roomId, member_id, event) { return this.request(`/api/rooms/${encodeURIComponent(roomId)}/events`, { method: "POST", body: { member_id, event } }); }
  forge(prompt, token) { return this.request("/api/worlds/generate", { method: "POST", headers: { "X-Admin-Token": token }, body: { prompt } }); }

  async request(url, { method = "GET", body, headers = {}, timeout = MUSE_API_TIMEOUT_MS } = {}) {
    const response = await fetch(url, {
      method,
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeout)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(payload.error || `http_${response.status}`), { status: response.status });
    return payload;
  }
}
