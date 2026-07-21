import { expect, test } from "@playwright/test";

test("the learner defaults to the girl and switches avatars without replacing the world actor", async ({ page }) => {
  const browserErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__MUSE_APP__?.engine?.player?.ready === true, null, { timeout: 30_000 });

  const initial = await page.evaluate(() => {
    const player = window.__MUSE_APP__.engine.player;
    return {
      avatarId: player.group.userData.avatarId,
      asset: player.group.userData.asset,
      model: player.group.userData.model,
      fallback: player.group.userData.fallback,
      rig: player.model.userData.motionRig,
      clips: player.model.userData.animationClips
    };
  });
  expect(initial).toEqual({
    avatarId: "little-girl",
    asset: "/assets/characters/learner-girl.glb",
    model: "tripo-little-girl-static-v1",
    fallback: false,
    rig: "procedural-limbs",
    clips: []
  });

  const switched = await page.evaluate(async () => {
    const engine = window.__MUSE_APP__.engine;
    const actor = engine.player.group;
    await engine.setLearnerAvatar("original");
    const original = {
      sameActor: actor === engine.player.group,
      avatarId: engine.player.group.userData.avatarId,
      rig: engine.player.model.userData.motionRig,
      clips: engine.player.model.userData.animationClips
    };
    await engine.setLearnerAvatar("little-girl");
    engine.player.phase = 0;
    engine.player.setMotion(1.33);
    engine.player.update(1, 0.24);
    const firstPose = { ...engine.player.motionAngles };
    engine.player.update(1, 0.62);
    return {
      original,
      restored: {
        sameActor: actor === engine.player.group,
        avatarId: engine.player.group.userData.avatarId,
        rig: engine.player.model.userData.motionRig,
        motion: engine.player.group.userData.motion
      },
      firstPose,
      secondPose: { ...engine.player.motionAngles }
    };
  });

  expect(switched.original).toEqual({
    sameActor: true,
    avatarId: "original",
    rig: "skeletal-animation",
    clips: ["preset:biped:wait", "preset:biped:walk"]
  });
  expect(switched.restored).toMatchObject({
    sameActor: true,
    avatarId: "little-girl",
    rig: "procedural-limbs",
    motion: "walk"
  });
  expect(poseDistance(switched.firstPose, switched.secondPose)).toBeGreaterThan(0.1);
  expect(Math.sign(switched.firstPose.leftLegX)).toBe(-Math.sign(switched.firstPose.rightLegX));
  expect(browserErrors).toEqual([]);
});

function poseDistance(left, right) {
  return Object.keys(left).reduce((sum, key) => sum + Math.abs(left[key] - right[key]), 0);
}
