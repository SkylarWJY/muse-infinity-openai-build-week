import { SCENE_MANIFEST, WORLDS } from "../config/scenes.js";

export class AppView {
  constructor() {
    this.entry = byId("entry-panel");
    this.goalForm = byId("goal-form");
    this.goalInput = byId("goal-input");
    this.dialogue = byId("dialogue");
    this.stopTitle = byId("stop-title");
    this.guideLine = byId("guide-line");
    this.guideState = byId("guide-state");
    this.answers = byId("answers");
    this.continueButton = byId("continue-button");
    this.routeList = byId("route-list");
    this.drawer = byId("drawer");
    this.drawerKicker = byId("drawer-kicker");
    this.drawerTitle = byId("drawer-title");
    this.drawerBody = byId("drawer-body");
    this.modelBadge = byId("model-badge");
    this.providerLabel = byId("provider-label");
    this.chapterLabel = byId("chapter-label");
    this.worldName = byId("world-name");
    this.syncState = byId("sync-state");
    this.toastElement = byId("toast");
    this.toastTimer = 0;
  }

  bind({ onStart, onAnswer, onContinue, onDrawer, onAction, onDrawerAction }) {
    this.goalForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const goal = this.goalInput.value.trim();
      if (goal) onStart(goal);
    });
    byId("goal-presets").addEventListener("click", (event) => {
      const button = event.target.closest("[data-goal]");
      if (!button) return;
      this.goalInput.value = button.dataset.goal;
      onStart(button.dataset.goal);
    });
    this.answers.addEventListener("click", (event) => {
      const button = event.target.closest("[data-answer]");
      if (button) onAnswer(button.dataset.answer);
    });
    this.continueButton.addEventListener("click", onContinue);
    document.addEventListener("click", (event) => {
      const drawerButton = event.target.closest("[data-drawer]");
      const actionButton = event.target.closest("[data-action]");
      if (drawerButton) onDrawer(drawerButton.dataset.drawer);
      if (actionButton) onAction(actionButton.dataset.action);
    });
    this.drawerBody.addEventListener("click", (event) => {
      const button = event.target.closest("[data-drawer-action]");
      if (button) onDrawerAction(button.dataset.drawerAction, button);
    });
  }

  setProvider(status) {
    this.modelBadge.textContent = status.openai ? "GPT-5.6 LIVE" : "CURATED DEMO";
    this.providerLabel.textContent = status.openai ? "GPT-5.6 LIVE · RESPONSES API" : "GPT-5.6 READY · CURATED FALLBACK ACTIVE";
  }

  begin(plan, provider) {
    this.entry.hidden = true;
    this.dialogue.hidden = false;
    this.modelBadge.textContent = provider.live ? "GPT-5.6 LIVE" : "CURATED DEMO";
    this.renderRoute(plan, []);
    this.showWalking(plan.start_stop_id);
  }

  showWalking(stopId) {
    const sceneStop = scene(stopId);
    this.guideState.textContent = "WALKING";
    this.stopTitle.textContent = `Approaching ${sceneStop.title}`;
    this.guideLine.textContent = "Mira is moving to the selected evidence point.";
    this.answers.replaceChildren();
    this.continueButton.hidden = true;
  }

  showQuestion(stop) {
    const sceneStop = scene(stop.stop_id);
    this.guideState.textContent = "ASKING";
    this.stopTitle.textContent = `${sceneStop.title} · ${sceneStop.artist}`;
    this.guideLine.textContent = `${stop.guide_line} ${stop.prompt}`;
    this.answers.replaceChildren(...stop.choices.map((choice) => element("button", { type: "button", dataset: { answer: choice.value } }, choice.label)));
    this.continueButton.hidden = true;
  }

  showFeedback(choice) {
    this.guideState.textContent = "REFLECTING";
    this.guideLine.textContent = choice.feedback;
    this.answers.replaceChildren();
    this.continueButton.hidden = false;
  }

  showRecap(recap, digest) {
    this.guideState.textContent = "LEARNING MAP";
    this.stopTitle.textContent = recap.title;
    this.guideLine.textContent = recap.summary;
    this.answers.replaceChildren(...digest.visits.map((visit, index) => {
      const item = element("div", { className: "perspective" });
      item.append(element("b", {}, `${String(index + 1).padStart(2, "0")} · ${scene(visit.stop_id).title}`), element("p", {}, `${visit.answer} · ${visit.detail_id.replaceAll("-", " ")}`));
      return item;
    }));
    this.continueButton.hidden = true;
    this.chapterLabel.textContent = "LEARNING MAP / 03";
  }

  renderRoute(plan, visited, currentId) {
    const dynamicOrder = [...visited, ...(currentId && !visited.includes(currentId) ? [currentId] : []), ...plan.stops.map((item) => item.stop_id).filter((id) => !visited.includes(id) && id !== currentId)];
    this.routeList.replaceChildren(...dynamicOrder.map((id, index) => {
      const li = element("li", { dataset: { route: String(index) }, className: visited.includes(id) ? "done" : id === currentId ? "active" : "" });
      li.append(element("b", {}, String(index + 1).padStart(2, "0")), element("span", {}, visited.includes(id) || id === currentId || index === 0 ? scene(id).title : "Unrevealed"));
      return li;
    }));
    this.chapterLabel.textContent = currentId ? `${scene(currentId).title.toUpperCase()} / ${String(visited.length + 1).padStart(2, "0")}` : "THRESHOLD / 00";
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
    this.drawer.hidden = false;
    this.drawer.dataset.type = type;
    renderers[type]();
  }

  closeDrawer() {
    this.drawer.hidden = true;
  }

  renderAtlas(context) {
    this.drawerKicker.textContent = "WORLD LAYER";
    this.drawerTitle.textContent = "Atlas";
    const grid = element("div", { className: "drawer-grid" });
    for (const world of WORLDS) {
      const button = element("button", { type: "button", className: `command${context.worldId === world.id ? " selected" : ""}`, dataset: { drawerAction: "world", value: world.id } });
      button.append(element("b", {}, world.name), element("p", {}, world.subtitle));
      grid.append(button);
    }
    this.drawerBody.replaceChildren(grid);
  }

  renderForge(context) {
    this.drawerKicker.textContent = "AUXILIARY WORLD MODEL";
    this.drawerTitle.textContent = "Forge";
    const section = element("div", { className: "drawer-section" });
    section.append(
      element("h3", {}, context.status.world_forge ? "World Labs connected" : "World generation locked"),
      element("p", {}, context.status.world_forge ? "Create an isolated spatial variation. The current lesson remains active." : "This server has no generation credentials. The procedural worlds and lesson remain available."),
      textarea("forge-prompt", "A luminous gallery where reflections become pathways", 600),
      input("forge-token", "password", "Admin token"),
      element("button", { type: "button", className: "command", disabled: !context.status.world_forge, dataset: { drawerAction: "forge" } }, "Generate world")
    );
    this.drawerBody.replaceChildren(section);
  }

  renderSalon(context) {
    this.drawerKicker.textContent = "MULTIPLE PERSPECTIVES";
    this.drawerTitle.textContent = "Salon";
    const body = element("div", { className: "drawer-grid" });
    if (context.salon?.perspectives) {
      for (const item of context.salon.perspectives) {
        const view = element("div", { className: "perspective" });
        view.append(element("h3", {}, item.name), element("p", {}, item.stance));
        body.append(view);
      }
    } else {
      body.append(element("p", { className: "drawer-note" }, context.hasLesson ? "Three readings will test the evidence gathered on your route." : "Begin a route to bring session evidence into the Salon."));
    }
    body.append(element("button", { type: "button", className: "command", disabled: !context.hasLesson, dataset: { drawerAction: "salon" } }, "Convene perspectives"));
    this.drawerBody.replaceChildren(body);
  }

  renderRoom(context) {
    this.drawerKicker.textContent = "SHARED PRESENCE";
    this.drawerTitle.textContent = "Room";
    const section = element("div", { className: "drawer-grid" });
    if (context.room?.room_id) {
      section.append(element("h3", {}, `Room ${context.room.room_id}`), element("p", {}, "Your current stop and observations can now travel between four learners."), element("button", { type: "button", className: "command", dataset: { drawerAction: "leave-room" } }, "Return to solo"));
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
    const rows = [
      ["Reasoning model", context.provider.live ? "GPT-5.6 · live" : "GPT-5.6 contract · curated demo"],
      ["Scene manifest", SCENE_MANIFEST.version],
      ["Guide position", context.metrics?.distance == null ? "Awaiting route" : `${context.metrics.distance.toFixed(2)} m from anchor`],
      ["Guide facing", context.metrics?.facingError == null ? "Awaiting route" : `${context.metrics.facingError.toFixed(1)}° error`],
      ["Runtime authorship", "Codex Build Week rebuild"],
      ["World model", context.status.world_forge ? "World Labs available" : "Optional · not configured"]
    ];
    const table = element("table", { className: "evidence-table" });
    const tbody = element("tbody");
    for (const [key, value] of rows) {
      const tr = element("tr");
      tr.append(element("th", {}, key), element("td", {}, value));
      tbody.append(tr);
    }
    table.append(tbody);
    this.drawerBody.replaceChildren(table, element("p", { className: "drawer-note" }, "Dialogue opens only after Mira reaches the declared artwork anchor and faces its evidence point."));
  }

  setWorld(world) {
    this.worldName.textContent = world.name.toUpperCase();
  }

  toast(message) {
    clearTimeout(this.toastTimer);
    this.toastElement.textContent = message;
    this.toastElement.hidden = false;
    this.toastTimer = setTimeout(() => { this.toastElement.hidden = true; }, 3000);
  }
}

function byId(id) {
  const item = document.getElementById(id);
  if (!item) throw new Error(`missing_element:${id}`);
  return item;
}

function scene(id) {
  return SCENE_MANIFEST.stops.find((item) => item.id === id) || { title: id, artist: "" };
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
