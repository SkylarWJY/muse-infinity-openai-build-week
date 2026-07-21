import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { MuseumEngine } from "../src/render/MuseumEngine.js";
import { ArtworkStoryDirector } from "../src/render/ArtworkStoryDirector.js";
import { WorldLayer } from "../src/render/WorldLayer.js";
import { AppView } from "../src/ui/AppView.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("the living-artwork anchor is a stable copy of the hero frame world matrix", () => {
  const parent = new THREE.Group();
  parent.position.set(3, 2, -4);
  const frame = new THREE.Group();
  frame.position.set(1, 0.5, 2);
  frame.rotation.y = Math.PI / 3;
  parent.add(frame);
  parent.updateMatrixWorld(true);

  const layer = Object.create(WorldLayer.prototype);
  layer.artworks = new Map([["station-one", {
    artwork: { id: "hero-work" },
    frame
  }]]);

  const first = layer.artworkAnchorMatrix("hero-work");
  const second = layer.artworkAnchorMatrix("hero-work");
  assert.ok(first?.isMatrix4);
  assert.notStrictEqual(first, frame.matrixWorld);
  assert.notStrictEqual(first, second);
  assert.deepEqual(first.elements, frame.matrixWorld.elements);

  first.elements[12] = 999;
  assert.notEqual(layer.artworkAnchorMatrix("hero-work").elements[12], 999);
  assert.equal(layer.artworkAnchorMatrix("missing-work"), null);
});

test("MuseumEngine exposes story controls without coupling them to artwork navigation", () => {
  const calls = [];
  const engine = {
    artworkStoryDirector: {
      trigger: (id) => { calls.push(["trigger", id]); return true; },
      pause: (paused) => { calls.push(["pause", paused]); return true; },
      skip: () => { calls.push(["skip"]); return true; },
      replay: () => { calls.push(["replay"]); return true; },
      snapshot: () => ({ state: "completed", artworkId: "hero-work" })
    }
  };

  assert.equal(MuseumEngine.prototype.triggerArtworkStory.call(engine, "hero-work"), true);
  assert.equal(MuseumEngine.prototype.pauseArtworkStory.call(engine, true), true);
  assert.equal(MuseumEngine.prototype.skipArtworkStory.call(engine), true);
  assert.equal(MuseumEngine.prototype.replayArtworkStory.call(engine), true);
  assert.deepEqual(MuseumEngine.prototype.artworkStorySnapshot.call(engine), {
    state: "completed",
    artworkId: "hero-work"
  });
  assert.deepEqual(calls, [
    ["trigger", "hero-work"],
    ["pause", true],
    ["skip"],
    ["replay"]
  ]);
});

test("MuseumEngine routes the browser-QA vision through the existing story controls", () => {
  const calls = [];
  const engine = {
    artworkVisionDirector: {
      setRevealOrigin: (origin) => { calls.push(["vision-origin", origin]); },
      trigger: (id) => { calls.push(["vision-trigger", id]); return true; },
      pause: (paused) => { calls.push(["vision-pause", paused]); return true; },
      skip: () => { calls.push(["vision-skip"]); return true; },
      replay: () => { calls.push(["vision-replay"]); return true; },
      snapshot: () => ({ state: "story", artworkId: "aic-111436" })
    },
    artworkStoryDirector: {
      trigger: () => { calls.push(["story-trigger"]); return true; },
      pause: () => { calls.push(["story-pause"]); return true; },
      skip: () => { calls.push(["story-skip"]); return true; },
      replay: () => { calls.push(["story-replay"]); return true; },
      snapshot: () => ({ state: "idle", artworkId: null })
    },
    artworkVisionOrigin: () => ({ x: 0.3, y: 0.4 })
  };

  assert.equal(MuseumEngine.prototype.triggerArtworkStory.call(engine, "aic-111436"), true);
  assert.equal(MuseumEngine.prototype.pauseArtworkStory.call(engine, true), true);
  assert.equal(MuseumEngine.prototype.skipArtworkStory.call(engine), true);
  assert.equal(MuseumEngine.prototype.replayArtworkStory.call(engine), true);
  assert.deepEqual(MuseumEngine.prototype.artworkStorySnapshot.call(engine), {
    state: "story",
    artworkId: "aic-111436"
  });
  assert.deepEqual(calls, [
    ["vision-origin", { x: 0.3, y: 0.4 }],
    ["vision-trigger", "aic-111436"],
    ["vision-pause", true],
    ["vision-skip"],
    ["vision-replay"]
  ]);
});

test("MuseumEngine installs the manifest-eligible preview only behind the explicit browser-QA gate", () => {
  let visionRequest = null;
  const engine = {
    activeWorldLive: true,
    artworkVisionQaCandidate: null,
    artworkVisionDirector: {
      setWorld(request) {
        visionRequest = request;
        return { state: "loading", artworkId: request.artworkId };
      }
    }
  };

  const snapshot = MuseumEngine.prototype.installArtworkVision.call(engine, {
    sceneId: "sunset-frames"
  });
  assert.equal(snapshot.artworkId, null);
  assert.deepEqual(visionRequest, {
    sceneId: "sunset-frames",
    artworkId: null,
    config: null
  });

  engine.artworkVisionQaCandidate = "aic-111436";
  const previewSnapshot = MuseumEngine.prototype.installArtworkVision.call(engine, { sceneId: "sunset-frames" });
  assert.equal(previewSnapshot.artworkId, "aic-111436");
  assert.equal(visionRequest.config.vision.manifest.visualQa, "approved-for-browser-qa");
  assert.equal(visionRequest.config.manifest.visualQa, "rejected");

  engine.activeWorldLive = false;
  MuseumEngine.prototype.installArtworkVision.call(engine, { sceneId: "sunset-frames" });
  assert.deepEqual(visionRequest, {
    sceneId: "sunset-frames",
    artworkId: null,
    config: null
  });
});

test("MuseumEngine passes null config and never loads or mounts rejected living-artwork visuals", () => {
  const scene = new THREE.Scene();
  let loaderCalls = 0;
  let anchorCalls = 0;
  let installed = null;
  const director = new ArtworkStoryDirector(scene, {
    loader: {
      loadAsync: async () => {
        loaderCalls += 1;
        return { scene: new THREE.Group(), animations: [] };
      }
    }
  });
  const setWorld = director.setWorld.bind(director);
  director.setWorld = (request) => {
    installed = request;
    return setWorld(request);
  };
  const engine = {
    activeWorldLive: true,
    artworkStoryDirector: director,
    worldLayer: {
      artworkAnchorMatrix() {
        anchorCalls += 1;
        return new THREE.Matrix4();
      }
    }
  };

  const snapshot = MuseumEngine.prototype.installArtworkStory.call(engine, {
    sceneId: "water-and-light"
  });

  assert.equal(snapshot.state, "idle");
  assert.deepEqual(installed, {
    sceneId: "water-and-light",
    artworkId: null,
    anchorMatrix: null,
    config: null
  });
  assert.equal(anchorCalls, 0);
  assert.equal(loaderCalls, 0);
  assert.equal(director.group.children.length, 0);
  assert.equal(director.snapshot().asset, null);
  director.dispose();
});

test("hero evidence is committed before a living story can trigger", async () => {
  const source = await readFile(path.join(ROOT, "src/main.js"), "utf8");
  const start = source.indexOf("function recordStationEvidence");
  const end = source.indexOf("function recordSceneReflection", start);
  const record = source.slice(start, end);
  const domainCommit = record.indexOf("sceneTour.recordStationEvidence");
  const historyCommit = record.indexOf("state.journeyStationEvidence =");
  const storyTrigger = record.indexOf("triggerLivingArtworkStory");

  assert.ok(domainCommit >= 0, "the scene-tour evidence commit must remain present");
  assert.ok(historyCommit > domainCommit, "the journey evidence history must follow the domain commit");
  assert.ok(storyTrigger > historyCommit, "story playback must only begin after both evidence commits");
  assert.match(source, /hero\?\.sceneId === scene\?\.id[\s\S]*hero\?\.artworkId === station\?\.artwork_id/);
  assert.match(source, /artworkVisionQaCandidate === "aic-111436"[\s\S]*engine\.triggerArtworkVisionPreview\(artworkId\)/);
  assert.match(source, /view\.app\.dataset\.artworkVision = event\.state/);
  assert.match(source, /if \(visionEvent\) narrator\.stop\(\)/);
});

test("the story overlay labels interpretation and routes controls independently", async () => {
  const [html, source] = await Promise.all([
    readFile(path.join(ROOT, "index.html"), "utf8"),
    readFile(path.join(ROOT, "src/ui/AppView.js"), "utf8")
  ]);

  assert.match(html, /id="artwork-story"[^>]*aria-live="polite"/);
  assert.match(html, /CURATED FACT/);
  assert.match(html, /IMAGINED REENACTMENT · NOT HISTORICAL TESTIMONY/u);
  assert.match(html, /data-story-action="pause"/);
  assert.match(html, /data-story-action="skip"/);
  assert.match(html, /data-story-action="replay"/);
  assert.match(html, /id="artwork-story-source" hidden target="_blank" rel="noopener noreferrer"/);
  assert.match(source, /storyAction === "skip"[\s\S]*call\("onArtworkStorySkip"\)/);
  assert.match(source, /cue\.kind === "curated-fact" \? safeArtworkStorySource\(cue\.sourceUrl\) : ""/);

  const storyHandler = source.slice(
    source.indexOf("this.artworkStory.addEventListener"),
    source.indexOf("document.addEventListener", source.indexOf("this.artworkStory.addEventListener"))
  );
  assert.doesNotMatch(storyHandler, /onSkipArtwork/);
  assert.doesNotMatch(storyHandler, /skipCurrentArtwork/);
});

test("story captions expose sources only for curated facts", () => {
  const view = storyView();
  AppView.prototype.setArtworkStory.call(view, {
    state: "story",
    artworkId: "hero-work",
    title: "Hero work",
    elapsed: 2.4,
    duration: 19,
    cue: {
      kind: "curated-fact",
      speakerName: "Claude Monet",
      text: "A sourced fact.",
      sourceUrl: "https://www.artic.edu/artworks/16568",
      sourceLabel: "Art Institute of Chicago source"
    }
  });

  assert.equal(view.artworkStorySource.hidden, false);
  assert.equal(view.artworkStorySource.href, "https://www.artic.edu/artworks/16568");
  assert.equal(view.artworkStoryCueLabel.textContent, "CURATED FACT");

  AppView.prototype.setArtworkStory.call(view, {
    state: "story",
    artworkId: "hero-work",
    title: "Hero work",
    elapsed: 9.2,
    duration: 19,
    cue: {
      kind: "imagined-reenactment",
      speakerName: "Hero work · ARTWORK VOICE",
      text: "An explicitly imagined line.",
      sourceUrl: "https://www.artic.edu/artworks/16568"
    }
  });

  assert.equal(view.artworkStorySource.hidden, true);
  assert.equal(view.artworkStorySource.href, "");
  assert.equal(view.artworkStoryCueLabel.textContent, "IMAGINED REENACTMENT · NOT HISTORICAL TESTIMONY");
});

test("replay suspension preserves the current companion turn for narration resume", () => {
  const view = conversationView();
  const turns = [{ speakerId: "monet", speaker: "Claude Monet", text: "Return to this evidence." }];
  AppView.prototype.showCompanionConversation.call(view, turns);

  assert.equal(AppView.prototype.suspendCompanionConversation.call(view), true);
  assert.equal(view.companionConversation.hidden, true);
  assert.equal(view.conversationTurns.length, 1);
  const resumed = AppView.prototype.resumeCompanionConversation.call(view);
  assert.equal(resumed.turn.text, turns[0].text);
  assert.equal(view.companionConversation.hidden, false);
});

function storyView() {
  const pauseLabel = { textContent: "" };
  const source = {
    hidden: true,
    href: "",
    textContent: "",
    removeAttribute(name) { if (name === "href") this.href = ""; }
  };
  return {
    app: { dataset: {} },
    artworkStory: { hidden: true, dataset: {} },
    artworkStoryTitle: { textContent: "" },
    artworkStoryStatus: { textContent: "" },
    artworkStoryDescription: { textContent: "", hidden: true },
    artworkStoryCaption: { hidden: true, dataset: {} },
    artworkStoryCueLabel: { textContent: "" },
    artworkStorySpeaker: { textContent: "" },
    artworkStoryLine: { textContent: "" },
    artworkStorySource: source,
    artworkStoryPause: {
      hidden: true,
      querySelector: () => pauseLabel,
      setAttribute() {}
    },
    artworkStorySkip: { hidden: true },
    artworkStoryReplay: { hidden: true },
    artworkStoryCue: null,
    hideArtworkStory: AppView.prototype.hideArtworkStory
  };
}

function conversationView() {
  const portrait = {
    src: "",
    alt: "",
    hidden: true,
    removeAttribute(name) { if (name === "src") this.src = ""; }
  };
  return {
    app: { dataset: {} },
    companionConversation: { hidden: true },
    companionConversationPortrait: portrait,
    companionConversationSpeaker: { textContent: "" },
    companionConversationLine: { textContent: "" },
    companionConversationProgress: { textContent: "" },
    companionConversationSkip: { hidden: false },
    companionConversationNext: { textContent: "" },
    conversationTurns: [],
    conversationIndex: -1,
    conversationCompleteLabel: "Continue",
    companionConversationSuspended: false,
    setInquiryBusy() {},
    renderCompanionConversationTurn: AppView.prototype.renderCompanionConversationTurn,
    hideCompanionConversation: AppView.prototype.hideCompanionConversation
  };
}
