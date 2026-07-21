import { createFallbackLesson, createFallbackSalon, createFallbackTransformation } from "../shared/contracts.js";
import { EXHIBITION_SPINE, FINAL_SCENE, getExhibitionScene } from "./config/exhibitionSpine.js";
import { getCompanion, getWorld } from "./config/legacyAssets.js";
import { livingArtworkForArtwork } from "./config/livingArtworks.js";
import { LessonSession } from "./domain/LessonSession.js";
import { JourneySession } from "./domain/JourneySession.js";
import { SceneTourSession } from "./domain/SceneTourSession.js";
import { MuseumEngine, resolveActiveArtwork } from "./render/MuseumEngine.js";
import { MuseApi } from "./services/api.js";
import { ProfileStore } from "./services/profile.js";
import { MuseumScore, NarrationSession, ProceduralSoundscape } from "./services/sound-experience.js";
import { VoiceSession } from "./services/voice.js";
import { AppView } from "./ui/AppView.js";

const api = new MuseApi();
const profileStore = new ProfileStore();
const session = new LessonSession();
const journey = new JourneySession();
const sceneTour = new SceneTourSession();
const view = new AppView();
const firstScene = EXHIBITION_SPINE[0];
const MIRA_SPEAKER = Object.freeze({ id: "mira", fullName: "Mira", name: "MIRA", portrait: null });
const DECISION_QUESTION = "If art can alter reality, what responsibility should it carry?";
const artworkVisionQaCandidate = new URLSearchParams(window.location.search).get("artworkVisionQa");
const state = {
  status: { configured: false, openai: false, gateway: "official", realtime: false, world_forge: false, model: "gpt-5.6" },
  provider: { live: false, model: "curated-demo" },
  salonProvider: { live: false, model: "curated-demo" },
  profile: profileStore.load(),
  room: null,
  roomTimer: null,
  salon: null,
  salonPromise: null,
  recap: null,
  worldId: firstScene.worldId,
  currentSceneId: firstScene.id,
  draftCompanions: [...journey.companions],
  selectedCompanions: [...journey.companions],
  contradiction: null,
  metrics: null,
  busy: false,
  dialogueBusy: false,
  dialogueGeneration: 0,
  sceneActivationGeneration: 0,
  sceneStationHistory: [],
  journeyStationEvidence: [],
  stationDialoguePerspectives: [],
  stationDialogueQuestion: "",
  companionReadyPromise: Promise.resolve(),
  narrationDisclosureShown: false,
  curationGeneration: 0,
  bootPromise: null,
  bootSettled: false,
  deferredCompanionConversation: null,
  resumeCompanionConversationAfterStory: false,
  artworkStoryCue: null
};

const engine = new MuseumEngine(document.getElementById("world"), {
  onGuideState: handleGuideState,
  onMetrics: (metrics) => {
    state.metrics = metrics;
    view.setSync(metrics);
  },
  onWorldLayerStatus: ({ message }) => view.toast(message),
  onCompanionStatus: ({ live, companion }) => {
    if (!live) view.toast(`${companion.fullName} AI lens · spatial fallback active`);
  },
  onArtworkStoryStatus: handleArtworkStoryStatus,
  artworkVisionQaCandidate
});
const soundscape = new ProceduralSoundscape({ fullVolume: 0.025, duckedVolume: 0.008 });
const museumScore = new MuseumScore();
const narrator = new NarrationSession({
  synthesize: (line, options) => api.narration(line, options),
  onLineStart: ({ speakerId }) => setNarrationSpeaker(speakerId, true),
  onLineEnd: ({ speakerId }) => setNarrationSpeaker(speakerId, false),
  onSpeaking: (speaking) => {
    soundscape.setSpeaking("narration", speaking);
    museumScore.setSpeaking("narration", speaking);
    view.setNarrationState(speaking);
  }
});
const voice = new VoiceSession({
  sessionId: api.sessionId,
  context: (question = "") => currentDialogueContext(question),
  dialogue: (context) => api.dialogue(context),
  onState: (value) => setVoiceState(value),
  onTranscript: (event) => view.appendVoiceTranscript(event),
  onDialogueResult: captureVoiceDialogue,
  onUtterance: captureVoiceUtterance,
  onAssistantReply: captureVoiceAssistantReply,
  onEvent: (event) => {
    if (String(event?.type || "").endsWith("_voice.error")) view.toast(`Voice unavailable: ${readable(event.error)}`);
  }
});

view.bind({
  onCrossThreshold: crossThreshold,
  onStart: startJourney,
  onAnswer: answerQuestion,
  onObservation: answerObservation,
  onInquiry: askInquiry,
  onContinue: continueLesson,
  onDrawer: openDrawer,
  onAction: handleAction,
  onDrawerAction: handleDrawerAction,
  onCompanionToggle: toggleCompanion,
  onCurate: curateJourney,
  onEnterWalk: enterWalk,
  onRetryScene: retryProcessScene,
  onBeginSummoning: beginSummoning,
  onConveneRoundtable: conveneRoundtable,
  onOpenDecision: openDecision,
  onDecision: chooseContradiction,
  onCompleteTransformation: completeTransformation,
  onPublishManifesto: publishManifesto,
  onEnterFinal: enterFinalWorld,
  onConversationNext: advanceConversation,
  onSkipArtwork: skipCurrentArtwork,
  onArtworkStoryPause: pauseArtworkStory,
  onArtworkStorySkip: skipArtworkStory,
  onArtworkStoryReplay: replayArtworkStory
});
bindMovementControls();
bindSoundUnlock();
view.showThreshold();
view.setWorld(getWorld(firstScene.worldId));
view.setSpeaker(MIRA_SPEAKER);
view.setSoundState(true, "armed");

const bootTransitionToken = view.beginWorldTransition(firstScene, { boot: true });
state.bootPromise = engine.init()
  .then((world) => {
    state.bootSettled = true;
    if (state.worldId === world.id) {
      view.setWorld(world);
      view.setWorldPresentation(firstScene, engine.isWorldReady(world.id));
    }
    return world;
  })
  .catch((error) => {
    state.bootSettled = true;
    view.setWorldPresentation(firstScene, false);
    view.toast(`Initial world unavailable: ${readable(error.message)}`);
    return engine.activeWorld;
  })
  .finally(() => view.finishWorldTransition(bootTransitionToken));

window.__MUSE_APP__ = {
  engine,
  session,
  journey,
  sceneTour,
  state,
  crossThreshold,
  startJourney,
  startLesson,
  answerQuestion,
  askInquiry,
  canOpenDialogue,
  voiceActive: () => voice.active,
  soundscape,
  museumScore,
  narrator,
  artworkStoryState: () => engine.artworkStorySnapshot(),
  artworkVisionState: () => engine.artworkVisionSnapshot(),
  previewArtworkVisionForBrowserQa: (artworkId = artworkVisionQaCandidate) => (
    artworkVisionQaCandidate === "aic-111436"
    && artworkId === artworkVisionQaCandidate
    && engine.triggerArtworkVisionPreview(artworkId)
  ),
  soundState: () => ({ soundscape: soundscape.snapshot(), score: museumScore.snapshot(), narration: narrator.snapshot() }),
  currentDialogueContext,
  continueLesson,
  beginSummoning,
  conveneRoundtable,
  enterFinalWorld
};

api.status().then((status) => {
  state.status = status;
  narrator.setRemoteEnabled(status.narration === true);
  view.setProvider(status);
}).catch(() => view.toast("Server status unavailable; the local nine-world journey remains active."));

function crossThreshold() {
  try {
    journey.crossThreshold();
    setSoundStage(journey.stage);
    view.showLifeQuestion();
    narrate([{
      speakerId: "mira",
      text: "Welcome to MUSE, an immersive museum built around one question. What question are you carrying?"
    }], { replace: true });
  } catch (error) {
    view.toast(readable(error.message));
  }
}

function startJourney(question) {
  try {
    journey.setQuestion(question);
    state.journeyStationEvidence = [];
    syncQuestionProgress();
    setSoundStage(journey.stage);
    state.draftCompanions = [...journey.companions];
    view.showCompany(state.draftCompanions);
  } catch (error) {
    view.toast(readable(error.message));
  }
}

function toggleCompanion(id) {
  const selected = new Set(state.draftCompanions);
  if (selected.has(id)) selected.delete(id);
  else if (selected.size < 3) selected.add(id);
  else {
    view.toast("Choose up to three AI interpretive lenses.");
    return;
  }
  state.draftCompanions = [...selected];
  view.showCompany(state.draftCompanions);
}

async function curateJourney() {
  if (state.busy) return;
  state.busy = true;
  try {
    journey.setCompanions(state.draftCompanions);
    journey.beginCuration();
    setSoundStage(journey.stage);
    state.selectedCompanions = [...journey.companions];
    voice.updateContext();
    const companions = selectedCompanionRecords();
    view.showCuration(journey.question, companions);
    view.setSpeaker(companions[0]);

    state.companionReadyPromise = engine.setCompanions(journey.companions).catch(() => {
      view.toast("Selected AI-lens avatars unavailable; spatial stand-ins remain active.");
      return null;
    });
    const localPlan = createFallbackLesson(journey.question);
    state.provider = { live: false, model: "curated-demo", reason: "instant_local_route" };
    session.start(localPlan);
    view.setCurationReady();
    syncQuestionProgress();
    narrate([{
      speakerId: "mira",
      text: "Your route is ready. GPT-5.6 and your chosen AI lenses will keep refining it while you enter the first chapter."
    }], { replace: true });
    const generation = ++state.curationGeneration;
    void enrichCuratedRoute(generation, journey.question);
  } catch (error) {
    view.toast(`Curation unavailable: ${readable(error.message)}`);
  } finally {
    state.busy = false;
  }
}

async function enrichCuratedRoute(generation, question) {
  try {
    const result = await api.lesson(question);
    if (generation !== state.curationGeneration || journey.question !== question || !session.plan) return;
    session.plan = result.data;
    state.provider = providerRecord(result);
    view.setProvider({ ...state.status, ...state.provider });
    if (journey.stage === "ai_curation") view.toast("GPT-5.6 finished refining the route. You can enter at any time.");
  } catch {
    if (generation === state.curationGeneration && journey.question === question) {
      state.provider = { live: false, model: "curated-demo", reason: "server_unavailable" };
    }
  }
}

async function enterWalk() {
  if (state.busy || journey.stage !== "ai_curation" || !session.plan) return;
  state.busy = true;
  try {
    journey.acceptCuration();
    setSoundStage(journey.stage);
    view.begin(session.plan, state.provider);
    await activateProcessScene(session.currentStopId);
  } catch (error) {
    view.toast(readable(error.message));
  } finally {
    state.busy = false;
  }
}

async function startLesson(goal) {
  if (journey.stage === "life_question") startJourney(goal);
  if (journey.stage === "companion_selection") await curateJourney();
  if (journey.stage === "ai_curation") await enterWalk();
  return session.plan;
}

async function activateProcessScene(sceneId) {
  const scene = getExhibitionScene(sceneId);
  if (!scene || scene.isFinal) throw new Error(`unknown_process_scene:${sceneId}`);
  const activationGeneration = ++state.sceneActivationGeneration;
  sceneTour.reset();
  resetArtworkStoryFlow();
  voice.stop();
  narrator.stop();
  view.hideCompanionConversation?.();
  soundscape.setStage("world_exploration");
  museumScore.setStage("world_exploration");
  const worldConfig = getWorld(scene.worldId);
  state.dialogueGeneration += 1;
  state.dialogueBusy = false;
  state.sceneStationHistory = [];
  state.stationDialoguePerspectives = [];
  state.stationDialogueQuestion = "";
  state.currentSceneId = scene.id;
  state.worldId = scene.worldId;
  view.setSpeaker(sceneSpeaker(scene));
  view.setWorld(worldConfig);
  view.showWalking(scene.id);
  view.renderRoute(session.plan, session.visited, scene.id);
  syncQuestionProgress();

  const transitionToken = view.beginWorldTransition(scene);
  try {
    let world;
    const firstBootInFlight = scene.id === firstScene.id && !state.bootSettled;
    if (firstBootInFlight) await state.bootPromise;
    if (engine.activeWorld.id === scene.worldId && engine.isWorldReady(scene.worldId)) world = engine.activeWorld;
    else world = await engine.setWorld(scene.worldId);
    if (world.id !== scene.worldId) world = await engine.setWorld(scene.worldId);
    if (world.id !== scene.worldId) throw new Error(`scene_activation_interrupted:${scene.id}`);
    if (activationGeneration !== state.sceneActivationGeneration || state.currentSceneId !== scene.id) return world;

    state.worldId = world.id;
    view.setWorld(world);
    view.setWorldPresentation(scene, engine.isWorldReady(scene.worldId));
    if (!engine.isWorldReady(scene.worldId)) {
      view.showArchiveRequired(scene);
      throw new Error(`scene_unavailable:${scene.id}`);
    }
    await state.companionReadyPromise;
    if (activationGeneration !== state.sceneActivationGeneration || state.currentSceneId !== scene.id) return world;
    const stop = session.currentStop;
    if (!stop || stop.stop_id !== scene.id) throw new Error(`scene_plan_mismatch:${scene.id}`);
    const token = sceneTour.start({
      sceneId: scene.id,
      stations: stop.stations.map((station) => station.artwork_id),
      companionIds: state.selectedCompanions,
      requiredStationCount: 3
    });
    sceneTour.arriveScene(token);
    navigateToCurrentStation(stop, token);
    postRoom("scene", scene.id);
    return world;
  } finally {
    view.finishWorldTransition(transitionToken);
  }
}

async function retryProcessScene() {
  if (state.busy || !["walking", "asking"].includes(session.phase) || !session.currentStopId) return;
  state.busy = true;
  try {
    if (session.phase === "asking") session.retryArrival();
    await activateProcessScene(session.currentStopId);
  } catch (error) {
    view.toast(readable(error.message));
  } finally {
    state.busy = false;
  }
}

function handleGuideState(event) {
  view.setGuideState(event.state);
  if (event.state !== "asking"
    || session.phase !== "walking"
    || sceneTour.phase !== "station-walking"
    || event.stopId !== sceneTour.focusedArtworkId
    || event.artworkId !== sceneTour.focusedArtworkId
    || event.speakerId !== sceneTour.leadCompanionId
    || event.companyReady === false
    || event.visitorReady === false) return;
  const scene = getExhibitionScene(sceneTour.sceneId);
  const expectedWorld = scene?.worldId;
  if (engine.activeWorld.id !== expectedWorld) return;
  if (!engine.isWorldReady(expectedWorld)) {
    view.showArchiveRequired(scene);
    view.toast("The complete scene must be live before this question can open.");
    return;
  }
  if (!event.correspondence?.synced) {
    view.toast("Scene correspondence is settling.");
    return;
  }
  const token = sceneTour.token;
  const stop = session.currentStop;
  const station = currentStation(stop);
  const artwork = focusedArtwork();
  sceneTour.arriveStation(token);
  sceneTour.beginDiscussion(token);
  view.setSpeaker(getCompanion(sceneTour.leadCompanionId) || sceneSpeaker(scene));
  view.showStationQuestion(stop, station, artwork, sceneTour.stationIndex, sceneTour.requiredStationCount);
  view.renderRoute(session.plan, session.visited, session.currentStopId);
  narrate([{
    speakerId: sceneTour.leadCompanionId || scene?.guideId || "mira",
    text: station.focus_question
  }], { replace: true });
}

function answerQuestion(value) {
  if (state.dialogueBusy) {
    view.toast("Wait for the AI lenses to finish this reply before recording the station.");
    return;
  }
  if (sceneTour.phase === "discussing") {
    recordStationEvidence({ choiceValue: value });
    return;
  }
  recordSceneReflection(() => session.answer(value));
}

function answerObservation(value) {
  if (state.dialogueBusy) {
    view.toast("Wait for the AI lenses to finish this reply before recording the station.");
    return;
  }
  if (sceneTour.phase === "discussing") {
    recordStationEvidence({ observation: value });
    return;
  }
  recordSceneReflection(() => session.answerObservation(value));
}

async function askInquiry(question) {
  const normalizedQuestion = String(question || "").trim();
  if (!normalizedQuestion || state.dialogueBusy) return;
  const sceneId = state.currentSceneId;
  if (!canOpenDialogue()) {
    view.toast("Reach and face the current artwork before opening a conversation.");
    return;
  }
  if (voice.active) voice.stop();

  const generation = ++state.dialogueGeneration;
  const tourToken = sceneTour.token;
  const stationIndex = sceneTour.stationIndex;
  const artworkId = sceneTour.focusedArtworkId;
  state.dialogueBusy = true;
  view.showInquiryPending(normalizedQuestion);
  try {
    const result = await api.dialogue(currentDialogueContext(normalizedQuestion));
    if (!isCurrentInquiry({ sceneId, generation, tourToken, stationIndex, artworkId })) return;
    state.stationDialogueQuestion = normalizedQuestion;
    state.stationDialoguePerspectives = Array.isArray(result?.perspectives)
      ? result.perspectives.map((item) => ({ ...item }))
      : [];
    view.showInquiryReply({ ...result, perspectives: [] });
    showConversationTurns(result?.perspectives, "Return to the artwork");
    const effect = result?.perspectives?.find((item) => item?.effect)?.effect;
    if (effect) engine.applyEffect(artworkId, effect);
  } catch (error) {
    if (isCurrentInquiry({ sceneId, generation, tourToken, stationIndex, artworkId })) {
      view.showInquiryError(`Dialogue unavailable: ${readable(error.message)}`);
    }
  } finally {
    if (state.dialogueGeneration === generation) {
      state.dialogueBusy = false;
      view.setInquiryBusy(false);
    }
  }
}

function isCurrentInquiry({ sceneId, generation, tourToken, stationIndex, artworkId }) {
  const expectedWorld = getExhibitionScene(sceneId)?.worldId;
  return state.dialogueGeneration === generation
    && state.currentSceneId === sceneId
    && session.currentStopId === sceneId
    && session.phase === "walking"
    && sceneTour.token === tourToken
    && sceneTour.phase === "discussing"
    && sceneTour.stationIndex === stationIndex
    && sceneTour.focusedArtworkId === artworkId
    && engine.activeStopId === artworkId
    && engine.activeWorld.id === expectedWorld
    && engine.isWorldReady(expectedWorld)
    && engine.isVisitorReadyForCompany?.() === true
    && engine.director.state === "asking"
    && engine.director.correspondence().synced === true;
}

function showConversationTurns(items, completeLabel, { allowSkip = true } = {}) {
  const turns = (Array.isArray(items) ? items : []).map((item) => ({
    speakerId: item?.speakerId || item?.speaker_id || item?.companionId || item?.companion_id || item?.character_id || "mira",
    speaker: item?.speaker || item?.name || "",
    text: shortDialogueText(item?.text || item?.stance)
  })).filter((item) => item.text);
  const result = view.showCompanionConversation(turns, {
    onCompleteLabel: completeLabel,
    allowSkip
  });
  if (result?.turn) narrate([result.turn], { replace: true });
  return result;
}

function advanceConversation({ turn, complete } = {}) {
  narrator.stop();
  if (complete || !turn) return;
  view.setSpeaker(getCompanion(turn.speakerId) || MIRA_SPEAKER);
  narrate([turn], { replace: true });
}

function handleArtworkStoryStatus(event = {}) {
  const config = livingArtworkForArtwork(event.artworkId);
  const visionEvent = Boolean(config?.vision && event.artworkId === config.artworkId);
  if (visionEvent && ["loading", "story", "completed"].includes(event.state)) {
    view.app.dataset.artworkVision = event.state;
  } else if (event.type === "state" && ["idle", "ready", "failed", "cleared"].includes(event.state)) {
    delete view.app.dataset.artworkVision;
  }
  let cuePresentation = null;
  if (event.type === "state" && event.state === "story") state.artworkStoryCue = null;
  if (event.type === "cue" && event.cue) {
    cuePresentation = presentArtworkStoryCue(event.cue, config);
    state.artworkStoryCue = cuePresentation;
  }
  view.setArtworkStory({
    ...event,
    title: config?.sources?.[0]?.title || "Artwork story",
    accessibleDescription: config?.accessibleDescription || "",
    cue: cuePresentation?.cue || null
  });
  if (cuePresentation) narrateArtworkStoryCue(cuePresentation);

  const terminal = event.type === "state" && ["completed", "failed", "cleared"].includes(event.state);
  const pendingSkipped = event.type === "control" && event.action === "skip-pending";
  if (terminal || pendingSkipped) {
    if (visionEvent) narrator.stop();
    if (pendingSkipped) delete view.app.dataset.artworkVision;
    if (event.state !== "completed") state.artworkStoryCue = null;
    restoreConversationAfterArtworkStory();
  }
}

function triggerLivingArtworkStory({ scene, station, deferredConversation = null } = {}) {
  const hero = livingArtworkForArtwork(station?.artwork_id);
  const isCurrentHero = hero?.sceneId === scene?.id && hero?.artworkId === station?.artwork_id;
  if (!isCurrentHero) return false;
  state.deferredCompanionConversation = deferredConversation;
  state.resumeCompanionConversationAfterStory = false;
  state.artworkStoryCue = null;
  const triggered = engine.triggerArtworkStory(station.artwork_id);
  if (!triggered) state.deferredCompanionConversation = null;
  return triggered;
}

function presentArtworkStoryCue(cue, config) {
  const curated = cue.kind === "curated-fact";
  const scene = getExhibitionScene(state.currentSceneId);
  const companion = getCompanion(sceneTour.leadCompanionId) || sceneSpeaker(scene) || MIRA_SPEAKER;
  const title = config?.sources?.[0]?.title || "Artwork";
  const source = curated
    ? config?.sources?.find((item) => item.id === cue.sourceId) || config?.sources?.[0]
    : null;
  return {
    speakerId: curated ? companion.id || "mira" : "mira",
    cue: {
      ...cue,
      speakerName: curated
        ? `${companion.fullName || companion.name || "MUSE"} · AI INTERPRETIVE LENS`
        : `${title} · ARTWORK VOICE`,
      sourceUrl: source?.url || "",
      sourceLabel: source ? "Art Institute of Chicago source" : ""
    }
  };
}

function narrateArtworkStoryCue({ cue, speakerId } = {}) {
  if (!cue?.text) return;
  narrate([{ speakerId: speakerId || "mira", text: cue.text }], { replace: true });
}

function pauseArtworkStory(paused) {
  if (paused) narrator.stop();
  const changed = engine.pauseArtworkStory(paused);
  if (changed && !paused && state.artworkStoryCue) narrateArtworkStoryCue(state.artworkStoryCue);
}

function skipArtworkStory() {
  narrator.stop();
  if (!engine.skipArtworkStory()) return;
  const snapshot = engine.artworkStorySnapshot();
  if (snapshot.state === "loading" && snapshot.pendingTrigger === false) {
    view.hideArtworkStory();
    restoreConversationAfterArtworkStory();
  }
}

function replayArtworkStory() {
  const suspended = view.suspendCompanionConversation();
  if (suspended) state.resumeCompanionConversationAfterStory = true;
  state.artworkStoryCue = null;
  narrator.stop();
  if (!engine.replayArtworkStory()) restoreConversationAfterArtworkStory();
}

function restoreConversationAfterArtworkStory() {
  const deferred = state.deferredCompanionConversation;
  state.deferredCompanionConversation = null;
  if (deferred) {
    showDeferredCompanionConversation(deferred);
    return;
  }
  if (!state.resumeCompanionConversationAfterStory) return;
  state.resumeCompanionConversationAfterStory = false;
  const resumed = view.resumeCompanionConversation();
  if (resumed?.turn) narrate([resumed.turn], { replace: true });
}

function showDeferredCompanionConversation({ turns, completeLabel, allowSkip = false } = {}) {
  return showConversationTurns(turns, completeLabel, { allowSkip });
}

function resetArtworkStoryFlow() {
  state.deferredCompanionConversation = null;
  state.resumeCompanionConversationAfterStory = false;
  state.artworkStoryCue = null;
  view.hideArtworkStory();
}

function shortDialogueText(value, limit = 360) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  const boundary = Math.max(text.lastIndexOf(". ", limit), text.lastIndexOf("? ", limit), text.lastIndexOf("! ", limit));
  const sliceEnd = boundary > 160 ? Math.min(limit, boundary + 1) : limit;
  return `${text.slice(0, sliceEnd).trim()}…`;
}

function canOpenDialogue() {
  const sceneId = session.currentStopId;
  const expectedWorld = getExhibitionScene(sceneId)?.worldId;
  if (session.phase !== "walking"
    || sceneTour.phase !== "discussing"
    || !sceneId
    || state.currentSceneId !== sceneId
    || sceneTour.sceneId !== sceneId
    || engine.activeStopId !== sceneTour.focusedArtworkId
    || engine.activeWorld.id !== expectedWorld
    || !engine.isWorldReady(expectedWorld)
    || engine.isVisitorReadyForCompany?.() !== true
    || engine.director.state !== "asking") return false;
  return engine.director.correspondence().synced === true;
}

function recordStationEvidence({ choiceValue = "", observation = "" } = {}) {
  try {
    if (state.dialogueBusy) throw new Error("dialogue_reply_in_progress");
    const currentId = session.currentStopId;
    const scene = getExhibitionScene(currentId);
    const expectedWorld = scene?.worldId;
    if (session.phase !== "walking" || sceneTour.phase !== "discussing" || sceneTour.sceneId !== currentId) return;
    if (engine.activeWorld.id !== expectedWorld) {
      view.toast("Return to the current thought chapter before recording evidence.");
      return;
    }
    if (!engine.isWorldReady(expectedWorld)) {
      view.showArchiveRequired(scene);
      view.toast("This fallback view cannot create evidence. Retry the complete scene.");
      return;
    }
    if (engine.isVisitorReadyForCompany?.() !== true) {
      view.toast("Move back near the current artwork before recording evidence.");
      return;
    }
    const correspondence = engine.director.correspondence();
    if (engine.director.state !== "asking" || !correspondence.synced) {
      view.toast("Wait for the speaking AI lens to reach and face the evidence.");
      return;
    }

    const stop = session.currentStop;
    const station = currentStation(stop);
    const selected = station.choices.find((choice) => choice.value === choiceValue);
    const normalizedObservation = String(observation || "").replace(/\s+/g, " ").trim().slice(0, 240);
    if (!selected && !normalizedObservation) throw new Error("unknown_station_answer");
    const choice = selected || {
      value: "free-observation",
      label: "Visitor observation",
      stance: "Keep this as a firsthand observation, separate from any interpretation the AI lenses propose.",
      evidence_prompt: "Name the exact relation another visitor could inspect, then note what remains uncertain.",
      effect: "focus"
    };
    const visitorObservation = normalizedObservation;
    const visitorInquiry = state.stationDialogueQuestion
      || (selected ? choice.evidence_prompt : "");
    const perspectiveById = new Map(state.stationDialoguePerspectives.map((item) => [
      item.speakerId || item.speaker_id || item.companionId || item.companion_id,
      item
    ]));
    const perspectives = sceneTour.speakerOrder.map((companionId) => {
      const livePerspective = perspectiveById.get(companionId);
      const companion = getCompanion(companionId);
      return {
        companionId,
        text: String(livePerspective?.text
          || companionPerspectiveText({ companion, choice, artwork: focusedArtwork(), station, prior: state.sceneStationHistory.at(-1) })
        ).replace(/\s+/g, " ").trim().slice(0, 800)
      };
    });
    const usedLivePerspectives = state.stationDialoguePerspectives.length > 0;
    const token = sceneTour.token;
    sceneTour.recordStationEvidence({
      visitorObservation,
      visitorQuestion: visitorInquiry,
      perspectives
    }, token);
    const evidenceFactIds = [...new Set(state.stationDialoguePerspectives.flatMap((item) => item.evidence_fact_ids || []))].slice(0, 8);
    const stationRecord = {
      scene_id: currentId,
      scene_order: scene?.order,
      station_order: sceneTour.stationIndex + 1,
      station_id: station.station_id,
      artwork_id: station.artwork_id,
      focus_question: station.focus_question,
      visitor_observation: visitorObservation,
      visitor_question: visitorInquiry,
      choice: {
        value: choice.value,
        label: choice.label,
        stance: choice.stance,
        evidence_prompt: choice.evidence_prompt,
        effect: choice.effect
      },
      evidence_fact_ids: evidenceFactIds,
      perspectives: perspectives.map((item) => ({ speaker_id: item.companionId, text: item.text }))
    };
    state.sceneStationHistory = [...state.sceneStationHistory.filter((record) => record.station_id !== station.station_id), stationRecord].slice(-4);
    state.journeyStationEvidence = [
      ...state.journeyStationEvidence.filter((record) => record.station_id !== station.station_id),
      structuredClone(stationRecord)
    ].slice(-24);
    const deferredConversation = usedLivePerspectives ? null : {
      turns: perspectives,
      completeLabel: sceneTour.metrics.resolved >= sceneTour.requiredStationCount
        ? "Reflect on this world"
        : "Continue to the next artwork",
      allowSkip: false
    };
    voice.stop();
    narrator.stop();
    state.dialogueGeneration += 1;
    state.dialogueBusy = false;
    engine.director.listen();
    engine.applyEffect(station.artwork_id, choice.effect);
    view.showStationFeedback(choice, sceneTour.metrics.resolved >= sceneTour.requiredStationCount, {
      observationRecorded: Boolean(visitorObservation),
      perspectives: []
    });
    const storyTriggered = triggerLivingArtworkStory({ scene, station, deferredConversation });
    if (deferredConversation && !storyTriggered) showDeferredCompanionConversation(deferredConversation);
    syncQuestionProgress();
    postRoom("answer", `${station.station_id}:${choice.label}`);
    postRoom("effect", choice.effect);
  } catch (error) {
    view.toast(readable(error.message));
  }
}

function recordSceneReflection(resolveAnswer) {
  try {
    const currentId = session.currentStopId;
    const expectedWorld = getExhibitionScene(currentId)?.worldId;
    if (engine.activeWorld.id !== expectedWorld) {
      view.toast("Return to the current thought chapter before recording evidence.");
      return;
    }
    if (!engine.isWorldReady(expectedWorld)) {
      view.showArchiveRequired(getExhibitionScene(currentId));
      view.toast("This fallback view cannot create evidence. Retry the complete scene.");
      return;
    }
    if (sceneTour.phase !== "scene-reflection" || session.phase !== "asking") {
      view.toast("Complete all three artwork stations before reflecting on this world.");
      return;
    }
    if (sceneTour.stationEvidence.length < 1) {
      view.toast("Explore at least one artwork before reflecting on this world.");
      return;
    }
    const choice = resolveAnswer();
    sceneTour.completeScene(choice.label, sceneTour.token);
    voice.stop();
    state.dialogueGeneration += 1;
    state.dialogueBusy = false;
    if (!journey.visitedSceneIds.includes(currentId)) journey.recordSceneVisit(currentId);
    engine.director.listen();
    engine.applyEffect(currentId, choice.effect);
    view.showFeedback(choice);
    narrate([{
      speakerId: getExhibitionScene(currentId)?.guideId || "mira",
      text: choice.feedback
    }], { replace: true });
    view.renderRoute(session.plan, session.visited, null);
    syncQuestionProgress();
    postRoom("answer", choice.label);
    postRoom("effect", choice.effect);
  } catch (error) {
    view.toast(readable(error.message));
  }
}

async function continueLesson() {
  if (state.busy) return;
  state.busy = true;
  try {
    if (sceneTour.phase === "station-reflecting") {
      const token = sceneTour.token;
      const stop = session.currentStop;
      advanceStationOrOpenReflection(stop, token);
      return;
    }
    const next = session.continue();
    if (next) {
      await activateProcessScene(next.stop_id);
      return;
    }
    const digest = currentDigest();
    const recap = await api.recap(digest).catch(() => ({
      data: {
        title: "Your question now carries an eight-chapter record",
        summary: "You carried one question through visibility, inheritance, perception, invention, intensity, transformation, identity and infinity."
      }
    }));
    state.recap = recap.data;
    view.showRecap(recap.data, digest);
    narrate([{ speakerId: "mira", text: recap.data?.summary }], { replace: true });
    state.profile = profileStore.record(session.plan.learning_goal, recap.data);
  } catch (error) {
    view.toast(readable(error.message));
  } finally {
    state.busy = false;
  }
}

function skipCurrentArtwork() {
  try {
    if (!["station-walking", "station-ready", "discussing"].includes(sceneTour.phase)) return;
    if (sceneTour.metrics.remaining === 1 && sceneTour.metrics.explored === 0) {
      view.toast("Pause at one artwork before leaving this world; the finale only uses evidence you actually explored.");
      return;
    }
    const stop = session.currentStop;
    const token = sceneTour.token;
    const skippedArtwork = focusedArtwork();
    const skippedId = sceneTour.skipStation(token);
    voice.stop();
    narrator.stop();
    view.hideCompanionConversation?.();
    state.dialogueGeneration += 1;
    state.dialogueBusy = false;
    engine.director.listen();
    advanceStationOrOpenReflection(stop, token);
    syncQuestionProgress();
    view.toast(`${skippedArtwork?.title || skippedId} skipped · no evidence was added.`);
  } catch (error) {
    view.toast(readable(error.message));
  }
}

function advanceStationOrOpenReflection(stop, token) {
  sceneTour.continue(token);
  if (sceneTour.phase === "station-walking") {
    navigateToCurrentStation(stop, token);
    return;
  }
  const scene = getExhibitionScene(stop.stop_id);
  session.arrive();
  view.setSpeaker(sceneSpeaker(scene));
  view.showQuestion(stop);
  view.renderRoute(session.plan, session.visited, session.currentStopId);
  narrate([{
    speakerId: scene?.guideId || "mira",
    text: stop.prompt
  }], { replace: true });
}

function beginSummoning() {
  if (state.busy) return;
  try {
    voice.stop();
    journey.beginSummoning();
    setSoundStage(journey.stage);
    const digest = currentDigest();
    view.showSummoning(digest, selectedCompanionRecords(), state.recap);
    state.salonPromise = requestSalon(digest);
    engine.showSalonCharacters(true).catch(() => view.toast("AI-lens staging unavailable; their perspectives remain in the record."));
  } catch (error) {
    view.toast(readable(error.message));
  }
}

async function conveneRoundtable() {
  if (state.busy || journey.stage !== "summoning") return;
  state.busy = true;
  try {
    journey.openRoundtable();
    setSoundStage(journey.stage);
    const companions = selectedCompanionRecords();
    view.showRoundtable(null, companions, state.salonProvider);
    const result = await (state.salonPromise || requestSalon(currentDigest()));
    state.salon = result.data;
    state.salonProvider = providerRecord(result);
    await engine.showSalonCharacters(true);
    view.showRoundtable(state.salon, companions, state.salonProvider);
    narrate([
      ...(state.salon?.perspectives || []).map((item) => ({
        speakerId: item.character_id || "mira",
        text: item.stance || item.text
      })),
      { speakerId: "mira", text: state.salon?.synthesis }
    ], { replace: true });
  } catch (error) {
    view.toast(readable(error.message));
  } finally {
    state.busy = false;
  }
}

async function requestSalon(digest) {
  try {
    return await api.salon(digest);
  } catch {
    return {
      data: createFallbackSalon(digest),
      live: false,
      model: "curated-demo",
      reason: "server_unavailable"
    };
  }
}

function chooseContradiction(axis) {
  if (state.busy || !state.salon) return;
  try {
    if (journey.stage === "roundtable") journey.completeRoundtable(state.salon);
    journey.chooseContradiction(axis);
    setSoundStage(journey.stage);
    state.contradiction = axis;
    view.showTransformation(axis, state.salon);
  } catch (error) {
    view.toast(readable(error.message));
  }
}

async function completeTransformation() {
  if (state.busy || journey.stage !== "world_transformation" || !state.contradiction) return;
  state.busy = true;
  view.setTransformationBusy(true);
  try {
    const result = await requestTransformation(currentDigest(), state.contradiction, state.salon);
    state.salon = result.data;
    state.salonProvider = providerRecord(result);
    journey.completeTransformation(state.salon);
    setSoundStage(journey.stage);
    view.showManifesto(state.salon, { axis: state.contradiction, ...state.salonProvider });
    narrate([{ speakerId: "mira", text: state.salon?.principle }], { replace: true });
  } catch (error) {
    view.setTransformationBusy(false);
    view.toast(readable(error.message));
  } finally {
    state.busy = false;
  }
}

async function requestTransformation(digest, contradiction, priorConcept) {
  try {
    return await api.transform(digest, contradiction, priorConcept);
  } catch {
    return {
      data: createFallbackTransformation(digest, contradiction),
      live: false,
      model: "curated-demo",
      reason: "server_unavailable"
    };
  }
}

function publishManifesto(value) {
  try {
    const manifesto = journey.publishManifesto(value);
    view.setManifestoPublished(manifesto);
    narrate([{ speakerId: "mira", text: manifesto, remote: false }], { replace: true });
  } catch (error) {
    view.toast(readable(error.message));
  }
}

async function enterFinalWorld() {
  if (state.busy) return;
  state.busy = true;
  let transitionToken = null;
  try {
    resetArtworkStoryFlow();
    voice.stop();
    const scene = journey.prepareFinalWorld();
    transitionToken = view.beginWorldTransition(scene);
    engine.activeStopId = null;
    await engine.showSalonCharacters(false);
    const world = await engine.setWorld(scene.worldId);
    state.worldId = world.id;
    view.setWorld(world);
    view.setWorldPresentation(scene, engine.isWorldReady(scene.worldId));
    if (!engine.isWorldReady(scene.worldId)) {
      view.showManifesto(state.salon, {
        axis: state.contradiction,
        live: state.salonProvider.live,
        model: state.salonProvider.model,
        published: true,
        text: journey.manifesto
      });
      view.toast("The answer world is unavailable. Your manifesto is preserved; retry when the spatial scene is ready.");
      return;
    }
    journey.enterFinalWorld();
    setSoundStage("final_answer");
    try {
      engine.enterFinale?.();
    } catch {
      engine.worldLayer.setArtworksVisible?.(false);
      await engine.showSalonCharacters(true);
    }
    view.toast("09 / ANSWER · your chosen AI lenses have returned to you");
    state.dialogueGeneration += 1;
    state.dialogueBusy = false;
    state.currentSceneId = scene.id;
    view.setSpeaker(MIRA_SPEAKER);
    view.enterFinalWorld(world, state.salon);
    narrate([{
      speakerId: "mira",
      text: `You carried “${journey.question}” through eight thought chapters, and your chosen AI lenses have returned with you. ${state.salon?.principle || journey.manifesto} This journey produced a concept no other path could repeat; the answer remains yours to live with.`,
      remote: Boolean(state.salon?.principle)
    }], { replace: true });
    postRoom("scene", FINAL_SCENE.id);
  } catch (error) {
    view.toast(readable(error.message));
  } finally {
    if (transitionToken !== null) view.finishWorldTransition(transitionToken);
    state.busy = false;
  }
}

function openDrawer(type) {
  const previousType = view.drawer.hidden ? null : view.drawer.dataset.type;
  if (previousType === type) {
    view.closeDrawer();
    return;
  }
  renderDrawer(type);
}

function renderDrawer(type = view.drawer.dataset.type) {
  view.openDrawer(type, {
    ...state,
    companions: selectedCompanionRecords(),
    hasLesson: Boolean(session.plan),
    lessonComplete: session.phase === "complete",
    canConveneSalon: canConveneSalon(),
    finalWorldEntered: journey.finalWorldEntered,
    visited: [...journey.visitedSceneIds],
    visitedSceneIds: [...journey.visitedSceneIds],
    session,
    provider: state.salon ? state.salonProvider : state.provider,
    tourLocked: false
  });
}

async function handleDrawerAction(action, button) {
  try {
    if (action === "world") {
      if (state.busy) throw new Error("world_transition_in_progress");
      if (journey.finalWorldEntered) throw new Error("answer_world_is_final");
      const sceneIndex = EXHIBITION_SPINE.findIndex((item) => item.worldId === button.dataset.value);
      if (journey.stage !== "world_exploration") throw new Error("begin_the_walk_before_using_atlas");
      if (sceneIndex < 0) throw new Error("unknown_process_scene");
      state.busy = true;
      voice.stop();
      narrator.stop();
      view.hideCompanionConversation?.();
      state.dialogueGeneration += 1;
      state.dialogueBusy = false;
      view.setInquiryBusy(false);
      const scene = EXHIBITION_SPINE[sceneIndex];
      view.closeDrawer();
      try {
        session.jumpTo(scene.id);
        await activateProcessScene(scene.id);
      } finally {
        state.busy = false;
      }
    } else if (action === "forge") {
      button.disabled = true;
      const result = await api.forge(valueOf("forge-prompt"), valueOf("forge-token"));
      view.toast(`World operation started: ${result.name || "queued"}`);
    } else if (action === "salon") {
      if (journey.stage !== "summoning") throw new Error("summoning_required_before_roundtable");
      view.closeDrawer();
      await conveneRoundtable();
    } else if (action === "save-profile") {
      state.profile = profileStore.save({ ...state.profile, name: valueOf("profile-name") });
      renderDrawer("profile");
      view.toast("Profile saved on this device");
    } else if (action === "create-room") {
      state.room = await api.createRoom(valueOf("room-name"));
      startRoomPolling();
      renderDrawer("room");
    } else if (action === "join-room") {
      state.room = await api.joinRoom(valueOf("room-code").toUpperCase(), valueOf("room-name"));
      startRoomPolling();
      renderDrawer("room");
    } else if (action === "leave-room") {
      stopRoomPolling();
      state.room = null;
      renderDrawer("room");
    }
  } catch (error) {
    button.disabled = false;
    view.toast(readable(error.message));
  }
}

function handleAction(action) {
  if (action === "close-drawer") view.closeDrawer();
  else if (action === "home") window.location.reload();
  else if (action === "voice") toggleVoice();
  else if (action === "sound") toggleSound();
}

function openDecision() {
  setSoundStage("decision");
  view.showDecision(DECISION_QUESTION, state.salon);
  narrate([{ speakerId: "socrates", text: DECISION_QUESTION }], { replace: true });
}

async function toggleSound() {
  const enabled = soundscape.setEnabled(!soundscape.enabled);
  museumScore.setEnabled(enabled);
  narrator.setEnabled(enabled);
  const ready = enabled
    ? (await Promise.all([soundscape.unlock(), museumScore.unlock()])).some(Boolean)
    : false;
  view.setSoundState(enabled, enabled ? (ready ? "on" : "unavailable") : "off");
}

async function toggleVoice() {
  if (state.dialogueBusy) {
    view.toast("Wait for the current typed reply before opening voice.");
    return;
  }
  if (voice.active) {
    voice.stop();
    return;
  }
  if (!canOpenDialogue()) {
    view.toast("Reach and face the current artwork before opening voice.");
    return;
  }
  try {
    narrator.stop();
    await voice.start({ realtime: state.status.realtime === true });
    if (!state.status.realtime) {
      view.toast(state.status.configured
        ? "Browser voice · GPT-5.6 dialogue via OpenAI"
        : "Browser voice · curated local dialogue");
    }
  } catch (error) {
    voice.stop();
    view.toast(readable(error.message));
  }
}

function setVoiceState(value) {
  view.setVoiceState(value);
  const speaking = !["off", "error"].includes(value);
  soundscape.setSpeaking("conversation", speaking);
  museumScore.setSpeaking("conversation", speaking);
}

function setSoundStage(stage) {
  narrator.stop();
  soundscape.setStage(stage);
  museumScore.setStage(stage);
}

function narrate(lines, options = {}) {
  if (voice.active || !soundscape.enabled) return Promise.resolve();
  const playable = (lines || []).filter((line) => String(line?.text || "").trim());
  if (state.status.narration && !state.narrationDisclosureShown && playable.some((line) => line.remote !== false)) {
    state.narrationDisclosureShown = true;
    view.toast("Named voices are AI-generated interpretive lenses, never the historical figures or living artists themselves.");
  }
  return narrator.enqueue(playable, options);
}

function setNarrationSpeaker(speakerId, speaking) {
  const companion = getCompanion(speakerId) || (speakerId === "mira" ? MIRA_SPEAKER : null);
  if (speaking && companion) view.setSpeaker(companion);
  engine.setCompanySpeaker?.(speakerId, speaking);
}

function bindSoundUnlock() {
  const unlock = () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    if (!soundscape.enabled) return;
    void Promise.all([soundscape.unlock(), museumScore.unlock()]).then((results) => {
      const ready = results.some(Boolean);
      const enabled = soundscape.enabled;
      view.setSoundState(enabled, enabled ? (ready ? "on" : "unavailable") : "off");
    });
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

function bindMovementControls() {
  const joystick = document.getElementById("joystick");
  const knob = joystick.firstElementChild;
  const reset = () => {
    engine.setTouchVector(0, 0);
    knob.style.transform = "translate(0, 0)";
  };
  joystick.addEventListener("pointerdown", (event) => joystick.setPointerCapture(event.pointerId));
  joystick.addEventListener("pointermove", (event) => {
    if (!joystick.hasPointerCapture(event.pointerId)) return;
    const rect = joystick.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (event.clientX - rect.left - rect.width / 2) / 32));
    const y = Math.max(-1, Math.min(1, (event.clientY - rect.top - rect.height / 2) / 32));
    engine.setTouchVector(x, y);
    knob.style.transform = `translate(${x * 24}px, ${y * 24}px)`;
  });
  joystick.addEventListener("pointerup", reset);
  joystick.addEventListener("pointercancel", reset);
}

function startRoomPolling() {
  stopRoomPolling();
  state.room.cursor = 0;
  state.roomTimer = window.setInterval(async () => {
    try {
      const update = await api.roomEvents(state.room.room_id, state.room.cursor);
      state.room.cursor = update.cursor;
      const remote = update.events.filter((event) => event.member_id !== state.room.member_id).at(-1);
      if (remote) view.toast(`Room: ${remote.type} · ${remote.value}`);
    } catch {
      stopRoomPolling();
      state.room = null;
      view.toast("Room ended; continuing solo.");
    }
  }, 1800);
}

function stopRoomPolling() {
  if (state.roomTimer) window.clearInterval(state.roomTimer);
  state.roomTimer = null;
}

function postRoom(type, value) {
  if (!state.room) return;
  api.postRoomEvent(state.room.room_id, state.room.member_id, { type, value }).catch(() => {
    stopRoomPolling();
    state.room = null;
  });
}

function currentDigest() {
  return session.digest({
    companion_ids: journey.companions,
    station_evidence: state.journeyStationEvidence
  });
}

function syncQuestionProgress() {
  const exploredStationIds = new Set(state.journeyStationEvidence.map((record) => record.station_id).filter(Boolean));
  return view.setQuestionProgress({
    question: journey.question,
    explored: exploredStationIds.size,
    total: 24,
    worldsExplored: new Set(journey.visitedSceneIds).size,
    worldsTotal: EXHIBITION_SPINE.length
  });
}

function providerRecord(result = {}) {
  return {
    live: result.live === true,
    model: result.model,
    reason: result.reason
  };
}

function currentDialogueContext(question = "") {
  const scene = getExhibitionScene(state.currentSceneId) || firstScene;
  const artwork = focusedArtwork();
  const speakerOrder = sceneTour.phase === "discussing" ? sceneTour.speakerOrder : state.selectedCompanions;
  const companions = speakerOrder.map(getCompanion).filter(Boolean).map((companion) => ({
    id: companion.id,
    name: companion.fullName || companion.name,
    lens: companion.lens
  }));
  return {
    question,
    carrying_question: journey.question,
    station_id: currentStation(session.currentStop)?.station_id,
    focus_question: currentStation(session.currentStop)?.focus_question,
    scene_id: scene.id,
    artwork_id: artwork?.id,
    companion_ids: [...speakerOrder],
    recent_evidence: session.visits.slice(-8).map((visit) => ({ ...visit })),
    station_history: state.sceneStationHistory.slice(-4).map((record) => structuredClone(record)),
    scene: {
      id: scene.id,
      title: scene.title,
      artist: scene.artist,
      chapter: scene.chapter,
      guide_id: scene.guideId,
      prompt: currentStation(session.currentStop)?.focus_question || scene.question,
      detail: scene.detail?.label || ""
    },
    artwork: artwork ? {
      id: artwork.id,
      title: artwork.title,
      artist: artwork.artist,
      date: artwork.date
    } : {},
    companions
  };
}

function navigateToCurrentStation(stop, token) {
  if (token !== sceneTour.token || sceneTour.phase !== "station-walking") throw new Error("stale_scene_tour_token");
  const station = currentStation(stop);
  const artwork = focusedArtwork();
  if (!station || !artwork || artwork.id !== sceneTour.focusedArtworkId) {
    throw new Error(`artwork_station_unavailable:${sceneTour.focusedArtworkId || "unknown"}`);
  }
  state.dialogueGeneration += 1;
  state.dialogueBusy = false;
  narrator.stop();
  view.setInquiryBusy(false);
  state.stationDialoguePerspectives = [];
  state.stationDialogueQuestion = "";
  view.setSpeaker(getCompanion(sceneTour.leadCompanionId) || sceneSpeaker(getExhibitionScene(stop.stop_id)));
  view.showStationWalking(stop, station, artwork, sceneTour.stationIndex, sceneTour.requiredStationCount);
  engine.navigateCompanyToArtwork(sceneTour.focusedArtworkId, sceneTour.speakerOrder);
}

function currentStation(stop = session.currentStop) {
  if (!stop || !Number.isInteger(sceneTour.stationIndex)) return null;
  return stop.stations?.[sceneTour.stationIndex] || null;
}

function focusedArtwork() {
  const artworkId = sceneTour.focusedArtworkId;
  if (!artworkId) return null;
  const liveArtwork = engine.worldLayer.artworkPose(artworkId)?.artwork;
  return resolveActiveArtwork(artworkId, liveArtwork, engine.companyTour);
}

function selectedCompanionRecords() {
  return state.selectedCompanions.map(getCompanion).filter(Boolean);
}

function sceneSpeaker(scene) {
  return getCompanion(scene?.guideId) || MIRA_SPEAKER;
}

function captureVoiceDialogue({ question, result, mode } = {}) {
  if (mode !== "browser" || state.dialogueBusy || !canOpenDialogue()) return;
  const normalizedQuestion = String(question || "").replace(/\s+/g, " ").trim().slice(0, 600);
  if (!normalizedQuestion) return;
  state.stationDialogueQuestion = normalizedQuestion;
  state.stationDialoguePerspectives = Array.isArray(result?.perspectives)
    ? result.perspectives.map((item) => ({ ...item }))
    : [];
  const effect = state.stationDialoguePerspectives.find((item) => item?.effect)?.effect;
  if (effect) engine.applyEffect(sceneTour.focusedArtworkId, effect);
}

function captureVoiceUtterance({ text, mode } = {}) {
  if (!["browser", "realtime"].includes(mode) || state.dialogueBusy || !canOpenDialogue()) return;
  const normalized = String(text || "").replace(/\s+/g, " ").trim().slice(0, 600);
  if (normalized) state.stationDialogueQuestion = normalized;
}

function captureVoiceAssistantReply({ text, mode } = {}) {
  if (mode !== "realtime" || state.dialogueBusy || !canOpenDialogue()) return;
  const normalized = String(text || "").replace(/\s+/g, " ").trim().slice(0, 800);
  if (!normalized) return;
  state.stationDialoguePerspectives = [{
    speakerId: sceneTour.leadCompanionId,
    text: normalized,
    evidence_fact_ids: []
  }];
}

function companionPerspectiveText({ companion, choice, artwork, station, prior } = {}) {
  const id = companion?.id || "companion";
  const name = companion?.fullName || companion?.name || id;
  const work = artwork?.title || "this work";
  const maker = artwork?.artist ? ` by ${artwork.artist}` : "";
  const date = artwork?.date ? ` (${artwork.date})` : "";
  const methods = {
    monet: "compare what stays with what changes as light, distance, or attention shifts",
    "van-gogh": "test where color, pressure, and rhythm support your feeling",
    socrates: "narrow the claim, then name the evidence that could prove it wrong",
    frida: "separate bodily experience and private symbolism from what others can verify",
    picasso: "hold two incompatible viewpoints together and notice what neither can contain",
    freud: "notice which memory or desire may be speaking without treating it as fact",
    "qi-baishi": "watch the economy of the mark and the active space around it",
    "yayoi-kusama": "track when repetition changes your sense of boundary or self"
  };
  const priorLink = prior?.visitor_observation || prior?.visitor_question;
  return `${name}: For “${journey.question},” I would ${methods[id] || methods.socrates}. In ${work}${maker}${date}, your stance is “${choice.stance}”${priorLink ? `; compare it with your earlier thought, “${priorLink}.”` : "."} Now test this: ${choice.evidence_prompt}`;
}

function hasActiveSceneTour() {
  return !["idle", "complete"].includes(sceneTour.phase);
}

function canConveneSalon() {
  return session.phase === "complete" && ["summoning", "roundtable", "decision", "world_transformation", "manifesto"].includes(journey.stage);
}

function valueOf(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function readable(value) {
  return String(value || "service unavailable").replaceAll("_", " ");
}
