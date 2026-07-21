import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { WORLDS } from "../src/config/scenes.js";

const screenshotRoot = "artifacts/screenshots/party-visual-baseline";
const targets = Object.freeze([
  Object.freeze({ sceneId: "threshold-conservatory", artworkIndex: 0 }),
  Object.freeze({ sceneId: "sunset-frames", artworkIndex: 1 }),
  Object.freeze({ sceneId: "infinite-repetition", artworkIndex: 2 })
]);

test("real companions preserve the artwork sightline, movement space and stable bottom conversation", async ({ page }) => {
  test.setTimeout(1_500_000);
  mkdirSync(screenshotRoot, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
  await page.goto("/?quality=performance", { waitUntil: "domcontentloaded" });
  try {
    await page.waitForFunction(() => Boolean(window.__MUSE_APP__), null, { timeout: 30_000 });
  } catch {
    throw new Error(`app_bootstrap_failed:${pageErrors.join(" | ") || "__MUSE_APP__ missing"}`);
  }
  await page.waitForFunction(() => window.__MUSE_APP__.state.bootSettled === true, null, { timeout: 120_000 });
  await page.waitForFunction(() => {
    const { engine } = window.__MUSE_APP__;
    return engine.player?.ready === true
      && engine.guide?.ready === true
      && engine.partyActors?.length === 2
      && engine.partyActors.every((actor) => actor.ready === true);
  }, null, { timeout: 90_000 });
  const cdp = await page.context().newCDPSession(page);

  await page.evaluate(async () => {
    const { AppView } = await import("/src/ui/AppView.js");
    window.__MUSE_PARTY_AUDIT_VIEW__ = new AppView();
    const app = document.querySelector("#app");
    app?.removeAttribute("data-world-presentation");
    if (app) app.dataset.narrativeStage = "world-exploration";
    for (const selector of [
      "#world-transition", ".world-wash", ".topbar", ".statusbar", ".toast",
      "#entry-panel", "#dialogue", ".mission-rail", ".movement-controls",
      ".artwork-story"
    ]) document.querySelector(selector)?.remove();
  });

  const results = [];
  let bubbleAudit = null;
  for (const target of targets) {
    const world = WORLDS.find((candidate) => candidate.sceneId === target.sceneId);
    if (!world) throw new Error(`unknown_visual_audit_world:${target.sceneId}`);

    await test.step(target.sceneId, async () => {
      const worldState = await page.evaluate(async (worldId) => {
        window.__MUSE_PARTY_AUDIT_VIEW__?.hideCompanionConversation?.();
        const { engine } = window.__MUSE_APP__;
        const attempts = [];
        for (let attempt = 0; attempt < 3 && !engine.isWorldReady(worldId); attempt += 1) {
          await engine.setWorld(worldId);
          attempts.push(engine.worldLayer.lastArchiveError ? { ...engine.worldLayer.lastArchiveError } : null);
        }
        const app = document.querySelector("#app");
        app?.removeAttribute("data-world-presentation");
        if (app) app.dataset.narrativeStage = "world-exploration";
        return {
          worldId: engine.activeWorld.id,
          ready: engine.isWorldReady(worldId),
          artworkCount: engine.worldLayer.artworks.size,
          companyReady: engine.permanentCompanyActors().every((actor) => actor.ready === true),
          archiveError: engine.worldLayer.lastArchiveError,
          attempts
        };
      }, world.id);
      expect(worldState.archiveError, `archive load failed: ${JSON.stringify(worldState)}`).toBeNull();
      expect(worldState).toMatchObject({ worldId: world.id, ready: true, artworkCount: 4, companyReady: true });

      const staged = await page.evaluate((artworkIndex) => {
        const { engine } = window.__MUSE_APP__;
        const records = [...engine.worldLayer.artworks.values()].sort((left, right) => left.index - right.index);
        const record = records[artworkIndex];
        if (!record) throw new Error(`unknown_visual_audit_artwork:${artworkIndex}`);
        engine.navigateCompanyToArtwork(record.key, engine.companionIds);
        const tour = engine.companyTour;
        engine.setFollow(false);
        engine.player.group.position.fromArray(tour.visitorAnchor);
        engine.player.group.rotation.y = Math.atan2(
          tour.pose.lookAt[0] - tour.visitorAnchor[0],
          tour.pose.lookAt[2] - tour.visitorAnchor[2]
        );
        for (const stage of tour.stages) {
          const director = engine.companyDirectors.get(stage.companionId);
          director.object.position.set(stage.x, stage.y, stage.z);
          director.object.rotation.y = Math.atan2(
            tour.visitorAnchor[0] - stage.x,
            tour.visitorAnchor[2] - stage.z
          );
          director.transition("asking");
          director.paused = true;
          engine.companyTour.ready.add(stage.companionId);
          engine.companyTour.memberStates.set(stage.companionId, "ready");
        }

        const towardX = tour.pose.lookAt[0] - tour.visitorAnchor[0];
        const towardZ = tour.pose.lookAt[2] - tour.visitorAnchor[2];
        engine.cameraYaw = Math.atan2(-towardX, -towardZ);
        engine.cameraPitch = -0.08;
        engine.cameraDistance = 4.8;
        engine.worldLayer.highlight(record.key, "focus");
        engine.scene.updateMatrixWorld(true);
        return {
          key: record.key,
          artworkId: record.artwork.id,
          artworkTitle: record.artwork.title,
          visitorAnchor: [...tour.visitorAnchor]
        };
      }, target.artworkIndex);

      await page.waitForTimeout(1_200);
      const metrics = await measurePartyView(page, staged);
      results.push(metrics);

      expect(metrics.archiveLive).toBe(true);
      expect(metrics.companyCount).toBe(3);
      expect(metrics.artworkSampleCount).toBe(9);
      expect(metrics.artworkSamplesInViewport).toBe(9);
      expect(metrics.companionOccludedSamples).toEqual([]);
      expect(metrics.maxFacingErrorDeg).toBeLessThanOrEqual(1);
      expect(metrics.minimumCompanySeparation).toBeGreaterThanOrEqual(0.72);
      expect(metrics.minimumTriggerClearance).toBeGreaterThanOrEqual(0.82);
      expect(metrics.minimumSightlineClearance).toBeGreaterThanOrEqual(0.72);
      expect(metrics.visitorMovementProbesClear).toBe(8);
      expect(metrics.companyRoutesClear).toBe(true);
      expect(metrics.minimumBoundsMargin).toBeGreaterThanOrEqual(0.25);

      await page.evaluate(() => {
        const app = document.querySelector("#app");
        app?.removeAttribute("data-world-presentation");
        if (app) app.dataset.narrativeStage = "world-exploration";
        const world = document.querySelector("#world");
        if (world) {
          world.style.visibility = "visible";
          world.style.opacity = "1";
        }
      });
      await capturePageWithCdp(cdp, `${screenshotRoot}/${target.sceneId}-${target.artworkIndex + 1}.png`);

      if (target === targets[0]) {
        const bubble = await showBottomConversation(page, staged.key);
        bubbleAudit = bubble;
        results.at(-1).conversationBubble = bubble;
        writeFileSync(`${screenshotRoot}/bubble-diagnostic.json`, `${JSON.stringify(bubble, null, 2)}\n`);
        await capturePageWithCdp(cdp, `${screenshotRoot}/${target.sceneId}-${target.artworkIndex + 1}-bubble.png`);
      }
    });
  }

  writeFileSync(`${screenshotRoot}/metrics.json`, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    baseURL: process.env.MUSE_E2E_BASE_URL || "http://127.0.0.1:4175",
    viewport: { width: 1440, height: 900 },
    results
  }, null, 2)}\n`);
  expect(bubbleAudit?.anchored, JSON.stringify(bubbleAudit)).toBe(false);
  expect(bubbleAudit.centered).toBe(true);
  expect(bubbleAudit.speakerId).toBe(bubbleAudit.activeSpeakerId);
  expect(bubbleAudit.speakerLabel).toContain(bubbleAudit.speakerName);
  expect(bubbleAudit.rect.left).toBeGreaterThanOrEqual(0);
  expect(bubbleAudit.rect.top).toBeGreaterThanOrEqual(0);
  expect(bubbleAudit.rect.right).toBeLessThanOrEqual(1440);
  expect(bubbleAudit.rect.bottom).toBeLessThanOrEqual(900);
  expect(bubbleAudit.lightSurface).toBe(true);
  expect(bubbleAudit.bottomGap).toBeGreaterThanOrEqual(40);
  expect(bubbleAudit.bottomGap).toBeLessThanOrEqual(140);
});

async function capturePageWithCdp(cdp, path) {
  const { data } = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false
  });
  writeFileSync(path, Buffer.from(data, "base64"));
}

async function showBottomConversation(page, artworkKey) {
  await page.evaluate((key) => {
    const { engine } = window.__MUSE_APP__;
    const view = window.__MUSE_PARTY_AUDIT_VIEW__;
    const speakerId = engine.companyTour.speakerOrder[0];
    const speaker = engine.companyDirectors.get(speakerId).avatar.companion;
    engine.setCompanySpeaker(speakerId, true);
    view.showCompanionConversation([{
      speakerId,
      speaker: speaker.fullName,
      text: "Look with me: keep the artwork visible while we test this question together."
    }], {
      onCompleteLabel: "Return to the artwork",
      allowSkip: true
    });
    engine.worldLayer.highlight(key, "focus");
  }, artworkKey);
  await page.waitForFunction(() => document.querySelector("#companion-conversation")?.hidden === false);
  return page.evaluate(() => {
    const { engine } = window.__MUSE_APP__;
    const element = document.querySelector("#companion-conversation");
    const rect = element.getBoundingClientRect();
    const surface = getComputedStyle(element.querySelector(".conversation-bubble"));
    const channels = surface.backgroundColor.match(/[\d.]+/g)?.map(Number) || [];
    const speakerId = engine.companyTour.speakerOrder[0];
    const actor = engine.companyDirectors.get(speakerId).avatar;
    return {
      anchored: element.dataset.anchored === "true",
      centered: Math.abs(rect.left + rect.width / 2 - window.innerWidth / 2) <= 1,
      bottomGap: window.innerHeight - rect.bottom,
      speakerId,
      activeSpeakerId: engine.activeSpeakerId,
      speakerName: actor.companion.fullName,
      speakerLabel: document.querySelector("#companion-conversation-speaker")?.textContent || "",
      rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
      lightSurface: channels.length >= 3 && channels[0] + channels[1] + channels[2] > 570
    };
  });
}

async function measurePartyView(page, staged) {
  return page.evaluate(async ({ key, artworkId, artworkTitle, visitorAnchor }) => {
    const THREE = await import("three");
    const { engine } = window.__MUSE_APP__;
    const record = engine.worldLayer.artworks.get(key);
    const tour = engine.companyTour;
    const localShortestAngle = (value) => Math.atan2(Math.sin(value), Math.cos(value));
    const localPointSegmentDistance2D = (point, start, end) => {
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const lengthSquared = dx * dx + dz * dz;
      if (lengthSquared <= 1e-8) return Math.hypot(point.x - start.x, point.z - start.z);
      const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared));
      return Math.hypot(point.x - (start.x + dx * t), point.z - (start.z + dz * t));
    };
    engine.scene.updateMatrixWorld(true);
    engine.camera.updateMatrixWorld(true);

    const width = record.picture.geometry.parameters.width;
    const height = record.picture.geometry.parameters.height;
    const sampleCoordinates = [-0.42, 0, 0.42];
    const samples = [];
    const actorRoots = engine.permanentCompanyActors().map((actor) => actor.group);
    for (const vertical of sampleCoordinates) {
      for (const horizontal of sampleCoordinates) {
        const target = record.picture.localToWorld(new THREE.Vector3(horizontal * width, vertical * height, 0));
        const direction = target.clone().sub(engine.camera.position);
        const targetDistance = direction.length();
        const raycaster = new THREE.Raycaster(engine.camera.position, direction.normalize(), 0.01, targetDistance - 0.02);
        const hits = raycaster.intersectObjects(actorRoots, true).filter((hit) => hit.object.visible !== false);
        const projected = target.clone().project(engine.camera);
        samples.push({
          horizontal,
          vertical,
          inViewport: Math.abs(projected.x) <= 1 && Math.abs(projected.y) <= 1 && projected.z >= -1 && projected.z <= 1,
          blockedBy: hits[0]?.object?.parent?.userData?.actor || hits[0]?.object?.name || null
        });
      }
    }

    const stages = tour.stages.map((stage) => {
      const actor = engine.companyDirectors.get(stage.companionId).object;
      const expectedYaw = Math.atan2(visitorAnchor[0] - actor.position.x, visitorAnchor[2] - actor.position.z);
      return {
        companionId: stage.companionId,
        x: actor.position.x,
        y: actor.position.y,
        z: actor.position.z,
        facingErrorDeg: Math.abs(localShortestAngle(actor.rotation.y - expectedYaw)) * 180 / Math.PI,
        triggerClearance: Math.hypot(actor.position.x - visitorAnchor[0], actor.position.z - visitorAnchor[2]),
        sightlineClearance: localPointSegmentDistance2D(
          actor.position,
          { x: visitorAnchor[0], z: visitorAnchor[2] },
          { x: tour.pose.lookAt[0], z: tour.pose.lookAt[2] }
        )
      };
    });

    const movementProbeRadius = 0.55;
    const movementProbes = Array.from({ length: 8 }, (_, index) => {
      const angle = index * Math.PI / 4;
      const desired = new THREE.Vector3(
        visitorAnchor[0] + Math.cos(angle) * movementProbeRadius,
        visitorAnchor[1],
        visitorAnchor[2] + Math.sin(angle) * movementProbeRadius
      );
      const origin = new THREE.Vector3().fromArray(visitorAnchor);
      const groundY = engine.worldLayer.walkableGroundHeightAt(desired.x, desired.z, visitorAnchor[1], 0.8);
      engine.worldLayer.horizontalCollisionCache = null;
      const resolved = engine.worldLayer.resolveHorizontalMove(origin, desired, 0.25);
      return Number.isFinite(groundY) && Math.hypot(resolved.x - desired.x, resolved.z - desired.z) <= 0.04;
    });

    const bounds = engine.activeWorld.profile.bounds;
    const boundsMargins = [
      visitorAnchor[0] - bounds.minX,
      bounds.maxX - visitorAnchor[0],
      visitorAnchor[2] - bounds.minZ,
      bounds.maxZ - visitorAnchor[2]
    ];
    const pairDistances = [];
    for (let left = 0; left < stages.length; left += 1) {
      for (let right = left + 1; right < stages.length; right += 1) {
        pairDistances.push(Math.hypot(stages[left].x - stages[right].x, stages[left].z - stages[right].z));
      }
    }

    const companyRoutesClear = tour.stages.every((stage) => {
      let previous = null;
      return stage.route.every((point) => {
        const target = { x: point[0], y: point[1], z: point[2] };
        const clear = previous ? engine.companyPathIsClear(previous, target, 0.18) : true;
        previous = target;
        return clear;
      });
    });

    return {
      sceneId: engine.activeWorld.sceneId,
      worldId: engine.activeWorld.id,
      archiveLive: engine.isWorldReady(engine.activeWorld.id),
      archiveType: engine.worldLayer.archive?.type || null,
      artworkId,
      artworkTitle,
      companyCount: stages.length,
      artworkSampleCount: samples.length,
      artworkSamplesInViewport: samples.filter((sample) => sample.inViewport).length,
      companionOccludedSamples: samples.filter((sample) => sample.blockedBy).map((sample) => ({
        horizontal: sample.horizontal,
        vertical: sample.vertical,
        blockedBy: sample.blockedBy
      })),
      maxFacingErrorDeg: Math.max(...stages.map((stage) => stage.facingErrorDeg)),
      minimumCompanySeparation: Math.min(...pairDistances),
      minimumTriggerClearance: Math.min(...stages.map((stage) => stage.triggerClearance)),
      minimumSightlineClearance: Math.min(...stages.map((stage) => stage.sightlineClearance)),
      visitorMovementProbesClear: movementProbes.filter(Boolean).length,
      companyRoutesClear,
      minimumBoundsMargin: Math.min(...boundsMargins),
      visitorAnchor,
      stages
    };
  }, staged);
}
