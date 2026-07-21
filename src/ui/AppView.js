import { EXHIBITION_SPINE, FINAL_SCENE } from "../config/exhibitionSpine.js";
import { COMPANIONS } from "../config/legacyAssets.js";
import { SCENE_MANIFEST, WORLDS } from "../config/scenes.js";

const PHILOSOPHY_AXES = Object.freeze([
  Object.freeze({ id: "perception", number: "01", name: "Perception", statement: "Art must sharpen what can be perceived." }),
  Object.freeze({ id: "emotion", number: "02", name: "Emotion", statement: "Art must answer to lived feeling." }),
  Object.freeze({ id: "invention", number: "03", name: "Invention", statement: "Art must keep reality open to reinvention." })
]);

const PORTRAIT_POSITIONS = Object.freeze({
  monet: "center 28%",
  "van-gogh": "center 34%",
  socrates: "center 24%",
  frida: "center 20%",
  picasso: "center 26%",
  freud: "center 18%",
  "qi-baishi": "center 18%",
  "yayoi-kusama": "center 16%"
});

const PROCESS_WORLDS = EXHIBITION_SPINE.map((item) => WORLDS.find((world) => world.id === item.worldId)).filter(Boolean);
const QUESTION_MOMENTS_TOTAL = EXHIBITION_SPINE.length * 3;

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
    this.questionProgressQuestion = byId("question-progress-question");
    this.questionProgressValue = byId("question-progress-value");
    this.questionProgressCopy = byId("question-progress-copy");
    this.worldProgressValue = byId("world-progress-value");
    this.questionProgressMeter = byId("question-progress-meter");
    this.questionProgressFill = byId("question-progress-fill");
    this.companionConversation = byId("companion-conversation");
    this.companionConversationPortrait = byId("companion-conversation-portrait");
    this.companionConversationSpeaker = byId("companion-conversation-speaker");
    this.companionConversationLine = byId("companion-conversation-line");
    this.companionConversationProgress = byId("companion-conversation-progress");
    this.companionConversationSkip = byId("companion-conversation-skip");
    this.companionConversationNext = byId("companion-conversation-next");
    this.artworkStory = byId("artwork-story");
    this.artworkStoryTitle = byId("artwork-story-title");
    this.artworkStoryStatus = byId("artwork-story-status");
    this.artworkStoryDescription = byId("artwork-story-description");
    this.artworkStoryCaption = byId("artwork-story-caption");
    this.artworkStoryCueLabel = byId("artwork-story-cue-label");
    this.artworkStorySpeaker = byId("artwork-story-speaker");
    this.artworkStoryLine = byId("artwork-story-line");
    this.artworkStorySource = byId("artwork-story-source");
    this.artworkStoryPause = byId("artwork-story-pause");
    this.artworkStorySkip = byId("artwork-story-skip");
    this.artworkStoryReplay = byId("artwork-story-replay");
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
    this.worldTransition = byId("world-transition");
    this.worldTransitionImage = byId("world-transition-image");
    this.worldTransitionKicker = byId("world-transition-kicker");
    this.worldTransitionTitle = byId("world-transition-title");
    this.worldTransitionStatus = byId("world-transition-status");
    this.currentSalon = null;
    this.conceptProvider = { live: false, model: "curated-demo" };
    this.providerStatus = { configured: false, live: false, openai: false, gateway: "official", model: "GPT-5.6" };
    this.soundRestingState = "armed";
    this.toastTimer = 0;
    this.worldTransitionTimer = 0;
    this.worldTransitionToken = 0;
    this.worldTransitionStartedAt = 0;
    this.worldTransitionImageReady = Promise.resolve(true);
    this.prefetchedTransitionImages = new Map();
    this.transitionInertSnapshot = null;
    this.pendingTransitionToast = "";
    this.lastPresentedStage = null;
    this.drawerReturnFocus = null;
    this.questionProgressState = null;
    this.conversationTurns = [];
    this.conversationIndex = -1;
    this.conversationCompleteLabel = "Continue the exploration";
    this.companionConversationSuspended = false;
    this.artworkStoryCue = null;
    this.stationQuestionDrafts = new Map();
    this.endingCompanions = [];
  }

  bind(callbacks = {}) {
    const call = (name, ...args) => {
      const callback = callbacks[name];
      return typeof callback === "function" ? callback(...args) : undefined;
    };
    const defer = (name, ...args) => queueMicrotask(() => call(name, ...args));

    this.entry.addEventListener("submit", (event) => {
      if (event.target.id !== "goal-form") return;
      event.preventDefault();
      const goal = event.target.elements.goal?.value.trim();
      if (goal) defer("onStart", goal);
    });

    this.entry.addEventListener("click", (event) => {
      const companion = event.target.closest("[data-companion]");
      const preset = event.target.closest("[data-goal]");
      const decision = event.target.closest("[data-decision]");
      const action = event.target.closest("[data-entry-action]");
      if (companion) {
        defer("onCompanionToggle", companion.dataset.companion);
        return;
      }
      if (preset) {
        const input = this.entry.querySelector("#goal-input");
        if (input) input.value = preset.dataset.goal;
        defer("onStart", preset.dataset.goal);
        return;
      }
      if (decision) {
        defer("onDecision", decision.dataset.decision);
        return;
      }
      if (!action) return;
      const name = action.dataset.entryAction;
      if (name === "cross-threshold") {
        if (typeof callbacks.onCrossThreshold === "function") call("onCrossThreshold");
        else this.showLifeQuestion();
      } else if (name === "curate") defer("onCurate");
      else if (name === "enter-walk") defer("onEnterWalk");
      else if (name === "begin-summoning") defer("onBeginSummoning");
      else if (name === "convene-roundtable") defer("onConveneRoundtable");
      else if (name === "open-decision") {
        if (typeof callbacks.onOpenDecision === "function") call("onOpenDecision");
        else this.showDecision(undefined, this.currentSalon);
      }
      else if (name === "complete-transformation") defer("onCompleteTransformation");
      else if (name === "publish-manifesto") {
        const value = this.entry.querySelector("#manifesto-input")?.value.trim() || "";
        if (value) defer("onPublishManifesto", value);
      } else if (name === "enter-final") defer("onEnterFinal");
      else if (name === "retry-scene") defer("onRetryScene");
      else if (name === "dismiss-final") this.entry.hidden = true;
    });

    this.answers.addEventListener("click", (event) => {
      const skip = event.target.closest("[data-skip-artwork]");
      if (skip) {
        call("onSkipArtwork", { source: "station-question" });
        return;
      }
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
    this.companionConversation.addEventListener("click", (event) => {
      const control = event.target.closest("[data-conversation-action]");
      if (!control) return;
      const currentTurn = this.conversationTurns[this.conversationIndex] || null;
      if (control.dataset.conversationAction === "skip") {
        const payload = { turn: currentTurn, index: this.conversationIndex, total: this.conversationTurns.length };
        this.hideCompanionConversation();
        call("onSkipArtwork", payload);
        return;
      }
      const result = this.advanceCompanionConversation();
      call("onConversationNext", { previousTurn: currentTurn, ...result });
    });
    this.artworkStory.addEventListener("click", (event) => {
      const control = event.target.closest("[data-story-action]");
      const storyAction = control?.dataset.storyAction;
      if (!storyAction) return;
      if (storyAction === "pause") call("onArtworkStoryPause", this.artworkStory.dataset.paused !== "true");
      else if (storyAction === "skip") call("onArtworkStorySkip");
      else if (storyAction === "replay") call("onArtworkStoryReplay");
    });
    document.addEventListener("click", (event) => {
      const drawerButton = event.target.closest("[data-drawer]");
      const actionButton = event.target.closest("[data-action]");
      if (drawerButton) {
        drawerButton.closest("details")?.removeAttribute("open");
        call("onDrawer", drawerButton.dataset.drawer);
      }
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
      element("h1", {}, "MUSE∞"),
      element("p", { className: "threshold-offer" }, "Understanding is not something you can simply read."),
      element("p", { className: "entry-copy threshold-copy" }, "Bring a real question. GPT-5.6 curates real artworks and three AI interpretive lenses across time and space; their disagreements and your actual observations shape an answer only this journey can form."),
      element("button", { type: "button", className: "entry-primary", dataset: { entryAction: "cross-threshold" } }, "Enter the museum →"),
      entryMeta()
    ]);
    this.renderRoute(null, [], null);
    this.chapterLabel.textContent = "THRESHOLD / 00";
  }

  showLifeQuestion(value = "") {
    const presets = element("div", { className: "goal-presets", id: "goal-presets" });
    for (const goal of ["What makes a life meaningful?", "How do I live with uncertainty?", "What should I keep, and what should I let go?"]) {
      presets.append(element("button", { type: "button", dataset: { goal } }, goal));
    }
    const form = element("form", { id: "goal-form" });
    form.append(
      element("label", { className: "sr-only", htmlFor: "goal-input" }, "Life question"),
      element("input", { id: "goal-input", name: "goal", maxLength: 120, autoComplete: "off", placeholder: "What makes a life meaningful?", value }),
      element("button", { type: "submit" }, "Choose your AI lenses →")
    );
    this.presentEntry("life-question", [
      element("p", { className: "eyebrow" }, "01 / LIFE QUESTION"),
      element("h1", {}, "What question are you carrying?"),
      element("p", { className: "entry-copy" }, "Choose a question or write your own. It stays with you while real artworks and distinct AI interpretive lenses test it from different positions."),
      presets,
      form,
      entryMeta()
    ]);
    if (value) this.setQuestionProgress({ question: value, explored: 0, total: QUESTION_MOMENTS_TOTAL, worldsExplored: 0, worldsTotal: EXHIBITION_SPINE.length });
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
      openai: provider.live === true,
      model: provider.model || this.providerStatus.model
    };
    this.updateModelBadge();
    this.updateProviderLabel();
    const question = plan?.question || plan?.goal || this.questionProgressState?.question || "The question you are carrying";
    this.setQuestionProgress({
      question,
      explored: 0,
      total: QUESTION_MOMENTS_TOTAL,
      worldsExplored: 0,
      worldsTotal: EXHIBITION_SPINE.length
    });
    this.renderRoute(plan, [], plan.start_stop_id);
    this.showWalking(plan.start_stop_id);
  }

  showCompany(selectedIds) {
    const selected = new Set(selectedIds);
    this.endingCompanions = COMPANIONS.filter((companion) => selected.has(companion.id));
    const intro = element("div", { className: "entry-intro" });
    intro.append(
      element("p", { className: "eyebrow" }, "02 / CHOOSE THREE LENSES"),
      element("h1", {}, "Which perspectives should challenge your question?"),
      element("p", { className: "entry-copy" }, "Choose up to three AI interpretive lenses grounded in documented ideas. They are not the artists or thinkers themselves, and their words are not authentic quotations or endorsements."),
      element("p", { className: "interpretation-note" }, "Every named voice is an AI interpretation, including lenses based on living artists.")
    );
    const grid = element("div", { className: "companion-grid" });
    for (const companion of COMPANIONS) {
      const active = selected.has(companion.id);
      const button = element("button", {
        type: "button",
        className: `companion-choice${active ? " selected" : ""}`,
        dataset: { companion: companion.id },
        ariaPressed: String(active),
        "aria-label": `${active ? "Remove" : "Choose"} ${companion.fullName} AI interpretive lens`
      });
      button.style.setProperty("--portrait-position", PORTRAIT_POSITIONS[companion.id] || "center 24%");
      button.append(
        element("img", { src: companion.portrait, alt: "" }),
        element("span", { className: "companion-copy" }),
        element("span", { className: "companion-check", ariaHidden: "true" }, active ? "✓" : "+")
      );
      button.querySelector(".companion-copy").append(
        element("b", {}, companion.fullName),
        element("small", {}, `AI INTERPRETIVE LENS · ${companion.lens}`)
      );
      grid.append(button);
    }
    const footer = element("div", { className: "company-footer" });
    footer.append(
      element("span", {}, `${selected.size} / 3 LENSES`),
      element("button", { type: "button", disabled: selected.size === 0, dataset: { entryAction: "curate" } }, "Let GPT curate →")
    );
    this.presentEntry("company", [intro, grid, footer]);
    this.chapterLabel.textContent = "AI LENSES / 02";
  }

  showCuration(question, companions = []) {
    this.endingCompanions = companions.slice(0, 3);
    this.setQuestionProgress({
      question,
      explored: 0,
      total: QUESTION_MOMENTS_TOTAL,
      worldsExplored: 0,
      worldsTotal: EXHIBITION_SPINE.length
    });
    const route = element("ol", { className: "curation-route", "aria-label": "Eight-chapter thought route" });
    for (const [index, sceneItem] of EXHIBITION_SPINE.entries()) {
      const item = element("li");
      item.style.setProperty("--stagger-delay", `${index * 55}ms`);
      const copy = element("div", { className: "curation-route-copy" });
      copy.append(
        element("b", {}, sceneItem.chapter),
        element("span", {}, sceneItem.title),
        element("small", {}, sceneItem.artist)
      );
      item.append(
        element("img", { src: sceneItem.thumbnail, alt: "", loading: "eager" }),
        copy
      );
      route.append(item);
    }
    const company = element("div", { className: "curation-company" });
    for (const companion of companions) company.append(portraitChip(companion));
    const action = element("button", { type: "button", className: "entry-primary", disabled: true, dataset: { entryAction: "enter-walk" } }, "Preparing the route…");
    this.presentEntry("curation", [
      element("p", { className: "eyebrow" }, "03 / GPT CURATION"),
      element("h1", {}, "GPT-5.6 shapes a bounded path through eight thought chapters."),
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
    this.hideArtworkStory();
    const sceneStop = scene(stopId);
    this.entry.hidden = true;
    this.dialogue.hidden = false;
    this.app.dataset.narrativeStage = "world-exploration";
    this.guideState.textContent = "WALKING";
    this.stopTitle.textContent = `Approaching ${sceneStop.title}`;
    this.guideLine.textContent = "Your chosen AI lenses are moving to the selected evidence point.";
    delete this.dialogue.dataset.stationIndex;
    delete this.dialogue.dataset.stationCount;
    delete this.dialogue.dataset.stationId;
    delete this.dialogue.dataset.artworkId;
    delete this.dialogue.dataset.stationQuestionKey;
    this.inquiryThread.hidden = true;
    this.inquiryThread.replaceChildren();
    this.answers.hidden = true;
    this.answers.replaceChildren();
    this.continueButton.hidden = true;
  }

  showStationWalking(stop, station, artwork, stationIndex, stationCount) {
    this.hideArtworkStory();
    const sceneStop = scene(stop.stop_id);
    const questionKey = `${stop.stop_id}:${station.station_id}:${artwork.id}`;
    const currentKey = this.dialogue.dataset.stationQuestionKey;
    const currentInput = this.answers.querySelector("#inquiry-input");
    if (currentKey && currentInput) this.stationQuestionDrafts.set(currentKey, currentInput.value);
    const reusingStation = currentKey === questionKey;
    this.entry.hidden = true;
    this.dialogue.hidden = false;
    this.app.dataset.narrativeStage = "world-exploration";
    this.dialogue.dataset.stationIndex = String(stationIndex);
    this.dialogue.dataset.stationCount = String(stationCount);
    this.dialogue.dataset.stationId = station.station_id;
    this.dialogue.dataset.artworkId = artwork.id;
    this.dialogue.dataset.stationQuestionKey = questionKey;
    this.guideState.textContent = "WALKING";
    this.stopTitle.textContent = `${sceneStop.title} · work ${stationIndex + 1} of ${stationCount}`;
    this.guideLine.textContent = `Your chosen AI lenses are moving independently toward ${artwork.title} by ${artwork.artist}.`;
    this.inquiryThread.hidden = true;
    this.answers.hidden = true;
    if (!reusingStation) {
      this.inquiryThread.replaceChildren();
      this.answers.replaceChildren();
    }
    this.continueButton.hidden = true;
  }

  showArchiveRequired(sceneItem) {
    this.hideArtworkStory();
    this.setWorldPresentation(sceneItem, false);
    this.presentEntry("archive-required", [
      element("p", { className: "eyebrow" }, `${sceneItem.chapter} / SCENE UNAVAILABLE`),
      element("h1", {}, sceneItem.title),
      element("p", { className: "entry-copy" }, "The complete spatial scene must finish loading before it can contribute evidence to the final concept."),
      element("button", { type: "button", className: "entry-primary", dataset: { entryAction: "retry-scene" } }, "Retry scene →")
    ]);
    this.chapterLabel.textContent = `${sceneItem.chapter} / RETRY`;
  }

  showQuestion(stop) {
    this.hideArtworkStory();
    const sceneStop = scene(stop.stop_id);
    this.dialogue.dataset.stationIndex = "reflection";
    this.dialogue.dataset.stationCount = String(stop.stations?.length || 3);
    delete this.dialogue.dataset.stationId;
    delete this.dialogue.dataset.artworkId;
    delete this.dialogue.dataset.stationQuestionKey;
    this.guideState.textContent = "ASKING";
    this.stopTitle.textContent = `${sceneStop.title} · world reflection`;
    this.guideLine.textContent = `${stop.guide_line} ${stop.prompt}`;
    this.inquiryThread.hidden = true;
    this.inquiryThread.replaceChildren();
    this.answers.hidden = false;
    const observationForm = element("form", { className: "observation-form" });
    observationForm.append(
      element("label", { className: "sr-only", htmlFor: "observation-input" }, "Your observation"),
      element("input", { id: "observation-input", name: "observation", maxLength: 80, autoComplete: "off", placeholder: "Write what you notice" }),
      element("button", { type: "submit" }, "Record")
    );
    this.answers.replaceChildren(
      ...stop.choices.map((choice) => element("button", { type: "button", dataset: { answer: choice.value } }, choice.label)),
      observationForm
    );
    this.continueButton.hidden = true;
  }

  showStationQuestion(stop, station, artwork, stationIndex, stationCount) {
    const sceneStop = scene(stop.stop_id);
    const questionKey = `${stop.stop_id}:${station.station_id}:${artwork.id}`;
    const drafts = this.stationQuestionDrafts || (this.stationQuestionDrafts = new Map());
    const currentInput = this.answers.querySelector("#inquiry-input");
    const currentKey = this.dialogue.dataset.stationQuestionKey;
    if (currentKey && currentInput) drafts.set(currentKey, currentInput.value);
    const reusableQuestion = currentKey === questionKey && Boolean(currentInput);
    const draftQuestion = preserveStationQuestionDraft(
      currentKey,
      questionKey,
      currentInput?.value,
      drafts.get(questionKey)
    );
    this.dialogue.dataset.stationIndex = String(stationIndex);
    this.dialogue.dataset.stationCount = String(stationCount);
    this.dialogue.dataset.stationId = station.station_id;
    this.dialogue.dataset.artworkId = artwork.id;
    this.dialogue.dataset.stationQuestionKey = questionKey;
    this.guideState.textContent = "ASKING";
    this.stopTitle.textContent = `${sceneStop.title} · ${artwork.title}`;
    this.guideLine.textContent = station.focus_question;
    this.inquiryThread.hidden = false;
    this.answers.hidden = false;
    if (reusableQuestion) {
      this.continueButton.hidden = true;
      return;
    }
    this.inquiryThread.replaceChildren();

    const inquiryForm = element("form", { className: "inquiry-form" });
    const inquiryInput = element("input", { id: "inquiry-input", name: "question", maxLength: 600, autoComplete: "off", placeholder: "Ask about this work" });
    inquiryInput.value = draftQuestion;
    inquiryInput.addEventListener("input", () => drafts.set(questionKey, inquiryInput.value));
    inquiryForm.append(
      element("label", { className: "sr-only", htmlFor: "inquiry-input" }, "Question for the AI interpretive lenses"),
      inquiryInput,
      element("button", { type: "submit" }, "Ask")
    );
    const choices = station.choices.map((choice) => richStationChoice(choice));
    const observationForm = element("form", { className: "observation-form" });
    observationForm.append(
      element("label", { className: "sr-only", htmlFor: "observation-input" }, "Your observation"),
      element("input", { id: "observation-input", name: "observation", maxLength: 240, autoComplete: "off", placeholder: "Record specific evidence you can point to" }),
      element("button", { type: "submit" }, "Record")
    );
    const skip = element("button", {
      type: "button",
      className: "station-skip",
      dataset: { skipArtwork: "true" }
    }, "Skip this artwork");
    this.answers.replaceChildren(inquiryForm, ...choices, observationForm, skip);
    this.continueButton.hidden = true;
  }

  showFeedback(choice) {
    this.guideState.textContent = "REFLECTING";
    this.guideLine.textContent = choice.feedback;
    this.answers.replaceChildren();
    this.continueButton.textContent = "Continue →";
    this.continueButton.hidden = false;
  }

  showStationFeedback(choice, opensSceneReflection = false, { observationRecorded = false, perspectives = [] } = {}) {
    this.guideState.textContent = "REFLECTING";
    this.guideLine.textContent = observationRecorded
      ? `${choice.stance} Your observation is recorded in your own words. Next test: ${choice.evidence_prompt}`
      : `${choice.stance} Inquiry path recorded. Test it against the work: ${choice.evidence_prompt}`;
    for (const item of perspectives) {
      const companion = findCompanion(item.companionId || item.speakerId);
      const turn = element("div", {
        className: "inquiry-turn company-turn station-perspective",
        dataset: { stationPerspective: "true", speakerId: companion?.id || item.companionId || item.speakerId || "companion" }
      });
      turn.append(
        element("b", {}, `${companion?.fullName || item.speaker || item.companionId || item.speakerId || "MUSE"} · AI INTERPRETIVE LENS`),
        element("p", {}, item.text || "")
      );
      this.inquiryThread.append(turn);
    }
    this.inquiryThread.scrollTop = this.inquiryThread.scrollHeight;
    this.answers.replaceChildren();
    this.continueButton.textContent = opensSceneReflection ? "Reflect on this world →" : "Next artwork →";
    this.continueButton.hidden = false;
  }

  showInquiryPending(question) {
    this.setInquiryBusy(true);
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
        element("b", {}, `${item.speaker || item.speakerId} · AI INTERPRETATION · ${source}`),
        element("p", {}, item.text || "")
      );
      this.inquiryThread.append(turn);
    }
    const form = this.answers.querySelector(".inquiry-form");
    this.setInquiryBusy(false);
    if (form?.elements.question) {
      form.elements.question.value = "";
      this.stationQuestionDrafts?.delete(this.dialogue.dataset.stationQuestionKey);
    }
    this.inquiryThread.scrollTop = this.inquiryThread.scrollHeight;
  }

  showInquiryError(message) {
    this.inquiryThread.querySelector("[data-inquiry-pending]")?.remove();
    const turn = element("div", { className: "inquiry-turn inquiry-error" });
    turn.append(element("b", {}, "CONNECTION"), element("p", {}, message));
    this.inquiryThread.append(turn);
    this.setInquiryBusy(false);
  }

  setInquiryBusy(busy) {
    this.dialogue.setAttribute("aria-busy", String(Boolean(busy)));
    for (const control of this.answers.querySelectorAll("button, input, textarea, select")) {
      control.disabled = Boolean(busy);
    }
    this.continueButton.disabled = Boolean(busy);
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

  setSoundState(enabled, state = enabled ? "on" : "off") {
    const button = document.getElementById("sound-tool");
    const label = button.querySelector(".tool-label");
    this.soundRestingState = state;
    button.dataset.soundState = state;
    button.setAttribute("aria-pressed", String(Boolean(enabled)));
    button.title = enabled
      ? "Mute museum score and synthetic guide narration"
      : "Enable museum score and synthetic guide narration";
    if (label) label.textContent = enabled ? "Sound" : "Muted";
  }

  setNarrationState(speaking) {
    const button = document.getElementById("sound-tool");
    if (button.getAttribute("aria-pressed") !== "true") return;
    button.dataset.soundState = speaking ? "speaking" : this.soundRestingState;
    button.title = speaking
      ? "Synthetic guide narration speaking"
      : "Mute museum score and synthetic guide narration";
  }

  setArtworkStory(story = {}) {
    const storyState = String(story.state || "idle");
    const visible = storyState === "story"
      || storyState === "completed"
      || (storyState === "loading" && story.pendingTrigger === true);
    if (!visible) {
      this.hideArtworkStory();
      return false;
    }

    const previousState = this.artworkStory.dataset.state;
    if (storyState === "story" && previousState !== "story") this.artworkStoryCue = null;
    if (story.cue) this.artworkStoryCue = normalizeArtworkStoryCue(story.cue);
    const cue = this.artworkStoryCue;
    const paused = story.paused === true;
    const title = String(story.title || story.artworkTitle || "Artwork story").trim();

    this.artworkStory.hidden = false;
    this.artworkStory.dataset.state = storyState;
    this.artworkStory.dataset.paused = String(paused);
    this.app.dataset.artworkStory = storyState;
    this.artworkStoryTitle.textContent = title;
    this.artworkStoryStatus.textContent = artworkStoryStatus(storyState, story);
    this.artworkStoryDescription.textContent = String(story.accessibleDescription || "").trim();
    this.artworkStoryDescription.hidden = !this.artworkStoryDescription.textContent;

    this.artworkStoryCaption.hidden = !cue;
    if (cue) {
      this.artworkStoryCaption.dataset.kind = cue.kind;
      this.artworkStoryCueLabel.textContent = cue.label;
      this.artworkStorySpeaker.textContent = cue.speaker;
      this.artworkStoryLine.textContent = cue.text;
      const sourceUrl = cue.kind === "curated-fact" ? safeArtworkStorySource(cue.sourceUrl) : "";
      this.artworkStorySource.hidden = !sourceUrl;
      if (sourceUrl) {
        this.artworkStorySource.href = sourceUrl;
        this.artworkStorySource.textContent = cue.sourceLabel || "Art Institute of Chicago source";
      } else {
        this.artworkStorySource.removeAttribute("href");
      }
    } else {
      delete this.artworkStoryCaption.dataset.kind;
      this.artworkStoryCueLabel.textContent = "";
      this.artworkStorySpeaker.textContent = "";
      this.artworkStoryLine.textContent = "";
      this.artworkStorySource.hidden = true;
      this.artworkStorySource.removeAttribute("href");
    }

    this.artworkStoryPause.hidden = storyState !== "story";
    this.artworkStorySkip.hidden = !["loading", "story"].includes(storyState);
    this.artworkStoryReplay.hidden = storyState !== "completed";
    const pauseLabel = this.artworkStoryPause.querySelector(".artwork-story-control-label");
    if (pauseLabel) pauseLabel.textContent = paused ? "Resume" : "Pause";
    this.artworkStoryPause.setAttribute("aria-label", paused ? "Resume living artwork" : "Pause living artwork");
    return true;
  }

  hideArtworkStory() {
    if (!this.artworkStory) return;
    this.artworkStory.hidden = true;
    delete this.artworkStory.dataset.state;
    delete this.artworkStory.dataset.paused;
    delete this.app.dataset.artworkStory;
    this.artworkStoryCue = null;
  }

  setQuestionProgress({ question, explored = 0, total = QUESTION_MOMENTS_TOTAL, worldsExplored = 0, worldsTotal = EXHIBITION_SPINE.length } = {}) {
    const safeTotal = positiveCount(total);
    const safeExplored = clampCount(explored, safeTotal);
    const safeWorldsTotal = positiveCount(worldsTotal);
    const safeWorldsExplored = clampCount(worldsExplored, safeWorldsTotal);
    const percent = safeTotal ? Math.round((safeExplored / safeTotal) * 100) : 0;
    const safeQuestion = String(question || this.questionProgressState?.question || "The question you are carrying").trim();
    const state = {
      question: safeQuestion,
      explored: safeExplored,
      total: safeTotal,
      worldsExplored: safeWorldsExplored,
      worldsTotal: safeWorldsTotal,
      percent
    };
    this.questionProgressState = state;
    this.questionProgressQuestion.textContent = safeQuestion;
    this.questionProgressValue.textContent = `${percent}%`;
    this.questionProgressCopy.textContent = safeTotal
      ? `${safeExplored} of ${safeTotal} question moments explored`
      : "Your exploration is ready to begin.";
    this.worldProgressValue.textContent = `${safeWorldsExplored} / ${safeWorldsTotal} WORLDS`;
    this.questionProgressMeter.setAttribute("aria-valuenow", String(safeExplored));
    this.questionProgressMeter.setAttribute("aria-valuemax", String(safeTotal));
    this.questionProgressFill.style.width = `${percent}%`;
    return state;
  }

  showCompanionConversation(turns, { onCompleteLabel = "Continue the exploration", allowSkip = true } = {}) {
    this.conversationTurns = normalizeConversationTurns(turns);
    this.conversationIndex = this.conversationTurns.length ? 0 : -1;
    this.conversationCompleteLabel = String(onCompleteLabel || "Continue the exploration");
    this.companionConversationSkip.hidden = !allowSkip;
    this.companionConversationSuspended = false;
    if (!this.conversationTurns.length) {
      this.hideCompanionConversation();
      return { turn: null, index: -1, total: 0, complete: true };
    }
    this.setInquiryBusy?.(true);
    this.companionConversation.hidden = false;
    this.app.dataset.companionConversation = "true";
    return this.renderCompanionConversationTurn();
  }

  advanceCompanionConversation() {
    const total = this.conversationTurns.length;
    if (!total || this.conversationIndex >= total - 1) {
      this.hideCompanionConversation();
      return { turn: null, index: total, total, complete: true };
    }
    this.conversationIndex += 1;
    return this.renderCompanionConversationTurn();
  }

  renderCompanionConversationTurn() {
    const turn = this.conversationTurns[this.conversationIndex] || null;
    const total = this.conversationTurns.length;
    if (!turn) return { turn: null, index: this.conversationIndex, total, complete: true };
    const companion = findCompanion(turn.speakerId);
    const name = turn.speaker || turn.name || companion?.fullName || companion?.name || "MUSE";
    const portrait = turn.portrait || companion?.portrait || "";
    if (this.companionConversation?.dataset) this.companionConversation.dataset.speakerId = turn.speakerId;
    this.companionConversationSpeaker.textContent = companion ? `${name} · AI INTERPRETIVE LENS` : name;
    this.companionConversationLine.textContent = turn.text;
    this.companionConversationProgress.textContent = `${this.conversationIndex + 1} / ${total}`;
    this.companionConversationNext.textContent = this.conversationIndex === total - 1 ? this.conversationCompleteLabel : "Next voice";
    if (portrait) {
      this.companionConversationPortrait.src = portrait;
      this.companionConversationPortrait.alt = name;
      this.companionConversationPortrait.hidden = false;
    } else {
      this.companionConversationPortrait.removeAttribute("src");
      this.companionConversationPortrait.alt = "";
      this.companionConversationPortrait.hidden = true;
    }
    return { turn, index: this.conversationIndex, total, complete: false };
  }

  hideCompanionConversation() {
    this.companionConversation.hidden = true;
    this.setInquiryBusy?.(false);
    delete this.app.dataset.companionConversation;
    this.conversationTurns = [];
    this.conversationIndex = -1;
    this.companionConversationSuspended = false;
    if (this.companionConversation?.dataset) delete this.companionConversation.dataset.speakerId;
  }

  suspendCompanionConversation() {
    if (this.companionConversation.hidden || !this.conversationTurns.length || this.conversationIndex < 0) return false;
    this.companionConversation.hidden = true;
    this.companionConversationSuspended = true;
    delete this.app.dataset.companionConversation;
    if (this.companionConversation?.dataset) delete this.companionConversation.dataset.speakerId;
    return true;
  }

  resumeCompanionConversation() {
    if (!this.companionConversationSuspended || !this.conversationTurns.length || this.conversationIndex < 0) return false;
    this.companionConversationSuspended = false;
    this.companionConversation.hidden = false;
    this.app.dataset.companionConversation = "true";
    this.setInquiryBusy?.(true);
    return this.renderCompanionConversationTurn();
  }

  showRecap(recap, digest) {
    const count = Array.isArray(digest?.visits) ? digest.visits.length : 0;
    this.presentEntry("exploration-complete", [
      element("p", { className: "eyebrow" }, "04 / EIGHT-CHAPTER THOUGHT SPINE"),
      element("h1", {}, recap?.title || "Your question now carries an eight-chapter record."),
      element("p", { className: "entry-copy" }, recap?.summary || "Your observations now travel together, ready to be challenged rather than graded as isolated answers."),
      evidenceCount(count),
      element("button", { type: "button", className: "entry-primary", disabled: count < EXHIBITION_SPINE.length, dataset: { entryAction: "begin-summoning" } }, "Bring the evidence to the roundtable →")
    ]);
    this.chapterLabel.textContent = "THOUGHT SPINE / 04";
  }

  showSummoning(digest, companions = [], recap = null) {
    const visits = Array.isArray(digest?.visits) ? digest.visits : [];
    const ledger = element("ol", { className: "summoning-ledger", "aria-label": "Evidence carried across eight thought chapters" });
    for (const [index, sceneItem] of EXHIBITION_SPINE.entries()) {
      const visit = visits.find((item) => item.stop_id === sceneItem.id);
      const row = element("li", { className: visit ? "recorded" : "missing" });
      row.style.setProperty("--stagger-delay", `${index * 55}ms`);
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
      element("h1", {}, "The evidence enters the roundtable."),
      element("p", { className: "entry-copy" }, recap?.summary || "The observations you actually made are placed before your chosen AI lenses. Their disagreements must remain visible in the concept that follows."),
      company,
      ledger,
      element("p", { className: "interpretation-note" }, "These are AI interpretive lenses grounded in documented themes, not the historical figures or living artists themselves, and not authentic quotations or endorsements."),
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
      for (const [index, item] of perspectives.entries()) {
        const companion = findCompanion(item.character_id, companions);
        const article = element("article", { className: "roundtable-thread" });
        article.style.setProperty("--stagger-delay", `${index * 55}ms`);
        if (companion) article.append(portraitChip(companion));
        article.append(
          element("h3", {}, `${companion?.fullName || item.name || item.character_id} · AI INTERPRETIVE LENS`),
          element("p", {}, item.stance || item.text || ""),
          element("small", { className: "ai-disclaimer" }, "AI interpretation · not an authentic quotation")
        );
        threads.append(article);
      }
    } else {
      threads.append(element("p", { className: "roundtable-status" }, "The selected AI lenses are tracing your real observations across all eight chapters…"));
    }
    const synthesis = element("section", { className: "roundtable-synthesis" });
    synthesis.append(
      conceptBadge(salon, provider),
      element("h2", {}, title),
      element("blockquote", {}, salon?.synthesis || "The final concept has not returned yet."),
      element("small", {}, "GPT generates the personalized concept. The ninth world gives that concept a spatial form you can enter.")
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
    for (const [index, axis] of PHILOSOPHY_AXES.entries()) {
      const button = element("button", { type: "button", className: "decision-choice", dataset: { decision: axis.id } });
      button.style.setProperty("--stagger-delay", `${index * 55}ms`);
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
      element("p", { className: "entry-copy" }, `${conceptTitle(this.currentSalon)} will be transformed by this choice before it becomes a manifesto. The ninth world remains closed until that new statement is published.`),
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
      element("p", { className: "archive-note" }, "Spatial realization: Fantasy Realm of Shimmering Spheres. Your statement determines how this final world is interpreted.")
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
    delete this.dialogue.dataset.speakerId;
    this.stopTitle.textContent = `${FINAL_SCENE.title} · ${FINAL_SCENE.artist}`;
    this.guideLine.textContent = FINAL_SCENE.question;
    this.inquiryThread.replaceChildren();
    this.answers.replaceChildren();
    const progress = this.questionProgressState || {};
    const finalProgress = this.setQuestionProgress({
      question: progress.question,
      explored: progress.explored || 0,
      total: progress.total || QUESTION_MOMENTS_TOTAL,
      worldsExplored: EXHIBITION_SPINE.length,
      worldsTotal: EXHIBITION_SPINE.length
    });
    const endingCompany = this.endingCompanions.length
      ? this.endingCompanions
      : (salon?.perspectives || []).map((item) => findCompanion(item.character_id || item.speakerId)).filter(Boolean).slice(0, 3);
    const lookback = element("div", { className: "ending-lookback" });
    const company = element("div", { className: "ending-company", "aria-label": "Your chosen AI interpretive lenses" });
    for (const companion of endingCompany) company.append(portraitChip(companion));
    lookback.append(
      company,
      element("p", {}, "Your chosen AI lenses turn toward you as the worlds you crossed settle into one answer."),
      element("strong", {}, `YOUR QUESTION, RECOMPOSED · ${finalProgress.explored} / ${finalProgress.total} WORKS · ${finalProgress.worldsExplored} / ${finalProgress.worldsTotal} THOUGHT CHAPTERS`)
    );
    this.presentEntry("final-answer", [
      element("button", { type: "button", className: "final-dismiss", dataset: { entryAction: "dismiss-final" }, "aria-label": "Close answer plaque" }, "×"),
      element("p", { className: "eyebrow" }, FINAL_SCENE.chapter),
      conceptBadge(this.currentSalon, provider),
      element("h1", {}, title),
      element("p", { className: "final-world-name" }, world?.name || "Fantasy Realm of Shimmering Spheres"),
      element("p", { className: "entry-copy" }, "Your chosen AI lenses turn toward you in the Shimmering Spheres. The works fall away; what remains is the question you carried and the answer this journey allowed you to form."),
      lookback,
      element("blockquote", { className: "return-question" }, FINAL_SCENE.question),
      element("p", { className: "archive-note" }, `Personalized concept: ${source} · Spatial form: 09 / ANSWER`)
    ]);
    this.app.dataset.narrativeStage = "answer";
    this.chapterLabel.textContent = FINAL_SCENE.chapter;
  }

  setSpeaker(companion) {
    if (!companion) return;
    if (this.dialogue?.dataset) {
      const speakerId = String(companion.id || "").trim();
      if (speakerId) this.dialogue.dataset.speakerId = speakerId;
      else delete this.dialogue.dataset.speakerId;
    }
    const isInterpretiveLens = Boolean(findCompanion(companion.id));
    this.speakerName.textContent = isInterpretiveLens ? `${companion.name} · AI LENS` : companion.name;
    if (companion.portrait) {
      this.speakerPortrait.src = companion.portrait;
      this.speakerPortrait.alt = isInterpretiveLens
        ? `${companion.fullName} AI interpretive lens`
        : companion.fullName;
      this.speakerPortrait.hidden = false;
    } else {
      this.speakerPortrait.removeAttribute("src");
      this.speakerPortrait.alt = "";
      this.speakerPortrait.hidden = true;
    }
  }

  setWorldPresentation(sceneItem = {}, ready = true) {
    if (ready) {
      delete this.app.dataset.worldPresentation;
      this.app.style.removeProperty("--world-poster");
      return;
    }
    const source = String(sceneItem.image || sceneItem.thumbnail || "")
      .replace(/[^A-Za-z0-9_./-]/gu, "");
    this.app.dataset.worldPresentation = "poster";
    this.app.style.setProperty("--world-poster", source ? `url("${source}")` : "none");
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
    const progress = this.questionProgressState || {};
    this.setQuestionProgress({
      question: progress.question || plan?.question || plan?.goal,
      explored: progress.explored || 0,
      total: progress.total || QUESTION_MOMENTS_TOTAL,
      worldsExplored: visitedIds.size,
      worldsTotal: EXHIBITION_SPINE.length
    });
    if (currentIndex >= 0) this.chapterLabel.textContent = `THOUGHT CHAPTER · ${String(currentIndex + 1).padStart(2, "0")} / 08`;
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
    if (this.drawer.hidden) this.drawerReturnFocus = document.activeElement;
    this.app.dataset.drawerOpen = type;
    this.dialogue.setAttribute("aria-hidden", "true");
    this.drawer.hidden = false;
    this.drawer.dataset.type = type;
    renderers[type]();
    this.drawer.querySelector('[data-action="close-drawer"]')?.focus();
  }

  closeDrawer() {
    this.drawer.hidden = true;
    delete this.app.dataset.drawerOpen;
    this.dialogue.removeAttribute("aria-hidden");
    if (this.drawerReturnFocus?.isConnected) this.drawerReturnFocus.focus();
    this.drawerReturnFocus = null;
  }

  renderAtlas(context) {
    this.drawerKicker.textContent = "EIGHT-CHAPTER THOUGHT SPINE";
    this.drawerTitle.textContent = "Atlas";
    const visitedIds = normalizeIds(context.visited || context.visitedSceneIds || context.session?.visited || []);
    const answerOpen = Boolean(context.finalWorldEntered);
    const grid = element("div", { className: "drawer-grid atlas-grid" });
    for (const [index, world] of PROCESS_WORLDS.entries()) {
      const sceneItem = EXHIBITION_SPINE.find((item) => item.worldId === world.id);
      const visited = visitedIds.has(sceneItem?.id) || visitedIds.has(world.id);
      const active = context.worldId === world.id;
      const button = element("button", {
        type: "button",
        className: `command atlas-world${active ? " selected" : ""}${visited ? " visited" : ""}`,
        disabled: answerOpen || context.busy,
        dataset: { drawerAction: "world", value: world.id }
      });
      button.append(
        element("img", { className: "world-thumb", src: world.thumb, alt: "" }),
        element("span", { className: "atlas-copy" })
      );
      button.querySelector(".atlas-copy").append(
        element("small", {}, `${sceneItem?.chapter || String(index + 1).padStart(2, "0")} · ${answerOpen ? "ANSWER OPEN" : context.busy ? "LOADING" : visited ? "VISITED" : active ? "CURRENT" : "AVAILABLE"}`),
        element("b", {}, sceneItem?.title || world.name),
        element("span", {}, sceneItem?.artist || world.subtitle)
      );
      grid.append(button);
    }
    this.drawerBody.replaceChildren(
      element("p", { className: "drawer-note" }, answerOpen
        ? "09 / ANSWER is open. The eight thought chapters remain visible here as a locked evidence record."
        : "All eight thought chapters are available as worlds. Move freely, linger with a work, or jump ahead; your question and evidence remain intact."),
      grid
    );
  }

  renderForge(context) {
    this.drawerKicker.textContent = "AUXILIARY WORLD MODEL";
    this.drawerTitle.textContent = "Forge";
    const section = element("div", { className: "drawer-section" });
    section.append(
      element("h3", {}, context.status.world_forge ? "World Labs connected" : "World generation locked"),
      element("p", {}, context.status.world_forge ? "Create an isolated spatial variation. The canonical nine-world journey remains active." : "This server has no generation credentials. The prepared worlds and local journey remain available."),
      textarea("forge-prompt", "A luminous gallery where reflections become pathways", 600),
      input("forge-token", "password", "Admin token"),
      element("button", { type: "button", className: "command", disabled: !context.status.world_forge, dataset: { drawerAction: "forge" } }, "Generate isolated world")
    );
    this.drawerBody.replaceChildren(section);
  }

  renderSalon(context) {
    this.drawerKicker.textContent = "SELECTED AI INTERPRETIVE LENSES";
    this.drawerTitle.textContent = "Salon";
    const body = element("div", { className: "drawer-grid" });
    const perspectives = Array.isArray(context.salon?.perspectives) ? context.salon.perspectives : [];
    if (perspectives.length) {
      body.append(element("h3", {}, conceptTitle(context.salon)));
      for (const item of perspectives) {
        const companion = findCompanion(item.character_id, context.companions);
        const view = element("div", { className: "perspective" });
        if (companion) view.append(portraitChip(companion));
        view.append(
          element("h3", {}, `${companion?.fullName || item.name} · AI INTERPRETIVE LENS`),
          element("p", {}, item.stance || item.text)
        );
        body.append(view);
      }
      body.append(element("blockquote", { className: "drawer-synthesis" }, context.salon.synthesis));
    } else {
      const note = !context.hasLesson
        ? "Begin the eight-chapter route to carry evidence into the Salon."
        : context.canConveneSalon
          ? "All eight observations are ready for the closing roundtable."
          : "The selected AI lenses convene after evidence has been carried across all eight thought chapters.";
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
    const narrationProvider = context.status?.narration
      ? `${String(context.status.narration_provider || "openai").toUpperCase()} · ${String(context.status.narration_model || "gpt-4o-mini-tts").toUpperCase()}`
      : "BROWSER SPEECH FALLBACK";
    const rows = [
      ["Reasoning model", live ? liveProviderName(context.provider) : "GPT contract · curated fallback"],
      ["Narration", narrationProvider],
      ["Scene manifest", SCENE_MANIFEST.version],
      ["Thought spine", "8 freely navigable chapters"],
      ["Final realization", "Shimmering Spheres · world 09"],
      ["Active world", context.worldId],
      ["Selected AI lenses", context.companions.map((item) => item.fullName).join(" · ")],
      ["Guide position", context.metrics?.distance == null ? "Awaiting route" : `${context.metrics.distance.toFixed(2)} m from anchor`],
      ["Guide facing", context.metrics?.facingError == null ? "Awaiting route" : `${context.metrics.facingError.toFixed(1)}° error`],
      ["Runtime", "MUSE embodied inquiry"],
      ["World model", "Nine high-resolution spatial worlds"]
    ];
    const table = element("table", { className: "evidence-table" });
    const tbody = element("tbody");
    for (const [key, value] of rows) {
      const tr = element("tr");
      tr.append(element("th", {}, key), element("td", {}, value));
      tbody.append(tr);
    }
    table.append(tbody);
    this.drawerBody.replaceChildren(table, element("p", { className: "drawer-note" }, "Dialogue opens after the selected AI lens reaches the scene anchor and faces its evidence point. Atlas browsing does not create visit evidence."));
  }

  setWorld(world) {
    this.worldName.textContent = world.name.toUpperCase();
  }

  toast(message) {
    const safeMessage = String(message || "");
    if (this.worldTransition.classList.contains("is-visible")) {
      this.pendingTransitionToast = safeMessage;
      return;
    }
    clearTimeout(this.toastTimer);
    this.toastElement.textContent = safeMessage.length > 240 ? `${safeMessage.slice(0, 237)}…` : safeMessage;
    this.toastElement.hidden = false;
    this.toastTimer = setTimeout(() => { this.toastElement.hidden = true; }, 3000);
  }

  beginWorldTransition(sceneItem = {}, { boot = false } = {}) {
    const token = ++this.worldTransitionToken;
    delete this.dialogue.dataset.speakerId;
    clearTimeout(this.worldTransitionTimer);
    clearTimeout(this.toastTimer);
    this.toastElement.hidden = true;
    this.pendingTransitionToast = "";
    this.worldTransitionStartedAt = performance.now();
    const primaryImage = sceneItem.image || sceneItem.thumbnail || "";
    const fallbackImage = sceneItem.thumbnail && sceneItem.thumbnail !== primaryImage ? sceneItem.thumbnail : "";
    this.worldTransition.classList.remove("is-image-ready");
    this.worldTransitionImageReady = prepareTransitionImage(this.worldTransitionImage, primaryImage, fallbackImage)
      .then((ready) => {
        if (token === this.worldTransitionToken && ready) {
          this.worldTransition.classList.add("is-image-ready");
          this.prefetchNextTransitionImage(sceneItem);
        }
        return ready;
      });
    const order = Number(sceneItem.order);
    this.worldTransitionKicker.textContent = boot
      ? "MUSE · PROLOGUE"
      : Number.isInteger(order) ? `WORLD ${String(order).padStart(2, "0")} / 09` : "ENTERING WORLD";
    this.worldTransitionTitle.textContent = sceneItem.title || sceneItem.name || "MUSE";
    this.worldTransitionStatus.textContent = boot
      ? "AWAKENING THE ARCHIVE"
      : sceneItem.isFinal ? "THE ANSWER TAKES FORM" : "ASSEMBLING THE LIVING WORLD";
    this.worldTransition.hidden = false;
    this.worldTransition.setAttribute("aria-busy", "true");
    this.worldTransition.classList.remove("is-visible", "is-leaving");
    this.setTransitionInert(true);
    void this.worldTransition.offsetWidth;
    this.worldTransition.classList.add("is-visible");
    return token;
  }

  finishWorldTransition(token) {
    if (token !== this.worldTransitionToken) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const minimumHold = reducedMotion ? 80 : 900;
    const fadeDuration = reducedMotion ? 0 : 760;
    clearTimeout(this.worldTransitionTimer);
    Promise.race([
      this.worldTransitionImageReady,
      new Promise((resolve) => window.setTimeout(() => resolve(false), 6_000))
    ]).then(() => {
      if (token !== this.worldTransitionToken) return;
      const elapsed = performance.now() - this.worldTransitionStartedAt;
      const wait = Math.max(0, minimumHold - elapsed);
      this.worldTransitionTimer = window.setTimeout(() => {
        if (token !== this.worldTransitionToken) return;
        this.worldTransition.classList.add("is-leaving");
        this.worldTransition.classList.remove("is-visible");
        this.worldTransition.setAttribute("aria-busy", "false");
        this.setTransitionInert(false);
        const pendingToast = this.pendingTransitionToast;
        this.pendingTransitionToast = "";
        if (pendingToast) this.toast(pendingToast);
        this.worldTransitionTimer = window.setTimeout(() => {
          if (token !== this.worldTransitionToken) return;
          this.worldTransition.hidden = true;
          this.worldTransition.classList.remove("is-leaving", "is-image-ready");
        }, fadeDuration);
      }, wait);
    });
  }

  setTransitionInert(enabled) {
    if (enabled && !this.transitionInertSnapshot) {
      this.transitionInertSnapshot = [...this.app.children]
        .filter((element) => element !== this.worldTransition)
        .map((element) => [element, element.inert]);
      for (const [element] of this.transitionInertSnapshot) element.inert = true;
      return;
    }
    if (!enabled && this.transitionInertSnapshot) {
      for (const [element, previous] of this.transitionInertSnapshot) element.inert = previous;
      this.transitionInertSnapshot = null;
    }
  }

  prefetchNextTransitionImage(sceneItem = {}) {
    const sequence = [...EXHIBITION_SPINE, FINAL_SCENE];
    const currentIndex = sequence.findIndex((item) => item.id === sceneItem.id);
    const source = sequence[currentIndex + 1]?.image;
    if (!source || this.prefetchedTransitionImages.has(source)) return;
    const image = new Image();
    image.decoding = "async";
    image.fetchPriority = "low";
    image.src = source;
    this.prefetchedTransitionImages.set(source, image);
  }

  presentEntry(stage, children) {
    this.hideCompanionConversation();
    this.hideArtworkStory();
    const stageChanged = this.lastPresentedStage !== stage;
    this.entry.dataset.stage = stage;
    this.entry.hidden = false;
    this.entry.replaceChildren(...children);
    const heading = this.entry.querySelector("h1, h2");
    if (heading) heading.id = "entry-title";
    this.dialogue.hidden = true;
    delete this.dialogue.dataset.speakerId;
    this.app.dataset.narrativeStage = stage;
    if (stageChanged) {
      this.entry.classList.remove("stage-reveal");
      void this.entry.offsetWidth;
      this.entry.classList.add("stage-reveal");
      this.lastPresentedStage = stage;
    }
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
  return element("span", { className: `concept-badge ${live ? "live" : fallback ? "fallback" : "pending"}` }, live ? "LIVE GPT CONCEPT" : fallback ? "CURATED FALLBACK CONCEPT" : "CONCEPT RECORD");
}

function liveProviderName(provider = {}) {
  const model = String(provider.model || "GPT-5.6").toUpperCase();
  return `${model} · OPENAI API`;
}

function voiceTranscriptLabel(role, mode, provider = {}) {
  if (role === "user") return "YOU · VOICE";
  if (mode === "realtime") return "MIRA · OPENAI REALTIME";
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
  const chip = element("span", { className: "portrait-chip", ariaLabel: `${companion.fullName} AI interpretive lens` });
  chip.append(element("img", { src: companion.portrait, alt: "" }), element("b", {}, companion.name));
  return chip;
}

function normalizeIds(values) {
  const source = Array.isArray(values) ? values : values instanceof Set ? [...values] : [];
  return new Set(source.map((item) => typeof item === "string" ? item : item?.stop_id || item?.id).filter(Boolean));
}

function normalizeConversationTurns(turns) {
  return (Array.isArray(turns) ? turns : []).map((turn) => {
    if (typeof turn === "string") return { speakerId: "muse", speaker: "MUSE", text: turn.trim(), portrait: "" };
    return {
      speakerId: String(turn?.speakerId || turn?.speaker_id || turn?.companionId || turn?.character_id || "muse"),
      speaker: String(turn?.speaker || turn?.name || turn?.fullName || "").trim(),
      name: String(turn?.name || "").trim(),
      text: String(turn?.text || turn?.line || turn?.content || "").trim(),
      portrait: String(turn?.portrait || "")
    };
  }).filter((turn) => turn.text);
}

function normalizeArtworkStoryCue(cue = {}) {
  const curated = cue.kind === "curated-fact";
  return {
    kind: curated ? "curated-fact" : "imagined-reenactment",
    label: curated ? "CURATED FACT" : "IMAGINED REENACTMENT · NOT HISTORICAL TESTIMONY",
    speaker: String(cue.speakerName || cue.presenter || cue.speaker || (curated ? "MUSE" : "ARTWORK VOICE")).trim(),
    text: String(cue.text || "").trim(),
    sourceUrl: curated ? String(cue.sourceUrl || "").trim() : "",
    sourceLabel: curated ? String(cue.sourceLabel || "").trim() : ""
  };
}

function safeArtworkStorySource(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" && url.hostname === "www.artic.edu" ? url.href : "";
  } catch {
    return "";
  }
}

function artworkStoryStatus(state, story = {}) {
  if (state === "loading") return "PREPARING STORY";
  if (state === "completed") return "STORY COMPLETE";
  if (story.paused === true) return "PAUSED";
  const elapsed = storyTime(story.elapsed);
  const duration = storyTime(story.duration);
  return duration ? `${elapsed} / ${duration}` : "PLAYING";
}

function storyTime(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  const whole = Math.round(seconds);
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

export function preserveStationQuestionDraft(currentKey, nextKey, value, storedValue = "") {
  const draft = currentKey && currentKey === nextKey ? value : storedValue;
  return String(draft || "").slice(0, 600);
}

function positiveCount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

function clampCount(value, total) {
  return Math.min(positiveCount(value), total);
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
  meta.append(element("span", { id: "model-badge" }, "CURATED FALLBACK"), element("span", {}, "8 thought chapters · 3 AI interpretive lenses · 1 personalized answer world"));
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

function richStationChoice(choice) {
  const button = element("button", {
    type: "button",
    className: "station-choice",
    dataset: { answer: choice.value },
    ariaLabel: `${choice.label}. ${choice.stance}. Evidence: ${choice.evidence_prompt}`
  });
  const label = element("strong", { className: "station-choice-label" }, choice.label);
  const stance = element("span", { className: "station-choice-stance" }, choice.stance);
  const evidence = element("small", { className: "station-choice-evidence" }, `Evidence · ${choice.evidence_prompt}`);
  button.append(label, stance, evidence);
  return button;
}

function prepareTransitionImage(image, primarySource, fallbackSource = "") {
  if (!primarySource) return Promise.resolve(false);
  return new Promise((resolve) => {
    let settled = false;
    let source = primarySource;
    let timeout = 0;
    const cleanup = () => {
      image.removeEventListener("load", loaded);
      image.removeEventListener("error", failed);
      window.clearTimeout(timeout);
    };
    const finish = async () => {
      if (settled) return;
      settled = true;
      cleanup();
      try { await image.decode?.(); } catch { /* natural dimensions remain the final readiness check */ }
      resolve(image.complete && image.naturalWidth > 0);
    };
    const loaded = () => { void finish(); };
    const failed = () => {
      if (fallbackSource && source !== fallbackSource) {
        source = fallbackSource;
        image.src = fallbackSource;
        return;
      }
      void finish();
    };
    image.addEventListener("load", loaded);
    image.addEventListener("error", failed);
    timeout = window.setTimeout(() => { void finish(); }, 6_000);
    image.src = source;
    if (image.complete && image.naturalWidth > 0) queueMicrotask(() => { void finish(); });
  });
}

function input(id, type, placeholder, value = "") {
  return element("input", { id, type, placeholder, value, maxLength: type === "password" ? 160 : 80 });
}

function textarea(id, placeholder, maxLength) {
  return element("textarea", { id, placeholder, maxLength, rows: 4 });
}
