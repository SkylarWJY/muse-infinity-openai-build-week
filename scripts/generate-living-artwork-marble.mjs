import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, relative, resolve } from "node:path";

const API_ROOT = "https://api.worldlabs.ai/marble/v1";
const DEFAULT_MODEL = "marble-1.1";
const DEFAULT_POLL_MS = 10_000;
const DEFAULT_TIMEOUT_MS = 15 * 60_000;

const options = parseArgs(process.argv.slice(2));
const apiKey = process.env.WORLDLABS_API_KEY;
if (!apiKey) throw new Error("WORLDLABS_API_KEY is required");
if (!options.promptFile || !options.outDir) {
  throw new Error("usage: node scripts/generate-living-artwork-marble.mjs --prompt-file <text> --out-dir <directory> [--input <image>] [--display-name <name>] [--model marble-1.1]");
}

const inputPath = options.input ? resolve(options.input) : null;
const promptPath = resolve(options.promptFile);
const outputPath = resolve(options.outDir);
const stagingPath = `${outputPath}.staging-${randomUUID()}`;
const displayName = options.displayName || `MUSE Living Artwork ${basename(promptPath, extname(promptPath))}`;
const model = options.model || DEFAULT_MODEL;
const startedAt = new Date().toISOString();

await ensureTargetAbsent(outputPath);
await mkdir(stagingPath, { recursive: true });

try {
  const [inputBytes, prompt, creditsBefore] = await Promise.all([
    inputPath ? readFile(inputPath) : Promise.resolve(null),
    readFile(promptPath, "utf8").then((value) => value.trim()),
    getCredits()
  ]);
  if (!prompt) throw new Error("marble prompt must not be empty");

  const mediaAsset = inputPath ? await uploadImage(inputPath, inputBytes) : null;
  const worldPrompt = mediaAsset
    ? {
        type: "image",
        image_prompt: {
          source: "media_asset",
          media_asset_id: mediaAsset.mediaAssetId
        },
        text_prompt: prompt,
        is_pano: false
      }
    : { type: "text", text_prompt: prompt };
  const request = {
    display_name: displayName,
    model,
    world_prompt: worldPrompt
  };
  const operation = await api("/worlds:generate", { method: "POST", body: request });
  if (!operation.operation_id) throw new Error("worldlabs operation_id missing");
  const completed = await pollOperation(operation.operation_id, options.timeoutMs || DEFAULT_TIMEOUT_MS);
  if (completed.error) throw new Error(`worldlabs generation failed: ${JSON.stringify(completed.error)}`);

  const worldId = completed.metadata?.world_id || completed.response?.id;
  if (!worldId) throw new Error("worldlabs world_id missing");
  const latest = await api(`/worlds/${encodeURIComponent(worldId)}`);
  const world = latest.world || latest;
  const assets = world.assets || completed.response?.assets || {};
  const downloads = await downloadWorldAssets(assets, stagingPath);
  const creditsAfter = await getCredits();
  const inputRelative = inputPath ? relative(process.cwd(), inputPath) || basename(inputPath) : null;
  const promptRelative = relative(process.cwd(), promptPath) || basename(promptPath);
  const manifest = {
    schemaVersion: 1,
    status: "generated-awaiting-visual-qa",
    artworkId: options.artworkId || (inputPath ? basename(inputPath, extname(inputPath)) : basename(promptPath, extname(promptPath))),
    provider: {
      name: "World Labs World API",
      model,
      api: API_ROOT,
      documentation: "https://docs.worldlabs.ai/api"
    },
    startedAt,
    completedAt: new Date().toISOString(),
    source: {
      type: inputPath ? "image" : "text",
      path: inputRelative,
      sha256: inputBytes ? sha256(inputBytes) : null,
      bytes: inputBytes?.byteLength || null,
      promptPath: promptRelative,
      prompt,
      mediaAssetId: mediaAsset?.mediaAssetId || null
    },
    generation: {
      operationId: operation.operation_id,
      worldId,
      worldMarbleUrl: world.world_marble_url || completed.response?.world_marble_url || null,
      caption: assets.caption || null,
      semantics: assets.splats?.semantics_metadata || null,
      request: {
        display_name: displayName,
        model,
        world_prompt: worldPrompt
      }
    },
    credits: {
      before: creditsBefore,
      after: creditsAfter,
      consumed: Number.isFinite(creditsBefore) && Number.isFinite(creditsAfter)
        ? creditsBefore - creditsAfter
        : null
    },
    files: downloads,
    integration: {
      visualAsset: downloads.some((entry) => entry.path === "world-500k.spz")
        ? "world-500k.spz"
        : downloads.find((entry) => entry.path.endsWith(".spz"))?.path || null,
      colliderAsset: downloads.find((entry) => entry.path === "collider.glb")?.path || null,
      note: "The SPZ is the visual environment. The collider GLB is not a visual-quality mesh. A separate Tripo hero asset is still required for independent object animation."
    }
  };
  await writeFile(`${stagingPath}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
  await mkdir(dirname(outputPath), { recursive: true });
  await rename(stagingPath, outputPath);
  console.log(JSON.stringify({ outputPath, worldId, credits: manifest.credits, files: downloads }, null, 2));
} catch (error) {
  console.error(`Generation staging retained at ${stagingPath}`);
  throw error;
}

async function uploadImage(path, bytes) {
  const extension = extname(path).slice(1).toLowerCase();
  if (!new Set(["jpg", "jpeg", "png", "webp"]).has(extension)) throw new Error(`unsupported image extension: ${extension}`);
  const prepared = await api("/media-assets:prepare_upload", {
    method: "POST",
    body: { file_name: basename(path), kind: "image", extension }
  });
  const mediaAssetId = prepared.media_asset?.media_asset_id || prepared.media_asset?.id;
  const uploadUrl = prepared.upload_info?.upload_url;
  if (!mediaAssetId || !uploadUrl) throw new Error("worldlabs upload preparation incomplete");
  const response = await fetch(uploadUrl, {
    method: prepared.upload_info?.upload_method || "PUT",
    headers: prepared.upload_info?.required_headers || {},
    body: bytes
  });
  if (!response.ok) throw new Error(`worldlabs upload HTTP ${response.status}: ${await response.text()}`);
  return { mediaAssetId };
}

async function pollOperation(operationId, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastProgress = "";
  while (Date.now() < deadline) {
    const operation = await api(`/operations/${encodeURIComponent(operationId)}`);
    const progress = operation.metadata?.progress;
    const summary = typeof progress === "string"
      ? progress
      : [progress?.status, progress?.description].filter(Boolean).join(": ");
    if (summary && summary !== lastProgress) {
      console.log(summary);
      lastProgress = summary;
    }
    if (operation.done) return operation;
    await delay(options.pollMs || DEFAULT_POLL_MS);
  }
  throw new Error(`worldlabs operation timed out after ${timeoutMs}ms`);
}

async function downloadWorldAssets(assets, directory) {
  const splats = assets.splats?.spz_urls || {};
  const candidates = [
    ["world-100k.spz", splats["100k"]],
    ["world-500k.spz", splats["500k"]],
    ["collider.glb", assets.mesh?.collider_mesh_url],
    ["pano.png", assets.imagery?.pano_url],
    ["thumbnail.webp", assets.thumbnail_url]
  ].filter(([, url]) => typeof url === "string" && url.startsWith("http"));
  const files = [];
  for (const [name, url] of candidates) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`asset download ${name} HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(`${directory}/${name}`, bytes);
    files.push({
      path: name,
      bytes: bytes.byteLength,
      sha256: sha256(bytes),
      contentType: response.headers.get("content-type") || null
    });
  }
  if (!files.some((entry) => entry.path.endsWith(".spz"))) throw new Error("worldlabs visual SPZ asset missing");
  return files;
}

async function getCredits() {
  const credits = await api("/credits");
  return Number(credits.remaining_credits);
}

async function api(path, { method = "GET", body } = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    method,
    headers: {
      "WLT-Api-Key": apiKey,
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) throw new Error(`worldlabs ${method} ${path} HTTP ${response.status}: ${await response.text()}`);
  return response.json();
}

async function ensureTargetAbsent(path) {
  try {
    await stat(path);
    throw new Error(`output already exists: ${path}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!key.startsWith("--")) throw new Error(`unexpected argument: ${key}`);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`missing value for ${key}`);
    index += 1;
    const name = key.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    parsed[name] = ["pollMs", "timeoutMs"].includes(name) ? Number(value) : value;
  }
  return parsed;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}
