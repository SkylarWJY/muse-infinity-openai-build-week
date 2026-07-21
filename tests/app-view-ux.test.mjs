import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AppView } from "../src/ui/AppView.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("the opening identifies MUSE Infinity before asking the carried question", async () => {
  const [html, source] = await Promise.all([
    readFile(path.join(ROOT, "index.html"), "utf8"),
    readFile(path.join(ROOT, "src/ui/AppView.js"), "utf8")
  ]);

  assert.match(html, /<h1 id="entry-title">MUSE&infin;<\/h1>/);
  assert.match(html, /An immersive museum built around one question/);
  assert.match(source, /"MUSE∞"/u);
  assert.match(source, /"What question are you carrying\?"/);
  assert.ok(source.indexOf("showLifeQuestion") < source.indexOf("showCompany"));
});

test("the exploration chrome exposes four primary tools and keeps secondary tools in More", async () => {
  const html = await readFile(path.join(ROOT, "index.html"), "utf8");

  assert.match(html, /class="tools"[\s\S]*?>[\s\S]*?Atlas[\s\S]*?Sound[\s\S]*?Voice[\s\S]*?<details class="tool-more"/);
  assert.match(html, /<summary[\s\S]*?More/);
  assert.match(html, /class="tool-menu"[\s\S]*?Forge[\s\S]*?Salon[\s\S]*?Room[\s\S]*?Profile[\s\S]*?Evidence/);
  assert.doesNotMatch(html, /LEARNING PATH/);
  assert.match(html, /id="follow-button"[^>]*hidden/);
});

test("setQuestionProgress reports inquiry and world completion independently", () => {
  const attributes = new Map();
  const view = {
    questionProgressQuestion: { textContent: "" },
    questionProgressValue: { textContent: "" },
    questionProgressCopy: { textContent: "" },
    worldProgressValue: { textContent: "" },
    questionProgressMeter: { setAttribute: (name, value) => attributes.set(name, value) },
    questionProgressFill: { style: { width: "" } }
  };

  const state = AppView.prototype.setQuestionProgress.call(view, {
    question: "What makes a life meaningful?",
    explored: 7,
    total: 12,
    worldsExplored: 3,
    worldsTotal: 8
  });

  assert.deepEqual(state, {
    question: "What makes a life meaningful?",
    explored: 7,
    total: 12,
    worldsExplored: 3,
    worldsTotal: 8,
    percent: 58
  });
  assert.equal(view.questionProgressValue.textContent, "58%");
  assert.equal(view.worldProgressValue.textContent, "3 / 8 WORLDS");
  assert.equal(view.questionProgressFill.style.width, "58%");
  assert.equal(attributes.get("aria-valuenow"), "7");
  assert.equal(attributes.get("aria-valuemax"), "12");
});

test("companion conversation renders and advances exactly one turn at a time", () => {
  const view = conversationView();
  const turns = [
    { speakerId: "monet", speaker: "Claude Monet", text: "Attention changes the pond." },
    { speakerId: "socrates", speaker: "Socrates", text: "What do you mean by change?" }
  ];

  const first = AppView.prototype.showCompanionConversation.call(view, turns, { onCompleteLabel: "Return to the painting" });
  assert.equal(first.turn.text, turns[0].text);
  assert.equal(view.companionConversationLine.textContent, turns[0].text);
  assert.equal(view.companionConversationProgress.textContent, "1 / 2");
  assert.equal(view.companionConversationNext.textContent, "Next voice");

  const second = AppView.prototype.advanceCompanionConversation.call(view);
  assert.equal(second.turn.text, turns[1].text);
  assert.equal(view.companionConversationLine.textContent, turns[1].text);
  assert.equal(view.companionConversationProgress.textContent, "2 / 2");
  assert.equal(view.companionConversationNext.textContent, "Return to the painting");

  const completed = AppView.prototype.advanceCompanionConversation.call(view);
  assert.equal(completed.complete, true);
  assert.equal(view.companionConversation.hidden, true);
  assert.equal(view.app.dataset.companionConversation, undefined);
});

test("the final answer includes a full-company look-back and completion statement", async () => {
  const source = await readFile(path.join(ROOT, "src/ui/AppView.js"), "utf8");
  assert.match(source, /ending-company/);
  assert.match(source, /Your whole company turns back/);
  assert.match(source, /QUESTION EXPLORATION COMPLETE/);
});

function conversationView() {
  const image = { src: "", alt: "", hidden: true, removeAttribute(name) { if (name === "src") this.src = ""; } };
  const view = {
    app: { dataset: {} },
    companionConversation: { hidden: true },
    companionConversationPortrait: image,
    companionConversationSpeaker: { textContent: "" },
    companionConversationLine: { textContent: "" },
    companionConversationProgress: { textContent: "" },
    companionConversationNext: { textContent: "" },
    conversationTurns: [],
    conversationIndex: -1,
    conversationCompleteLabel: "Continue"
  };
  view.renderCompanionConversationTurn = AppView.prototype.renderCompanionConversationTurn;
  return view;
}
