import { EXHIBITION_SPINE, FINAL_SCENE } from "../config/exhibitionSpine.js";
import { COMPANIONS } from "../config/legacyAssets.js";
import { SCENE_MANIFEST, WORLDS } from "../config/scenes.js";

const PHILOSOPHY_AXES = Object.freeze([
  Object.freeze({ id: "perception", number: "01", name: "Perception", statement: "Art must sharpen what can be perceived." }),
  Object.freeze({ id: "emotion", number: "02", name: "Emotion", statement: "Art must answer to lived feeling." }),
  Object.freeze({ id: "invention", number: "03", name: "Invention", statement: "Art must keep reality open to reinvention." })
]);

const PROCESS_WORLDS = EXHIBITION_SPINE.map((item) => WORLDS.find((world) => world.id === item.worldId)).filter(Boolean);

export function providerPresentation(status = {}) {
  const model = String(status.model || "GPT-5.6").toUpperCase();
  const configured = Boolean(status.configured ?? status.openai);
  if (!configured) {
    return {
      label: `${model} READY · CURATED FALLBACK ACTIVE`,
      shortLabel: "CURATED DEMO",
      badge: "CURATED FALLBACK"
    };
  }

  const live = status.live === true;
  if (status.gateway === "inherited-gpt") {
    const responseReported = status.model_source === "gateway-response-reported";
    return {
      label: `${model} ${live ? "LIVE" : "CONFIGURED"} · INHERITED GATEWAY · ${responseReported ? "MODEL RESPONSE REPORTED" : "MODEL REQUESTED"}`,
      shortLabel: `${model} · GATEWAY · ${responseReported ? "RESPONSE" : "REQUEST"}`,
      badge: `${model} · GATEWAY ${live ? "LIVE" : "READY"}`
    };
  }

  return {
    label: `${model} ${live ? "LIVE" : "CONFIGURED"} · OPENAI RESPONSES API`,
    shortLabel: `${model} · OPENAI ${live ? "LIVE" : "READY"}`,
    badge: `${model} · OPENAI ${live ? "LIVE" : "READY"}`
  };
}

export class AppView {
  constructor() {
    this.app = byId("app");
    this.entry = byId("entry-panel");
    this.dialogue = byId("dialogue");
    this.stopTitle = byId("stop-title");
    this.guideLine = byId("guide-line");
    this.guideState = byId("guide-state");
    this.inquiryThread = byId("inquiry-thread");
    this.speakerName = byId("speaker-name");
    this.speakerPortrait = byId("speaker-portrait");
    this.answers = byId("answers");
    this.continueButton = byId("continue-button");
    this.routeList = byId("route-list");
    this.drawer = byId("drawer");
    this.drawerKicker = byId("drawer-kicker");
    this.drawerTitle = byId("drawer-title");
    this.drawerBody = byId("drawer-body");
    this.modelBadge = document.getElementById("model-badge");
    this.providerLabel = byId("provider-label");
    this.chapterLabel = byId("chapter-label");
    this.worldName = byId("world-name");
    this.syncState = byId("sync-state");
    this.toastElement = byId("toast");
    this.currentSalon = null;
    this.conceptProvider = { live: false, model: "curated-demo" };
    this.providerStatus = { configured: false, live: false, openai: false, gateway: "official", model: "GPT-5.6" };
    this.toastTimer = 0;
  }

  bind(callbacks = {}) {
    const call = (name, ...args) => {
      const callback = callbacks[name];
      return typeof callback === "function" ? callback(...args) : undefined;
    };

    this.entry.addEventListener("submit", (event) => {
      if (event.target.id !== "goal-form") return;
      event.preventDefault();
      const goal = event.target.elements.goal?.value.trim();
      if (goal) setTimeout(() => call("onStart", goal), 80);
    });

    this.entry.addEventListener("click", (event) => {
      const companion = event.target.closest("[data-companion]");
      const preset = event.target.closest("[data-goal]");
      const decision = event.target.closest("[data-decision]");
      const action = event.target.closest("[data-entry-action]");
      if (companion) {
        setTimeout(() => call("onCompanionToggle", companion.dataset.companion), 80);
        return;
      }
      if (preset) {
        const input = this.entry.querySelector("#goal-input");
        if (input) input.value = preset.dataset.goal;
        setTimeout(() => call("onStart", preset.dataset.goal), 80);
        return;
      }
      if (decision) {
        setTimeout(() => call("onDecision", decision.dataset.decision), 80);
        return;
      }
      if (!action) return;
      const name = action.dataset.entryAction;
      if (name === "cross-threshold") {
        if (typeof callbacks.onCrossThreshold === "function") call("onCrossThreshold");
        else this.showLifeQuestion();
      } else if (name === "curate") setTimeout(() => call("onCurate"), 80);
      else if (name === "enter-walk") setTimeout(() => call("onEnterWalk"), 80);
      else if (name === "begin-summoning") setTimeout(() => call("onBeginSummoning"), 80);
      else if (name === "convene-roundtable") setTimeout(() => call("onConveneRoundtable"), 80);
      else if (name === "open-decision") this.showDecision(undefined, this.currentSalon);
      else if (name === "complete-transformation") setTimeout(() => call("onCompleteTransformation"), 80);
      else if (name === "publish-manifesto") {
        const value = this.entry.querySelector("#manifesto-input")?.value.trim() || "";
        if (value) setTimeout(() => call("onPublishManifesto", value), 80);
      } else if (name === "enter-final") setTimeout(() => call("onEnterFinal"), 80);
      else if (name === "retry-scene") setTimeout(() => call("onRetryScene"), 80);
      else if (name === "dismiss-final") this.entry.hidden = true;
    });

    this.answers.addEventListener("click", (event) => {
      const button = event.target.closest("[data-answer]");
      if (button) call("onAnswer", button.dataset.answer);
    });
    this.answers.addEventListener("submit", (event) => {
      event.preventDefault();
      if (event.target.matches(".observation-form")) {
        const observation = event.target.elements.observation?.value.trim();
        if (observation) call("onObservation", observation);
      } else if (event.target.matches(".inquiry-form")) {
        const question = event.target.elements.question?.value.trim();
        if (question) call("onInquiry", question);
      }
    });
    this.continueButton.addEventListener("click", () => call("onContinue"));
    document.addEventListener("click", (event) => {
      const drawerButton = event.target.closest("[data-drawer]");
      const actionButton = event.target.closest("[data-action]");
      if (drawerButton) call("onDrawer", drawerButton.dataset.drawer);
      if (actionButton) call("onAction", actionButton.dataset.action);
    });
    this.drawerBody.addEventListener("click", (event) => {
      const button = event.target.closest("[data-drawer-action]");
      if (button) call("onDrawerAction", button.dataset.drawerAction, button);
    });
  }

  showThreshold() {
    this.presentEntry("threshold", [
      element("p", { className: "eyebrow" }, "00 / THRESHOLD"),
      element("h1", {}, "A question can become a place."),
      element("p", { className: "entry-copy threshold-copy" }, "Cross into nine connected worlds. The first eight gather evidence; the ninth exists only after you form an answer."),
      element("button", { type: "button", className: "entry-primary", dataset: { entryAction: "cross-threshold" } }, "Cross the threshold →"),
      entryMeta()
    ]);
    this.renderRoute(null, [], null);
    this.chapterLabel.textContent = "THRESHOLD / 00";
  }

  showLifeQuestion(value = "") {
    const presets = element("div", { className: "goal-presets", id: "goal-presets" });
    for (const goal of ["How composition moves my attention", "How color creates emotion", "How a space tells a story"]) {
      presets.append(element("button", { type: "button", dataset: { goal } }, goal));
    }
    const form = element("form", { id: "goal-form" });
    form.append(
      element("label", { className: "sr-only", htmlFor: "goal-input" }, "Life question"),
      element("input", { id: "goal-input", name: "goal", maxLength: 120, autoComplete: "off", placeholder: "Name the question you will carry", value }),
      element("button", { type: "submit" }, "Choose your company →")
    );
    this.presentEntry("life-question", [
      element("p", { className: "eyebrow" }, "01 / LIFE QUESTION"),
      element("h1", {}, "What do you want to learn to notice?"),
      element("p", { className: "entry-copy" }, "Your question will remain visible as eight worlds test it from different positions."),
      presets,
      form,
      entryMeta()
    ]);
    this.chapterLabel.textContent = "LIFE QUESTION / 01";
    requestAnimationFrame(() => form.querySelector("input")?.focus());
  }

  setProvider(status) {
    this.providerStatus = { ...this.providerStatus, ...status, live: status.live === true };
    this.updateModelBadge();
    this.updateProviderLabel();
  }

  updateProviderLabel() {
    const presentation = providerPresentation(this.providerStatus);
    this.providerLabel.textContent = presentation.label;
    this.providerLabel.dataset.shortLabel = presentation.shortLabel;
  }

  begin(plan, provider) {
    this.entry.hidden = true;
    this.dialogue.hidden = false;
    this.providerStatus = {
      ...this.providerStatus,
      configured: provider.live === true,
      live: provider.live === true,
      openai: provider.live === true && provider.gateway !== "inherited-gpt",
      gateway: provider.gateway || this.providerStatus.gateway,
      model: provider.model || this.providerStatus.model,
      model_source: provider.model_source || this.providerStatus.model_source
    };
    this.updateModelBadge();
    this.updateProviderLabel();
    this.renderRoute(plan, [], plan.start_stop_id);
    this.showWalking(plan.start_stop_id);
  }

  showCompany(selectedIds) {
    const selected = new Set(selectedIds);
    const intro = element("div", { className: "entry-intro" });
    intro.append(
      element("p", { className: "eyebrow" }, "02 / CHOOSE YOUR COMPANY"),
      element("h1", {}, "Who should walk the question with you?"),
      element("p", { className: "entry-copy" }, "Invite up to three interpretive companions from the original MUSE collection. Their archived 3D forms will move through the worlds with you.")
    );
    const grid = element("div", { className: "companion-grid" });
    for (const companion of COMPANIONS) {
      const active = selected.has(companion.id);
      const button = element("button", {
        type: "button",
        className: `companion-choice${active ? " selected" : ""}`,
        dataset: { companion: companion.id },
        ariaPressed: String(active),
        "aria-label": `${active ? "Remove" : "Invite"} ${companion.fullName}`
      });
      button.append(
        element("img", { src: companion.portrait, alt: "" }),
        element("span", { className: "companion-copy" }),
        element("span", { className: "companion-check", ariaHidden: "true" }, active ? "✓" : "+")
      );
      button.querySelector(".companion-copy").append(element("b", {}, companion.fullName), element("small", {}, companion.lens));
      grid.append(button);
    }
    const footer = element("div", { className: "company-footer" });
    footer.append(
      element("span", {}, `${selected.size} / 3 INVITED`),
      element("button", { type: "button", disabled: selected.size === 0, dataset: { entryAction: "curate" } }, "Let GPT curate →")
    );
    this.presentEntry("company", [intro, grid, footer]);
    this.chapterLabel.textContent = "COMPANY / 02";
  }

  showCuration(question, companions = []) {
    const route = element("ol", { className: "curation-route", "aria-label": "Eight-scene exhibition route" });
    for (const sceneItem of EXHIBITION_SPINE) {
      const item = element("li");
      item.append(
        element("b", {}, sceneItem.chapter),
        element("span", {}, sceneItem.title),
        element("small", {}, sceneItem.artist)
      );
      route.append(item);
    }
    const company = element("div", { className: "curation-company" });
    for (const companion of companions) company.append(portraitChip(companion));
    const action = element("button", { type: "button", className: "entry-primary", disabled: true, dataset: { entryAction: "enter-walk" } }, "Preparing the route…");
    this.presentEntry("curation", [
      element("p", { className: "eyebrow" }, "03 / GPT CURATION"),
      element("h1", {}, "A question becomes an eight-world inquiry."),
      element("blockquote", { className: "curation-question" }, question),
      company,
      route,
      action
    ]);
    this.chapterLabel.textContent = "GPT CURATION / 03";
  }

  setCurationReady() {
    const action = this.entry.querySelector("[data-entry-action='enter-walk']");
    if (!action) return;
    action.disabled = false;
    action.textContent = "Enter 01 / ARRIVAL →";
  }

  showWalking(stopId) {
    const sceneStop = scene(stopId);
    this.entry.hidden = true;
    this.dialogue.hidden = false;
    this.app.dataset.narrativeStage = "world-exploration";
    this.guideState.textContent = "WALKING";
    this.stopTitle.textContent = `Approaching ${sceneStop.title}`;
    this.guideLine.textContent = `${this.speakerName.textContent} is moving to the selected evidence point.`;
    this.inquiryThread.hidden = true;
    this.inquiryThread.replaceChildren();
    this.answers.replaceChildren();
    this.continueButton.hidden = true;
  }

  showArchiveRequired(sceneItem) {
    this.presentEntry("archive-required", [
      element("p", { className: "eyebrow" }, `${sceneItem.chapter} / ARCHIVE REQUIRED`),
      element("h1", {}, sceneItem.title),
      element("p", { className: "entry-copy" }, "This scene has not reached source fidelity, so it cannot contribute evidence to the final concept."),
      element("button", { type: "button", className: "entry-primary", dataset: { entryAction: "retry-scene" } }, "Retry archived scene →")
    ]);
    this.chapterLabel.textContent = `${sceneItem.chapter} / RETRY`;
  }

  showQuestion(stop) {
    const sceneStop = scene(stop.stop_id);
    this.guideState.textContent = "ASKING";
    this.stopTitle.textContent = `${sceneStop.title} · ${sceneStop.artist}`;
    this.guideLine.textContent = `${stop.guide_line} ${stop.prompt}`;
    this.inquiryThread.hidden = false;
    this.inquiryThread.replaceChildren();
    const inquiryForm = element("form", { className: "inquiry-form" });
    inquiryForm.append(
      element("label", { className: "sr-only", htmlFor: "inquiry-input" }, "Question for the company"),
      element("input", { id: "inquiry-input", name: "question", maxLength: 600, autoComplete: "off", placeholder: "Ask about this work" }),
      element("button", { type: "submit" }, "Ask")
    );
    const observationForm = element("form", { className: "observation-form" });
    observationForm.append(
      element("label", { className: "sr-only", htmlFor: "observation-input" }, "Your observation"),
      element("input", { id: "observation-input", name: "observation", maxLength: 80, autoComplete: "off", placeholder: "Write what you notice" }),
      element("button", { type: "submit" }, "Record")
    );
    this.answers.replaceChildren(
      inquiryForm,
      ...stop.choices.map((choice) => element("button", { type: "button", dataset: { answer: choice.value } }, choice.label)),
      observationForm
    );
    this.continueButton.hidden = true;
  }

  showFeedback(choice) {
    this.guideState.textContent = "REFLECTING";
    this.guideLine.textContent = choice.feedback;
    this.answers.replaceChildren();
    this.continueButton.textContent = "Continue →";
    this.continueButton.hidden = false;
  }

  showInquiryPending(question) {
    const form = this.answers.querySelector(".inquiry-form");
    for (const control of form?.elements || []) control.disabled = true;
    const turn = element("div", { className: "inquiry-turn visitor-turn" });
    turn.append(element("b", {}, "YOU"), element("p", {}, question));
    const pending = element("div", { className: "inquiry-pending", dataset: { inquiryPending: "true" } }, "READING THE WORK…");
    this.inquiryThread.append(turn, pending);
    this.inquiryThread.scrollTop = this.inquiryThread.scrollHeight;
  }

  showInquiryReply(result) {
    this.inquiryThread.querySelector("[data-inquiry-pending]")?.remove();
    const source = result?.live === true ? liveProviderName(result) : "CURATED LOCAL";
    for (const item of result?.perspectives || []) {
      const turn = element("div", { className: "inquiry-turn company-turn" });
      turn.append(
        element("b", {}, `${item.speaker || item.speakerId} · ${source}`),
        element("p", {}, item.text || "")
      );
      this.inquiryThread.append(turn);
    }
    const form = this.answers.querySelector(".inquiry-form");
    for (const control of form?.elements || []) control.disabled = false;
    if (form?.elements.question) form.elements.question.value = "";
    this.inquiryThread.scrollTop = this.inquiryThread.scrollHeight;
  }

  showInquiryError(message) {
    this.inquiryThread.querySelector("[data-inquiry-pending]")?.remove();
    const turn = element("div", { className: "inquiry-turn inquiry-error" });
    turn.append(element("b", {}, "CONNECTION"), element("p", {}, message));
    this.inquiryThread.append(turn);
    const form = this.answers.querySelector(".inquiry-form");
    for (const control of form?.elements || []) control.disabled = false;
  }

  appendVoiceTranscript({ role, id, delta = "", text, final, mode, provider }) {
    if (this.inquiryThread.hidden || (!delta && typeof text !== "string" && !final)) return;
    const turnId = String(id || `${role}-active`).slice(0, 160);
    let turn = [...this.inquiryThread.querySelectorAll(`.voice-turn[data-role="${role}"]:not([data-final="true"])`)]
      .find((item) => item.dataset.turnId === turnId);
    if (!turn) {
      turn = element("div", {
        className: `inquiry-turn voice-turn ${role === "user" ? "visitor-turn" : "company-turn"}`,
        dataset: { role, turnId, final: "false" }
      });
      turn.append(element("b"), element("p"));
      this.inquiryThread.append(turn);
    }
    const label = turn.querySelector("b");
    if (label) label.textContent = voiceTranscriptLabel(role, mode, provider);
    const copy = turn.querySelector("p");
    if (copy) copy.textContent = typeof text === "string" ? text : `${copy.textContent}${delta}`;
    if (final) turn.dataset.final = "true";
    this.inquiryThread.scrollTop = this.inquiryThread.scrollHeight;
  }

  setVoiceState(value) {
    const button = document.getElementById("voice-tool");
    const label = button.querySelector(".tool-label");
    const copy = {
      off: ["Voice", "Start voice conversation"],
      connecting: ["Connect", "Connecting voice"],
      live: ["Live", "Stop voice conversation"],
      listening: ["Listen", "Listening"],
      thinking: ["Think", "Preparing response"],
      speaking: ["Speak", "Speaking"],
      error: ["Error", "Voice connection error"]
    }[value] || ["Voice", "Voice"];
    button.dataset.voiceState = value;
    button.setAttribute("aria-pressed", String(value !== "off" && value !== "error"));
    button.title = copy[1];
    if (label) label.textContent = copy[0];
  }

  showRecap(recap, digest) {
    const count = Array.isArray(digest?.visits) ? digest.visits.length : 0;
    this.presentEntry("exploration-complete", [
      element("p", { className: "eyebrow" }, "04 / WORLD EXPLORATION COMPLETE"),
      element("h1", {}, recap?.title || "Eight worlds are now in the record."),
      element("p", { className: "entry-copy" }, recap?.summary || "Your observations can now be read together rather than as isolated answers."),
      evidenceCount(count),
      element("button", { type: "button", className: "entry-primary", disabled: count < EXHIBITION_SPINE.length, dataset: { entryAction: "begin-summoning" } }, "Summon the record →")
    ]);
    this.chapterLabel.textContent = "WORLD EXPLORATION / 04";
  }

  showSummoning(digest, companions = [], recap = null) {
    const visits = Array.isArray(digest?.visits) ? digest.visits : [];
    const ledger = element("ol", { className: "summoning-ledger", "aria-label": "Evidence gathered across eight worlds" });
    for (const sceneItem of EXHIBITION_SPINE) {
      const visit = visits.find((item) => item.stop_id === sceneItem.id);
      const row = element("li", { className: visit ? "recorded" : "missing" });
      row.append(
        element("b", {}, sceneItem.chapter),
        element("span", {}, sceneItem.title),
        element("small", {}, visit ? `${visit.answer || "Observation recorded"} · ${readDetail(visit.detail_id)}` : "Evidence missing")
      );
      ledger.append(row);
    }
    const company = element("div", { className: "curation-company summoning-company" });
    for (const companion of companions) company.append(portraitChip(companion));
    this.presentEntry("summoning", [
      element("p", { className: "eyebrow" }, "05 / SUMMONING"),
      element("h1", {}, "The walk enters the record."),
      element("p", { className: "entry-copy" }, recap?.summary || "Eight observations are placed before your chosen company. The closing concept must account for all of them."),
      company,
      ledger,
      element("p", { className: "interpretation-note" }, "Historical companions appear as AI interpretations grounded in their documented themes, not authentic quotations or endorsements."),
      element("button", { type: "button", className: "entry-primary", disabled: visits.length < EXHIBITION_SPINE.length, dataset: { entryAction: "convene-roundtable" } }, "Convene the roundtable →")
    ]);
    this.chapterLabel.textContent = "SUMMONING / 05";
  }

  showRoundtable(salon, companions = [], provider = {}) {
    this.currentSalon = salon || null;
    if (salon) this.conceptProvider = { ...this.conceptProvider, ...provider };
    const title = conceptTitle(salon);
    const body = element("div", { className: "roundtable-layout" });
    const threads = element("div", { className: "roundtable-threads" });
    const perspectives = Array.isArray(salon?.perspectives) ? salon.perspectives : [];
    if (perspectives.length) {
      for (const item of perspectives) {
        const companion = findCompanion(item.character_id, companions);
        const article = element("article", { className: "roundtable-thread" });
        if (companion) article.append(portraitChip(companion));
        article.append(
          element("h3", {}, companion?.fullName || item.name || item.character_id),
          element("p", {}, item.stance || item.text || ""),
          element("small", { className: "ai-disclaimer" }, "AI interpretation · not an authentic quotation")
        );
        threads.append(article);
      }
    } else {
      threads.append(element("p", { className: "roundtable-status" }, "The selected company is reading all eight scenes…"));
    }
    const synthesis = element("section", { className: "roundtable-synthesis" });
    synthesis.append(
      conceptBadge(salon, provider),
      element("h2", {}, title),
      element("blockquote", {}, salon?.synthesis || "The final concept has not returned yet."),
      element("small", {}, "GPT generates the personalized concept. The ninth spatial realization is the archived Shimmering Spheres world from MUSE Infinity.")
    );
    body.append(threads, synthesis);
    this.presentEntry("roundtable", [
      element("p", { className: "eyebrow" }, "06 / THE CLOSING ROUNDTABLE"),
      body,
      element("button", { type: "button", className: "entry-primary", disabled: !salon?.synthesis, dataset: { entryAction: "open-decision" } }, "Face the contradiction →")
    ]);
    this.chapterLabel.textContent = "ROUNDTABLE / 06";
  }

  showDecision(question, salon = this.currentSalon) {
    if (question && typeof question === "object") {
      salon = question;
      question = undefined;
    }
    this.currentSalon = salon || this.currentSalon;
    const grid = element("div", { className: "decision-grid" });
    for (const axis of PHILOSOPHY_AXES) {
      const button = element("button", { type: "button", className: "decision-choice", dataset: { decision: axis.id } });
      button.append(element("small", {}, axis.number), element("b", {}, axis.name), element("span", {}, axis.statement));
      grid.append(button);
    }
    this.presentEntry("decision", [
      element("p", { className: "eyebrow" }, "07 / SOCRATES ASKS YOU"),
      element("h1", {}, question || "If art can alter reality, what responsibility should it carry?"),
      element("p", { className: "entry-copy" }, `Choose the contradiction that ${conceptTitle(this.currentSalon)} must carry into form.`),
      grid
    ]);
    this.chapterLabel.textContent = "DECISION / 07";
  }

  showTransformation(axis, salon = this.currentSalon) {
    const choice = PHILOSOPHY_AXES.find((item) => item.id === axis) || PHILOSOPHY_AXES[0];
    this.currentSalon = salon || this.currentSalon;
    this.presentEntry("transformation", [
      element("p", { className: "eyebrow" }, "08 / YOUR ANSWER ENTERS THE WORLD"),
      element("div", { className: `transformation-mark axis-${choice.id}`, ariaHidden: "true" }),
      element("h1", {}, "The museum is ready to rewrite itself."),
      element("p", { className: "transformation-axis" }, `${choice.name} · ${choice.statement}`),
      element("p", { className: "entry-copy" }, `${conceptTitle(this.currentSalon)} will be transformed by this choice before it becomes a manifesto. The archived ninth world remains closed until that new statement is published.`),
      element("button", { type: "button", className: "entry-primary", dataset: { entryAction: "complete-transformation" } }, `Bind ${choice.name} into the concept →`)
    ]);
    this.chapterLabel.textContent = "TRANSFORMATION / 08";
  }

  setTransformationBusy(busy) {
    const button = this.entry.querySelector("[data-entry-action='complete-transformation']");
    if (!button) return;
    button.disabled = Boolean(busy);
    if (busy) button.textContent = "GPT-5.6 is transforming the concept…";
  }

  showManifesto(salon, options = {}, legacyText = "") {
    if (looksLikeWorld(salon) && options?.perspectives) salon = options;
    const normalized = typeof options === "string" ? { axis: options, text: legacyText } : options || {};
    this.currentSalon = salon || this.currentSalon;
    this.conceptProvider = { ...this.conceptProvider, ...normalized };
    const initialText = String(normalized.text || salon?.principle || salon?.manifesto || salon?.synthesis || "").trim().slice(0, 360);
    const published = Boolean(normalized.published);
    const field = element("textarea", { id: "manifesto-input", rows: 4, maxLength: 360, readOnly: published, "aria-label": "Personal manifesto" });
    field.value = initialText;
    const publish = element("button", { type: "button", className: "entry-primary", disabled: published || !initialText, dataset: { entryAction: "publish-manifesto" } }, published ? "Manifesto published" : "Publish manifesto");
    field.addEventListener("input", () => { publish.disabled = !field.value.trim(); });
    const enter = element("button", { type: "button", className: "entry-secondary", hidden: !published, dataset: { entryAction: "enter-final" } }, "Enter 09 / ANSWER →");
    const actions = element("div", { className: "manifesto-actions" });
    actions.append(publish, enter);
    this.presentEntry("manifesto", [
      element("p", { className: "eyebrow" }, "09 / YOUR IMPOSSIBLE WORLD"),
      conceptBadge(this.currentSalon, normalized),
      element("h1", {}, conceptTitle(this.currentSalon)),
      element("p", { className: "manifesto-axis" }, `Governing axis · ${axisName(normalized.axis || salon?.philosophy_axis)}`),
      element("p", { className: "entry-copy" }, "This personalized concept is grounded in the eight-scene walk. Publish its governing statement to open the final spatial answer."),
      field,
      actions,
      element("p", { className: "archive-note" }, "Spatial realization: Fantasy Realm of Shimmering Spheres · archived MUSE Infinity world. The geometry is not generated live.")
    ]);
    this.chapterLabel.textContent = "MANIFESTO / 09";
  }

  setManifestoPublished(text) {
    const field = this.entry.querySelector("#manifesto-input");
    const publish = this.entry.querySelector("[data-entry-action='publish-manifesto']");
    const enter = this.entry.querySelector("[data-entry-action='enter-final']");
    if (field && text) field.value = String(text).slice(0, 360);
    if (field) field.readOnly = true;
    if (publish) {
      publish.disabled = true;
      publish.textContent = "Manifesto published";
    }
    if (enter) enter.hidden = false;
  }

  enterFinalWorld(world, salon = this.currentSalon, provider = this.conceptProvider) {
    this.currentSalon = salon || this.currentSalon;
    const title = conceptTitle(this.currentSalon);
    const source = provider?.live === true || salon?.live === true ? liveProviderName(provider) : "curated fallback";
    this.dialogue.hidden = true;
    this.presentEntry("final-answer", [
      element("button", { type: "button", className: "final-dismiss", dataset: { entryAction: "dismiss-final" }, "aria-label": "Close answer plaque" }, "×"),
      element("p", { className: "eyebrow" }, FINAL_SCENE.chapter),
      conceptBadge(this.currentSalon, provider),
      element("h1", {}, title),
      element("p", { className: "final-world-name" }, world?.name || "Fantasy Realm of Shimmering Spheres"),
      element("p", { className: "entry-copy" }, "Your GPT concept now inhabits the archived Shimmering Spheres realization. Move through it as the answer to the eight worlds behind you."),
      element("blockquote", { className: "return-question" }, FINAL_SCENE.question),
      element("p", { className: "archive-note" }, `Personalized concept: ${source} · Spatial asset: archived MUSE Infinity world`)
    ]);
    this.app.dataset.narrativeStage = "answer";
    this.chapterLabel.textContent = FINAL_SCENE.chapter;
  }

  setSpeaker(companion) {
    if (!companion) return;
    this.speakerName.textContent = companion.name;
    this.speakerPortrait.src = companion.portrait;
    this.speakerPortrait.alt = companion.fullName;
    this.speakerPortrait.hidden = false;
  }

  renderRoute(plan, visited = [], currentId) {
    const visitedIds = normalizeIds(visited);
    const currentIndex = EXHIBITION_SPINE.findIndex((item) => item.id === currentId);
    const nextIndex = Math.min(visitedIds.size, EXHIBITION_SPINE.length - 1);
    this.routeList.replaceChildren(...EXHIBITION_SPINE.map((item, index) => {
      const done = visitedIds.has(item.id);
      const active = item.id === currentId;
      const available = done || active || index === nextIndex;
      const li = element("li", {
        dataset: { route: String(index), sceneId: item.id },
        className: done ? "done" : active ? "active" : available ? "available" : "locked",
        "aria-current": active ? "step" : "false"
      });
      li.append(
        element("b", {}, String(index + 1).padStart(2, "0")),
        element("span", {}, item.title),
        element("small", {}, done ? "VISITED" : active ? "CURRENT" : available ? "NEXT" : "LOCKED")
      );
      return li;
    }));
    if (currentIndex >= 0) this.chapterLabel.textContent = `WORLD EXPLORATION · ${String(currentIndex + 1).padStart(2, "0")} / 08`;
    else if (!plan) this.chapterLabel.textContent = "THRESHOLD / 00";
  }

  setGuideState(state) {
    this.guideState.textContent = state.toUpperCase();
  }

  setSync(metrics) {
    this.syncState.textContent = metrics.synced ? "SCENE SYNC ✓" : "SCENE SYNC";
  }

  openDrawer(type, context) {
    const renderers = {
      atlas: () => this.renderAtlas(context),
      forge: () => this.renderForge(context),
      salon: () => this.renderSalon(context),
      room: () => this.renderRoom(context),
      profile: () => this.renderProfile(context),
      evidence: () => this.renderEvidence(context)
    };
    if (!renderers[type]) return;
    this.app.dataset.drawerOpen = type;
    this.dialogue.setAttribute("aria-hidden", "true");
    this.drawer.hidden = false;
    this.drawer.dataset.type = type;
    renderers[type]();
  }

  closeDrawer() {
    this.drawer.hidden = true;
    delete this.app.dataset.drawerOpen;
    this.dialogue.removeAttribute("aria-hidden");
  }

  renderAtlas(context) {
    this.drawerKicker.textContent = "EIGHT PROCESS WORLDS";
    this.drawerTitle.textContent = "Atlas";
    const visitedIds = normalizeIds(context.visited || context.visitedSceneIds || context.session?.visited || []);
    const complete = Boolean(context.canConveneSalon || context.lessonComplete || visitedIds.size >= EXHIBITION_SPINE.length);
    const answerOpen = Boolean(context.finalWorldEntered);
    const grid = element("div", { className: "drawer-grid atlas-grid" });
    for (const [index, world] of PROCESS_WORLDS.entries()) {
      const sceneItem = EXHIBITION_SPINE.find((item) => item.worldId === world.id);
      const visited = visitedIds.has(sceneItem?.id) || visitedIds.has(world.id);
      const active = context.worldId === world.id;
      const unlocked = complete || visited || active || index === visitedIds.size;
      const button = element("button", {
        type: "button",
        className: `command atlas-world${active ? " selected" : ""}${visited ? " visited" : ""}`,
        disabled: answerOpen || context.busy || !unlocked,
        dataset: { drawerAction: "world", value: world.id }
      });
      button.append(
        element("img", { className: "world-thumb", src: world.thumb, alt: "" }),
        element("span", { className: "atlas-copy" })
      );
      button.querySelector(".atlas-copy").append(
        element("small", {}, `${sceneItem?.chapter || String(index + 1).padStart(2, "0")} · ${answerOpen ? "ARCHIVED" : context.busy ? "LOADING" : visited ? "VISITED" : active ? "CURRENT" : unlocked ? "AVAILABLE" : "LOCKED"}`),
        element("b", {}, sceneItem?.title || world.name),
        element("span", {}, sceneItem?.artist || world.subtitle)
      );
      grid.append(button);
    }
    this.drawerBody.replaceChildren(
      element("p", { className: "drawer-note" }, answerOpen
        ? "09 / ANSWER is open. The eight process worlds remain visible here as a locked evidence record."
        : "Eight worlds hold the process evidence. 09 / ANSWER remains outside the Atlas until the manifesto opens it."),
      grid
    );
  }

  renderForge(context) {
    this.drawerKicker.textContent = "AUXILIARY WORLD MODEL";
    this.drawerTitle.textContent = "Forge";
    const section = element("div", { className: "drawer-section" });
    section.append(
      element("h3", {}, context.status.world_forge ? "World Labs connected" : "World generation locked"),
      element("p", {}, context.status.world_forge ? "Create an isolated spatial variation. The canonical nine-world journey remains active." : "This server has no generation credentials. The archived worlds and local journey remain available."),
      textarea("forge-prompt", "A luminous gallery where reflections become pathways", 600),
      input("forge-token", "password", "Admin token"),
      element("button", { type: "button", className: "command", disabled: !context.status.world_forge, dataset: { drawerAction: "forge" } }, "Generate isolated world")
    );
    this.drawerBody.replaceChildren(section);
  }

  renderSalon(context) {
    this.drawerKicker.textContent = "SELECTED HISTORICAL COMPANY";
    this.drawerTitle.textContent = "Salon";
    const body = element("div", { className: "drawer-grid" });
    const perspectives = Array.isArray(context.salon?.perspectives) ? context.salon.perspectives : [];
    if (perspectives.length) {
      body.append(element("h3", {}, conceptTitle(context.salon)));
      for (const item of perspectives) {
        const companion = findCompanion(item.character_id, context.companions);
        const view = element("div", { className: "perspective" });
        if (companion) view.append(portraitChip(companion));
        view.append(element("h3", {}, companion?.fullName || item.name), element("p", {}, item.stance || item.text));
        body.append(view);
      }
      body.append(element("blockquote", { className: "drawer-synthesis" }, context.salon.synthesis));
    } else {
      const note = !context.hasLesson
        ? "Begin the eight-world route to bring evidence into the Salon."
        : context.canConveneSalon
          ? "All eight observations are ready for the closing roundtable."
          : "The selected company convenes after all eight process worlds are visited.";
      body.append(element("p", { className: "drawer-note" }, note));
      body.append(element("button", { type: "button", className: "command", disabled: !context.canConveneSalon, dataset: { drawerAction: "salon" } }, "Convene perspectives"));
    }
    this.drawerBody.replaceChildren(body);
  }

  renderRoom(context) {
    this.drawerKicker.textContent = "SHARED PRESENCE";
    this.drawerTitle.textContent = "Room";
    const section = element("div", { className: "drawer-grid" });
    if (context.room?.room_id) {
      section.append(element("h3", {}, `Room ${context.room.room_id}`), element("p", {}, "Your current scene and observations can now travel between four learners."), element("button", { type: "button", className: "command", dataset: { drawerAction: "leave-room" } }, "Return to solo"));
    } else {
      section.append(input("room-name", "text", "Display name", context.profile.name), element("button", { type: "button", className: "command", dataset: { drawerAction: "create-room" } }, "Create room"), input("room-code", "text", "Six-character room code"), element("button", { type: "button", className: "command", dataset: { drawerAction: "join-room" } }, "Join room"));
    }
    this.drawerBody.replaceChildren(section);
  }

  renderProfile(context) {
    this.drawerKicker.textContent = "LOCAL LEARNER MEMORY";
    this.drawerTitle.textContent = "Profile";
    const section = element("div", { className: "drawer-grid" });
    section.append(input("profile-name", "text", "Display name", context.profile.name), element("button", { type: "button", className: "command", dataset: { drawerAction: "save-profile" } }, "Save locally"));
    if (context.profile.history.length) {
      const history = element("div", { className: "drawer-section" });
      history.append(element("h3", {}, "Learning maps"));
      for (const item of [...context.profile.history].reverse()) history.append(element("p", {}, item.goal));
      section.append(history);
    }
    this.drawerBody.replaceChildren(section);
  }

  renderEvidence(context) {
    this.drawerKicker.textContent = "PROVENANCE & CORRESPONDENCE";
    this.drawerTitle.textContent = "Evidence";
    const live = context.provider?.live === true;
    const rows = [
      ["Reasoning model", live ? liveProviderName(context.provider) : "GPT contract · curated fallback"],
      ["Scene manifest", SCENE_MANIFEST.version],
      ["Canonical process", "8 ordered worlds"],
      ["Final realization", "Shimmering Spheres · archived world 09"],
      ["Active archived world", context.worldId],
      ["Archived companions", context.companions.map((item) => item.fullName).join(" · ")],
      ["Guide position", context.metrics?.distance == null ? "Awaiting route" : `${context.metrics.distance.toFixed(2)} m from anchor`],
      ["Guide facing", context.metrics?.facingError == null ? "Awaiting route" : `${context.metrics.facingError.toFixed(1)}° error`],
      ["Runtime authorship", "Codex Build Week rebuild"],
      ["World model", "muse-infinity World Labs archives · original high-resolution assets"]
    ];
    const table = element("table", { className: "evidence-table" });
    const tbody = element("tbody");
    for (const [key, value] of rows) {
      const tr = element("tr");
      tr.append(element("th", {}, key), element("td", {}, value));
      tbody.append(tr);
    }
    table.append(tbody);
    this.drawerBody.replaceChildren(table, element("p", { className: "drawer-note" }, "Dialogue opens after the selected archived companion reaches the scene anchor and faces its evidence point. Atlas browsing does not create visit evidence."));
  }

  setWorld(world) {
    this.worldName.textContent = world.name.toUpperCase();
  }

  toast(message) {
    clearTimeout(this.toastTimer);
    const safeMessage = String(message || "");
    this.toastElement.textContent = safeMessage.length > 240 ? `${safeMessage.slice(0, 237)}…` : safeMessage;
    this.toastElement.hidden = false;
    this.toastTimer = setTimeout(() => { this.toastElement.hidden = true; }, 3000);
  }

  presentEntry(stage, children) {
    this.entry.dataset.stage = stage;
    this.entry.hidden = false;
    this.entry.replaceChildren(...children);
    const heading = this.entry.querySelector("h1, h2");
    if (heading) heading.id = "entry-title";
    this.dialogue.hidden = true;
    this.app.dataset.narrativeStage = stage;
    this.updateModelBadge();
  }

  updateModelBadge() {
    const badge = document.getElementById("model-badge");
    if (!badge) return;
    this.modelBadge = badge;
    badge.textContent = providerPresentation(this.providerStatus).badge;
  }
}

function byId(id) {
  const item = document.getElementById(id);
  if (!item) throw new Error(`missing_element:${id}`);
  return item;
}

function scene(id) {
  return EXHIBITION_SPINE.find((item) => item.id === id)
    || SCENE_MANIFEST.stops.find((item) => item.id === id || item.stop_id === id)
    || { title: id, artist: "" };
}

function conceptTitle(salon) {
  return String(salon?.world_title || salon?.worldTitle || salon?.title || "The World Between Worlds").trim();
}

function conceptBadge(salon, provider = {}) {
  if (!salon) return element("span", { className: "concept-badge pending" }, "GPT CONCEPT PENDING");
  const live = salon?.live === true || provider?.live === true;
  const fallbackText = `${salon?.synthesis || ""} ${salon?.warning || ""}`;
  const fallback = salon?.live === false || provider?.live === false || salon?.source === "fallback" || /curated demo|fallback|not generated live/i.test(fallbackText);
  const liveLabel = provider?.gateway === "inherited-gpt" ? "GATEWAY GPT CONCEPT" : "LIVE GPT CONCEPT";
  return element("span", { className: `concept-badge ${live ? "live" : fallback ? "fallback" : "pending"}` }, live ? liveLabel : fallback ? "CURATED FALLBACK CONCEPT" : "CONCEPT RECORD");
}

function liveProviderName(provider = {}) {
  const model = String(provider.model || "GPT-5.6").toUpperCase();
  return provider.gateway === "inherited-gpt" ? `${model} · INHERITED GATEWAY` : `${model} · OPENAI API`;
}

function voiceTranscriptLabel(role, mode, provider = {}) {
  if (role === "user") return "YOU · VOICE";
  if (mode === "realtime") return "MIRA · OPENAI REALTIME";
  if (provider.live === true && provider.gateway === "inherited-gpt") {
    return `MIRA · ${String(provider.model || "GPT-5.6").toUpperCase()} · INHERITED GATEWAY`;
  }
  if (provider.live === true) return `MIRA · ${String(provider.model || "GPT-5.6").toUpperCase()} · OPENAI`;
  return "MIRA · CURATED LOCAL";
}

function axisName(id) {
  return PHILOSOPHY_AXES.find((item) => item.id === id)?.name || "Perception · Emotion · Invention";
}

function findCompanion(id, companions = []) {
  const records = companions.map((item) => typeof item === "string" ? COMPANIONS.find((companion) => companion.id === item) : item).filter(Boolean);
  return records.find((item) => item.id === id) || COMPANIONS.find((item) => item.id === id) || null;
}

function portraitChip(companion) {
  const chip = element("span", { className: "portrait-chip" });
  chip.append(element("img", { src: companion.portrait, alt: "" }), element("b", {}, companion.name));
  return chip;
}

function normalizeIds(values) {
  const source = Array.isArray(values) ? values : values instanceof Set ? [...values] : [];
  return new Set(source.map((item) => typeof item === "string" ? item : item?.stop_id || item?.id).filter(Boolean));
}

function readDetail(value) {
  return String(value || "evidence").replaceAll("-", " ");
}

function evidenceCount(count) {
  const item = element("div", { className: "evidence-count" });
  item.append(element("b", {}, String(count).padStart(2, "0")), element("span", {}, `/ ${String(EXHIBITION_SPINE.length).padStart(2, "0")} scenes recorded`));
  return item;
}

function entryMeta() {
  const meta = element("div", { className: "entry-meta" });
  meta.append(element("span", { id: "model-badge" }, "CURATED FALLBACK"), element("span", {}, "8 process worlds · 8 companions · 1 answer world"));
  return meta;
}

function looksLikeWorld(value) {
  return Boolean(value?.id && value?.name && !value?.synthesis && !value?.perspectives);
}

function element(tag, props = {}, text) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "dataset") Object.assign(node.dataset, value);
    else if (key in node) node[key] = value;
    else node.setAttribute(key, value);
  }
  if (text !== undefined) node.textContent = text;
  return node;
}

function input(id, type, placeholder, value = "") {
  return element("input", { id, type, placeholder, value, maxLength: type === "password" ? 160 : 80 });
}

function textarea(id, placeholder, maxLength) {
  return element("textarea", { id, placeholder, maxLength, rows: 4 });
}
