import { test, expect } from "@playwright/test";
import { createFallbackSalon, createFallbackTransformation } from "../shared/contracts.js";

const desktop = { width: 1440, height: 900 };
const mobile = { width: 390, height: 844 };
const appUrl = process.env.MUSE_E2E_BASE_URL || "/?quality=high";

const PROCESS = Object.freeze([
  { sceneId: "threshold-conservatory", worldId: "grand-conservatory-with-lush-gardens", title: "The Threshold Conservatory" },
  { sceneId: "court-of-light", worldId: "elegant-floral-palace-interior", title: "The Court of Light" },
  { sceneId: "water-and-light", worldId: "enchanted-water-garden-sanctuary", title: "The Garden of Water and Light" },
  { sceneId: "sunset-frames", worldId: "dreamlike-coastal-villa-gardens", title: "The Sunset Frame Gallery" },
  { sceneId: "burning-sky", worldId: "van-gogh-inspired-gallery-interior", title: "The Studio of the Burning Sky" },
  { sceneId: "petal-transition", worldId: "sunlit-palace-gardens", title: "The Petal Transition Hall" },
  { sceneId: "living-memory", worldId: "mexican-courtyard-bedroom-fantasy", title: "The Courtyard of Living Memory" },
  { sceneId: "infinite-repetition", worldId: "yellow-polka-dot-infinity-room", title: "The Infinite Repetition Chamber" }
]);

const FINAL = Object.freeze({
  sceneId: "personal-dream-world",
  worldId: "fantasy-realm-of-shimmering-spheres",
  name: "Fantasy Realm of Shimmering Spheres"
});

const FREE_OBSERVATION = "The reflected doorway brightens when I step beside the water.";
const LIVE_INQUIRY = Object.freeze({
  question: "How does the doorway redirect my attention?",
  perspectives: Object.freeze([
    Object.freeze({
      speakerId: "monet",
      speaker: "Claude Monet",
      text: "Follow the pale edge of the doorway: its changing contrast pulls your eye from the garden into the room.",
      effect: "echo"
    }),
    Object.freeze({
      speakerId: "van-gogh",
      speaker: "Vincent van Gogh",
      text: "The stronger color around the opening makes the threshold feel charged rather than passive.",
      effect: "warmth"
    }),
    Object.freeze({
      speakerId: "socrates",
      speaker: "Socrates",
      text: "Which visible edge makes you call the doorway an invitation instead of a boundary?",
      effect: "focus"
    })
  ])
});

const DOMAIN_STAGES = Object.freeze([
  "threshold",
  "life_question",
  "companion_selection",
  "ai_curation",
  "world_exploration",
  "summoning",
  "roundtable",
  "decision",
  "world_transformation",
  "manifesto"
]);

const COMPANION_NAMES = Object.freeze([
  "Claude Monet",
  "Vincent van Gogh",
  "Socrates",
  "Frida Kahlo",
  "Pablo Picasso",
  "Sigmund Freud",
  "Qi Baishi",
  "Yayoi Kusama"
]);

test.describe.configure({ mode: "serial" });

test("the canonical ten-stage journey carries eight worlds into one gated answer world", async ({ page }) => {
  test.setTimeout(480_000);
  await page.setViewportSize(desktop);
  const errors = captureErrors(page);
  const interceptedModelRequests = [];
  const dialogueRequests = [];
  await installCuratedModelRoutes(page, interceptedModelRequests, dialogueRequests);
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__MUSE_APP__));
  await installStageTrace(page);

  await test.step("the threshold renders the real high-fidelity RAD archive", async () => {
    await expect(page.locator("#entry-panel")).toHaveAttribute("data-stage", "threshold");
    await expect(page.locator("#route-list > li")).toHaveCount(8);
    await waitForRealRadWorld(page, PROCESS[0].worldId);
    await page.waitForFunction(() => {
      const { engine } = window.__MUSE_APP__;
      return engine.player?.ready === true
        && engine.guide?.ready === true
        && engine.partyActors?.length === 2
        && engine.partyActors.every((actor) => actor.ready === true && actor.group.visible === true);
    }, null, { timeout: 90_000 });

    const archive = await page.evaluate(() => {
      const { engine } = window.__MUSE_APP__;
      const { spark, splat } = engine.worldLayer.archive;
      return {
        world: engine.activeWorld.id,
        source: engine.activeWorld.rad,
        sourceSplats: engine.activeWorld.sourceSplats,
        live: engine.worldLayer.isLive(engine.activeWorld.id),
        type: engine.worldLayer.archive.type,
        format: splat.userData.archiveFormat,
        paged: Boolean(splat.paged),
        pagedLodSplats: splat.paged?.numSplats || 0,
        activeSplats: spark.activeSplats || 0,
        sceneryVisible: engine.worldLayer.scenery.visible,
        companion: engine.guide.companion.id,
        companionAsset: engine.guide.group.userData.asset,
        party: engine.partyActors.map((actor) => actor.companion.id),
        partyAssets: engine.partyActors.map((actor) => actor.group.userData.asset),
        learnerReady: engine.player.ready,
        learnerModel: engine.player.group.userData.model,
        learnerFallback: engine.player.group.userData.fallback,
        learnerRig: engine.player.model?.userData.motionRig,
        learnerClips: engine.player.model?.userData.animationClips,
        sourceGradeSkinWeights: engine.player.model?.userData.sourceGradeSkinWeights,
        actors: engine.scene.children.filter((item) => item.userData?.actor).length
      };
    });
    expect(archive).toMatchObject({
      world: PROCESS[0].worldId,
      sourceSplats: 4_320_000,
      live: true,
      type: "splat",
      format: "rad",
      paged: true,
      sceneryVisible: false,
      companion: "monet",
      companionAsset: "/assets/characters/monet.glb",
      learnerReady: true,
      learnerModel: "gpt-image-2-tripo-v31-biped-v2",
      learnerFallback: false,
      learnerRig: "skeletal-animation",
      learnerClips: ["preset:biped:wait", "preset:biped:walk"],
      sourceGradeSkinWeights: true,
      party: ["van-gogh", "socrates"],
      partyAssets: ["/assets/characters/van-gogh.glb", "/assets/characters/socrates.glb"],
      actors: 4
    });
    expect(archive.source).toMatch(/\.rad$/);
    expect(archive.pagedLodSplats).toBeGreaterThan(0);
    expect(archive.activeSplats).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.__MUSE_APP__.canOpenDialogue())).toBe(false);
    await page.locator("#voice-tool").click();
    await expect(page.locator("#toast")).toContainText("Reach and face the current artwork");
    expect(await page.evaluate(() => window.__MUSE_APP__.voiceActive())).toBe(false);

    const pixels = await canvasPixels(page, "artifacts/screenshots/desktop-rad-threshold.png");
    expect(pixels.variance).toBeGreaterThan(180);
    expect(pixels.nonDominantRatio).toBeGreaterThan(0.12);
    await constrainRadAfterScreenshot(page);

    const before = await playerPosition(page);
    const partyBefore = await partyPositions(page);
    await page.keyboard.down("w");
    await page.waitForFunction(() => window.__MUSE_APP__.engine.player.group.userData.motion === "walk");
    await page.waitForTimeout(250);
    const firstLegPose = await playerLegPose(page);
    await page.waitForTimeout(220);
    const secondLegPose = await playerLegPose(page);
    await page.keyboard.up("w");
    await page.waitForFunction(() => window.__MUSE_APP__.engine.player.group.userData.motion === "idle");
    await page.waitForTimeout(350);
    const after = await playerPosition(page);
    const partyAfter = await partyPositions(page);
    expect(planarDistance(before, after)).toBeGreaterThan(0.15);
    for (const [index, position] of partyAfter.entries()) {
      expect(planarDistance(partyBefore[index], position)).toBeGreaterThan(0.08);
    }
    expect(poseDistance(firstLegPose, secondLegPose)).toBeGreaterThan(0.02);

  });

  await installLightweightWorldSwitches(page);

  await test.step("Atlas exposes only process worlds and cannot create evidence", async () => {
    await page.locator("[data-drawer='atlas']").click();
    const atlas = page.locator("[data-drawer-action='world']");
    await expect(atlas).toHaveCount(8);
    expect(await atlas.evaluateAll((items) => items.map((item) => item.dataset.value))).toEqual(PROCESS.map((item) => item.worldId));
    await expect(page.locator(`[data-drawer-action='world'][data-value='${FINAL.worldId}']`)).toHaveCount(0);
    await expect(page.locator("#drawer-body")).toContainText("09 / ANSWER remains outside the Atlas");
    await expect(page.locator("[data-drawer-action='world']:not([disabled])")).toHaveCount(1);

    await atlas.first().click();
    expect(await journeySnapshot(page)).toMatchObject({ stage: "threshold", visited: [], finalWorldEntered: false });
    expect(await page.evaluate(() => window.__MUSE_APP__.session.phase)).toBe("idle");
    await page.locator("[data-action='close-drawer']").click();

    await expect(page.locator("[data-entry-action='enter-final']")).toHaveCount(0);
    await page.evaluate(() => window.__MUSE_APP__.enterFinalWorld());
    await expect(page.locator("#toast")).toContainText("final world requires manifesto");
    expect(await journeySnapshot(page)).toMatchObject({ stage: "threshold", manifesto: "", finalWorldEntered: false });
  });

  await test.step("Threshold, life question, eight-companion chooser and GPT curation stay explicit", async () => {
    await page.locator("[data-entry-action='cross-threshold']").click();
    await expect(page.locator("#entry-panel")).toHaveAttribute("data-stage", "life-question");
    expect(await page.evaluate(() => window.__MUSE_APP__.journey.stage)).toBe("life_question");

    await page.getByRole("button", { name: "How composition moves my attention" }).click();
    await expect(page.locator("#entry-panel")).toHaveAttribute("data-stage", "company");
    expect(await page.evaluate(() => window.__MUSE_APP__.journey.stage)).toBe("companion_selection");
    await expect(page.locator("[data-companion]")).toHaveCount(8);
    expect(await page.locator(".companion-copy b").allTextContents()).toEqual(COMPANION_NAMES);
    await expect(page.locator("[data-companion][aria-pressed='true']")).toHaveCount(3);
    await expect.poll(() => loadedImages(page, ".companion-choice img")).toBe(8);

    await page.setViewportSize(mobile);
    const companyLayout = await mobileLayout(page, "#entry-panel");
    expect(companyLayout.documentOverflow).toBeLessThanOrEqual(0);
    expect(companyLayout.panelOverflow).toBeLessThanOrEqual(0);
    expect(companyLayout.panelTouchesMovement).toBe(false);
    expect(companyLayout.panelTouchesMission).toBe(false);
    expect(companyLayout.columns).toBe(2);
    expect(companyLayout.panelScrollable).toBe(true);
    await page.screenshot({ path: "artifacts/screenshots/mobile-eight-companion-chooser.png" });
    await page.setViewportSize(desktop);

    await page.evaluate(() => {
      const fetchImpl = window.fetch.bind(window);
      window.fetch = (input, init) => {
        if (new URL(String(input), window.location.href).pathname === "/api/lesson/plan") {
          window.fetch = fetchImpl;
          return Promise.reject(new TypeError("simulated_client_disconnect"));
        }
        return fetchImpl(input, init);
      };
    });
    await page.locator("[data-entry-action='curate']").click();
    await expect(page.locator("#entry-panel")).toHaveAttribute("data-stage", "curation");
    expect(await page.evaluate(() => window.__MUSE_APP__.journey.stage)).toBe("ai_curation");
    await expect(page.locator(".curation-route > li")).toHaveCount(8);
    expect(await page.locator(".curation-route > li span").allTextContents()).toEqual(PROCESS.map((item) => item.title));
    await page.waitForFunction(() => {
      const button = document.querySelector("[data-entry-action='enter-walk']");
      return button && !button.disabled && window.__MUSE_APP__.state.busy === false;
    });
    expect(await page.evaluate(() => ({
      provider: window.__MUSE_APP__.state.provider,
      stops: window.__MUSE_APP__.session.plan?.stops?.length,
      goal: window.__MUSE_APP__.session.plan?.learning_goal
    }))).toEqual({
      provider: { live: false, model: "curated-demo", reason: "server_unavailable" },
      stops: 8,
      goal: "How composition moves my attention"
    });
  });

  await test.step("all eight process worlds are visited in canonical order", async () => {
    await page.locator("[data-entry-action='enter-walk']").click();
    await waitForProcessStop(page, 0, "walking");

    const guideBefore = await page.evaluate(() => window.__MUSE_APP__.engine.guide.group.position.toArray());
    await page.waitForTimeout(500);
    const guideAfter = await page.evaluate(() => window.__MUSE_APP__.engine.guide.group.position.toArray());
    expect(planarDistance(guideBefore, guideAfter)).toBeGreaterThan(0.05);

    for (let index = 0; index < PROCESS.length; index += 1) {
      const expected = PROCESS[index];
      await waitForProcessStop(page, index, "walking");
      if (index === PROCESS.length - 1) {
        await waitForRealMeshWorld(page, expected.worldId);
        const sceneEightArchive = await meshArchiveMetrics(page);
        expect(sceneEightArchive).toMatchObject({
          world: expected.worldId,
          archiveWorld: expected.worldId,
          archiveType: "mesh",
          live: true,
          sceneryVisible: false,
          maxTextureWidth: 8192,
          maxTextureHeight: 8192,
          toneMappedMaterials: 0,
          finalWorldEntered: false,
          salonVisible: false,
          guideVisible: true,
          party: [
            { id: "van-gogh", ready: true, visible: true },
            { id: "socrates", ready: true, visible: true }
          ]
        });
        expect(sceneEightArchive.meshCount).toBeGreaterThan(0);
        expect(sceneEightArchive.triangles).toBeGreaterThan(595_000);
        expect((await canvasPixels(page, "artifacts/screenshots/desktop-scene-08-kusama-8k.png")).variance).toBeGreaterThan(120);
        await installLightweightWorldSwitches(page);
      }
      await arriveAtCurrentStop(page);
      expect(await page.evaluate(() => window.__MUSE_APP__.canOpenDialogue())).toBe(true);
      await expect(page.locator("#stop-title")).toContainText(expected.title);
      await expect(page.locator("[data-answer]")).toHaveCount(2);

      if (index === 1) await verifyCurrentArchiveFailureBlocksEvidence(page, expected, index);

      if (index === 0) {
        await verifyLiveInquiry(page, dialogueRequests);
        await page.setViewportSize(mobile);
        const questionLayout = await mobileLayout(page, "#dialogue");
        expect(questionLayout.documentOverflow).toBeLessThanOrEqual(0);
        expect(questionLayout.panelOverflow).toBeLessThanOrEqual(0);
        expect(questionLayout.panelTouchesMovement).toBe(false);
        expect(questionLayout.panelTouchesMission).toBe(false);
        await page.screenshot({ path: "artifacts/screenshots/mobile-first-world-question.png" });
        await page.setViewportSize(desktop);
      }

      if (index === 2) {
        await page.locator("#observation-input").fill(FREE_OBSERVATION);
        await page.locator(".observation-form").evaluate((form) => form.requestSubmit());
      } else {
        await page.locator("[data-answer]").first().click();
      }
      await page.waitForFunction((count) => {
        const app = window.__MUSE_APP__;
        return app.session.phase === "reflecting"
          && app.session.visited.length === count
          && app.journey.visitedSceneIds.length === count;
      }, index + 1);
      expect(await page.evaluate(() => window.__MUSE_APP__.canOpenDialogue())).toBe(false);
      expect((await journeySnapshot(page)).visited).toEqual(PROCESS.slice(0, index + 1).map((item) => item.sceneId));
      await expect(page.locator("#route-list > li.done")).toHaveCount(index + 1);

      if (index === 2) {
        const recordedObservation = await page.evaluate((visitIndex) => {
          const { session, journey } = window.__MUSE_APP__;
          return session.digest({ companion_ids: journey.companions }).visits[visitIndex];
        }, index);
        expect(recordedObservation).toMatchObject({
          stop_id: expected.sceneId,
          answer: FREE_OBSERVATION,
          effect: "focus"
        });
      }

      if (index === 0) {
        await page.locator("[data-drawer='atlas']").click();
        await expect(page.locator("[data-drawer-action='world']")).toHaveCount(8);
        await expect(page.locator("[data-drawer-action='world']:not([disabled])")).toHaveCount(2);
        await page.locator(`[data-drawer-action='world'][data-value='${PROCESS[1].worldId}']`).click();
        await page.waitForFunction((worldId) => window.__MUSE_APP__.engine.activeWorld.id === worldId, PROCESS[1].worldId);
        expect(await page.evaluate(() => ({
          sessionPhase: window.__MUSE_APP__.session.phase,
          sessionStop: window.__MUSE_APP__.session.currentStopId,
          sessionVisited: [...window.__MUSE_APP__.session.visited],
          journeyVisited: [...window.__MUSE_APP__.journey.visitedSceneIds]
        }))).toEqual({
          sessionPhase: "reflecting",
          sessionStop: PROCESS[0].sceneId,
          sessionVisited: [PROCESS[0].sceneId],
          journeyVisited: [PROCESS[0].sceneId]
        });
        await expect(page.locator(`[data-drawer-action='world'][data-value='${FINAL.worldId}']`)).toHaveCount(0);
        await page.locator("[data-action='close-drawer']").click();
      }

      if (index === PROCESS.length - 2) await restoreRealWorldSwitches(page);
      if (index === 1) await verifyAtlasCannotInterruptTransition(page);
      else if (index === 2) await verifyArchiveFailureRequiresRetry(page, PROCESS[index + 1]);
      else await page.locator("#continue-button").click();
      if (index < PROCESS.length - 1) {
        await waitForProcessStop(page, index + 1, "walking");
      } else {
        await page.waitForFunction(() => window.__MUSE_APP__.session.phase === "complete"
          && document.querySelector("#entry-panel")?.dataset.stage === "exploration-complete");
      }
    }

    expect(await page.evaluate(() => window.__MUSE_APP__.journey.stage)).toBe("world_exploration");
    await expect(page.locator(".evidence-count b")).toHaveText("08");
    await expect(page.locator("[data-entry-action='enter-final']")).toHaveCount(0);

    await page.locator("[data-drawer='atlas']").click();
    await expect(page.locator("[data-drawer-action='world']")).toHaveCount(8);
    await expect(page.locator("[data-drawer-action='world']:not([disabled])")).toHaveCount(8);
    await expect(page.locator(`[data-drawer-action='world'][data-value='${FINAL.worldId}']`)).toHaveCount(0);
    expect(await page.evaluate(() => ({
      phase: window.__MUSE_APP__.session.phase,
      sessionVisits: window.__MUSE_APP__.session.visited.length,
      journeyVisits: window.__MUSE_APP__.journey.visitedSceneIds.length,
      finalWorldEntered: window.__MUSE_APP__.journey.finalWorldEntered
    }))).toEqual({ phase: "complete", sessionVisits: 8, journeyVisits: 8, finalWorldEntered: false });
    await page.locator("[data-action='close-drawer']").click();
  });

  await test.step("Summoning, Roundtable, Decision and Transformation retain all evidence", async () => {
    await page.locator("[data-entry-action='begin-summoning']").click();
    await expect(page.locator("#entry-panel")).toHaveAttribute("data-stage", "summoning");
    expect(await page.evaluate(() => window.__MUSE_APP__.journey.stage)).toBe("summoning");
    await expect(page.locator(".summoning-ledger > li.recorded")).toHaveCount(8);
    await expect(page.locator(".summoning-ledger > li").nth(2)).toContainText(FREE_OBSERVATION);
    await expect(page.locator("[data-entry-action='enter-final']")).toHaveCount(0);

    await page.locator("[data-entry-action='convene-roundtable']").click();
    await page.waitForFunction(() => window.__MUSE_APP__.state.busy === false
      && window.__MUSE_APP__.journey.stage === "roundtable"
      && document.querySelector("#entry-panel")?.dataset.stage === "roundtable"
      && !document.querySelector("[data-entry-action='open-decision']")?.disabled);
    await page.waitForFunction(() => {
      const { engine } = window.__MUSE_APP__;
      return engine.salonVisible === true
        && engine.salonActors.length === 3
        && engine.salonActors.every((actor) => actor.ready === true && actor.group.visible === true)
        && engine.guide.group.visible === false
        && engine.partyActors.every((actor) => actor.group.visible === false);
    });
    await expect(page.locator(".roundtable-thread")).toHaveCount(3);
    await expect(page.locator("[data-entry-action='enter-final']")).toHaveCount(0);

    await page.locator("[data-entry-action='open-decision']").click();
    await expect(page.locator("#entry-panel")).toHaveAttribute("data-stage", "decision");
    await expect(page.locator("[data-decision]")).toHaveCount(3);
    expect(await page.evaluate(() => window.__MUSE_APP__.journey.stage)).toBe("roundtable");

    await page.locator("[data-decision='emotion']").click();
    await expect(page.locator("#entry-panel")).toHaveAttribute("data-stage", "transformation");
    expect(await page.evaluate(() => window.__MUSE_APP__.journey.stage)).toBe("world_transformation");
    const provisionalConcept = await page.evaluate(() => window.__MUSE_APP__.journey.finalConcept);
    expect(provisionalConcept.evidence_scene_ids).toEqual(PROCESS.map((item) => item.sceneId));
    expect(provisionalConcept.perspectives.map((item) => item.character_id)).toEqual(["monet", "van-gogh", "socrates"]);

    await page.locator("[data-entry-action='complete-transformation']").click();
    await page.waitForFunction(() => {
      const app = window.__MUSE_APP__;
      return app.state.busy === false
        && app.journey.stage === "manifesto"
        && app.state.salon?.philosophy_axis === "emotion"
        && app.journey.finalConcept?.philosophy_axis === "emotion"
        && document.querySelector("#entry-panel")?.dataset.stage === "manifesto";
    });
    const transformedConcept = await page.evaluate(() => ({
      contradiction: window.__MUSE_APP__.journey.contradiction,
      stateSalon: window.__MUSE_APP__.state.salon,
      finalConcept: window.__MUSE_APP__.journey.finalConcept,
      manifestoDraft: document.querySelector("#manifesto-input")?.value
    }));
    expect(transformedConcept.contradiction).toBe("emotion");
    expect(transformedConcept.stateSalon.philosophy_axis).toBe("emotion");
    expect(transformedConcept.finalConcept).toMatchObject({
      philosophy_axis: "emotion",
      evidence_scene_ids: PROCESS.map((item) => item.sceneId)
    });
    expect(transformedConcept.finalConcept.world_title).not.toBe(provisionalConcept.world_title);
    expect(transformedConcept.finalConcept.synthesis).not.toBe(provisionalConcept.synthesis);
    expect(transformedConcept.manifestoDraft).toBe(transformedConcept.finalConcept.principle);
    await expect(page.locator(".manifesto-axis")).toContainText("Emotion");
    expect(await journeySnapshot(page)).toMatchObject({ stage: "manifesto", manifesto: "", finalWorldEntered: false });
  });

  await test.step("the ninth world remains gated until manifesto publication", async () => {
    const enter = page.locator("[data-entry-action='enter-final']");
    await expect(enter).toBeHidden();
    expect(await page.evaluate(() => window.__MUSE_APP__.engine.activeWorld.id)).toBe(PROCESS[7].worldId);

    await page.evaluate(() => window.__MUSE_APP__.enterFinalWorld());
    await expect(page.locator("#toast")).toContainText("final world requires manifesto");
    expect(await journeySnapshot(page)).toMatchObject({ stage: "manifesto", manifesto: "", finalWorldEntered: false });
    expect(await page.evaluate(() => window.__MUSE_APP__.engine.activeWorld.id)).toBe(PROCESS[7].worldId);

    const manifesto = "Art should make careful attention reciprocal: the observer changes the world, and the world answers back.";
    await page.locator("#manifesto-input").fill(manifesto);
    await page.locator("[data-entry-action='publish-manifesto']").click();
    await expect(page.locator("#manifesto-input")).toHaveAttribute("readonly", "");
    await expect(enter).toBeVisible();
    expect(await journeySnapshot(page)).toMatchObject({ stage: "manifesto", manifesto, finalWorldEntered: false });
    expect(await page.evaluate(() => window.__MUSE_APP__.engine.activeWorld.id)).toBe(PROCESS[7].worldId);
  });

  await test.step("the published concept opens the real archived 8K answer world", async () => {
    await restoreRealWorldSwitches(page);
    await installOneShotWorldLoadFailure(page, FINAL.worldId);
    await page.locator("[data-entry-action='enter-final']").click();
    await page.waitForFunction(() => window.__MUSE_APP__.state.busy === false);
    await expect(page.locator("#entry-panel")).toHaveAttribute("data-stage", "manifesto");
    await expect(page.locator("[data-entry-action='enter-final']")).toBeVisible();
    expect(await journeySnapshot(page)).toMatchObject({ stage: "manifesto", finalWorldEntered: false });

    await page.locator("[data-entry-action='enter-final']").click();
    await page.waitForFunction((worldId) => {
      const app = window.__MUSE_APP__;
      return app.state.busy === false
        && app.journey.finalWorldEntered === true
        && app.engine.activeWorld.id === worldId
        && app.engine.worldLayer.isLive(worldId)
        && app.engine.worldLayer.archive?.type === "mesh"
        && document.querySelector("#entry-panel")?.dataset.stage === "final-answer";
    }, FINAL.worldId, { timeout: 120_000 });

    const finalArchive = await meshArchiveMetrics(page);
    expect(finalArchive).toMatchObject({
      world: FINAL.worldId,
      archiveWorld: FINAL.worldId,
      archiveType: "mesh",
      live: true,
      sceneryVisible: false,
      maxTextureWidth: 8192,
      maxTextureHeight: 8192,
      toneMappedMaterials: 0,
      finalWorldEntered: true,
      salonVisible: false,
      guideVisible: true,
      party: [
        { id: "van-gogh", ready: true, visible: true },
        { id: "socrates", ready: true, visible: true }
      ]
    });
    expect(finalArchive.meshCount).toBeGreaterThan(0);
    expect(finalArchive.triangles).toBeGreaterThan(590_000);

    await expect(page.locator("#entry-panel")).toContainText(FINAL.name);
    const pixels = await canvasPixels(page, "artifacts/screenshots/desktop-final-shimmering-spheres-8k.png");
    expect(pixels.variance).toBeGreaterThan(140);
    expect(pixels.nonDominantRatio).toBeGreaterThan(0.1);

    const uniqueStages = await page.evaluate(() => window.__MUSE_STAGE_TRACE__.filter((stage, index, all) => index === 0 || stage !== all[index - 1]));
    expect(uniqueStages).toEqual(DOMAIN_STAGES);

    await page.setViewportSize(mobile);
    const finalLayout = await mobileLayout(page, "#entry-panel");
    expect(finalLayout.documentOverflow).toBeLessThanOrEqual(0);
    expect(finalLayout.panelOverflow).toBeLessThanOrEqual(0);
    expect(finalLayout.panelTouchesMovement).toBe(false);
    const footerLayout = await page.evaluate(() => {
      const status = document.querySelector(".statusbar").getBoundingClientRect();
      const provider = document.querySelector("#provider-label");
      const bounds = provider.getBoundingClientRect();
      return {
        shortLabel: provider.dataset.shortLabel,
        renderedLabel: getComputedStyle(provider, "::after").content,
        inBounds: bounds.left >= status.left && bounds.right <= status.right
      };
    });
    expect(footerLayout).toEqual({
      shortLabel: "CURATED DEMO",
      renderedLabel: '"CURATED DEMO"',
      inBounds: true
    });
    await page.screenshot({ path: "artifacts/screenshots/mobile-final-shimmering-spheres.png" });

    await page.locator("[data-drawer='atlas']").click();
    await expect(page.locator("[data-drawer-action='world']")).toHaveCount(8);
    await expect(page.locator(`[data-drawer-action='world'][data-value='${FINAL.worldId}']`)).toHaveCount(0);
    await expect(page.locator("[data-drawer-action='world']:not([disabled])")).toHaveCount(0);
    await expect(page.locator("#drawer-body")).toContainText("locked evidence record");
    await page.locator("[data-drawer-action='world']").first().evaluate((button) => {
      button.disabled = false;
      button.click();
    });
    await expect(page.locator("#toast")).toContainText("answer world is final");
    expect(await page.evaluate(() => window.__MUSE_APP__.engine.activeWorld.id)).toBe(FINAL.worldId);
  });

  expect(interceptedModelRequests).toEqual(["/api/dialogue", "/api/salon", "/api/salon/transform"]);
  expect(errors).toEqual([]);
});

async function installCuratedModelRoutes(page, interceptedModelRequests, dialogueRequests) {
  let dialogueReplyAvailable = true;
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === "/api/status") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          configured: false,
          openai: false,
          model: "gpt-5.6",
          gateway: "official",
          model_source: "openai-api",
          dialogue: false,
          realtime: false,
          realtime_model: null,
          world_forge: false,
          rooms: true
        })
      });
    }
    if (request.method() === "POST" && pathname === "/api/salon") {
      interceptedModelRequests.push(pathname);
      const body = request.postDataJSON();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: createFallbackSalon(body), live: false, model: "curated-demo", reason: "e2e_isolated" })
      });
    }
    if (request.method() === "POST" && pathname === "/api/salon/transform") {
      interceptedModelRequests.push(pathname);
      const body = request.postDataJSON();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: createFallbackTransformation(body, body.contradiction),
          live: false,
          model: "curated-demo",
          reason: "e2e_isolated"
        })
      });
    }
    if (request.method() === "POST" && pathname === "/api/dialogue" && dialogueReplyAvailable) {
      dialogueReplyAvailable = false;
      interceptedModelRequests.push(pathname);
      dialogueRequests.push(request.postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          perspectives: LIVE_INQUIRY.perspectives,
          live: true,
          fallback: false,
          model: "gpt-5.6",
          response_model: "gpt-5.6",
          gateway: "inherited-gpt",
          model_source: "gateway-response-reported"
        })
      });
    }
    if (["/api/lesson/plan", "/api/dialogue", "/api/realtime/call"].includes(pathname)) {
      interceptedModelRequests.push(pathname);
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "e2e_model_endpoint_disabled" })
      });
    }
    return route.continue();
  });
}

async function verifyLiveInquiry(page, dialogueRequests) {
  await page.locator("#inquiry-input").fill(LIVE_INQUIRY.question);
  await page.locator(".inquiry-form").evaluate((form) => form.requestSubmit());

  const visitorTurn = page.locator("#inquiry-thread .visitor-turn").last();
  await expect(visitorTurn.locator("b")).toHaveText("YOU");
  await expect(visitorTurn.locator("p")).toHaveText(LIVE_INQUIRY.question);

  const replies = page.locator("#inquiry-thread .company-turn");
  await expect(replies).toHaveCount(LIVE_INQUIRY.perspectives.length);
  for (const [index, perspective] of LIVE_INQUIRY.perspectives.entries()) {
    await expect(replies.nth(index).locator("b")).toHaveText(`${perspective.speaker} · GPT-5.6 · INHERITED GATEWAY`);
    await expect(replies.nth(index).locator("p")).toHaveText(perspective.text);
  }

  await expect(page.locator("[data-inquiry-pending]")).toHaveCount(0);
  await expect(page.locator("#inquiry-input")).toBeEnabled();
  await expect(page.locator("#inquiry-input")).toHaveValue("");
  await expect(page.locator(".inquiry-form button[type='submit']")).toBeEnabled();
  expect(dialogueRequests).toHaveLength(1);
  expect(dialogueRequests[0]).toMatchObject({
    question: LIVE_INQUIRY.question,
    scene_id: PROCESS[0].sceneId,
    companion_ids: ["monet", "van-gogh", "socrates"],
    recent_evidence: [],
    scene: { id: PROCESS[0].sceneId },
    artwork: { id: dialogueRequests[0].artwork_id }
  });
  expect(dialogueRequests[0].artwork_id).toMatch(/^aic-/);

  const visualEffect = await page.evaluate((sceneId) => {
    const record = window.__MUSE_APP__.engine.worldLayer.artworks.get(sceneId);
    return {
      opacity: record?.border.material.opacity,
      transparent: record?.border.material.transparent
    };
  }, PROCESS[0].sceneId);
  expect(visualEffect.opacity).toBeCloseTo(0.82, 2);
  expect(visualEffect.transparent).toBe(true);
}

async function installStageTrace(page) {
  await page.evaluate(() => {
    const journey = window.__MUSE_APP__.journey;
    const methods = [
      "crossThreshold",
      "setQuestion",
      "setCompanions",
      "beginCuration",
      "acceptCuration",
      "recordSceneVisit",
      "beginSummoning",
      "openRoundtable",
      "completeRoundtable",
      "chooseContradiction",
      "completeTransformation",
      "publishManifesto",
      "enterFinalWorld"
    ];
    window.__MUSE_STAGE_TRACE__ = [journey.stage];
    for (const name of methods) {
      const original = journey[name];
      journey[name] = function tracedJourneyTransition(...args) {
        const result = original.apply(this, args);
        window.__MUSE_STAGE_TRACE__.push(this.stage);
        return result;
      };
    }
  });
}

async function installLightweightWorldSwitches(page) {
  await page.evaluate(async () => {
    const { WORLDS } = await import("/src/config/scenes.js");
    const { engine, state } = window.__MUSE_APP__;
    const archive = engine.worldLayer.archive;
    if (archive?.type === "splat") {
      archive.spark.autoUpdate = false;
      archive.spark.enableDriveLod = false;
      archive.spark.visible = false;
      archive.splat.visible = false;
    } else if (archive?.type === "mesh") {
      archive.object.visible = false;
    }
    engine.worldLayer.scenery.visible = true;
    window.__MUSE_REAL_SET_WORLD__ = engine.setWorld.bind(engine);
    window.__MUSE_REAL_GROUND_HEIGHT__ = engine.worldLayer.groundHeightAt.bind(engine.worldLayer);
    engine.worldLayer.groundHeightAt = () => engine.worldLayer.activeWorld?.profile?.groundY || 0;
    engine.setWorld = async (worldId) => {
      const token = ++engine.worldToken;
      const world = WORLDS.find((item) => item.id === worldId) || WORLDS[0];
      engine.director.paused = true;
      await engine.showSalonCharacters(false);
      if (token !== engine.worldToken) return engine.activeWorld;
      engine.applyWorldProfile(world, false);
      engine.worldLayer.activeWorld = world;
      engine.activeWorld = world;
      engine.activeWorldLive = true;
      engine.director.paused = false;
      return world;
    };
    window.__MUSE_REAL_IS_LIVE__ = engine.worldLayer.isLive.bind(engine.worldLayer);
    engine.worldLayer.isLive = (worldId) => engine.activeWorld.id === worldId;
    state.bootSettled = true;
    state.bootPromise = Promise.resolve(engine.activeWorld);
  });
}

async function restoreRealWorldSwitches(page) {
  await page.evaluate(() => {
    const { engine } = window.__MUSE_APP__;
    engine.setWorld = window.__MUSE_REAL_SET_WORLD__;
    engine.worldLayer.groundHeightAt = window.__MUSE_REAL_GROUND_HEIGHT__;
    engine.worldLayer.isLive = window.__MUSE_REAL_IS_LIVE__;
  });
}

async function verifyAtlasCannotInterruptTransition(page) {
  await page.evaluate(() => {
    const { engine } = window.__MUSE_APP__;
    const setWorld = engine.setWorld.bind(engine);
    let release;
    window.__MUSE_RELEASE_WORLD_SWITCH__ = () => release?.();
    engine.setWorld = async (...args) => {
      await new Promise((resolve) => { release = resolve; });
      engine.setWorld = setWorld;
      return setWorld(...args);
    };
  });
  await page.locator("#continue-button").click();
  await page.waitForFunction(() => window.__MUSE_APP__.state.busy === true);
  await page.locator("[data-drawer='atlas']").click();
  await expect(page.locator("[data-drawer-action='world']:not([disabled])")).toHaveCount(0);
  await page.locator("[data-drawer-action='world']").first().evaluate((button) => {
    button.disabled = false;
    button.click();
  });
  await expect(page.locator("#toast")).toContainText("world transition in progress");
  await page.evaluate(() => window.__MUSE_RELEASE_WORLD_SWITCH__());
  await page.waitForFunction(() => window.__MUSE_APP__.state.busy === false);
  await page.locator("[data-action='close-drawer']").click();
}

async function verifyArchiveFailureRequiresRetry(page, expected) {
  await installOneShotWorldLoadFailure(page, expected.worldId);
  await page.locator("#continue-button").click();
  await page.waitForFunction(() => window.__MUSE_APP__.state.busy === false
    && document.querySelector("#entry-panel")?.dataset.stage === "archive-required");
  expect(await page.evaluate(() => ({
    phase: window.__MUSE_APP__.session.phase,
    stop: window.__MUSE_APP__.session.currentStopId,
    finalWorldEntered: window.__MUSE_APP__.journey.finalWorldEntered
  }))).toEqual({ phase: "walking", stop: expected.sceneId, finalWorldEntered: false });
  await page.locator("[data-entry-action='retry-scene']").click();
  await page.waitForFunction(() => window.__MUSE_APP__.state.busy === false
    && document.querySelector("#dialogue")?.hidden === false);
}

async function verifyCurrentArchiveFailureBlocksEvidence(page, expected, visitedCount) {
  await installOneShotWorldLoadFailure(page, expected.worldId);
  await page.locator("[data-drawer='atlas']").click();
  await page.locator(`[data-drawer-action='world'][data-value='${expected.worldId}']`).click();
  await page.waitForFunction(() => window.__MUSE_APP__.state.busy === false);
  await page.locator("[data-action='close-drawer']").click();

  await page.locator("[data-answer]").first().click();
  await expect(page.locator("#entry-panel")).toHaveAttribute("data-stage", "archive-required");
  expect(await page.evaluate(() => ({
    phase: window.__MUSE_APP__.session.phase,
    sessionVisits: window.__MUSE_APP__.session.visited.length,
    journeyVisits: window.__MUSE_APP__.journey.visitedSceneIds.length
  }))).toEqual({ phase: "asking", sessionVisits: visitedCount, journeyVisits: visitedCount });

  await page.locator("[data-entry-action='retry-scene']").click();
  await page.waitForFunction(() => window.__MUSE_APP__.state.busy === false
    && window.__MUSE_APP__.session.phase === "walking");
  await arriveAtCurrentStop(page);
  await expect(page.locator("[data-answer]")).toHaveCount(2);
}

async function installOneShotWorldLoadFailure(page, worldId) {
  await page.evaluate(async (targetWorldId) => {
    const { WORLDS } = await import("/src/config/scenes.js");
    const { engine } = window.__MUSE_APP__;
    const setWorld = engine.setWorld.bind(engine);
    engine.setWorld = async (requestedId) => {
      engine.setWorld = setWorld;
      engine.activeWorldLive = false;
      return WORLDS.find((world) => world.id === requestedId) || WORLDS.find((world) => world.id === targetWorldId);
    };
  }, worldId);
}

async function waitForRealRadWorld(page, worldId) {
  await page.waitForFunction((id) => {
    const engine = window.__MUSE_APP__?.engine;
    const archive = engine?.worldLayer?.archive;
    return engine?.activeWorld?.id === id
      && engine.worldLayer.isLive(id)
      && archive?.type === "splat"
      && archive.splat?.isInitialized === true
      && archive.splat.userData.archiveFormat === "rad"
      && (archive.splat.paged?.numSplats || 0) > 0
      && (archive.spark.activeSplats || 0) > 0
      && engine.worldLayer.scenery.visible === false;
  }, worldId, { timeout: 180_000 });
}

async function constrainRadAfterScreenshot(page) {
  await page.evaluate(() => {
    const spark = window.__MUSE_APP__.engine.worldLayer.archive.spark;
    spark.lodSplatCount = 120_000;
    spark.lodDirty = true;
    spark.lastLod = undefined;
  });
  await page.waitForFunction(() => (window.__MUSE_APP__.engine.worldLayer.archive.spark.activeSplats || 0) > 0);
}

async function waitForProcessStop(page, index, phase) {
  await page.waitForFunction(({ expectedScene, expectedWorld, expectedPhase }) => {
    const app = window.__MUSE_APP__;
    return app.journey.stage === "world_exploration"
      && app.session.phase === expectedPhase
      && app.session.currentStopId === expectedScene
      && app.engine.activeWorld.id === expectedWorld;
  }, {
    expectedScene: PROCESS[index].sceneId,
    expectedWorld: PROCESS[index].worldId,
    expectedPhase: phase
  });
}

async function waitForRealMeshWorld(page, worldId) {
  await page.waitForFunction((id) => {
    const app = window.__MUSE_APP__;
    return app.state.busy === false
      && app.engine.activeWorld.id === id
      && app.engine.worldLayer.isLive(id)
      && app.engine.worldLayer.archive?.type === "mesh";
  }, worldId, { timeout: 150_000 });
}

async function meshArchiveMetrics(page) {
  return page.evaluate(() => {
    const { engine, journey } = window.__MUSE_APP__;
    const object = engine.worldLayer.archive.object;
    let triangles = 0;
    let meshCount = 0;
    let maxTextureWidth = 0;
    let maxTextureHeight = 0;
    let toneMappedMaterials = 0;
    object.traverse((child) => {
      if (!child.isMesh) return;
      meshCount += 1;
      const geometry = child.geometry;
      triangles += (geometry.index?.count || geometry.attributes.position?.count || 0) / 3;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (!material) continue;
        if (material.toneMapped) toneMappedMaterials += 1;
        const image = material.map?.source?.data || material.map?.image;
        maxTextureWidth = Math.max(maxTextureWidth, image?.naturalWidth || image?.videoWidth || image?.width || 0);
        maxTextureHeight = Math.max(maxTextureHeight, image?.naturalHeight || image?.videoHeight || image?.height || 0);
      }
    });
    return {
      world: engine.activeWorld.id,
      archiveWorld: object.userData.archivedWorld,
      archiveType: object.userData.archiveType,
      live: engine.worldLayer.isLive(engine.activeWorld.id),
      sceneryVisible: engine.worldLayer.scenery.visible,
      meshCount,
      triangles,
      maxTextureWidth,
      maxTextureHeight,
      toneMappedMaterials,
      finalWorldEntered: journey.finalWorldEntered,
      salonVisible: engine.salonVisible,
      guideVisible: engine.guide.group.visible,
      party: engine.partyActors.map((actor) => ({
        id: actor.companion.id,
        ready: actor.ready,
        visible: actor.group.visible
      }))
    };
  });
}

async function arriveAtCurrentStop(page) {
  await page.evaluate(() => {
    const { director } = window.__MUSE_APP__.engine;
    if (window.__MUSE_APP__.session.phase !== "walking") return;
    director.object.position.copy(director.target);
    const delta = director.lookAt.clone().sub(director.object.position);
    director.object.rotation.y = Math.atan2(delta.x, delta.z);
    director.transition("asking");
  });
  await page.waitForFunction(() => window.__MUSE_APP__.session.phase === "asking"
    && Boolean(document.querySelector("[data-answer]")));
}

async function journeySnapshot(page) {
  return page.evaluate(() => {
    const journey = window.__MUSE_APP__.journey;
    return {
      stage: journey.stage,
      visited: [...journey.visitedSceneIds],
      manifesto: journey.manifesto,
      finalWorldEntered: journey.finalWorldEntered
    };
  });
}

async function playerPosition(page) {
  return page.evaluate(() => window.__MUSE_APP__.engine.player.group.position.toArray());
}

async function partyPositions(page) {
  return page.evaluate(() => window.__MUSE_APP__.engine.partyActors.map((actor) => actor.group.position.toArray()));
}

async function playerLegPose(page) {
  return page.evaluate(() => {
    const model = window.__MUSE_APP__.engine.player.model;
    return ["L_Thigh", "L_Calf", "R_Thigh", "R_Calf"].flatMap((name) => model.getObjectByName(name).quaternion.toArray());
  });
}

function planarDistance(left, right) {
  return Math.hypot(right[0] - left[0], right[2] - left[2]);
}

function poseDistance(left, right) {
  return left.reduce((sum, value, index) => sum + Math.abs(value - right[index]), 0);
}

async function loadedImages(page, selector) {
  return page.locator(selector).evaluateAll((images) => images.filter((image) => image.complete && image.naturalWidth > 0).length);
}

function captureErrors(page) {
  const errors = [];
  const seen = new Set();
  const record = (value) => {
    const message = String(value || "unknown browser error");
    if (seen.has(message)) return;
    seen.add(message);
    errors.push(message);
  };
  page.on("console", (message) => { if (message.type() === "error") record(message.text()); });
  page.on("pageerror", (error) => record(error.stack || error.message));
  return errors;
}

async function mobileLayout(page, panelSelector) {
  return page.evaluate((selector) => {
    const panel = document.querySelector(selector);
    const movement = document.querySelector("#movement-controls");
    const mission = document.querySelector(".mission-rail");
    const rect = (element) => {
      if (!element || getComputedStyle(element).display === "none" || getComputedStyle(element).visibility === "hidden") return null;
      const value = element.getBoundingClientRect();
      return { top: value.top, right: value.right, bottom: value.bottom, left: value.left, width: value.width, height: value.height };
    };
    const overlaps = (left, right) => Boolean(left && right
      && left.left < right.right - 1
      && left.right > right.left + 1
      && left.top < right.bottom - 1
      && left.bottom > right.top + 1);
    const cards = [...document.querySelectorAll("[data-companion]")];
    const panelRect = rect(panel);
    return {
      documentOverflow: document.documentElement.scrollWidth - window.innerWidth,
      panelOverflow: panel.scrollWidth - panel.clientWidth,
      panelScrollable: panel.scrollHeight > panel.clientHeight,
      panelTouchesMovement: overlaps(panelRect, rect(movement)),
      panelTouchesMission: overlaps(panelRect, rect(mission)),
      columns: new Set(cards.map((card) => Math.round(card.getBoundingClientRect().left))).size
    };
  }, panelSelector);
}

async function canvasPixels(page, path) {
  const screenshot = await page.screenshot({ path, timeout: 45_000 });
  return page.evaluate(async (encoded) => {
    const image = new Image();
    image.src = `data:image/png;base64,${encoded}`;
    await image.decode();
    const sample = document.createElement("canvas");
    sample.width = 72;
    sample.height = 45;
    const context = sample.getContext("2d", { willReadFrequently: true });
    context.drawImage(
      image,
      image.width * 0.2,
      image.height * 0.12,
      image.width * 0.62,
      image.height * 0.46,
      0,
      0,
      sample.width,
      sample.height
    );
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
