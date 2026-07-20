import { test, expect } from "@playwright/test";

const desktop = { width: 1440, height: 900 };
const mobile = { width: 390, height: 844 };

test("stable embodied lesson renders and completes without credentials", async ({ page }) => {
  await page.setViewportSize(desktop);
  const errors = captureErrors(page);
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => window.__MUSE_METRICS__?.actors || 0)).toBe(2);
  const pixels = await canvasPixels(page);
  expect(pixels.variance).toBeGreaterThan(250);
  expect(pixels.nonDominantRatio).toBeGreaterThan(0.15);
  expect(await sampleMedianFps(page, 2500)).toBeGreaterThanOrEqual(30);
  await page.screenshot({ path: "artifacts/screenshots/desktop-initial.png" });

  await page.evaluate(() => { window.__MUSE_APP__.engine.director.speed = 12; });
  await page.getByRole("button", { name: "How composition moves my attention" }).click();
  await expect(page.locator("[data-answer='quiet']")).toBeVisible();
  await expect(page.locator("#sync-state")).toContainText("✓");
  await page.screenshot({ path: "artifacts/screenshots/desktop-question.png" });

  await page.locator("[data-answer='quiet']").click();
  await page.locator("#continue-button").click();
  await expect(page.locator("[data-answer='angle']")).toBeVisible();
  await expect(page.locator("#stop-title")).toContainText("The Bedroom");
  await page.locator("[data-answer='angle']").click();
  await page.locator("#continue-button").click();
  await expect(page.locator("[data-answer='vision']")).toBeVisible();
  await expect(page.locator("#stop-title")).toContainText("La Grande Jatte");
  await page.locator("[data-answer='vision']").click();
  await page.locator("#continue-button").click();
  await expect(page.locator("#guide-state")).toHaveText("LEARNING MAP");
  await expect(page.locator("#answers .perspective")).toHaveCount(3);
  await page.screenshot({ path: "artifacts/screenshots/desktop-recap.png" });
  expect(errors).toEqual([]);
});

test("alternate first observation changes the physical route", async ({ page }) => {
  await page.setViewportSize(desktop);
  await page.goto("/");
  await page.evaluate(() => { window.__MUSE_APP__.engine.director.speed = 14; });
  await page.getByRole("button", { name: "How color creates emotion" }).click();
  await expect(page.locator("[data-answer='motion']")).toBeVisible();
  await page.locator("[data-answer='motion']").click();
  await page.locator("#continue-button").click();
  await expect(page.locator("#stop-title")).toContainText("La Grande Jatte");
  const stopId = await page.evaluate(() => window.__MUSE_APP__.session.currentStopId);
  expect(stopId).toBe("grande-jatte");
});

test("isolated Atlas, Forge, Salon, room and profile layers remain reachable", async ({ page }) => {
  await page.setViewportSize(desktop);
  const errors = captureErrors(page);
  await page.goto("/");
  await page.getByTitle("World Atlas").click();
  await page.getByRole("button", { name: /Memory Garden/ }).click();
  await expect(page.locator("#world-name")).toHaveText("MEMORY GARDEN");
  await expect(page.locator("canvas")).toHaveCount(1);

  await page.getByTitle("World Forge").click();
  await expect(page.getByRole("button", { name: "Generate world" })).toBeDisabled();
  await expect(page.locator("#drawer-body")).toContainText("procedural worlds");

  await page.getByTitle("Perspective Salon").click();
  await expect(page.getByRole("button", { name: "Convene perspectives" })).toBeDisabled();
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "How a space tells a story" }).click();
  await page.getByTitle("Perspective Salon").click();
  await page.getByRole("button", { name: "Convene perspectives" }).click();
  await expect(page.locator(".perspective")).toHaveCount(3);
  expect(await page.evaluate(() => window.__MUSE_APP__.engine.salonActors.length)).toBe(3);
  await page.screenshot({ path: "artifacts/screenshots/desktop-salon.png" });

  await page.evaluate(() => localStorage.setItem("muse.profile.v1", "{corrupted"));
  await page.reload();
  await page.getByTitle("Learner profile").click();
  await expect(page.locator("#profile-name")).toHaveValue("");
  await page.locator("#profile-name").fill("Avery");
  await page.getByRole("button", { name: "Save locally" }).click();
  await page.reload();
  await page.getByTitle("Learner profile").click();
  await expect(page.locator("#profile-name")).toHaveValue("Avery");

  await page.getByTitle("Shared room").click();
  await page.locator("#room-name").fill("Avery");
  await page.getByRole("button", { name: "Create room" }).click();
  await expect(page.locator("#drawer-body h3")).toContainText(/^Room [A-F0-9]{6}$/);
  expect(errors).toEqual([]);
});

test("archived World Labs model decodes locally without corrupting the core world", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  const errors = captureErrors(page);
  await page.goto("/");
  await page.getByTitle("World Atlas").click();
  await page.getByRole("button", { name: /Marble Archive/ }).click();
  await page.waitForFunction(() => window.__MUSE_APP__.engine.worldLayer.splat?.splat?.isInitialized, null, { timeout: 30_000 });
  const state = await page.evaluate(() => ({
    sceneryVisible: window.__MUSE_APP__.engine.worldLayer.scenery.visible,
    artworkAnchors: window.__MUSE_APP__.engine.worldLayer.artworks.size,
    actors: window.__MUSE_APP__.engine.scene.children.filter((item) => item.userData?.actor).length
  }));
  expect(state).toEqual({ sceneryVisible: false, artworkAnchors: 3, actors: 2 });
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.screenshot({ path: "artifacts/screenshots/desktop-marble.png" });
  expect(errors).toEqual([]);
});

test("mobile controls and question layout do not collide", async ({ page }) => {
  await page.setViewportSize(mobile);
  const errors = captureErrors(page);
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => window.__MUSE_METRICS__?.actors || 0)).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  await page.screenshot({ path: "artifacts/screenshots/mobile-initial.png" });
  await page.evaluate(() => { window.__MUSE_APP__.engine.director.speed = 14; });
  await page.getByRole("button", { name: "How color creates emotion" }).click();
  await expect(page.locator("[data-answer='quiet']")).toBeVisible();
  const boxes = await page.evaluate(() => {
    const rect = (selector) => {
      const value = document.querySelector(selector).getBoundingClientRect();
      return { top: value.top, bottom: value.bottom, left: value.left, right: value.right };
    };
    return { dialogue: rect("#dialogue"), joystick: rect("#joystick"), follow: rect("#follow-button") };
  });
  expect(boxes.dialogue.bottom).toBeLessThanOrEqual(boxes.joystick.top);
  expect(boxes.dialogue.bottom).toBeLessThanOrEqual(boxes.follow.top);
  const before = await page.evaluate(() => window.__MUSE_APP__.engine.player.group.position.toArray());
  const stick = page.locator("#joystick");
  const box = await stick.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 5, box.y + box.height / 2);
  await page.waitForTimeout(350);
  await page.mouse.up();
  const after = await page.evaluate(() => window.__MUSE_APP__.engine.player.group.position.toArray());
  expect(after[0]).not.toBeCloseTo(before[0], 2);
  await page.screenshot({ path: "artifacts/screenshots/mobile-question.png" });
  expect(errors).toEqual([]);
});

function captureErrors(page) {
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function canvasPixels(page) {
  const box = await page.locator("canvas").boundingBox();
  const clip = {
    x: box.x + box.width * 0.2,
    y: box.y + box.height * 0.12,
    width: box.width * 0.6,
    height: box.height * 0.48
  };
  const screenshot = await page.screenshot({ clip });
  return page.evaluate(async (encoded) => {
    const image = new Image();
    image.src = `data:image/png;base64,${encoded}`;
    await image.decode();
    const sample = document.createElement("canvas");
    sample.width = 72;
    sample.height = 45;
    const context = sample.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0, sample.width, sample.height);
    const data = context.getImageData(0, 0, sample.width, sample.height).data;
    const luminance = [];
    const buckets = new Map();
    for (let index = 0; index < data.length; index += 4) {
      const value = Math.round((data[index] + data[index + 1] + data[index + 2]) / 3);
      luminance.push(value);
      const bucket = Math.round(value / 16);
      buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
    }
    const mean = luminance.reduce((sum, value) => sum + value, 0) / luminance.length;
    const variance = luminance.reduce((sum, value) => sum + (value - mean) ** 2, 0) / luminance.length;
    const dominant = Math.max(...buckets.values());
    return { variance, nonDominantRatio: 1 - dominant / luminance.length };
  }, screenshot.toString("base64"));
}

async function sampleMedianFps(page, durationMs) {
  return page.evaluate((duration) => new Promise((resolve) => {
    const deltas = [];
    let started = performance.now();
    let previous = started;
    const tick = (now) => {
      deltas.push(now - previous);
      previous = now;
      if (now - started < duration) requestAnimationFrame(tick);
      else {
        const stable = deltas.slice(5).sort((left, right) => left - right);
        resolve(Math.round(1000 / stable[Math.floor(stable.length / 2)]));
      }
    };
    requestAnimationFrame(tick);
  }), durationMs);
}
