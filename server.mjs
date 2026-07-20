import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { OpenAIService } from "./services/openai.js";
import { RoomService } from "./services/rooms.js";
import { WorldLabsService } from "./services/worldLabs.js";
import { createFallbackLesson, createSessionDigest, normalizeText } from "./shared/contracts.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const BODY_LIMIT = 160_000;
const STATIC_PREFIXES = ["/src/", "/shared/", "/assets/"];
const STATIC_FILES = new Set(["/", "/index.html", "/styles.css"]);
const VENDOR_FILES = new Map([
  ["/vendor/three.module.js", path.join(ROOT, "node_modules/three/build/three.module.js")],
  ["/vendor/three.core.js", path.join(ROOT, "node_modules/three/build/three.core.js")],
  ["/vendor/spark.module.js", path.join(ROOT, "node_modules/@sparkjsdev/spark/dist/spark.module.min.js")],
  ["/vendor/Pass.js", path.join(ROOT, "node_modules/three/examples/jsm/postprocessing/Pass.js")]
]);
const MIME = new Map([
  [".html", "text/html; charset=utf-8"], [".css", "text/css; charset=utf-8"], [".js", "text/javascript; charset=utf-8"],
  [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"], [".png", "image/png"], [".webp", "image/webp"], [".spz", "application/octet-stream"], [".glb", "model/gltf-binary"]
]);

export function createMuseServer({ env = process.env, fetchImpl = fetch, roomService } = {}) {
  const openai = new OpenAIService({
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    realtimeModel: env.OPENAI_REALTIME_MODEL,
    fetchImpl,
    safetySalt: env.SAFETY_ID_SALT || "muse-build-week"
  });
  const worlds = new WorldLabsService({ apiKey: env.WORLDLABS_API_KEY, adminToken: env.INTEGRATION_ADMIN_TOKEN, fetchImpl });
  const rooms = roomService || new RoomService();
  const modelBudget = new RequestBudget({ limit: 30, windowMs: 10 * 60 * 1000 });

  return http.createServer(async (req, res) => {
    setHeaders(res);
    if (req.method === "OPTIONS") return sendEmpty(res, 204);
    try {
      const url = new URL(req.url || "/", "http://localhost");
      if (url.pathname.startsWith("/api/")) return await handleApi({ req, res, url, openai, worlds, rooms, modelBudget });
      if (req.method !== "GET" && req.method !== "HEAD") return sendJson(res, 405, { error: "method_not_allowed" });
      return await serveStatic(req, res, url.pathname);
    } catch (error) {
      const status = Number(error?.statusCode) || 500;
      if (status >= 500) console.error(JSON.stringify({ event: "request_error", route: req.url, error: error?.message || "unknown" }));
      return sendJson(res, status, { error: status >= 500 ? "service_unavailable" : String(error?.message || "bad_request") });
    }
  });
}

async function handleApi({ req, res, url, openai, worlds, rooms, modelBudget }) {
  if (req.method === "GET" && url.pathname === "/api/status") {
    return sendJson(res, 200, {
      openai: openai.configured,
      model: openai.model,
      realtime: openai.configured,
      realtime_model: openai.realtimeModel,
      world_forge: worlds.configured,
      rooms: true
    });
  }
  if (req.method === "POST" && url.pathname === "/api/lesson/plan") {
    if (!modelBudget.take(clientKey(req))) return sendJson(res, 429, { error: "rate_limited" });
    const body = await readJson(req);
    const goal = normalizeText(body.goal, 120);
    if (!goal) return sendJson(res, 400, { error: "goal_required" });
    const result = await openai.createLesson(goal, body.session_id);
    return sendJson(res, 200, result);
  }
  if (req.method === "POST" && url.pathname === "/api/lesson/recap") {
    const body = await readJson(req);
    const digest = createSessionDigest(body);
    return sendJson(res, 200, {
      live: false,
      model: "curated-demo",
      data: {
        title: "Your learning map",
        summary: digest.visits.length
          ? `You tested ${digest.visits.length} observations against visible details. Your route changed because attention became a choice.`
          : "Begin with one visible detail, then test what it changes in your interpretation.",
        evidence: digest.visits
      }
    });
  }
  if (req.method === "POST" && url.pathname === "/api/salon") {
    if (!modelBudget.take(clientKey(req))) return sendJson(res, 429, { error: "rate_limited" });
    const result = await openai.createSalon(await readJson(req));
    return sendJson(res, 200, result);
  }
  if (req.method === "POST" && url.pathname === "/api/realtime/call") {
    if (!modelBudget.take(clientKey(req), 6)) return sendJson(res, 429, { error: "rate_limited" });
    const sdp = await readText(req, 120_000);
    const answer = await openai.createRealtimeCall(sdp, req.headers["x-session-id"]);
    res.writeHead(200, { "Content-Type": "application/sdp" });
    return res.end(answer);
  }
  if (req.method === "POST" && url.pathname === "/api/worlds/generate") {
    const body = await readJson(req);
    const prompt = normalizeText(body.prompt, 600);
    if (!prompt) return sendJson(res, 400, { error: "prompt_required" });
    const result = await worlds.generate(prompt, req.headers["x-admin-token"]);
    return sendJson(res, 202, result);
  }
  const operationMatch = url.pathname.match(/^\/api\/worlds\/operations\/(.+)$/);
  if (req.method === "GET" && operationMatch) {
    return sendJson(res, 200, await worlds.operation(operationMatch[1], req.headers["x-admin-token"]));
  }
  if (req.method === "POST" && url.pathname === "/api/rooms") {
    const body = await readJson(req);
    return sendJson(res, 201, rooms.create(body.display_name));
  }
  const roomJoin = url.pathname.match(/^\/api\/rooms\/([A-Fa-f0-9]{6})\/join$/);
  if (req.method === "POST" && roomJoin) {
    const body = await readJson(req);
    return sendJson(res, 200, rooms.join(roomJoin[1], body.display_name));
  }
  const roomEvents = url.pathname.match(/^\/api\/rooms\/([A-Fa-f0-9]{6})\/events$/);
  if (roomEvents && req.method === "GET") return sendJson(res, 200, rooms.read(roomEvents[1], Number(url.searchParams.get("cursor") || 0)));
  if (roomEvents && req.method === "POST") {
    const body = await readJson(req);
    return sendJson(res, 201, rooms.post(roomEvents[1], body.member_id, body.event));
  }
  return sendJson(res, 404, { error: "not_found" });
}

async function serveStatic(req, res, pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return sendJson(res, 404, { error: "not_found" }); }
  if (!STATIC_FILES.has(decoded) && !STATIC_PREFIXES.some((prefix) => decoded.startsWith(prefix)) && !VENDOR_FILES.has(decoded)) return sendJson(res, 404, { error: "not_found" });
  const relative = decoded === "/" ? "index.html" : decoded.slice(1);
  const filePath = VENDOR_FILES.get(decoded) || path.resolve(ROOT, relative);
  if (!filePath.startsWith(`${ROOT}${path.sep}`)) return sendJson(res, 404, { error: "not_found" });
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) return sendJson(res, 404, { error: "not_found" });
    const data = req.method === "HEAD" ? null : await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME.get(path.extname(filePath).toLowerCase()) || "application/octet-stream", "Content-Length": stat.size });
    return res.end(data);
  } catch {
    return sendJson(res, 404, { error: "not_found" });
  }
}

function setHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), geolocation=(), payment=()");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' 'sha256-kW2epsWMwt8US1iQRflgI0fhpbYVixba6O4QRBtcli8='; style-src 'self'; img-src 'self' data:; connect-src 'self' data: https://api.openai.com; worker-src 'self' blob:; media-src 'self' blob:");
}

async function readJson(req) {
  const text = await readText(req, BODY_LIMIT);
  if (!text) return {};
  try { return JSON.parse(text); } catch { throw Object.assign(new Error("invalid_json"), { statusCode: 400 }); }
}

function readText(req, limit = BODY_LIMIT) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    req.on("data", (chunk) => {
      if (tooLarge) return;
      size += chunk.length;
      if (size > limit) {
        tooLarge = true;
        chunks.length = 0;
      } else chunks.push(chunk);
    });
    req.on("end", () => {
      if (tooLarge) reject(Object.assign(new Error("body_too_large"), { statusCode: 413 }));
      else resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(body) });
  res.end(body);
}

function sendEmpty(res, status) {
  res.writeHead(status);
  res.end();
}

class RequestBudget {
  constructor({ limit, windowMs, now = () => Date.now() }) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
    this.entries = new Map();
  }

  take(key, cost = 1) {
    const now = this.now();
    let entry = this.entries.get(key);
    if (!entry || entry.resetAt <= now) entry = { used: 0, resetAt: now + this.windowMs };
    if (entry.used + cost > this.limit) return false;
    entry.used += cost;
    this.entries.set(key, entry);
    if (this.entries.size > 2000) {
      for (const [entryKey, value] of this.entries) if (value.resetAt <= now) this.entries.delete(entryKey);
      if (this.entries.size > 2000) this.entries.delete(this.entries.keys().next().value);
    }
    return true;
  }
}

function clientKey(req) {
  return req.socket.remoteAddress || "unknown";
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const port = Number(process.env.PORT || 4175);
  const server = createMuseServer();
  server.listen(port, "127.0.0.1", () => console.log(`MUSE running at http://127.0.0.1:${port}`));
}

export { createFallbackLesson };
