import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { ArtworkStoryDirector } from "../src/render/ArtworkStoryDirector.js";

test("loads one anchored artwork and enters ambient motion", async () => {
  const scene = new THREE.Scene();
  const asset = disposableGltf({ clips: [clip("Ambient", 2), clip("Story", 1)] });
  const director = new ArtworkStoryDirector(scene, {
    loader: { loadAsync: async () => asset.gltf }
  });
  const anchorMatrix = new THREE.Matrix4().makeTranslation(2, 3, 4);

  director.setWorld({
    sceneId: "water",
    artworkId: "water-lilies",
    anchorMatrix,
    config: config({ asset: "/water-lilies.glb" })
  });
  assert.equal(director.snapshot().state, "loading");

  await nextTask();
  const snapshot = director.snapshot();
  assert.equal(snapshot.state, "ambient");
  assert.equal(snapshot.motion, "clip");
  assert.equal(snapshot.loaded, true);
  assert.deepEqual(director.group.position.toArray(), [2, 3, 4]);
  assert.equal(director.group.userData.forwardAxis, "+z");
  assert.equal(asset.gltf.scene.parent, director.group);
  director.dispose();
});

test("keeps the living model out of the artwork sightline until its story is active", async () => {
  const asset = disposableGltf();
  const director = new ArtworkStoryDirector(new THREE.Scene(), {
    loader: { loadAsync: async () => asset.gltf }
  });
  director.setWorld(worldArgs(config({ duration: 1 })));
  await nextTask();

  assert.equal(director.snapshot().state, "ambient");
  assert.equal(asset.gltf.scene.visible, false);

  assert.equal(director.trigger("hero"), true);
  assert.equal(director.snapshot().state, "story");
  assert.equal(asset.gltf.scene.visible, true);

  director.update(1);
  assert.equal(director.snapshot().state, "completed");
  assert.equal(asset.gltf.scene.visible, false);

  assert.equal(director.replay(), true);
  assert.equal(asset.gltf.scene.visible, true);
  director.dispose();
});

test("queues a matching trigger while loading and starts the story on resolve", async () => {
  const pending = deferred();
  const director = new ArtworkStoryDirector(new THREE.Scene(), {
    loader: { loadAsync: () => pending.promise }
  });
  director.setWorld(worldArgs(config()));

  assert.equal(director.trigger("hero"), true);
  assert.equal(director.trigger("some-other-artwork"), false);
  assert.equal(director.snapshot().pendingTrigger, true);

  pending.resolve(disposableGltf({ clips: [clip("Story", 1)] }).gltf);
  await nextTask();
  assert.equal(director.snapshot().state, "story");
  assert.equal(director.snapshot().pendingTrigger, false);
  director.dispose();
});

test("world generation changes cannot install stale assets", async () => {
  const first = deferred();
  const second = deferred();
  const requests = [first, second];
  const scene = new THREE.Scene();
  const director = new ArtworkStoryDirector(scene, {
    loader: { loadAsync: () => requests.shift().promise }
  });
  director.setWorld(worldArgs(config({ asset: "/first.glb" })));
  director.setWorld({
    sceneId: "second",
    artworkId: "second-hero",
    anchorMatrix: new THREE.Matrix4(),
    config: config({ asset: "/second.glb" })
  });

  const stale = disposableGltf();
  first.resolve(stale.gltf);
  await nextTask();
  assert.equal(stale.counts.geometry, 1);
  assert.equal(director.snapshot().state, "loading");

  const current = disposableGltf();
  second.resolve(current.gltf);
  await nextTask();
  assert.equal(director.snapshot().state, "ambient");
  assert.equal(current.gltf.scene.parent, director.group);
  director.dispose();
});

test("load timeout fails closed and disposes a late GLB", async () => {
  const pending = deferred();
  const events = [];
  const director = new ArtworkStoryDirector(new THREE.Scene(), {
    loader: { loadAsync: () => pending.promise },
    loadTimeoutMs: 5,
    onStatus: (event) => events.push(event)
  });
  director.setWorld(worldArgs(config()));

  await delay(12);
  assert.equal(director.snapshot().state, "failed");
  assert.match(director.snapshot().error, /artwork_story_timeout/);
  assert.ok(events.some((event) => event.type === "state" && event.state === "failed"));

  const late = disposableGltf();
  pending.resolve(late.gltf);
  await nextTask();
  assert.equal(late.counts.geometry, 1);
  assert.doesNotThrow(() => director.update(1));
  director.dispose();
});

test("story cues, pause, skip and replay follow the story clock", async () => {
  const events = [];
  const timelineSamples = [];
  const director = new ArtworkStoryDirector(new THREE.Scene(), {
    loader: { loadAsync: async () => disposableGltf().gltf },
    onStatus: (event) => events.push(event)
  });
  director.setWorld(worldArgs(config({
    duration: 2,
    cues: [{ at: 0, id: "opening" }, { at: 1, id: "reveal" }],
    proceduralTimeline: {
      story: ({ time }) => timelineSamples.push(time)
    }
  })));
  await nextTask();

  assert.equal(director.trigger("hero"), true);
  assert.deepEqual(events.filter((event) => event.type === "cue").map((event) => event.cue.id), ["opening"]);
  director.update(0.5);
  director.pause(true);
  director.update(1);
  assert.equal(director.snapshot().elapsed, 0.5);
  director.pause(false);
  director.update(0.6);
  assert.ok(events.some((event) => event.type === "cue" && event.cue.id === "reveal"));
  assert.ok(timelineSamples.length >= 2);

  assert.equal(director.skip(), true);
  assert.equal(director.snapshot().state, "completed");
  assert.equal(director.replay(), true);
  assert.equal(director.snapshot().state, "story");
  assert.equal(director.snapshot().elapsed, 0);
  assert.equal(events.filter((event) => event.type === "cue" && event.cue.id === "opening").length, 2);
  director.update(2);
  assert.equal(director.snapshot().state, "completed");
  director.dispose();
});

test("skip cancels a pending trigger without starting a late story", async () => {
  const pending = deferred();
  const director = new ArtworkStoryDirector(new THREE.Scene(), {
    loader: { loadAsync: () => pending.promise }
  });
  director.setWorld(worldArgs(config()));
  director.trigger("hero");
  assert.equal(director.skip(), true);
  assert.equal(director.snapshot().pendingTrigger, false);

  pending.resolve(disposableGltf({ clips: [clip("Story", 1)] }).gltf);
  await nextTask();
  assert.equal(director.snapshot().state, "ambient");
  director.dispose();
});

test("reduced motion freezes visual timelines but preserves story state and cues", async () => {
  let ambientSamples = 0;
  let storySamples = 0;
  const events = [];
  const loaded = disposableGltf();
  const timeline = (middle, handler, clipName) => ({
    type: "procedural",
    clip: clipName,
    loop: false,
    durationMs: 1_000,
    handler,
    timeline: [
      { atMs: 0, position: [0, 0, 0] },
      { atMs: 500, position: middle },
      { atMs: 1_000, position: [0, 0, 0] }
    ]
  });
  const director = new ArtworkStoryDirector(new THREE.Scene(), {
    reducedMotion: true,
    loader: { loadAsync: async () => ({
      ...loaded.gltf,
      animations: [clip("Ambient", 2), clip("Story", 2)]
    }) },
    onStatus: (event) => events.push(event)
  });
  director.setWorld(worldArgs(config({
    duration: 1,
    cues: [{ at: 0.5, id: "caption" }],
    motion: {
      ambient: timeline([0, 0.2, 0], () => { ambientSamples += 1; }, "Ambient"),
      story: timeline([0, 0, 0.75], () => { storySamples += 1; }, "Story")
    }
  })));
  await nextTask();

  assert.deepEqual(loaded.gltf.scene.position.toArray(), [0, 0.2, 0]);
  assert.equal(director.actions.ambient.time, 1);
  director.update(0.5);
  director.trigger("hero");
  assert.deepEqual(loaded.gltf.scene.position.toArray(), [0, 0, 0.75]);
  assert.equal(director.actions.story.time, 1);
  director.update(0.5);
  assert.equal(ambientSamples, 0);
  assert.equal(storySamples, 0);
  assert.deepEqual(loaded.gltf.scene.position.toArray(), [0, 0, 0.75]);
  assert.equal(director.snapshot().reducedMotion, true);
  assert.equal(director.snapshot().state, "story");
  assert.ok(events.some((event) => event.type === "cue" && event.cue.id === "caption"));
  director.update(0.5);
  assert.equal(director.snapshot().state, "completed");
  director.dispose();
});

test("formal procedural motion interpolates frame-local transforms", async () => {
  const loaded = disposableGltf();
  const director = new ArtworkStoryDirector(new THREE.Scene(), {
    loader: { loadAsync: async () => loaded.gltf }
  });
  const motion = {
    type: "procedural",
    loop: true,
    durationMs: 1_000,
    timeline: [
      { atMs: 0, position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], opacity: 1 },
      { atMs: 1_000, position: [0, 0, 3], rotation: [0, 0, 0], scale: [2, 2, 2], opacity: 0.5 }
    ]
  };
  director.setWorld(worldArgs({
    asset: "/hero.glb",
    durationMs: 1_000,
    maxProjectionM: 10,
    frameLocalTransform: {
      position: [1, 2, 3],
      rotation: [0, 0, 0],
      scale: [1, 1, 1]
    },
    motion: { ambient: motion, story: { ...motion, loop: false } },
    cues: []
  }));
  await nextTask();

  director.update(0.5);
  assert.deepEqual(loaded.gltf.scene.position.toArray(), [1, 2, 4.5]);
  assert.deepEqual(loaded.gltf.scene.scale.toArray(), [1.5, 1.5, 1.5]);
  assert.equal(loaded.gltf.scene.children[0].material.opacity, 0.75);

  director.trigger("hero");
  director.update(1);
  assert.equal(director.snapshot().state, "completed");
  assert.deepEqual(loaded.gltf.scene.position.toArray(), [1, 2, 3]);
  director.dispose();
});

test("projection enforcement includes base transforms, child bounds, scale and rotation", async () => {
  const loaded = disposableGltf();
  loaded.gltf.scene.children[0].position.z = 0.6;
  const director = new ArtworkStoryDirector(new THREE.Scene(), {
    loader: { loadAsync: async () => loaded.gltf }
  });
  director.setWorld(worldArgs({
    asset: "/deep-geometry.glb",
    durationMs: 2_000,
    maxProjectionM: 1.25,
    frameLocalTransform: {
      position: [0, 0, 0.2],
      rotation: [0, Math.PI / 5, 0],
      scale: [1.5, 1.2, 2]
    },
    motion: {
      story: {
        type: "procedural",
        loop: false,
        durationMs: 2_000,
        timeline: [
          { atMs: 0, position: [0, 0, 0] },
          { atMs: 1_000, position: [0, 0, 2], rotation: [0.1, 0.25, 0], scale: [1.3, 1.1, 1.4] },
          { atMs: 2_000, position: [0, 0, 0] }
        ]
      }
    },
    cues: []
  }));
  await nextTask();
  director.trigger("hero");
  director.update(1);

  director.group.updateMatrixWorld(true);
  const furthest = new THREE.Box3().setFromObject(director.model, true).max.z;
  assert.ok(furthest <= 1.25 + 1e-9, `furthest rendered point was ${furthest}`);
  assert.ok(director.model.position.z < 2.2, "the root must account for geometry depth, not only clamp its own Z");
  director.dispose();
});

test("hybrid motion samples clips immediately and normalizes them to the phase clock", async () => {
  const loaded = disposableGltf();
  const actor = loaded.gltf.scene.children[0];
  actor.name = "Actor";
  const storyClip = new THREE.AnimationClip("Story", 2, [
    new THREE.VectorKeyframeTrack("Actor.position", [0, 2], [0, 1, 0, 0, 3, 0])
  ]);
  loaded.gltf.animations = [storyClip];
  const director = new ArtworkStoryDirector(new THREE.Scene(), {
    loader: { loadAsync: async () => loaded.gltf }
  });
  director.setWorld(worldArgs({
    asset: "/hybrid.glb",
    durationMs: 4_000,
    motion: {
      story: {
        type: "procedural",
        clip: "Story",
        loop: false,
        durationMs: 4_000,
        timeline: [
          { atMs: 0, position: [0, 0, 0] },
          { atMs: 4_000, position: [0, 0, 0.8] }
        ]
      }
    },
    cues: []
  }));
  await nextTask();

  director.trigger("hero");
  assert.equal(actor.position.y, 1, "the clip's first frame must be sampled before rendering");
  assert.equal(director.snapshot().motion, "hybrid");
  director.update(1);
  assert.equal(director.actions.story.time, 0.5);
  assert.equal(actor.position.y, 1.5);
  assert.equal(loaded.gltf.scene.position.z, 0.2);
  director.dispose();
});

test("clear and dispose release geometry, material and textures exactly once", async () => {
  const scene = new THREE.Scene();
  const loaded = disposableGltf({ texture: true });
  const director = new ArtworkStoryDirector(scene, {
    loader: { loadAsync: async () => loaded.gltf }
  });
  director.setWorld(worldArgs(config()));
  await nextTask();

  director.clear();
  assert.equal(director.snapshot().state, "cleared");
  assert.equal(loaded.counts.geometry, 1);
  assert.equal(loaded.counts.material, 1);
  assert.equal(loaded.counts.texture, 1);
  assert.equal(loaded.gltf.scene.parent, null);

  director.dispose();
  director.dispose();
  assert.equal(scene.children.includes(director.group), false);
  assert.equal(loaded.counts.geometry, 1);
  assert.equal(loaded.counts.material, 1);
  assert.equal(loaded.counts.texture, 1);
});

function worldArgs(storyConfig) {
  return {
    sceneId: "scene",
    artworkId: "hero",
    anchorMatrix: new THREE.Matrix4(),
    config: storyConfig
  };
}

function config(overrides = {}) {
  return {
    asset: "/hero.glb",
    clips: { ambient: "Ambient", story: "Story" },
    duration: 2,
    ...overrides
  };
}

function clip(name, duration) {
  return new THREE.AnimationClip(name, duration, []);
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((settle, fail) => {
    resolve = settle;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function disposableGltf({ clips = [], texture = false } = {}) {
  const scene = new THREE.Group();
  const map = texture ? new THREE.Texture() : null;
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ map });
  const mesh = new THREE.Mesh(geometry, material);
  const counts = { geometry: 0, material: 0, texture: 0 };
  geometry.addEventListener("dispose", () => { counts.geometry += 1; });
  material.addEventListener("dispose", () => { counts.material += 1; });
  map?.addEventListener("dispose", () => { counts.texture += 1; });
  scene.add(mesh);
  return { gltf: { scene, animations: clips }, counts };
}

function nextTask() {
  return delay(0);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
