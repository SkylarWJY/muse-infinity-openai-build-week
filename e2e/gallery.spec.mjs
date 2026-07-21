import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { WORLDS } from "../src/config/scenes.js";

const screenshotRoot = "artifacts/screenshots/gallery-v4";

test("all nine deterministic layouts place four readable artworks on inherited collider geometry", async ({ page }) => {
  test.setTimeout(240_000);
  mkdirSync(screenshotRoot, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/*", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const isHeavyArchive = pathname.endsWith(".rad")
      || pathname.endsWith(".spz")
      || pathname.endsWith("-texture-mesh.glb");
    if (pathname.startsWith("/api/")) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "e2e_api_endpoint_disabled" })
      });
    } else if (isHeavyArchive) await route.abort("blockedbyclient");
    else await route.continue();
  });

  await page.goto("/?quality=performance", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__MUSE_APP__?.state.bootSettled === true, null, { timeout: 90_000 });
  await page.evaluate(() => {
    const { engine } = window.__MUSE_APP__;
    engine.ready = false;
    engine.worldLayer.loadArchive = async () => false;
    document.querySelector("#app").removeAttribute("data-world-presentation");
    document.querySelector("#entry-panel").hidden = true;
    document.querySelector("#dialogue").hidden = true;
    document.querySelector(".mission-rail").hidden = true;
  });
  await page.waitForTimeout(50);

  for (const world of WORLDS) {
    await test.step(world.sceneId, async () => {
      await page.evaluate(async (worldId) => {
        const { engine } = window.__MUSE_APP__;
        await engine.setWorld(worldId);
        engine.player.group.visible = false;
        engine.guide.group.visible = false;
        for (const actor of [...engine.partyActors, ...engine.salonActors]) actor.group.visible = false;
        engine.worldLayer.scenery.visible = false;

        const THREE = await import("three");
        if (engine.__galleryVerificationGroup) {
          engine.scene.remove(engine.__galleryVerificationGroup);
          engine.__galleryVerificationGroup.traverse((object) => {
            object.geometry?.dispose?.();
            if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
            else object.material?.dispose?.();
          });
        }
        engine.scene.background = new THREE.Color(0x171a18);
        engine.scene.fog = null;
        const colliderBounds = new THREE.Box3().setFromObject(engine.worldLayer.collider);

        const verificationGroup = new THREE.Group();
        verificationGroup.name = "gallery-verification-overlay";
        const boundsHelper = new THREE.Box3Helper(colliderBounds, 0x6f7d75);
        boundsHelper.material.transparent = true;
        boundsHelper.material.opacity = 0.5;
        verificationGroup.add(boundsHelper);
        const size = colliderBounds.getSize(new THREE.Vector3());
        const center = colliderBounds.getCenter(new THREE.Vector3());
        const grid = new THREE.GridHelper(Math.max(size.x, size.z), 24, 0x6f7d75, 0x343a36);
        grid.position.set(center.x, colliderBounds.min.y + 0.01, center.z);
        grid.material.transparent = true;
        grid.material.opacity = 0.32;
        verificationGroup.add(grid);
        engine.__galleryVerificationGroup = verificationGroup;
        engine.scene.add(verificationGroup);
      }, world.id);

      const metrics = await page.evaluate(async () => {
        const THREE = await import("three");
        const { engine } = window.__MUSE_APP__;
        const layer = engine.worldLayer;
        const records = [...layer.artworks.values()].sort((left, right) => left.index - right.index);
        const bounds = engine.activeWorld.profile.bounds;
        const entries = records.map((record) => {
          const { frame, border, picture } = record;
          const activeScale = 1.025;
          const halfWidth = Number(border.geometry.parameters.width || 0) / 2 * activeScale;
          const halfDepth = Number(border.geometry.parameters.depth || 0.07) / 2 * activeScale;
          const yaw = frame.rotation.y;
          const extentX = Math.abs(Math.cos(yaw)) * halfWidth + Math.abs(Math.sin(yaw)) * halfDepth;
          const extentZ = Math.abs(Math.sin(yaw)) * halfWidth + Math.abs(Math.cos(yaw)) * halfDepth;
          const guide = frame.userData.guideAnchor;
          const normal = frame.position.clone().set(0, 0, 1).applyQuaternion(frame.quaternion).normalize();
          const toGuide = frame.position.clone().set(guide[0], frame.position.y, guide[2]).sub(frame.position).normalize();
          const supportVisible = frame.userData.supports?.every((support) => support.visible) === true;
          const expectedGround = supportVisible
            ? layer.walkableGroundHeightAt(frame.position.x, frame.position.z, guide[1], 0.45) + 0.02
            : guide[1] + 0.02;
          const image = picture.material.map?.image;
          const frameCenter = frame.position.clone();
          frameCenter.y += 1.48;
          const guideEye = frame.position.clone().set(guide[0], guide[1] + 1.48, guide[2]);
          const sightlineHalfWidth = Math.max(0.1, halfWidth);
          const sightlineHalfHeight = Math.max(0.1, Number(border.geometry.parameters.height || 0) / 2 * activeScale);
          const tangent = new THREE.Vector3(1, 0, 0).applyQuaternion(frame.quaternion).normalize();
          const sightlineTargets = [
            ["center", 0, 0],
            ["top-left", -sightlineHalfWidth, sightlineHalfHeight],
            ["top-right", sightlineHalfWidth, sightlineHalfHeight],
            ["bottom-left", -sightlineHalfWidth, -sightlineHalfHeight],
            ["bottom-right", sightlineHalfWidth, -sightlineHalfHeight]
          ];
          const obstructions = sightlineTargets.flatMap(([label, horizontal, vertical]) => {
            const target = frameCenter.clone().addScaledVector(tangent, horizontal);
            target.y += vertical;
            const sightline = target.sub(guideEye);
            const obstruction = new THREE.Raycaster(
              guideEye,
              sightline.clone().normalize(),
              0.08,
              sightline.length() - 0.005
            ).intersectObject(layer.collider, true)[0];
            return obstruction ? [{ label, distance: obstruction.distance }] : [];
          });
          const backingWallDistance = supportVisible ? null : layer.backingWallGap({
            x: frame.position.x,
            z: frame.position.z,
            groundY: frame.position.y,
            yaw: frame.rotation.y,
            guideAnchor: frame.userData.guideAnchor
          }, { halfWidth: sightlineHalfWidth, halfHeight: sightlineHalfHeight });
          return {
            id: record.artwork.id,
            visible: frame.visible,
            placementError: frame.userData.placementError || null,
            source: record.artwork.source,
            sourceUrl: record.artwork.sourceUrl,
            imageUrl: image?.currentSrc || image?.src || "",
            imageWidth: image?.naturalWidth || image?.width || 0,
            imageHeight: image?.naturalHeight || image?.height || 0,
            x: frame.position.x,
            y: frame.position.y,
            z: frame.position.z,
            minX: frame.position.x - extentX,
            maxX: frame.position.x + extentX,
            minZ: frame.position.z - extentZ,
            maxZ: frame.position.z + extentZ,
            groundError: Math.abs(frame.position.y - expectedGround),
            facingDot: normal.dot(toGuide),
            supportVisible,
            minimumViewingDistance: frameCenter.distanceTo(guideEye),
            sightlineClear: obstructions.length === 0,
            obstructions,
            backingWallDistance,
            guide,
            lookAt: frame.userData.lookAt
          };
        });
        const clearances = [];
        for (let left = 0; left < records.length; left += 1) {
          for (let right = left + 1; right < records.length; right += 1) {
            const a = records[left];
            const b = records[right];
            const distance = Math.hypot(a.frame.position.x - b.frame.position.x, a.frame.position.z - b.frame.position.z);
            const radiusA = Number(a.border.geometry.parameters.width || 0) / 2;
            const radiusB = Number(b.border.geometry.parameters.width || 0) / 2;
            clearances.push(distance - radiusA - radiusB);
          }
        }
        const pose = layer.stopPose(engine.activeWorld.sceneId);
        return {
          worldId: engine.activeWorld.id,
          sceneId: engine.activeWorld.sceneId,
          artworkGroupVisible: layer.artworkGroup.visible,
          colliderLoaded: Boolean(layer.collider),
          bounds,
          entries,
          minimumClearance: Math.min(...clearances),
          focusedArtworkId: pose?.artwork?.id || null
        };
      });

      expect(metrics.worldId).toBe(world.id);
      expect(metrics.sceneId).toBe(world.sceneId);
      expect(metrics.artworkGroupVisible).toBe(true);
      expect(metrics.colliderLoaded).toBe(true);
      expect(metrics.entries).toHaveLength(4);
      expect(metrics.focusedArtworkId).toBe(metrics.entries[0].id);
      expect(metrics.minimumClearance).toBeGreaterThan(0.15);
      for (const artwork of metrics.entries) {
        expect(artwork.id).toMatch(/^aic-\d+$/);
        expect(artwork.visible, `${artwork.id} visibility`).toBe(true);
        expect(artwork.placementError, `${artwork.id} placement error`).toBeNull();
        expect(artwork.source).toBe("Art Institute of Chicago");
        expect(artwork.sourceUrl).toMatch(/^https:\/\/www\.artic\.edu\/artworks\//);
        expect(artwork.imageUrl).toContain(`/assets/art/collection/${artwork.id}.jpg`);
        expect(artwork.imageWidth).toBeGreaterThan(500);
        expect(artwork.imageHeight).toBeGreaterThan(500);
        expect(artwork.minX).toBeGreaterThanOrEqual(metrics.bounds.minX - 0.02);
        expect(artwork.maxX).toBeLessThanOrEqual(metrics.bounds.maxX + 0.02);
        expect(artwork.minZ).toBeGreaterThanOrEqual(metrics.bounds.minZ - 0.02);
        expect(artwork.maxZ).toBeLessThanOrEqual(metrics.bounds.maxZ + 0.02);
        expect(artwork.groundError).toBeLessThan(0.03);
        expect(artwork.facingDot).toBeGreaterThan(artwork.supportVisible ? 0.995 : 0.6);
        expect(artwork.minimumViewingDistance, `${artwork.id} viewing distance`).toBeGreaterThanOrEqual(2.2);
        expect(artwork.sightlineClear, `${artwork.id} guide sightline`).toBe(true);
        if (!artwork.supportVisible) {
          expect(artwork.backingWallDistance, `${artwork.id} backing wall`).not.toBeNull();
          expect(artwork.backingWallDistance, `${artwork.id} backing wall gap`).toBeLessThanOrEqual(0.1);
        }
        expect(artwork.guide.every(Number.isFinite)).toBe(true);
        expect(artwork.lookAt.every(Number.isFinite)).toBe(true);
      }

      await page.evaluate(async () => {
        const THREE = await import("three");
        const { engine } = window.__MUSE_APP__;
        const colliderMaterial = new THREE.MeshBasicMaterial({ color: 0x29302c });
        engine.worldLayer.collider.traverse((object) => {
          if (!object.isMesh) return;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) material?.dispose?.();
          object.material = colliderMaterial;
          object.visible = true;
        });
      });

      const views = [
        { name: "overview", indices: [0, 1, 2, 3] },
        ...metrics.entries.map((artwork, index) => ({
          name: `artwork-${index + 1}-${artwork.id}`,
          indices: [index]
        }))
      ];
      for (const view of views) {
        const projection = await page.evaluate(async (selectedIndices) => {
          const THREE = await import("three");
          const { engine } = window.__MUSE_APP__;
          const allRecords = [...engine.worldLayer.artworks.values()]
            .sort((left, right) => left.index - right.index);
          for (const record of allRecords) record.frame.visible = selectedIndices.includes(record.index);
          const records = allRecords.filter((record) => selectedIndices.includes(record.index));
          const centers = records.map((record) => {
            const center = record.frame.position.clone();
            center.y += 1.48;
            return center;
          });
          const target = centers[0].clone().set(0, 0, 0);
          const guide = target.clone();
          for (let index = 0; index < records.length; index += 1) {
            const record = records[index];
            target.add(centers[index]);
            const anchor = record.frame.userData.guideAnchor;
            guide.add(record.frame.position.clone().set(anchor[0], anchor[1] + 1.55, anchor[2]));
          }
          target.multiplyScalar(1 / records.length);
          guide.multiplyScalar(1 / records.length);
          const radius = Math.max(...records.map((record, index) => {
            const halfWidth = Number(record.border.geometry.parameters.width || 0) / 2;
            return centers[index].distanceTo(target) + Math.max(1.35, halfWidth);
          }));
          if (records.length === 1) {
            engine.camera.position.copy(guide);
          } else {
            const direction = guide.sub(target);
            direction.y += Math.max(0.55, radius * 0.08);
            if (direction.lengthSq() < 0.01) direction.set(0, 0.25, 1);
            const halfFov = engine.camera.fov * Math.PI / 360;
            direction.setLength(Math.max(3.8, radius / Math.tan(halfFov) * 1.15));
            engine.camera.position.copy(target).add(direction);
          }
          engine.camera.lookAt(target);
          engine.camera.updateMatrixWorld(true);
          engine.renderer.render(engine.scene, engine.camera);

          return records.map((record) => {
            const center = record.frame.position.clone();
            center.y += 1.48;
            const activeScale = 1.025;
            const halfWidth = Math.max(0.1, Number(record.border.geometry.parameters.width || 0) / 2 * activeScale);
            const halfHeight = Math.max(0.1, Number(record.border.geometry.parameters.height || 0) / 2 * activeScale);
            const tangent = new THREE.Vector3(1, 0, 0).applyQuaternion(record.frame.quaternion).normalize();
            const points = [
              ["center", 0, 0],
              ["top-left", -halfWidth, halfHeight],
              ["top-right", halfWidth, halfHeight],
              ["bottom-left", -halfWidth, -halfHeight],
              ["bottom-right", halfWidth, -halfHeight]
            ].map(([label, horizontal, vertical]) => {
              const point = center.clone().addScaledVector(tangent, horizontal);
              point.y += vertical;
              point.project(engine.camera);
              return { label, x: point.x, y: point.y, z: point.z };
            });
            return { id: record.artwork.id, points };
          });
        }, view.indices);
        for (const artwork of projection) {
          for (const point of artwork.points) {
            expect(Math.abs(point.x), `${artwork.id} ${point.label} horizontal projection`).toBeLessThan(0.96);
            expect(Math.abs(point.y), `${artwork.id} ${point.label} vertical projection`).toBeLessThan(0.9);
            expect(point.z, `${artwork.id} ${point.label} near plane`).toBeGreaterThan(-1);
            expect(point.z, `${artwork.id} ${point.label} far plane`).toBeLessThan(1);
          }
        }
        const screenshot = await page.locator("#world canvas").screenshot({
          path: `${screenshotRoot}/${world.sceneId}-${view.name}.png`
        });
        expect(screenshot.byteLength).toBeGreaterThan(20_000);
      }
    });
  }
});
