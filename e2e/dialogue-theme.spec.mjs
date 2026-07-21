import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const screenshotRoot = "artifacts/screenshots/dialogue-theme";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.startsWith("/api/")) {
      await route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"visual_test"}' });
      return;
    }
    if (pathname === "/src/main.js") {
      await route.abort("blockedbyclient");
      return;
    }
    if (/\.(?:rad|spz)$/.test(pathname) || pathname.endsWith("-texture-mesh.glb")) {
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
  await page.goto("/?quality=performance", { waitUntil: "domcontentloaded" });
  await page.locator("#dialogue").waitFor({ state: "attached" });
});

test("dialogue stays centered at the bottom on desktop and mobile without dark chrome", async ({ page }) => {
  mkdirSync(screenshotRoot, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 }
  ]) {
    await page.setViewportSize(viewport);
    await presentDialogueFixture(page);
    const layout = await dialogueMetrics(page);
    expect(layout.documentOverflow).toBeLessThanOrEqual(0);
    expect(layout.rootTransparent).toBe(true);
    expect(layout.rootBorderless).toBe(true);
    expect(layout.bubbleLight).toBe(true);
    expect(layout.responseLight).toBe(true);
    expect(layout.centerError).toBeLessThanOrEqual(1);
    expect(layout.responseBottom).toBeGreaterThan(viewport.height * 0.55);
    expect(layout.responseTouchesMovement).toBe(false);
    expect(layout.allAnswersVisible).toBe(true);

    const originalBottom = layout.responseBottom;
    await page.evaluate(() => {
      document.querySelector("#guide-line").textContent = "A longer spoken passage can wrap naturally without moving the response controls or covering the people in the scene.";
    });
    expect(Math.abs((await dialogueMetrics(page)).responseBottom - originalBottom)).toBeLessThanOrEqual(1);
    await capturePageWithCdp(cdp, `${screenshotRoot}/${viewport.name}-question.png`);
  }
});

test("multi-speaker conversation uses the same stable bottom language", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => {
    const app = document.querySelector("#app");
    app.dataset.narrativeStage = "world-exploration";
    app.dataset.companionConversation = "true";
    app.removeAttribute("data-world-presentation");
    document.querySelector("#world-transition").hidden = true;
    document.querySelector("#entry-panel").hidden = true;
    document.querySelector("#dialogue").hidden = true;
    const conversation = document.querySelector("#companion-conversation");
    conversation.hidden = false;
    conversation.dataset.speakerId = "monet";
    delete conversation.dataset.anchored;
    delete conversation.dataset.anchorPlacement;
    document.querySelector("#companion-conversation-speaker").textContent = "Claude Monet";
    document.querySelector("#companion-conversation-line").textContent = "Follow the pale edge: the changing contrast pulls your attention back toward the artwork.";
    document.querySelector("#companion-conversation-progress").textContent = "1 / 3";
  });
  const metrics = await page.locator("#companion-conversation").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element.querySelector(".conversation-bubble"));
    return {
      centered: Math.abs(rect.left + rect.width / 2 - window.innerWidth / 2) <= 1,
      bottomGap: window.innerHeight - rect.bottom,
      light: isLight(style.backgroundColor),
      anchored: element.dataset.anchored === "true",
      speakerId: element.dataset.speakerId
    };

    function isLight(color) {
      const channels = color.match(/[\d.]+/g)?.map(Number) || [];
      return channels.length >= 3 && channels[0] + channels[1] + channels[2] > 570;
    }
  });
  expect(metrics).toMatchObject({ centered: true, light: true, anchored: false, speakerId: "monet" });
  expect(metrics.bottomGap).toBeGreaterThanOrEqual(40);
  expect(metrics.bottomGap).toBeLessThanOrEqual(120);
  const cdp = await page.context().newCDPSession(page);
  await capturePageWithCdp(cdp, `${screenshotRoot}/desktop-conversation.png`);
});

async function capturePageWithCdp(cdp, path) {
  const { data } = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false
  });
  writeFileSync(path, Buffer.from(data, "base64"));
}

async function presentDialogueFixture(page) {
  await page.evaluate(() => {
    const app = document.querySelector("#app");
    app.dataset.narrativeStage = "world-exploration";
    app.removeAttribute("data-world-presentation");
    delete app.dataset.companionConversation;
    document.querySelector("#world-transition").hidden = true;
    document.querySelector("#entry-panel").hidden = true;
    document.querySelector("#companion-conversation").hidden = true;
    const dialogue = document.querySelector("#dialogue");
    dialogue.hidden = false;
    dialogue.dataset.speakerId = "monet";
    document.querySelector("#speaker-name").textContent = "MONET · AI LENS";
    document.querySelector("#guide-state").textContent = "LOOKING";
    document.querySelector("#guide-line").textContent = "Look at the frame, then let your eye return to the light inside the painting.";
    document.querySelector("#stop-title").textContent = "The Threshold Conservatory · Artwork 1 of 3";
    const answers = document.querySelector("#answers");
    answers.replaceChildren(...["Follow the brightest edge", "Notice the repeated shape", "Question the doorway"].map((label) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.answer = label;
      button.textContent = label;
      return button;
    }));
  });
  await page.waitForTimeout(100);
}

async function dialogueMetrics(page) {
  return page.evaluate(() => {
    const root = document.querySelector("#dialogue");
    const bubble = document.querySelector("#dialogue-bubble");
    const response = document.querySelector("#dialogue-response");
    const movement = document.querySelector("#movement-controls");
    const rootStyle = getComputedStyle(root);
    const bubbleStyle = getComputedStyle(bubble);
    const responseStyle = getComputedStyle(response);
    const rootRect = root.getBoundingClientRect();
    const responseRect = response.getBoundingClientRect();
    const movementRect = movement.getBoundingClientRect();
    const answerRects = [...document.querySelectorAll("#answers > button")].map((button) => button.getBoundingClientRect());
    const overlaps = responseRect.left < movementRect.right && responseRect.right > movementRect.left
      && responseRect.top < movementRect.bottom && responseRect.bottom > movementRect.top;
    return {
      documentOverflow: document.documentElement.scrollWidth - window.innerWidth,
      rootTransparent: alpha(rootStyle.backgroundColor) === 0,
      rootBorderless: parseFloat(rootStyle.borderTopWidth) === 0,
      bubbleLight: isLight(bubbleStyle.backgroundColor),
      responseLight: isLight(responseStyle.backgroundColor),
      centerError: Math.abs(responseRect.left + responseRect.width / 2 - rootRect.left - rootRect.width / 2),
      responseBottom: responseRect.bottom,
      responseTouchesMovement: overlaps && getComputedStyle(movement).display !== "none",
      allAnswersVisible: answerRects.every((rect) => rect.top >= responseRect.top - 1 && rect.bottom <= responseRect.bottom + 1)
    };

    function channels(color) {
      return color.match(/[\d.]+/g)?.map(Number) || [];
    }
    function alpha(color) {
      const values = channels(color);
      return values.length >= 4 ? values[3] : 1;
    }
    function isLight(color) {
      const values = channels(color);
      return values.length >= 3 && values[0] + values[1] + values[2] > 570;
    }
  });
}
