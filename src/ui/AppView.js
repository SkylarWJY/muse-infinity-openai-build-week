import { COMPANIONS } from "../config/legacyAssets.js";
import { SCENE_MANIFEST, WORLDS } from "../config/scenes.js";

export class AppView {
  constructor() {
    this.app = byId("app");
    this.entry = byId("entry-panel");
    this.goalForm = byId("goal-form");
    this.goalInput = byId("goal-input");
    this.dialogue = byId("dialogue");
    this.stopTitle = byId("stop-title");
    this.guideLine = byId("guide-line");
    this.guideState = byId("guide-state");
    this.speakerName = byId("speaker-name");
    this.speakerPortrait = byId("speaker-portrait");
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

  bind({ onStart, onAnswer, onContinue, onDrawer, onAction, onDrawerAction, onCompanionToggle, onCurate, onEnterWalk, onRewrite, onEnterFinal }) {
    this.goalForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const goal = this.goalInput.value.trim();
      if (goal) setTimeout(() => onStart(goal), 80);
    });
    byId("goal-presets").addEventListener("click", (event) => {
      const button = event.target.closest("[data-goal]");
      if (!button) return;
      this.goalInput.value = button.dataset.goal;
      setTimeout(() => onStart(button.dataset.goal), 80);
    });
    this.answers.addEventListener("click", (event) => {
      const button = event.target.closest("[data-answer]");
      if (button) onAnswer(button.dataset.answer);
    });
    this.continueButton.addEventListener("click", onContinue);
    this.entry.addEventListener("click", (event) => {
      const companion = event.target.closest("[data-companion]");
      const action = event.target.closest("[data-entry-action]");
      if (companion) {
        setTimeout(() => onCompanionToggle(companion.dataset.companion), 80);
        return;
      }
      if (!action) return;
      if (action.dataset.entryAction === "curate") setTimeout(onCurate, 80);
      else if (action.dataset.entryAction === "enter-walk") setTimeout(onEnterWalk, 80);
      else if (action.dataset.entryAction === "rewrite") setTimeout(() => onRewrite(action.dataset.world), 80);
      else if (action.dataset.entryAction === "enter-final") setTimeout(onEnterFinal, 80);
    });
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

  showCompany(selectedIds) {
    const selected = new Set(selectedIds);
    const intro = element("div", { className: "entry-intro" });
    intro.append(
      element("p", { className: "eyebrow" }, "02 / CHOOSE YOUR COMPANY"),
      element("h1", {}, "Who should walk the question with you?"),
      element("p", { className: "entry-copy" }, "Invite up to three interpretive companions from the original MUSE collection. Their archived 3D forms will move through the world with you.")
    );
    const grid = element("div", { className: "companion-grid" });
    for (const companion of COMPANIONS) {
      const active = selected.has(companion.id);
      const button = element("button", {
        type: "button",
        className: `companion-choice${active ? " selected" : ""}`,
        dataset: { companion: companion.id },
        ariaPressed: String(active),
        ariaLabel: `${active ? "Remove" : "Invite"} ${companion.fullName}`
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
    this.entry.dataset.stage = "company";
    this.entry.hidden = false;
    this.entry.replaceChildren(intro, grid, footer);
    this.chapterLabel.textContent = "COMPANY / 02";
  }

  showCuration(question, companions) {
    const route = element("ol", { className: "curation-route", ariaLabel: "Curated exhibition route" });
    for (const [index, stop] of SCENE_MANIFEST.stops.entries()) {
      const item = element("li");
      item.append(element("b", {}, String(index + 1).padStart(2, "0")), element("span", {}, stop.title), element("small", {}, stop.artist));
      route.append(item);
    }
    const company = element("div", { className: "curation-company" });
    for (const companion of companions) company.append(portraitChip(companion));
    const action = element("button", { type: "button", className: "entry-primary", disabled: true, dataset: { entryAction: "enter-walk" } }, "Preparing the company…");
    this.entry.dataset.stage = "curation";
    this.entry.hidden = false;
    this.entry.replaceChildren(
      element("p", { className: "eyebrow" }, "03 / AI THEME CURATION"),
      element("h1", {}, "A question becomes a route."),
      element("blockquote", { className: "curation-question" }, question),
      company,
      route,
      action
    );
    this.chapterLabel.textContent = "AI CURATION / 03";
  }

  setCurationReady() {
    const action = this.entry.querySelector("[data-entry-action='enter-walk']");
    if (!action) return;
    action.disabled = false;
    action.textContent = "Enter the exhibition →";
  }

  showWalking(stopId) {
    const sceneStop = scene(stopId);
    this.guideState.textContent = "WALKING";
    this.stopTitle.textContent = `Approaching ${sceneStop.title}`;
    this.guideLine.textContent = `${this.speakerName.textContent} is moving to the selected evidence point.`;
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
    this.continueButton.textContent = "Convene your Salon →";
    this.continueButton.hidden = false;
    this.chapterLabel.textContent = "SUMMONING / 05";
  }

  showRewrite(worlds, salon, question) {
    const grid = element("div", { className: "rewrite-grid" });
    for (const world of worlds) {
      const button = element("button", { type: "button", className: "rewrite-choice", dataset: { entryAction: "rewrite", world: world.id } });
      button.append(element("img", { src: world.thumb, alt: "" }), element("b", {}, world.name), element("small", {}, world.subtitle));
      grid.append(button);
    }
    const synthesis = salon?.perspectives?.[0]?.stance || "Your observations are ready to become a place.";
    this.entry.dataset.stage = "rewrite";
    this.entry.hidden = false;
    this.entry.replaceChildren(
      element("p", { className: "eyebrow" }, "08 / WORLD REWRITTEN"),
      element("h1", {}, "Which world should your answer become?"),
      element("p", { className: "entry-copy" }, question),
      element("blockquote", { className: "curation-question" }, synthesis),
      grid
    );
    this.chapterLabel.textContent = "WORLD REWRITTEN / 08";
  }

  showManifesto(world, salon) {
    const synthesis = (salon?.perspectives || []).map((item) => item.stance).join(" ");
    this.entry.dataset.stage = "manifesto";
    this.entry.hidden = false;
    this.entry.replaceChildren(
      element("p", { className: "eyebrow" }, "09 / YOUR IMPOSSIBLE WORLD"),
      element("h1", {}, world.name),
      element("p", { className: "manifesto-copy" }, synthesis || "Attention changed the route; the route has now changed the world."),
      element("button", { type: "button", className: "entry-primary", dataset: { entryAction: "enter-final" } }, "Walk inside your answer →")
    );
    this.chapterLabel.textContent = "MANIFESTO / 09";
  }

  enterFinalWorld(world) {
    this.entry.hidden = true;
    this.dialogue.hidden = false;
    this.guideState.textContent = "WORLD LIVE";
    this.stopTitle.textContent = world.name;
    this.guideLine.textContent = "The archived scene is now the consequence of your walk. Move freely, or open the Atlas to compare its spatial logic.";
    this.answers.replaceChildren();
    this.continueButton.hidden = true;
  }

  setSpeaker(companion) {
    this.speakerName.textContent = companion.name;
    this.speakerPortrait.src = companion.portrait;
    this.speakerPortrait.alt = companion.fullName;
    this.speakerPortrait.hidden = false;
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
    this.drawerKicker.textContent = "WORLD LAYER";
    this.drawerTitle.textContent = "Atlas";
    const grid = element("div", { className: "drawer-grid" });
    for (const world of WORLDS) {
      const button = element("button", { type: "button", className: `command${context.worldId === world.id ? " selected" : ""}`, dataset: { drawerAction: "world", value: world.id } });
      button.append(element("img", { className: "world-thumb", src: world.thumb, alt: "" }), element("b", {}, world.name), element("p", {}, world.subtitle));
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
      element("p", {}, context.status.world_forge ? "Create an isolated spatial variation. The current lesson remains active." : "This server has no generation credentials. The archived worlds and local lesson remain available."),
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
      for (const [index, item] of context.salon.perspectives.entries()) {
        const companion = context.companions[index];
        const view = element("div", { className: "perspective" });
        if (companion) view.append(portraitChip(companion));
        view.append(element("h3", {}, companion?.fullName || item.name), element("p", {}, item.stance));
        body.append(view);
      }
    } else {
      const note = !context.hasLesson
        ? "Begin a route to bring session evidence into the Salon."
        : context.canConveneSalon
          ? "Three readings will test the evidence gathered on your route."
          : "Complete the three-stop route before convening the Salon.";
      body.append(element("p", { className: "drawer-note" }, note));
    }
    if (context.salon?.perspectives && context.canConveneSalon) {
      body.append(element("button", { type: "button", className: "command rewrite-command", dataset: { drawerAction: "open-rewrite" } }, "Rewrite the world →"));
    } else if (!context.salon?.perspectives) {
      body.append(element("button", { type: "button", className: "command", disabled: !context.canConveneSalon, dataset: { drawerAction: "salon" } }, "Convene perspectives"));
    }
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
      ["Active archived world", context.worldId],
      ["Archived companions", context.companions.map((item) => item.fullName).join(" · ")],
      ["Guide position", context.metrics?.distance == null ? "Awaiting route" : `${context.metrics.distance.toFixed(2)} m from anchor`],
      ["Guide facing", context.metrics?.facingError == null ? "Awaiting route" : `${context.metrics.facingError.toFixed(1)}° error`],
      ["Runtime authorship", "Codex Build Week rebuild"],
      ["World model", "muse-infinity World Labs archives · local deployable assets"]
    ];
    const table = element("table", { className: "evidence-table" });
    const tbody = element("tbody");
    for (const [key, value] of rows) {
      const tr = element("tr");
      tr.append(element("th", {}, key), element("td", {}, value));
      tbody.append(tr);
    }
    table.append(tbody);
    this.drawerBody.replaceChildren(table, element("p", { className: "drawer-note" }, "Dialogue opens only after the selected archived companion reaches the declared artwork anchor and faces its evidence point."));
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

function portraitChip(companion) {
  const chip = element("span", { className: "portrait-chip" });
  chip.append(element("img", { src: companion.portrait, alt: "" }), element("b", {}, companion.name));
  return chip;
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
