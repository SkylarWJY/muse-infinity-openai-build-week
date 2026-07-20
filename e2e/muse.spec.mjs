import { test, expect } from "@playwright/test";

const desktop = { width: 1440, height: 900 };
const mobile = { width: 390, height: 844 };

test.describe.configure({ mode: "serial" });

test("archived threshold boots the real museum and moving Monet model", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize(desktop);
  const errors = captureErrors(page);
  await page.goto("/");
  await waitForArchivedWorld(page, "bright-gallery");
  await page.waitForFunction(() => window.__MUSE_APP__?.engine?.guide?.ready === true);
  await page.waitForFunction(() => window.__MUSE_APP__?.engine?.player?.loaded === true);
  await page.waitForFunction(() => window.__MUSE_APP__?.engine?.player?.ready === true);

  const state = await page.evaluate(() => {
    const { engine } = window.__MUSE_APP__;
    const { splat, spark } = engine.worldLayer.splat;
    let shaderInstalled = false;
    engine.guide.model.traverse((object) => {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      shaderInstalled ||= materials.some((material) => material?.customProgramCacheKey?.().startsWith("muse-archived-avatar-motion-"));
    });
    let learnerSkins = 0;
    engine.player.model.traverse((object) => { learnerSkins += object.isSkinnedMesh ? 1 : 0; });
    return {
      world: engine.activeWorld.id,
      worldAsset: splat.userData.archivedWorld,
      activeSplats: splat.numSplats,
      lodSplats: splat.packedSplats?.lodSplats?.numSplats || 0,
      lodTarget: spark.lodSplatCount,
      sceneryVisible: engine.worldLayer.scenery.visible,
      companion: engine.guide.companion.id,
      companionAsset: engine.guide.group.userData.asset,
      playerAsset: engine.player.group.userData.asset,
      playerReady: engine.player.ready,
      playerRig: engine.player.model?.userData.motionRig,
      playerClips: engine.player.model?.userData.animationClips,
      actors: engine.scene.children.filter((item) => item.userData?.actor).length,
      rig: engine.guide.model.userData.motionRig,
      shaderInstalled,
      learnerAsset: engine.player.group.userData.asset,
      learnerModel: engine.player.group.userData.model,
      learnerFallback: engine.player.group.userData.fallback,
      learnerRig: engine.player.model.userData.motionRig,
      learnerClips: engine.player.model.userData.animationClips,
      correctedSkinWeights: engine.player.model.userData.correctedSkinWeights,
      learnerSkins
    };
  });

  expect(state).toMatchObject({
    world: "bright-gallery",
    worldAsset: "bright-gallery",
    sceneryVisible: false,
    companion: "monet",
    companionAsset: "/assets/characters/monet.glb",
    playerAsset: "/assets/characters/learner.glb",
    playerReady: true,
    playerRig: "skeletal-animation",
    playerClips: ["preset:idle", "preset:walk"],
    actors: 2,
    rig: "procedural-limbs",
    shaderInstalled: true,
    learnerAsset: "/assets/characters/learner.glb",
    learnerModel: "gpt-image-2-tripo-rig-v1",
    learnerFallback: false,
    learnerRig: "skeletal-animation",
    learnerClips: ["preset:idle", "preset:walk"],
    correctedSkinWeights: 126,
    learnerSkins: 1
  });
  expect(state.activeSplats).toBeGreaterThan(50_000);
  expect(state.activeSplats).toBeLessThanOrEqual(state.lodTarget + 2_000);
  expect(state.lodSplats).toBeGreaterThan(500_000);

  const playerBefore = await page.evaluate(() => window.__MUSE_APP__.engine.player.group.position.toArray());
  await page.keyboard.down("KeyW");
  await page.waitForFunction(() => window.__MUSE_APP__.engine.player.group.userData.motion === "walk");
  await page.waitForTimeout(350);
  await page.keyboard.up("KeyW");
  const playerAfter = await page.evaluate(() => window.__MUSE_APP__.engine.player.group.position.toArray());
  expect(Math.hypot(playerAfter[0] - playerBefore[0], playerAfter[2] - playerBefore[2])).toBeGreaterThan(0.2);

  await page.keyboard.down("w");
  await page.waitForFunction(() => {
    const player = window.__MUSE_APP__.engine.player;
    return player.group.userData.motion === "walk" && player.actions.walk.getEffectiveWeight() > 0.5;
  });
  await page.keyboard.up("w");
  await page.waitForFunction(() => {
    const player = window.__MUSE_APP__.engine.player;
    return player.group.userData.motion === "idle" && player.actions.idle.getEffectiveWeight() > 0.5;
  });

  const pixels = await canvasPixels(page);
  expect(pixels.variance).toBeGreaterThan(220);
  expect(pixels.nonDominantRatio).toBeGreaterThan(0.16);
  await page.screenshot({ path: "artifacts/screenshots/desktop-archived-threshold.png" });
  expect(errors).toEqual([]);
});

test("company selection loads the first invited muse-infinity companion", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize(desktop);
  const errors = captureErrors(page);
  await page.goto("/");
  await page.waitForFunction(() => window.__MUSE_APP__?.engine?.guide?.ready === true);

  const preset = page.getByRole("button", { name: "How composition moves my attention" });
  const box = await preset.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator("#entry-panel")).toHaveAttribute("data-stage", "company");
  await expect(page.locator("[data-companion]")).toHaveCount(5);
  expect(await loadedImages(page, ".companion-choice img")).toBe(5);
  await expect(page.locator("[data-companion][aria-pressed='true']")).toHaveCount(3);
  await page.screenshot({ path: "artifacts/screenshots/desktop-company.png" });

  await dispatchClick(page, "[data-companion='monet']");
  await expect(page.locator("[data-companion='monet']")).toHaveAttribute("aria-pressed", "false");
  await dispatchClick(page, "[data-companion='frida']");
  await expect(page.locator("[data-companion='frida']")).toHaveAttribute("aria-pressed", "true");
  let releaseCompanion;
  const companionGate = new Promise((resolve) => { releaseCompanion = resolve; });
  await page.route("**/van-gogh.glb", async (route) => {
    await companionGate;
    await route.continue();
  });
  try {
    await dispatchClick(page, "[data-entry-action='curate']");
    await expect(page.locator("#entry-panel")).toHaveAttribute("data-stage", "curation");
    await expect(page.locator("[data-entry-action='enter-walk']")).toBeEnabled({ timeout: 2_000 });
    expect(await page.evaluate(() => ({
      guide: window.__MUSE_APP__.engine.guide.companion.id,
      ready: window.__MUSE_APP__.engine.guide.ready,
      fallback: Boolean(window.__MUSE_APP__.engine.guide.fallback)
    }))).toEqual({ guide: "van-gogh", ready: false, fallback: true });
  } finally {
    releaseCompanion();
  }
  await page.waitForFunction(() => window.__MUSE_APP__.engine.guide.ready === true);

  const selection = await page.evaluate(() => ({
    draft: window.__MUSE_APP__.state.draftCompanions,
    selected: window.__MUSE_APP__.state.selectedCompanions,
    guide: window.__MUSE_APP__.engine.guide.companion.id,
    asset: window.__MUSE_APP__.engine.guide.group.userData.asset
  }));
  expect(selection).toEqual({
    draft: ["van-gogh", "socrates", "frida"],
    selected: ["van-gogh", "socrates", "frida"],
    guide: "van-gogh",
    asset: "/assets/characters/van-gogh.glb"
  });
  expect(errors).toEqual([]);
});

test("complete embodied journey reaches Salon and a rewritten archived world", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize(desktop);
  const errors = captureErrors(page);
  await page.goto("/");
  await waitForArchivedWorld(page, "bright-gallery");
  await startDefaultWalk(page);

  await dispatchClick(page, "[data-drawer='salon']");
  await expect(page.getByRole("button", { name: "Convene perspectives" })).toBeDisabled();
  await expect(page.locator("#drawer-body")).toContainText("Complete the three-stop route");
  expect(await page.evaluate(() => window.__MUSE_APP__.engine.salonActors.length)).toBe(0);
  await dispatchClick(page, "[data-drawer='salon']");

  for (let index = 0; index < 3; index += 1) {
    await arriveAtCurrentStop(page);
    await expect(page.locator("[data-answer]").first()).toBeVisible();
    if (index === 0) {
      await dispatchClick(page, "[data-drawer='atlas']");
      await dispatchClick(page, "[data-drawer-action='world'][data-value='infinity-room']");
      await waitForArchivedWorld(page, "infinity-room");
      await dispatchClick(page, "[data-answer]");
      expect(await page.evaluate(() => window.__MUSE_APP__.session.phase)).toBe("asking");
      await expect(page.locator("#toast")).toContainText("reach and face the evidence");
      await page.waitForFunction(() => {
        const { director } = window.__MUSE_APP__.engine;
        return director.state === "asking" && director.correspondence().synced;
      });
      await dispatchClick(page, "[data-action='close-drawer']");
    }
    await dispatchClick(page, "[data-answer]");
    await page.waitForFunction(() => window.__MUSE_APP__.session.phase === "reflecting");
    await dispatchClick(page, "#continue-button");
    if (index < 2) await page.waitForFunction(() => window.__MUSE_APP__.session.phase === "walking");
  }

  await page.waitForFunction(() => window.__MUSE_APP__.session.phase === "complete");
  await expect(page.locator("#guide-state")).toHaveText("LEARNING MAP");
  await expect(page.locator("#answers .perspective")).toHaveCount(3);
  expect(await page.evaluate(() => window.__MUSE_APP__.journey.stage)).toBe("salon");

  await dispatchClick(page, "#continue-button");
  await page.waitForFunction(() => {
    const app = window.__MUSE_APP__;
    return !document.querySelector("#drawer").hidden
      && document.querySelectorAll("#drawer .perspective").length === 3
      && app.engine.salonActors.length === 3
      && app.engine.salonActors.every((actor) => actor.ready);
  });
  await expect(page.locator("#dialogue")).toHaveCSS("visibility", "hidden");
  const salon = await page.evaluate(() => ({
    actors: window.__MUSE_APP__.engine.salonActors.map((actor) => actor.companion.id),
    paths: window.__MUSE_APP__.engine.salonActors.map((actor) => actor.group.userData.asset)
  }));
  expect(salon.actors).toEqual(["monet", "van-gogh", "socrates"]);
  expect(salon.paths.every((value) => value.startsWith("/assets/characters/"))).toBe(true);
  await page.screenshot({ path: "artifacts/screenshots/desktop-salon.png" });

  await dispatchClick(page, "[data-drawer='atlas']");
  await page.waitForFunction(() => window.__MUSE_APP__.engine.salonActors.length === 0);
  await dispatchClick(page, "[data-drawer='salon']");
  await page.waitForFunction(() => window.__MUSE_APP__.engine.salonActors.length === 3
    && window.__MUSE_APP__.engine.salonActors.every((actor) => actor.ready));

  await dispatchClick(page, "[data-drawer-action='open-rewrite']");
  await expect(page.locator("#entry-panel")).toHaveAttribute("data-stage", "rewrite");
  await expect(page.locator("[data-entry-action='rewrite']")).toHaveCount(2);
  expect(await loadedImages(page, ".rewrite-choice img")).toBe(2);
  expect(await page.evaluate(() => window.__MUSE_APP__.journey.stage)).toBe("salon");

  await dispatchClick(page, "[data-entry-action='rewrite'][data-world='van-gogh-gallery']");
  await expect(page.locator("#entry-panel")).toHaveAttribute("data-stage", "manifesto");
  await waitForArchivedWorld(page, "van-gogh-gallery");
  expect(await page.evaluate(() => window.__MUSE_APP__.journey.stage)).toBe("rewrite");
  expect(await page.evaluate(() => window.__MUSE_APP__.engine.salonActors.length)).toBe(0);

  await dispatchClick(page, "[data-entry-action='enter-final']");
  await expect(page.locator("#guide-state")).toHaveText("WORLD LIVE");
  await expect(page.locator("#stop-title")).toHaveText("Van Gogh Gallery");
  const finalPixels = await canvasPixels(page);
  expect(finalPixels.variance).toBeGreaterThan(220);
  await page.screenshot({ path: "artifacts/screenshots/desktop-final-van-gogh.png" });
  expect(errors).toEqual([]);
});

test("Atlas switches between both additional archived scenes", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  const errors = captureErrors(page);
  await page.goto("/");
  await waitForArchivedWorld(page, "bright-gallery");

  const raceState = await page.evaluate(() => new Promise((resolve, reject) => {
    const { engine } = window.__MUSE_APP__;
    const spark = engine.worldLayer.splat.spark;
    window.__MUSE_RETIRED_SPARK__ = spark;
    spark.readPause = 250;
    spark.lastSortTime = 0;
    spark.sortDirty = true;
    spark.driveSort();
    const deadline = performance.now() + 10_000;
    const tick = () => {
      const sortMessages = Object.keys(spark.sortWorker?.messages || {}).length;
      const lodMessages = Object.keys(spark.lodWorker?.messages || {}).length;
      if (spark.sorting === true && sortMessages === 0 && lodMessages === 0) {
        window.__MUSE_RACE_SWITCH__ = engine.setWorld("van-gogh-gallery");
        resolve({ sorting: spark.sorting, sortMessages, lodMessages });
        return;
      }
      if (performance.now() > deadline) {
        reject(new Error("spark_sort_window_timeout"));
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  }));
  expect(raceState).toEqual({ sorting: true, sortMessages: 0, lodMessages: 0 });
  await page.evaluate(() => window.__MUSE_RACE_SWITCH__);
  await waitForArchivedWorld(page, "van-gogh-gallery");
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => ({
    autoUpdate: window.__MUSE_RETIRED_SPARK__.autoUpdate,
    sortWorker: window.__MUSE_RETIRED_SPARK__.sortWorker,
    lodWorker: window.__MUSE_RETIRED_SPARK__.lodWorker
  }))).toEqual({ autoUpdate: false, sortWorker: null, lodWorker: null });
  expect(errors).toEqual([]);

  await dispatchClick(page, "[data-drawer='atlas']");

  for (const world of [
    { id: "van-gogh-gallery", name: "VAN GOGH GALLERY" },
    { id: "infinity-room", name: "INFINITY DOT ROOM" }
  ]) {
    await dispatchClick(page, `[data-drawer-action='world'][data-value='${world.id}']`);
    await waitForArchivedWorld(page, world.id);
    await expect(page.locator("#world-name")).toHaveText(world.name);
    const state = await page.evaluate(() => {
      const { engine } = window.__MUSE_APP__;
      return {
        world: engine.activeWorld.id,
        activeSplats: engine.worldLayer.splat.splat.numSplats,
        scale: engine.worldLayer.splat.splat.scale.x,
        actors: engine.scene.children.filter((item) => item.userData?.actor).length
      };
    });
    expect(state.world).toBe(world.id);
    expect(state.activeSplats).toBeGreaterThan(50_000);
    expect(state.activeSplats).toBeLessThan(135_000);
    expect(state.actors).toBe(2);
    expect((await canvasPixels(page)).variance).toBeGreaterThan(180);
    await page.screenshot({ path: `artifacts/screenshots/desktop-atlas-${world.id}.png` });
  }

  const rapidSwitches = await page.evaluate(async () => {
    const { engine } = window.__MUSE_APP__;
    const first = engine.setWorld("van-gogh-gallery");
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = engine.setWorld("infinity-room");
    await Promise.all([first, second]);
    const { spawn, guideSpawn, yaw } = engine.activeWorld.profile;
    return {
      world: engine.activeWorld.id,
      layer: engine.worldLayer.activeWorld.id,
      player: engine.player.group.position.toArray(),
      guide: engine.guide.group.position.toArray(),
      expectedPlayer: [spawn.x + Math.cos(yaw) * 0.5, 0, spawn.z + Math.sin(yaw) * 0.5],
      expectedGuide: [guideSpawn.x, 0, guideSpawn.z]
    };
  });
  await waitForArchivedWorld(page, "infinity-room");
  expect(rapidSwitches.world).toBe("infinity-room");
  expect(rapidSwitches.layer).toBe("infinity-room");
  for (let index = 0; index < 3; index += 1) {
    expect(rapidSwitches.player[index]).toBeCloseTo(rapidSwitches.expectedPlayer[index], 5);
    expect(rapidSwitches.guide[index]).toBeCloseTo(rapidSwitches.expectedGuide[index], 5);
  }
  expect(errors).toEqual([]);
});

test("mobile company, curation and question controls do not collide", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize(mobile);
  const errors = captureErrors(page);
  await page.goto("/");
  await waitForArchivedWorld(page, "bright-gallery");
  await dispatchClick(page, "[data-goal]");
  await expect(page.locator("#entry-panel")).toHaveAttribute("data-stage", "company");

  const company = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("[data-companion]")].map((item) => item.getBoundingClientRect());
    return {
      overflow: document.documentElement.scrollWidth - innerWidth,
      columns: new Set(cards.map((card) => Math.round(card.left))).size,
      cardWidths: cards.map((card) => Math.round(card.width)),
      panelScrollable: document.querySelector("#entry-panel").scrollHeight > document.querySelector("#entry-panel").clientHeight
    };
  });
  expect(company.overflow).toBe(0);
  expect(company.columns).toBe(2);
  expect(new Set(company.cardWidths).size).toBe(1);
  expect(company.panelScrollable).toBe(true);

  await page.locator("#entry-panel").evaluate((panel) => panel.scrollTo(0, panel.scrollHeight));
  await dispatchClick(page, "[data-entry-action='curate']");
  await expect(page.locator("#entry-panel")).toHaveAttribute("data-stage", "curation");
  await expect(page.locator("[data-entry-action='enter-walk']")).toBeEnabled();
  await dispatchClick(page, "[data-entry-action='enter-walk']");
  await page.waitForFunction(() => window.__MUSE_APP__.session.phase === "walking");
  await arriveAtCurrentStop(page);

  const boxes = await page.evaluate(() => {
    const rect = (selector) => {
      const value = document.querySelector(selector).getBoundingClientRect();
      return { top: value.top, bottom: value.bottom, left: value.left, right: value.right };
    };
    return {
      overflow: document.documentElement.scrollWidth - innerWidth,
      dialogue: rect("#dialogue"),
      joystick: rect("#joystick"),
      follow: rect("#follow-button")
    };
  });
  expect(boxes.overflow).toBe(0);
  expect(boxes.dialogue.bottom).toBeLessThanOrEqual(boxes.joystick.top);
  expect(boxes.dialogue.bottom).toBeLessThanOrEqual(boxes.follow.top);

  const stick = page.locator("#joystick");
  const stickBox = await stick.boundingBox();
  await page.mouse.move(stickBox.x + stickBox.width / 2, stickBox.y + stickBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(stickBox.x + stickBox.width - 5, stickBox.y + stickBox.height / 2);
  expect(await page.evaluate(() => window.__MUSE_APP__.engine.touchVector.x)).toBeGreaterThan(0.5);
  await page.mouse.up();
  await page.screenshot({ path: "artifacts/screenshots/mobile-question.png" });
  expect(errors).toEqual([]);
});

test("auxiliary tools remain bounded without credentials", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize(desktop);
  const errors = captureErrors(page);
  await page.goto("/");
  await page.waitForFunction(() => window.__MUSE_APP__);

  await dispatchClick(page, "[data-drawer='forge']");
  await expect(page.getByRole("button", { name: "Generate world" })).toBeDisabled();
  await expect(page.locator("#drawer-body")).toContainText("archived worlds");

  await dispatchClick(page, "[data-drawer='profile']");
  await page.locator("#profile-name").fill("Avery");
  await dispatchClick(page, "[data-drawer-action='save-profile']");
  await page.reload();
  await dispatchClick(page, "[data-drawer='profile']");
  await expect(page.locator("#profile-name")).toHaveValue("Avery");

  await dispatchClick(page, "[data-drawer='room']");
  await page.locator("#room-name").fill("Avery");
  await dispatchClick(page, "[data-drawer-action='create-room']");
  await expect(page.locator("#drawer-body h3")).toContainText(/^Room [A-F0-9]{6}$/);
  expect(errors).toEqual([]);
});

async function startDefaultWalk(page) {
  await dispatchClick(page, "[data-goal]");
  await page.waitForFunction(() => document.querySelector("#entry-panel")?.dataset.stage === "company");
  await dispatchClick(page, "[data-entry-action='curate']");
  await page.waitForFunction(() => {
    const button = document.querySelector("[data-entry-action='enter-walk']");
    return document.querySelector("#entry-panel")?.dataset.stage === "curation" && button && !button.disabled;
  });
  await dispatchClick(page, "[data-entry-action='enter-walk']");
  await page.waitForFunction(() => window.__MUSE_APP__.journey.stage === "walk" && window.__MUSE_APP__.session.phase === "walking");
}

async function arriveAtCurrentStop(page) {
  await page.evaluate(() => {
    const director = window.__MUSE_APP__.engine.director;
    director.object.position.copy(director.target);
    const delta = director.lookAt.clone().sub(director.object.position);
    director.object.rotation.y = Math.atan2(delta.x, delta.z);
    director.transition("asking");
  });
  await page.waitForFunction(() => window.__MUSE_APP__.session.phase === "asking" && document.querySelector("[data-answer]"));
}

async function waitForArchivedWorld(page, worldId) {
  await page.waitForFunction((id) => {
    const engine = window.__MUSE_APP__?.engine;
    const splat = engine?.worldLayer?.splat?.splat;
    return engine?.activeWorld?.id === id
      && splat?.isInitialized === true
      && splat.userData.archivedWorld === id
      && splat.numSplats > 0
      && engine.worldLayer.scenery.visible === false;
  }, worldId, { timeout: 120_000 });
}

async function dispatchClick(page, selector) {
  await page.evaluate((value) => {
    const item = document.querySelector(value);
    if (!item) throw new Error(`missing_click_target:${value}`);
    item.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  }, selector);
}

async function loadedImages(page, selector) {
  return page.locator(selector).evaluateAll((images) => images.filter((image) => image.complete && image.naturalWidth > 0).length);
}

function captureErrors(page) {
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function canvasPixels(page) {
  const box = await page.locator("canvas").boundingBox();
  const screenshot = await page.screenshot({ clip: {
    x: box.x + box.width * 0.18,
    y: box.y + box.height * 0.1,
    width: box.width * 0.64,
    height: box.height * 0.5
  }});
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
