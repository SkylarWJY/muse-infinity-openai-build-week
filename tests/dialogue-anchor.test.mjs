import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { getCompanion } from "../src/config/legacyAssets.js";
import { ArchivedAvatar } from "../src/render/ArchivedAvatar.js";
import { MuseumEngine, projectWorldAnchorToViewport } from "../src/render/MuseumEngine.js";
import { ProceduralAvatar } from "../src/render/ProceduralAvatar.js";
import { AppView } from "../src/ui/AppView.js";

function cameraLookingAtOrigin() {
  const camera = new THREE.PerspectiveCamera(60, 2, 0.1, 100);
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return camera;
}

test("avatar head anchors use stable model-space landmarks", () => {
  const procedural = new ProceduralAvatar({ scale: 0.5 });
  procedural.group.position.set(1, 2, 3);
  const target = new THREE.Vector3();
  const proceduralHead = procedural.headWorldPosition(target);
  assert.strictEqual(proceduralHead, target);
  assert.ok(Math.abs(proceduralHead.x - 1) < 0.0001);
  assert.ok(Math.abs(proceduralHead.y - 3.22) < 0.0001);
  assert.ok(Math.abs(proceduralHead.z - 3) < 0.0001);

  const archived = new ArchivedAvatar({
    companion: { id: "test", fullName: "Test", model: "/test.glb", color: "#ffffff" },
    height: 1.7
  });
  archived.ready = true;
  archived.group.position.set(-1, 0.5, 2);
  const archivedHead = archived.headWorldPosition(new THREE.Vector3());
  assert.ok(Math.abs(archivedHead.x + 1) < 0.0001);
  assert.ok(Math.abs(archivedHead.y - 2.34) < 0.0001);
  assert.ok(Math.abs(archivedHead.z - 2) < 0.0001);
  procedural.dispose();
  archived.dispose();
});

test("a non-person lens keeps a dialogue anchor without adding a visual body", async () => {
  const lens = new ArchivedAvatar({
    companion: getCompanion("yayoi-kusama"),
    loader: { loadAsync: () => assert.fail("non-person lens must not request a GLB") },
    height: 1.7
  });
  lens.group.position.set(-1, 0.5, 2);

  await lens.load();
  const head = lens.headWorldPosition(new THREE.Vector3());

  assert.equal(lens.ready, true);
  assert.equal(lens.visual.children.length, 0);
  assert.ok(Math.abs(head.x + 1) < 0.0001);
  assert.ok(Math.abs(head.y - 2.34) < 0.0001);
  assert.ok(Math.abs(head.z - 2) < 0.0001);
  lens.setMotion(1.25, "point");
  lens.update(1 / 60, 0.2);
  assert.equal(lens.group.userData.motion, "walk");
  lens.dispose();
});

test("world anchors project into canvas coordinates with complete visibility metadata", () => {
  const camera = cameraLookingAtOrigin();
  const viewport = { left: 30, top: 40, width: 800, height: 400 };
  const anchor = projectWorldAnchorToViewport(new THREE.Vector3(0, 0, 0), camera, viewport);
  assert.deepEqual(Object.keys(anchor).sort(), ["depth", "distance", "state", "visible", "x", "y"]);
  assert.ok(Math.abs(anchor.x - 430) < 0.0001);
  assert.ok(Math.abs(anchor.y - 240) < 0.0001);
  assert.ok(Math.abs(anchor.distance - 5) < 0.0001);
  assert.equal(anchor.visible, true);
  assert.equal(anchor.state, "anchored");
});

test("projection distinguishes camera-behind, clipped, and missing anchors", () => {
  const camera = cameraLookingAtOrigin();
  const viewport = { left: 0, top: 0, width: 800, height: 400 };
  const behind = projectWorldAnchorToViewport(new THREE.Vector3(0, 0, 10), camera, viewport);
  assert.equal(behind.state, "behind");
  assert.equal(behind.visible, false);
  assert.equal(behind.x, null);
  assert.ok(Math.abs(behind.distance - 5) < 0.0001);

  const clipped = projectWorldAnchorToViewport(new THREE.Vector3(100, 0, 0), camera, viewport);
  assert.equal(clipped.state, "offscreen");
  assert.equal(clipped.visible, false);
  assert.ok(Number.isFinite(clipped.x));

  assert.deepEqual(projectWorldAnchorToViewport(null, camera, viewport), {
    x: null, y: null, depth: null, distance: null, visible: false, state: "missing"
  });
  assert.equal(projectWorldAnchorToViewport(new THREE.Vector3(), camera, viewport, { sourceVisible: false }).state, "missing");
});

test("engine anchors only the permanent actor and uses the canvas rectangle", () => {
  const camera = cameraLookingAtOrigin();
  const permanent = {
    companion: { id: "frida" },
    group: new THREE.Group(),
    headWorldPosition(target) { return this.group.localToWorld(target.set(0, 1.9, 0)); }
  };
  permanent.group.position.set(0, -1.9, 0);
  const salon = {
    companion: { id: "frida" },
    group: new THREE.Group(),
    headWorldPosition(target) { return this.group.localToWorld(target.set(0, 20, 0)); }
  };
  const engine = Object.create(MuseumEngine.prototype);
  engine.camera = camera;
  engine.guide = permanent;
  engine.partyActors = [];
  engine.salonActors = [salon];
  engine.companyDirectors = new Map([["frida", { avatar: salon }]]);
  engine.container = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1, height: 1 }) };
  engine.renderer = { domElement: { getBoundingClientRect: () => ({ left: 25, top: 35, width: 800, height: 400 }) } };

  const anchor = engine.companionScreenAnchor("frida");
  assert.equal(anchor.speakerId, "frida");
  assert.equal(anchor.state, "anchored");
  assert.ok(Math.abs(anchor.x - 425) < 0.0001);
  assert.ok(Math.abs(anchor.y - 235) < 0.0001);

  permanent.group.visible = false;
  assert.deepEqual(engine.companionScreenAnchor("frida"), {
    speakerId: "frida", x: null, y: null, depth: null, distance: null, visible: false, state: "missing"
  });
  assert.equal(engine.companionScreenAnchor("unknown"), null);
});

test("rerendering the same artwork question preserves node identity, value, focus, and selection", () => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const document = fakeDocument();
  Object.defineProperty(globalThis, "document", { configurable: true, value: document });
  try {
    const view = stationView();
    const stop = { stop_id: "threshold-conservatory" };
    const station = {
      station_id: "threshold-detail-1",
      focus_question: "What becomes visible at this threshold?",
      choices: [{ value: "notice", label: "Notice", stance: "Look again", evidence_prompt: "Name a detail" }]
    };
    const artwork = { id: "aic-27992", title: "The Threshold", artist: "MUSE Archive" };

    AppView.prototype.showStationQuestion.call(view, stop, station, artwork, 0, 3);
    const form = view.answers.querySelector(".inquiry-form");
    const input = view.answers.querySelector("#inquiry-input");
    const thread = view.inquiryThread;
    input.value = "How does this doorway redirect my attention?";
    input.focus();
    input.setSelectionRange(9, 21);
    thread.append(document.createElement("div"));
    const threadChild = thread.children[0];

    station.focus_question = "Which detail now carries your question?";
    AppView.prototype.showStationQuestion.call(view, stop, station, artwork, 0, 3);

    assert.strictEqual(view.answers.querySelector(".inquiry-form"), form);
    assert.strictEqual(view.answers.querySelector("#inquiry-input"), input);
    assert.strictEqual(view.inquiryThread, thread);
    assert.strictEqual(view.inquiryThread.children[0], threadChild);
    assert.equal(input.value, "How does this doorway redirect my attention?");
    assert.strictEqual(document.activeElement, input);
    assert.equal(input.selectionStart, 9);
    assert.equal(input.selectionEnd, 21);
    assert.equal(view.guideLine.textContent, "Which detail now carries your question?");
  } finally {
    restoreGlobalProperty("document", previousDocument);
  }
});

function styleDeclaration() {
  const properties = new Map();
  return {
    properties,
    setProperty(name, value) { properties.set(name, value); },
    removeProperty(name) { properties.delete(name); }
  };
}

function restoreGlobalProperty(name, descriptor) {
  if (descriptor) Object.defineProperty(globalThis, name, descriptor);
  else delete globalThis[name];
}

function stationView() {
  return {
    app: { dataset: {} },
    entry: fakeNode("section"),
    dialogue: fakeNode("section"),
    guideState: fakeNode("span"),
    stopTitle: fakeNode("h2"),
    guideLine: fakeNode("p"),
    inquiryThread: fakeNode("div"),
    answers: fakeNode("div"),
    continueButton: fakeNode("button"),
    stationQuestionDrafts: new Map(),
    hideArtworkStory() {}
  };
}

function fakeDocument() {
  return {
    activeElement: null,
    documentElement: { clientWidth: 800, clientHeight: 600 },
    createElement(tag) {
      const node = fakeNode(tag);
      node.ownerDocument = this;
      return node;
    }
  };
}

function fakeNode(tag) {
  const node = {
    tagName: String(tag).toUpperCase(),
    id: "",
    className: "",
    name: "",
    value: "",
    textContent: "",
    hidden: false,
    disabled: false,
    dataset: {},
    children: [],
    style: styleDeclaration(),
    selectionStart: 0,
    selectionEnd: 0,
    append(...children) {
      for (const child of children) {
        child.parentNode = this;
        this.children.push(child);
      }
    },
    replaceChildren(...children) {
      this.children = [];
      this.append(...children);
    },
    querySelector(selector) {
      return findFakeNode(this, selector);
    },
    addEventListener() {},
    setAttribute(name, value) { this[name] = String(value); },
    focus() { if (this.ownerDocument) this.ownerDocument.activeElement = this; },
    setSelectionRange(start, end) {
      this.selectionStart = start;
      this.selectionEnd = end;
    }
  };
  return node;
}

function findFakeNode(root, selector) {
  for (const child of root.children || []) {
    if (selector.startsWith("#") && child.id === selector.slice(1)) return child;
    if (selector.startsWith(".") && String(child.className).split(/\s+/u).includes(selector.slice(1))) return child;
    const nested = findFakeNode(child, selector);
    if (nested) return nested;
  }
  return null;
}
