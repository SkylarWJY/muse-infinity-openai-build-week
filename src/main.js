import { createFallbackLesson, createFallbackSalon, createFallbackTransformation } from "../shared/contracts.js";
import { EXHIBITION_SPINE, FINAL_SCENE, getExhibitionScene } from "./config/exhibitionSpine.js";
import { getCompanion, getWorld } from "./config/legacyAssets.js";
import { LessonSession } from "./domain/LessonSession.js";
import { JourneySession } from "./domain/JourneySession.js";
import { MuseumEngine } from "./render/MuseumEngine.js";
import { MuseApi } from "./services/api.js";
import { ProfileStore } from "./services/profile.js";
import { VoiceSession } from "./services/voice.js";
import { AppView } from "./ui/AppView.js";

const api = new MuseApi();
const profileStore = new ProfileStore();
const session = new LessonSession();
const journey = new JourneySession();
const view = new AppView();
const firstScene = EXHIBITION_SPINE[0];
const state = {
  status: { openai: false, realtime: false, world_forge: false, model: "gpt-5.6" },
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
    ? `${companion.fullName} · archived 3D companion live`
    : `${companion.fullName} · spatial fallback active`)
});
const voice = new VoiceSession({ sessionId: api.sessionId, onState: (value) => setVoiceState(value) });

view.bind({
  onCrossThreshold: crossThreshold,
  onStart: startJourney,
  onAnswer: answerQuestion,
  onObservation: answerObservation,
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
  onDecision: chooseContradiction,
  onCompleteTransformation: completeTransformation,
  onPublishManifesto: publishManifesto,
  onEnterFinal: enterFinalWorld
});
bindMovementControls();
view.showThreshold();
view.setWorld(getWorld(firstScene.worldId));
view.setSpeaker(getCompanion(journey.companions[0]));

state.bootPromise = engine.init()
  .then((world) => {
    state.bootSettled = true;
    if (state.worldId === world.id) view.setWorld(world);
    return world;
  })
  .catch((error) => {
    state.bootSettled = true;
    view.toast(`Initial archive unavailable: ${readable(error.message)}`);
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
  continueLesson,
  beginSummoning,
  conveneRoundtable,
  enterFinalWorld
};

api.status().then((status) => {
  state.status = status;
  view.setProvider(status);
}).catch(() => view.toast("Server status unavailable; the local nine-world journey remains active."));

function crossThreshold() {
  try {
    journey.crossThreshold();
    view.showLifeQuestion();
  } catch (error) {
    view.toast(readable(error.message));
  }
}

function startJourney(question) {
  try {
    journey.setQuestion(question);
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
    state.selectedCompanions = [...journey.companions];
    const companions = selectedCompanionRecords();
    view.showCuration(journey.question, companions);
    view.setSpeaker(companions[0]);

    engine.setCompanions(journey.companions).catch(() => view.toast("Archived companions unavailable; spatial stand-ins remain active."));
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
    state.provider = { live: result.live, model: result.model, reason: result.reason };
    session.start(result.data);
    view.setCurationReady();
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
  const worldConfig = getWorld(scene.worldId);
  state.currentSceneId = scene.id;
  state.worldId = scene.worldId;
  view.setWorld(worldConfig);
  view.showWalking(scene.id);
  view.renderRoute(session.plan, session.visited, scene.id);

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
    throw new Error(`archive_unavailable:${scene.id}`);
  }
  engine.navigateTo(scene.id);
  postRoom("scene", scene.id);
  return world;
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
    view.toast("The source archive must be live before this question can open.");
    return;
  }
  if (!event.correspondence.synced) {
    view.toast("Scene correspondence is settling.");
    return;
  }
  const stop = session.arrive();
  view.showQuestion(stop);
  view.renderRoute(session.plan, session.visited, session.currentStopId);
}

function answerQuestion(value) {
  recordEvidence(() => session.answer(value));
}

function answerObservation(value) {
  recordEvidence(() => session.answerObservation(value));
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
      view.toast("This fallback view cannot create evidence. Retry the source archive.");
      return;
    }
    const correspondence = engine.director.correspondence();
    if (engine.director.state !== "asking" || !correspondence.synced) {
      view.toast("Wait for your companion to reach and face the evidence.");
      return;
    }
    const choice = resolveAnswer();
    journey.recordSceneVisit(currentId);
    engine.director.listen();
    engine.applyEffect(currentId, choice.effect);
    engine.director.reflect();
    view.showFeedback(choice);
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
    journey.beginSummoning();
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
    const companions = selectedCompanionRecords();
    view.showRoundtable(null, companions, state.salonProvider);
    const result = await (state.salonPromise || requestSalon(currentDigest()));
    state.salon = result.data;
    state.salonProvider = { live: result.live, model: result.model, reason: result.reason };
    await engine.showSalonCharacters(true);
    view.showRoundtable(state.salon, companions, state.salonProvider);
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
    state.salonProvider = { live: result.live, model: result.model, reason: result.reason };
    journey.completeTransformation(state.salon);
    view.showManifesto(state.salon, {
      axis: state.contradiction,
      live: state.salonProvider.live,
      model: state.salonProvider.model
    });
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
  } catch (error) {
    view.toast(readable(error.message));
  }
}

async function enterFinalWorld() {
  if (state.busy) return;
  state.busy = true;
  try {
    const scene = journey.prepareFinalWorld();
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
      view.toast("The archived answer world is unavailable. Your manifesto is preserved; retry when the source asset is ready.");
      return;
    }
    journey.enterFinalWorld();
    view.toast("Opening 09 / ANSWER · archived 8K realization");
    state.currentSceneId = scene.id;
    view.enterFinalWorld(world, state.salon);
    postRoom("scene", FINAL_SCENE.id);
  } catch (error) {
    view.toast(readable(error.message));
  } finally {
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
        : `${world.name} · archive unavailable; comparison fallback only`);
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
}

async function toggleVoice() {
  if (!state.status.realtime) {
    view.toast("OpenAI Realtime is not configured; text inquiry remains active.");
    return;
  }
  const button = document.getElementById("voice-tool");
  if (button.getAttribute("aria-pressed") === "true") voice.stop();
  else {
    try {
      await voice.start();
    } catch (error) {
      voice.stop();
      view.toast(readable(error.message));
    }
  }
}

function setVoiceState(value) {
  const button = document.getElementById("voice-tool");
  button.setAttribute("aria-pressed", value === "live" ? "true" : "false");
  button.title = value === "live" ? "Stop voice" : "Voice";
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

function selectedCompanionRecords() {
  return state.selectedCompanions.map(getCompanion).filter(Boolean);
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
