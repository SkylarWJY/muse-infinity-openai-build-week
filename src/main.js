import { createFallbackLesson, createFallbackSalon, createFallbackTransformation } from "../shared/contracts.js";
import { EXHIBITION_SPINE, FINAL_SCENE, getExhibitionScene } from "./config/exhibitionSpine.js";
import { getCompanion, getWorld } from "./config/legacyAssets.js";
import { LessonSession } from "./domain/LessonSession.js";
import { JourneySession } from "./domain/JourneySession.js";
import { MuseumEngine } from "./render/MuseumEngine.js";
import { MuseApi } from "./services/api.js";
import { ProfileStore } from "./services/profile.js";
import { NarrationSession, ProceduralSoundscape } from "./services/sound-experience.js";
import { VoiceSession } from "./services/voice.js";
import { AppView } from "./ui/AppView.js";

const api = new MuseApi();
const profileStore = new ProfileStore();
const session = new LessonSession();
const journey = new JourneySession();
const view = new AppView();
const firstScene = EXHIBITION_SPINE[0];
const MIRA_SPEAKER = Object.freeze({ id: "mira", fullName: "Mira", name: "MIRA", portrait: null });
const DECISION_QUESTION = "If art can alter reality, what responsibility should it carry?";
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
  narrationDisclosureShown: false,
  bootPromise: null,
  bootSettled: false
};

const engine = new MuseumEngine(document.getElementById("world"), {
  onGuideState: handleGuideState,
  onMetrics: (metrics) => {
    state.metrics = metrics;
    view.setSync(metrics);
  },
  onFollowChange: (enabled) => document.getElementById("follow-button").setAttribute("aria-pressed", String(enabled)),
  onWorldLayerStatus: ({ message }) => view.toast(message),
  onCompanionStatus: ({ live, companion }) => view.toast(live
    ? `${companion.fullName} · 3D companion ready`
    : `${companion.fullName} · spatial fallback active`)
});
const soundscape = new ProceduralSoundscape();
const narrator = new NarrationSession({
  synthesize: (line, options) => api.narration(line, options),
  onSpeaking: (speaking) => {
    soundscape.setSpeaking("narration", speaking);
    view.setNarrationState(speaking);
  }
});
const voice = new VoiceSession({
  sessionId: api.sessionId,
  context: (question = "") => currentDialogueContext(question),
  dialogue: (context) => api.dialogue(context),
  onState: (value) => setVoiceState(value),
  onTranscript: (event) => view.appendVoiceTranscript(event),
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
  onEnterFinal: enterFinalWorld
});
bindMovementControls();
bindSoundUnlock();
view.showThreshold();
view.setWorld(getWorld(firstScene.worldId));
view.setSpeaker(MIRA_SPEAKER);
view.setSoundState(true, "armed");

state.bootPromise = engine.init()
  .then((world) => {
    state.bootSettled = true;
    if (state.worldId === world.id) view.setWorld(world);
    return world;
  })
  .catch((error) => {
    state.bootSettled = true;
    view.toast(`Initial world unavailable: ${readable(error.message)}`);
    return engine.activeWorld;
  });

window.__MUSE_APP__ = {
  engine,
  session,
  journey,
  state,
  crossThreshold,
  startJourney,
  startLesson,
  answerQuestion,
  askInquiry,
  canOpenDialogue,
  voiceActive: () => voice.active,
  soundscape,
  narrator,
  soundState: () => ({ soundscape: soundscape.snapshot(), narration: narrator.snapshot() }),
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
  } catch (error) {
    view.toast(readable(error.message));
  }
}

function startJourney(question) {
  try {
    journey.setQuestion(question);
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
    view.toast("Invite up to three companions.");
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

    engine.setCompanions(journey.companions).catch(() => view.toast("Selected 3D companions unavailable; spatial stand-ins remain active."));
    let result;
    try {
      result = await api.lesson(journey.question);
    } catch (error) {
      result = {
        data: createFallbackLesson(journey.question),
        live: false,
        model: "curated-demo",
        reason: "server_unavailable"
      };
      view.toast(`GPT connection unavailable; the complete curated route remains active. ${readable(error.message)}`);
    }
    state.provider = providerRecord(result);
    session.start(result.data);
    view.setCurationReady();
    narrate([{ speakerId: "mira", text: result.data.opening }], { replace: true });
  } catch (error) {
    view.toast(`Curation unavailable: ${readable(error.message)}`);
  } finally {
    state.busy = false;
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
  voice.stop();
  narrator.stop();
  soundscape.setStage("world_exploration");
  const worldConfig = getWorld(scene.worldId);
  state.dialogueGeneration += 1;
  state.dialogueBusy = false;
  state.currentSceneId = scene.id;
  state.worldId = scene.worldId;
  view.setSpeaker(sceneSpeaker(scene));
  view.setWorld(worldConfig);
  view.showWalking(scene.id);
  view.renderRoute(session.plan, session.visited, scene.id);

  const transitionToken = view.beginWorldTransition(scene);
  try {
    let world;
    const firstBootInFlight = scene.id === firstScene.id && !state.bootSettled;
    if (firstBootInFlight) await state.bootPromise;
    if (engine.activeWorld.id === scene.worldId && engine.isWorldReady(scene.worldId)) world = engine.activeWorld;
    else world = await engine.setWorld(scene.worldId);
    if (world.id !== scene.worldId) world = await engine.setWorld(scene.worldId);
    if (world.id !== scene.worldId) throw new Error(`scene_activation_interrupted:${scene.id}`);

    state.worldId = world.id;
    view.setWorld(world);
    if (!engine.isWorldReady(scene.worldId)) {
      view.showArchiveRequired(scene);
      throw new Error(`scene_unavailable:${scene.id}`);
    }
    engine.navigateTo(scene.id);
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
  if (event.state !== "asking" || session.phase !== "walking" || event.stopId !== session.currentStopId) return;
  const scene = getExhibitionScene(event.stopId);
  const expectedWorld = scene?.worldId;
  if (engine.activeWorld.id !== expectedWorld) return;
  if (!engine.isWorldReady(expectedWorld)) {
    view.showArchiveRequired(scene);
    view.toast("The complete scene must be live before this question can open.");
    return;
  }
  if (!event.correspondence.synced) {
    view.toast("Scene correspondence is settling.");
    return;
  }
  const stop = session.arrive();
  view.showQuestion(stop);
  view.renderRoute(session.plan, session.visited, session.currentStopId);
  narrate([{
    speakerId: scene?.guideId || "mira",
    text: `${stop.guide_line} ${stop.prompt}`
  }], { replace: true });
}

function answerQuestion(value) {
  recordEvidence(() => session.answer(value));
}

function answerObservation(value) {
  recordEvidence(() => session.answerObservation(value));
}

async function askInquiry(question) {
  const normalizedQuestion = String(question || "").trim();
  if (!normalizedQuestion || state.dialogueBusy) return;
  const sceneId = state.currentSceneId;
  if (!canOpenDialogue()) {
    view.toast("Reach and face the current artwork before opening a conversation.");
    return;
  }

  const generation = ++state.dialogueGeneration;
  state.dialogueBusy = true;
  view.showInquiryPending(normalizedQuestion);
  try {
    const result = await api.dialogue(currentDialogueContext(normalizedQuestion));
    if (!isCurrentInquiry(sceneId, generation)) return;
    view.showInquiryReply(result);
    narrate((result?.perspectives || []).map((item) => ({
      speakerId: item.speakerId || "mira",
      text: item.text
    })));
    const effect = result?.perspectives?.find((item) => item?.effect)?.effect;
    if (effect) engine.applyEffect(sceneId, effect);
  } catch (error) {
    if (isCurrentInquiry(sceneId, generation)) view.showInquiryError(`Dialogue unavailable: ${readable(error.message)}`);
  } finally {
    if (state.dialogueGeneration === generation) state.dialogueBusy = false;
  }
}

function isCurrentInquiry(sceneId, generation) {
  return state.dialogueGeneration === generation
    && state.currentSceneId === sceneId
    && session.currentStopId === sceneId
    && session.phase === "asking";
}

function canOpenDialogue() {
  const sceneId = session.currentStopId;
  const expectedWorld = getExhibitionScene(sceneId)?.worldId;
  if (session.phase !== "asking"
    || !sceneId
    || state.currentSceneId !== sceneId
    || engine.activeWorld.id !== expectedWorld
    || !engine.isWorldReady(expectedWorld)
    || engine.director.state !== "asking") return false;
  return engine.director.correspondence().synced === true;
}

function recordEvidence(resolveAnswer) {
  try {
    const currentId = session.currentStopId;
    const expectedWorld = getExhibitionScene(currentId)?.worldId;
    if (engine.activeWorld.id !== expectedWorld) {
      view.toast("Return to the current process world before recording evidence.");
      return;
    }
    if (!engine.isWorldReady(expectedWorld)) {
      view.showArchiveRequired(getExhibitionScene(currentId));
      view.toast("This fallback view cannot create evidence. Retry the complete scene.");
      return;
    }
    const correspondence = engine.director.correspondence();
    if (engine.director.state !== "asking" || !correspondence.synced) {
      view.toast("Wait for your companion to reach and face the evidence.");
      return;
    }
    const choice = resolveAnswer();
    voice.stop();
    state.dialogueGeneration += 1;
    state.dialogueBusy = false;
    journey.recordSceneVisit(currentId);
    engine.director.listen();
    engine.applyEffect(currentId, choice.effect);
    view.showFeedback(choice);
    narrate([{
      speakerId: getExhibitionScene(currentId)?.guideId || "mira",
      text: choice.feedback
    }], { replace: true });
    view.renderRoute(session.plan, session.visited, null);
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
    const next = session.continue();
    if (next) {
      await activateProcessScene(next.stop_id);
      return;
    }
    const digest = currentDigest();
    const recap = await api.recap(digest).catch(() => ({
      data: {
        title: "Eight worlds are now in the record",
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

function beginSummoning() {
  if (state.busy) return;
  try {
    voice.stop();
    journey.beginSummoning();
    setSoundStage(journey.stage);
    const digest = currentDigest();
    view.showSummoning(digest, selectedCompanionRecords(), state.recap);
    state.salonPromise = requestSalon(digest);
    engine.showSalonCharacters(true).catch(() => view.toast("Companion staging unavailable; their perspectives remain in the record."));
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
    voice.stop();
    const scene = journey.prepareFinalWorld();
    transitionToken = view.beginWorldTransition(scene);
    engine.activeStopId = null;
    await engine.showSalonCharacters(false);
    const world = await engine.setWorld(scene.worldId);
    state.worldId = world.id;
    view.setWorld(world);
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
    view.toast("Opening 09 / ANSWER · high-resolution spatial realization");
    state.dialogueGeneration += 1;
    state.dialogueBusy = false;
    state.currentSceneId = scene.id;
    view.setSpeaker(MIRA_SPEAKER);
    view.enterFinalWorld(world, state.salon);
    narrate([{
      speakerId: "mira",
      text: `${state.salon?.principle || journey.manifesto} ${FINAL_SCENE.question}`,
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
    provider: state.salon ? state.salonProvider : state.provider
  });
}

async function handleDrawerAction(action, button) {
  try {
    if (action === "world") {
      if (state.busy) throw new Error("world_transition_in_progress");
      if (journey.finalWorldEntered) throw new Error("answer_world_is_final");
      const sceneIndex = EXHIBITION_SPINE.findIndex((item) => item.worldId === button.dataset.value);
      const unlockedIndex = Math.min(journey.visitedSceneIds.length, EXHIBITION_SPINE.length - 1);
      if (sceneIndex < 0 || sceneIndex > unlockedIndex) throw new Error("world_not_unlocked");
      state.busy = true;
      voice.stop();
      let world;
      try {
        world = await engine.setWorld(button.dataset.value);
        state.worldId = world.id;
        view.setWorld(world);
      } finally {
        state.busy = false;
      }
      renderDrawer("atlas");
      view.toast(engine.isWorldReady(world.id)
        ? `${world.name} · Atlas comparison only`
        : `${world.name} · scene unavailable; comparison fallback only`);
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
  narrator.setEnabled(enabled);
  const ready = enabled ? await soundscape.unlock() : false;
  view.setSoundState(enabled, enabled ? (ready ? "on" : "unavailable") : "off");
}

async function toggleVoice() {
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
  soundscape.setSpeaking("conversation", !["off", "error"].includes(value));
}

function setSoundStage(stage) {
  narrator.stop();
  soundscape.setStage(stage);
}

function narrate(lines, options = {}) {
  if (voice.active || !soundscape.enabled) return Promise.resolve();
  const playable = (lines || []).filter((line) => String(line?.text || "").trim());
  if (state.status.narration && !state.narrationDisclosureShown && playable.some((line) => line.remote !== false)) {
    state.narrationDisclosureShown = true;
    view.toast("Guide voices are AI-generated interpretations, not the historical figures themselves.");
  }
  return narrator.enqueue(playable, options);
}

function bindSoundUnlock() {
  const unlock = () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    if (!soundscape.enabled) return;
    void soundscape.unlock().then((ready) => {
      const enabled = soundscape.enabled;
      view.setSoundState(enabled, enabled ? (ready ? "on" : "unavailable") : "off");
    });
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

function bindMovementControls() {
  const follow = document.getElementById("follow-button");
  follow.addEventListener("click", () => {
    const enabled = follow.getAttribute("aria-pressed") !== "true";
    engine.setFollow(enabled);
  });
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
  return session.digest({ companion_ids: journey.companions });
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
  const artwork = engine.worldLayer.stopPose(scene.id)?.artwork || null;
  const companions = selectedCompanionRecords().map((companion) => ({
    id: companion.id,
    name: companion.fullName || companion.name,
    lens: companion.lens
  }));
  return {
    question,
    scene_id: scene.id,
    artwork_id: artwork?.id,
    companion_ids: [...state.selectedCompanions],
    recent_evidence: session.visits.map((visit) => ({ ...visit })),
    scene: {
      id: scene.id,
      title: scene.title,
      artist: scene.artist,
      chapter: scene.chapter,
      guide_id: scene.guideId,
      prompt: scene.question,
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

function selectedCompanionRecords() {
  return state.selectedCompanions.map(getCompanion).filter(Boolean);
}

function sceneSpeaker(scene) {
  return getCompanion(scene?.guideId) || MIRA_SPEAKER;
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
