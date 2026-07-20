import { LessonSession } from "./domain/LessonSession.js";
import { MuseumEngine } from "./render/MuseumEngine.js";
import { MuseApi } from "./services/api.js";
import { ProfileStore } from "./services/profile.js";
import { VoiceSession } from "./services/voice.js";
import { AppView } from "./ui/AppView.js";

const api = new MuseApi();
const profileStore = new ProfileStore();
const session = new LessonSession();
const view = new AppView();
const state = {
  status: { openai: false, realtime: false, world_forge: false, model: "gpt-5.6" },
  provider: { live: false, model: "curated-demo" },
  profile: profileStore.load(),
  room: null,
  roomTimer: null,
  salon: null,
  worldId: "gallery",
  metrics: null,
  busy: false
};

const engine = new MuseumEngine(document.getElementById("world"), {
  onGuideState: handleGuideState,
  onMetrics: (metrics) => { state.metrics = metrics; view.setSync(metrics); },
  onFollowChange: (enabled) => document.getElementById("follow-button").setAttribute("aria-pressed", String(enabled)),
  onWorldLayerStatus: ({ message }) => view.toast(message)
});
const voice = new VoiceSession({ sessionId: api.sessionId, onState: (value) => setVoiceState(value) });

view.bind({
  onStart: startLesson,
  onAnswer: answerQuestion,
  onContinue: continueLesson,
  onDrawer: openDrawer,
  onAction: handleAction,
  onDrawerAction: handleDrawerAction
});
bindMovementControls();
view.setWorld(await engine.init());
window.__MUSE_APP__ = { engine, session, state, startLesson, answerQuestion, continueLesson };

api.status().then((status) => {
  state.status = status;
  view.setProvider(status);
}).catch(() => view.toast("Server status unavailable; the local world remains active."));

async function startLesson(goal) {
  if (state.busy) return;
  state.busy = true;
  view.toast("Preparing a route for your question…");
  try {
    const result = await api.lesson(goal);
    state.provider = { live: result.live, model: result.model };
    const first = session.start(result.data);
    view.begin(session.plan, state.provider);
    view.renderRoute(session.plan, session.visited, first.stop_id);
    engine.navigateTo(first.stop_id);
    postRoom("stop", first.stop_id);
  } catch (error) {
    view.toast(`Route unavailable: ${readable(error.message)}`);
  } finally {
    state.busy = false;
  }
}

function handleGuideState(event) {
  view.setGuideState(event.state);
  if (event.state !== "asking" || session.phase !== "walking" || event.stopId !== session.currentStopId) return;
  if (!event.correspondence.synced) {
    view.toast("Scene correspondence is settling.");
    return;
  }
  const stop = session.arrive();
  view.showQuestion(stop);
  view.renderRoute(session.plan, session.visited, session.currentStopId);
}

function answerQuestion(value) {
  try {
    const currentId = session.currentStopId;
    const choice = session.answer(value);
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
  try {
    const next = session.continue();
    if (next) {
      view.showWalking(next.stop_id);
      view.renderRoute(session.plan, session.visited, next.stop_id);
      engine.navigateTo(next.stop_id);
      postRoom("stop", next.stop_id);
      return;
    }
    const digest = session.digest();
    const recap = await api.recap(digest).catch(() => ({ data: { title: "Your learning map", summary: "You turned three observations into a route through visible evidence." } }));
    view.showRecap(recap.data, digest);
    state.profile = profileStore.record(session.plan.learning_goal, recap.data);
  } catch (error) {
    view.toast(readable(error.message));
  }
}

function openDrawer(type) {
  if (!view.drawer.hidden && view.drawer.dataset.type === type) {
    view.closeDrawer();
    if (type === "salon") engine.showSalonCharacters(false);
    return;
  }
  if (type === "salon") engine.showSalonCharacters(true);
  renderDrawer(type);
}

function renderDrawer(type = view.drawer.dataset.type) {
  view.openDrawer(type, {
    ...state,
    hasLesson: Boolean(session.plan),
    provider: state.provider
  });
}

async function handleDrawerAction(action, button) {
  try {
    if (action === "world") {
      const world = await engine.setWorld(button.dataset.value);
      state.worldId = world.id;
      view.setWorld(world);
      renderDrawer("atlas");
      view.toast(`${world.name} active`);
    } else if (action === "forge") {
      button.disabled = true;
      const result = await api.forge(valueOf("forge-prompt"), valueOf("forge-token"));
      view.toast(`World operation started: ${result.name || "queued"}`);
    } else if (action === "salon") {
      button.disabled = true;
      const result = await api.salon(session.digest());
      state.salon = result.data;
      engine.showSalonCharacters(true);
      renderDrawer("salon");
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
  if (action === "close-drawer") {
    if (view.drawer.dataset.type === "salon") engine.showSalonCharacters(false);
    view.closeDrawer();
  } else if (action === "home") {
    window.location.reload();
  } else if (action === "voice") {
    toggleVoice();
  }
}

async function toggleVoice() {
  if (!state.status.realtime) {
    view.toast("OpenAI Realtime is not configured; text inquiry remains active.");
    return;
  }
  const button = document.getElementById("voice-tool");
  if (button.getAttribute("aria-pressed") === "true") voice.stop();
  else {
    try { await voice.start(); } catch (error) { voice.stop(); view.toast(readable(error.message)); }
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
  const reset = () => { engine.setTouchVector(0, 0); knob.style.transform = "translate(0, 0)"; };
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

function valueOf(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function readable(value) {
  return String(value || "service unavailable").replaceAll("_", " ");
}
