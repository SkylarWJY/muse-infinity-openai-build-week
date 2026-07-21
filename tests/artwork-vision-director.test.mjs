import test from "node:test";
import assert from "node:assert/strict";
import {
  ArtworkVisionDirector,
  selectArtworkVisionAsset
} from "../src/render/ArtworkVisionDirector.js";

const DESKTOP_ASSET = "/assets/generated/living-artworks-v2/aic-111436-marble-text/world-500k.spz";
const MOBILE_ASSET = "/assets/generated/living-artworks-v2/aic-111436-marble-text/world-100k.spz";
const THUMBNAIL = "/assets/generated/living-artworks-v2/aic-111436-marble-text/thumbnail.webp";

test("vision stays hidden until evidence triggers it, then returns to the painting at five seconds", async () => {
  const harness = visionHarness();
  const director = harness.director;

  assert.equal(director.snapshot().state, "idle");
  director.setWorld(request());
  assert.equal(director.snapshot().state, "loading");
  await director.whenReady();

  assert.equal(director.snapshot().state, "ready");
  assert.equal(harness.runtime.visible, false);
  assert.equal(harness.runtime.element.hidden, true);
  assert.deepEqual(director.setRevealOrigin({ x: 0.28, y: 0.42 }), { x: 0.28, y: 0.42 });
  assert.equal(director.trigger("aic-111436"), true);
  assert.equal(harness.runtime.visible, true);
  assert.equal(harness.runtime.element.hidden, false);
  assert.equal(harness.runtime.opacity, 0);

  director.update(0.325);
  assert.ok(harness.runtime.opacity > 0 && harness.runtime.opacity < 1);
  assert.ok(harness.runtime.reveal.progress > 0 && harness.runtime.reveal.progress < 1);
  assert.deepEqual(harness.runtime.reveal.origin, { x: 0.28, y: 0.42 });
  director.update(0.325);
  assert.equal(harness.runtime.opacity, 1);
  assert.equal(harness.runtime.reveal.progress, 1);
  director.update(3.55);
  assert.equal(harness.runtime.frames.at(-1).cameraProgress, 1);
  director.update(0.4);
  assert.ok(harness.runtime.opacity > 0 && harness.runtime.opacity < 1);
  director.update(0.4);

  assert.equal(director.snapshot().state, "completed");
  assert.equal(director.snapshot().elapsed, 5);
  assert.equal(harness.runtime.visible, false);
  assert.equal(harness.runtime.element.hidden, true);
  assert.equal(harness.runtime.element.style.pointerEvents, "none");
  assert.equal(harness.runtime.reveal.progress, 0);
  assert.deepEqual(
    harness.events.filter(({ type }) => type === "cue").map(({ cue }) => cue.kind),
    ["curated-fact", "imagined-reenactment"]
  );
});

test("pause freezes the reveal while skip and replay restore the original frame cleanly", async () => {
  const harness = visionHarness();
  const director = harness.director;
  director.setWorld(request());
  await director.whenReady();
  director.trigger("aic-111436");
  director.update(1);
  const beforePause = director.snapshot().elapsed;
  const frameCount = harness.runtime.frames.length;

  assert.equal(director.pause(true), true);
  director.update(2);
  assert.equal(director.snapshot().elapsed, beforePause);
  assert.equal(harness.runtime.frames.length, frameCount);
  assert.equal(director.pause(false), true);
  director.update(0.5);
  assert.equal(director.snapshot().elapsed, beforePause + 0.5);

  assert.equal(director.skip(), true);
  assert.equal(director.snapshot().state, "completed");
  assert.equal(harness.runtime.visible, false);
  assert.equal(director.replay(), true);
  assert.equal(director.snapshot().state, "story");
  assert.equal(director.snapshot().elapsed, 0);
  assert.equal(harness.runtime.visible, true);
});

test("reduced motion uses the static representative frame and never advances the camera", async () => {
  const harness = visionHarness({ reducedMotion: true });
  const director = harness.director;
  director.setWorld(request());
  await director.whenReady();

  assert.equal(harness.factoryCalls[0].source, THUMBNAIL);
  assert.equal(harness.factoryCalls[0].reducedMotion, true);
  director.trigger("aic-111436");
  director.update(2.5);
  assert.equal(harness.runtime.frames.at(-1).cameraProgress, 0);
  assert.equal(harness.runtime.frames.at(-1).reducedMotion, true);
  assert.equal(harness.runtime.reveal.progress, 1);
  director.update(2.5);
  assert.equal(director.snapshot().state, "completed");
  assert.equal(harness.runtime.visible, false);
});

test("a failed load never reveals a canvas or installs a primitive fallback", async () => {
  const failure = new Error("spz_decode_failed");
  const harness = visionHarness({ ready: Promise.reject(failure) });
  const director = harness.director;
  director.setWorld(request());
  assert.equal(director.trigger("aic-111436"), true);
  await director.whenReady();

  assert.equal(director.snapshot().state, "failed");
  assert.equal(director.snapshot().error, failure.message);
  assert.equal(harness.runtime.everVisible, false);
  assert.equal(harness.runtime.disposed, true);
  assert.equal(Object.hasOwn(director.snapshot(), "fallback"), false);
  assert.ok(harness.events.some((event) => event.type === "state" && event.state === "failed"));
});

test("a stale load is disposed and cannot replace the next world", async () => {
  const deferred = promiseWithResolvers();
  const harness = visionHarness({ ready: deferred.promise });
  const director = harness.director;
  director.setWorld(request());
  await Promise.resolve();
  const staleLoad = director.whenReady();

  director.setWorld({ sceneId: "water-and-light" });
  assert.equal(director.snapshot().state, "idle");
  deferred.resolve();
  await staleLoad;

  assert.equal(harness.runtime.disposed, true);
  assert.equal(harness.runtime.everVisible, false);
  assert.equal(director.snapshot().sceneId, "water-and-light");
  assert.equal(director.snapshot().artworkId, null);
  assert.equal(director.snapshot().state, "idle");
});

test("desktop and mobile select their explicit SPZ budgets", async () => {
  const config = request().config;
  assert.equal(selectArtworkVisionAsset(config, false), DESKTOP_ASSET);
  assert.equal(selectArtworkVisionAsset(config, true), MOBILE_ASSET);

  const desktop = visionHarness({ mobile: false });
  desktop.director.setWorld(request());
  await desktop.director.whenReady();
  assert.equal(desktop.factoryCalls[0].source, DESKTOP_ASSET);

  const mobile = visionHarness({ mobile: true });
  mobile.director.setWorld(request());
  await mobile.director.whenReady();
  assert.equal(mobile.factoryCalls[0].source, MOBILE_ASSET);
});

function request() {
  return {
    sceneId: "sunset-frames",
    artworkId: "aic-111436",
    config: {
      artworkId: "aic-111436",
      vision: {
        durationMs: 5_000,
        assets: {
          desktop: DESKTOP_ASSET,
          mobile: MOBILE_ASSET,
          representativeFrame: THUMBNAIL
        },
        cues: [
          { atMs: 700, kind: "curated-fact", text: "A fact.", sourceId: "aic-111436" },
          { atMs: 2_500, kind: "imagined-reenactment", text: "An imagined line." }
        ]
      }
    }
  };
}

function visionHarness({ reducedMotion = false, mobile = false, ready = Promise.resolve() } = {}) {
  const events = [];
  const factoryCalls = [];
  const runtime = fakeRuntime(ready);
  const container = {
    clientWidth: 1_280,
    clientHeight: 720,
    appendChild() {}
  };
  const director = new ArtworkVisionDirector(container, {
    reducedMotion,
    mobile,
    onStatus: (event) => events.push(event),
    runtimeFactory: async (options) => {
      factoryCalls.push(options);
      return runtime;
    }
  });
  return { container, director, events, factoryCalls, runtime };
}

function fakeRuntime(ready) {
  return {
    element: {
      hidden: true,
      style: { opacity: "0", pointerEvents: "none" },
      setAttribute() {}
    },
    ready,
    visible: false,
    everVisible: false,
    opacity: 0,
    reveal: { progress: 0, origin: { x: 0.5, y: 0.5 } },
    disposed: false,
    frames: [],
    setVisible(visible) {
      this.visible = Boolean(visible);
      this.everVisible ||= this.visible;
      this.element.hidden = !this.visible;
      this.element.style.pointerEvents = "none";
    },
    setOpacity(opacity) {
      this.opacity = opacity;
      this.element.style.opacity = String(opacity);
    },
    setReveal(progress, origin) {
      this.reveal = { progress, origin: { ...origin } };
    },
    resize() {},
    render(frame) { this.frames.push(frame); },
    dispose() {
      this.disposed = true;
      this.setVisible(false);
    }
  };
}

function promiseWithResolvers() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
