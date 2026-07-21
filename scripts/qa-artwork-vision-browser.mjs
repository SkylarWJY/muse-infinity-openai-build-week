import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const BASE_URL = process.env.MUSE_QA_URL || "http://127.0.0.1:4187";
const OUTPUT_DIR = path.resolve(process.env.MUSE_QA_OUTPUT || ".omx/artifacts/living-artwork-qa");
const ARTWORK_ID = "aic-111436";
const WORLD_ID = "dreamlike-coastal-villa-gardens";
const CAPTURE_TIMES_MS = [0, 200, 800, 2_500, 4_500, 5_400];

await mkdir(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  artworkId: ARTWORK_ID,
  worldId: WORLD_ID,
  cases: []
};

try {
  report.defaultGate = await verifyDefaultGate(browser);
  for (const testCase of [
    { name: "desktop", viewport: { width: 1_440, height: 900 } },
    { name: "mobile", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    { name: "reduced-motion", viewport: { width: 1_440, height: 900 }, reducedMotion: "reduce" }
  ]) {
    report.cases.push(await captureCase(browser, testCase));
  }
} finally {
  await browser.close();
}

await writeFile(path.join(OUTPUT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

async function verifyDefaultGate(activeBrowser) {
  const context = await activeBrowser.newContext({ viewport: { width: 1_280, height: 720 } });
  const page = await context.newPage();
  const spzRequests = [];
  await blockArchivedWorlds(page);
  page.on("request", (request) => {
    if (/living-artworks-v2\/.+\.spz(?:$|\?)/.test(request.url())) spzRequests.push(request.url());
  });
  try {
    await bootIntoQaHarness(page, false);
    await page.waitForTimeout(750);
    const snapshot = await page.evaluate(() => window.__MUSE_APP__.artworkVisionState());
    return {
      passed: snapshot?.state === "idle" && snapshot?.artworkId == null && spzRequests.length === 0,
      snapshot,
      spzRequests
    };
  } finally {
    await context.close();
  }
}

async function captureCase(activeBrowser, testCase) {
  const context = await activeBrowser.newContext({
    viewport: testCase.viewport,
    isMobile: testCase.isMobile,
    hasTouch: testCase.hasTouch,
    reducedMotion: testCase.reducedMotion,
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const assetResponses = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(String(error?.stack || error)));
  page.on("response", (response) => {
    if (/living-artworks-v2\/.+\.(?:spz|webp)(?:$|\?)/.test(response.url())) {
      assetResponses.push({
        url: response.url(),
        status: response.status(),
        contentLength: response.headers()["content-length"] || null
      });
    }
  });

  const result = {
    name: testCase.name,
    viewport: testCase.viewport,
    reducedMotion: testCase.reducedMotion === "reduce",
    captures: [],
    consoleErrors,
    pageErrors,
    assetResponses
  };

  try {
    await blockArchivedWorlds(page);
    await bootIntoQaHarness(page, true);
    await page.waitForFunction(() => ["ready", "failed"].includes(window.__MUSE_APP__.artworkVisionState()?.state), null, {
      timeout: 60_000
    });
    result.readyState = await visionState(page);
    await page.screenshot({ path: path.join(OUTPUT_DIR, `${testCase.name}-baseline.png`) });

    if (result.readyState.snapshot?.state !== "ready") return result;

    await page.evaluate(() => {
      const sample = { start: performance.now(), marks: [], done: false };
      window.__MUSE_VISION_QA_FRAMES__ = sample;
      const tick = (now) => {
        sample.marks.push(now);
        if (now - sample.start < 5_800) requestAnimationFrame(tick);
        else sample.done = true;
      };
      requestAnimationFrame(tick);
    });
    const triggered = await page.evaluate((artworkId) => (
      window.__MUSE_APP__.previewArtworkVisionForBrowserQa(artworkId)
    ), ARTWORK_ID);
    result.triggered = triggered;

    const startedAt = Date.now();
    for (const targetMs of CAPTURE_TIMES_MS) {
      const remaining = targetMs - (Date.now() - startedAt);
      if (remaining > 0) await page.waitForTimeout(remaining);
      const label = String(targetMs).padStart(4, "0");
      const screenshot = `${testCase.name}-${label}ms.png`;
      await page.screenshot({ path: path.join(OUTPUT_DIR, screenshot) });
      result.captures.push({ targetMs, screenshot, ...(await visionState(page)) });
    }

    await page.waitForFunction(() => window.__MUSE_VISION_QA_FRAMES__?.done === true, null, { timeout: 10_000 });
    const frameMarks = await page.evaluate(() => window.__MUSE_VISION_QA_FRAMES__?.marks || []);
    result.frameTiming = summarizeFrames(frameMarks);
    result.finalState = await visionState(page);
    result.returnedCleanly = result.finalState.snapshot?.state === "completed"
      && result.finalState.element?.hidden === true
      && Number(result.finalState.element?.opacity) === 0;
    return result;
  } finally {
    await context.close();
  }
}

async function bootIntoQaHarness(page, enablePreview) {
  const query = enablePreview ? `?artworkVisionQa=${ARTWORK_ID}` : "";
  await page.goto(`${BASE_URL}/${query}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForFunction(() => window.__MUSE_APP__?.state?.bootSettled === true, null, { timeout: 90_000 });
  await page.evaluate(({ artworkId, enablePreview }) => {
    const app = window.__MUSE_APP__;
    const engine = app.engine;
    const world = document.querySelector("#world");
    if (!engine.ready) {
      engine.ready = true;
      engine.animate();
    }
    engine.renderer.domElement.style.visibility = "hidden";
    for (const selector of [
      ".entry-panel",
      ".mission-rail",
      ".dialogue",
      ".companion-conversation",
      ".movement-controls"
    ]) document.querySelector(selector)?.setAttribute("hidden", "");

    const stage = document.createElement("div");
    stage.dataset.visionQaBaseline = "true";
    Object.assign(stage.style, {
      position: "absolute",
      inset: "0",
      display: "grid",
      placeItems: "center",
      padding: "clamp(68px, 8vh, 92px) clamp(18px, 7vw, 110px) clamp(46px, 7vh, 72px)",
      background: "#d8d2c4",
      boxSizing: "border-box"
    });
    const frame = document.createElement("div");
    Object.assign(frame.style, {
      maxWidth: "min(100%, 940px)",
      maxHeight: "100%",
      padding: "clamp(8px, 1.5vw, 18px)",
      background: "#4b392c",
      boxShadow: "0 22px 68px rgba(45, 32, 25, .28)"
    });
    const image = document.createElement("img");
    image.src = "/assets/art/collection/aic-111436.jpg";
    image.alt = "The Basket of Apples by Paul Cezanne";
    Object.assign(image.style, {
      display: "block",
      maxWidth: "100%",
      maxHeight: "calc(100vh - 170px)",
      objectFit: "contain"
    });
    frame.appendChild(image);
    stage.appendChild(frame);
    world.prepend(stage);

    engine.activeWorldLive = true;
    engine.artworkVisionQaCandidate = enablePreview ? artworkId : null;
    engine.installArtworkVision({ sceneId: "sunset-frames" });
  }, { artworkId: ARTWORK_ID, enablePreview });
  await page.waitForFunction(() => document.querySelector("[data-vision-qa-baseline] img")?.complete === true, null, {
    timeout: 30_000
  });
}

async function blockArchivedWorlds(page) {
  await page.route("**/src/main.js", async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    const bootCall = "state.bootPromise = engine.init()";
    if (!source.includes(bootCall)) throw new Error("artwork_vision_qa_boot_hook_missing");
    const headers = { ...response.headers() };
    delete headers["content-length"];
    await route.fulfill({
      response,
      headers,
      body: source.replace(bootCall, "state.bootPromise = Promise.resolve(engine.activeWorld)")
    });
  });
  await page.route("**/assets/worlds/**", (route) => route.abort("failed"));
}

async function visionState(page) {
  return page.evaluate(() => {
    const snapshot = window.__MUSE_APP__.artworkVisionState();
    const element = document.querySelector(".artwork-vision-canvas, .artwork-vision-frame");
    if (!element) return { snapshot, element: null };
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      snapshot,
      element: {
        tagName: element.tagName,
        hidden: element.hidden,
        opacity: style.opacity,
        clipPath: style.clipPath,
        display: style.display,
        width: rect.width,
        height: rect.height,
        pixelWidth: element.width || element.naturalWidth || null,
        pixelHeight: element.height || element.naturalHeight || null
      }
    };
  });
}

function summarizeFrames(marks) {
  const intervals = marks.slice(1).map((value, index) => value - marks[index]).filter(Number.isFinite);
  const sorted = [...intervals].sort((left, right) => left - right);
  const median = percentile(sorted, 0.5);
  const p95 = percentile(sorted, 0.95);
  return {
    count: marks.length,
    durationMs: marks.length > 1 ? marks.at(-1) - marks[0] : 0,
    medianFrameMs: median,
    p95FrameMs: p95,
    medianFps: median > 0 ? 1_000 / median : 0,
    slowFramesOver34ms: intervals.filter((value) => value > 34).length
  };
}

function percentile(sorted, ratio) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}
