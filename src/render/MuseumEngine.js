import * as THREE from "three";
import { getCompanion } from "../config/legacyAssets.js";
import { GuideDirector } from "./GuideDirector.js";
import { ArchivedAvatar } from "./ArchivedAvatar.js";
import { LearnerAvatar } from "./LearnerAvatar.js";
import { ProceduralAvatar } from "./ProceduralAvatar.js";
import { AmbientLife } from "./AmbientLife.js";
import { WorldLayer, currentSceneQuality } from "./WorldLayer.js";
import { WORLDS, getSceneStop } from "../config/scenes.js";

const LEARNER_WALK_SPEED = 1.33;
const LEARNER_FOLLOW_CATCHUP_SPEED = 1.6;
const COMPANY_LISTENER_SPREAD = 1.05;
const COMPANY_LISTENER_RETREAT = 0.35;
const COMPANY_VISITOR_READY_RADIUS = 2.8;
const COMPANY_STAGE_MIN_SEPARATION = 0.72;
const COMPANY_STAGE_PATH_SPACING = 0.2;
const MAX_COMPANY_STAGE_CANDIDATES = 36;
const COMPANY_STAGE_SIDE_OFFSETS = Object.freeze([-1.65, -1.35, -1.05, -0.8, -0.55, -0.3, 0, 0.3, 0.55, 0.8, 1.05, 1.35, 1.65]);
const COMPANY_STAGE_RETREATS = Object.freeze([0, 0.35, 0.7, 1.05, 1.4, 1.75, 2.1]);
const ARCHIVED_ACTOR_LOAD = Symbol("archived-actor-load");

const PARTY_FORMATION_SLOTS = Object.freeze([
  Object.freeze({ side: -0.9, behind: 0.65 }),
  Object.freeze({ side: 0.9, behind: 0.65 })
]);
const PARTY_BOUNDS_MARGIN = 0.35;
const MAX_PARTY_GROUND_DELTA = 0.35;
const PLAYER_COLLISION_RADIUS = 0.25;
const PARTY_MIN_SEPARATION = 0.65;
const PARTY_MIN_PLAYER_DISTANCE = 0.4;
const PARTY_FOOTPRINT_RADIUS = 0.18;
const PARTY_FOOTPRINT_VARIATION = 0.22;
const PARTY_RADIUS_FACTORS = Object.freeze([1, 0.82, 0.64, 0.46, 0.34]);
const MAX_SUPPORTED_PARTY_CANDIDATES = 6;
const PARTY_ANGLE_OFFSETS = Object.freeze([
  0,
  Math.PI / 8, -Math.PI / 8,
  Math.PI / 4, -Math.PI / 4,
  3 * Math.PI / 8, -3 * Math.PI / 8,
  Math.PI / 2, -Math.PI / 2,
  2 * Math.PI / 3, -2 * Math.PI / 3,
  5 * Math.PI / 6, -5 * Math.PI / 6,
  Math.PI
]);
const PARTY_PATH_FRACTIONS = Object.freeze([0.2, 0.4, 0.6, 0.8]);
const NOMINAL_PARTY_PATTERNS = Object.freeze([
  Object.freeze({ factor: 1, angleOffset: 0 }),
  Object.freeze({ factor: 1, angleOffset: 0 })
]);
const INITIAL_PARTY_PATTERN_OVERRIDES = Object.freeze({
  "sunset-frames": Object.freeze([
    Object.freeze({ factor: 0.64, angleOffset: 0 }),
    Object.freeze({ factor: 1, angleOffset: 0 })
  ]),
  "burning-sky": Object.freeze([
    Object.freeze({ factor: 0.64, angleOffset: Math.PI / 4 }),
    Object.freeze({ factor: 1, angleOffset: 0 })
  ]),
  "petal-transition": Object.freeze([
    Object.freeze({ factor: 0.64, angleOffset: Math.PI / 4 }),
    Object.freeze({ factor: 1, angleOffset: 5 * Math.PI / 6 })
  ]),
  "personal-dream-world": Object.freeze([
    Object.freeze({ factor: 0.64, angleOffset: 3 * Math.PI / 8 }),
    Object.freeze({ factor: 1, angleOffset: 0 })
  ])
});

export class MuseumEngine {
  constructor(container, { onGuideState = () => {}, onMetrics = () => {}, onFollowChange = () => {}, onWorldLayerStatus = () => {}, onCompanionStatus = () => {}, quality = currentSceneQuality() } = {}) {
    this.container = container;
    this.onGuideState = onGuideState;
    this.onMetrics = onMetrics;
    this.onFollowChange = onFollowChange;
    this.onWorldLayerStatus = onWorldLayerStatus;
    this.onCompanionStatus = onCompanionStatus;
    this.quality = quality;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(52, 1, 0.08, 90);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.devicePixelRatioCap));
    this.renderer.shadowMap.enabled = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.elapsed = 0;
    this.keys = new Set();
    this.touchVector = { x: 0, y: 0 };
    this.followGuide = true;
    this.cameraYaw = 0;
    this.cameraPitch = -0.14;
    this.cameraDistance = 5.6;
    this.dragging = false;
    this.effects = [];
    this.partyActors = [];
    this.salonActors = [];
    this.salonVisible = false;
    this.companionIds = ["monet", "van-gogh", "socrates"];
    this.companionToken = 0;
    this.worldToken = 0;
    this.salonToken = 0;
    this.partyFormationCache = null;
    this.activeStopId = null;
    this.activeSpeakerId = "mira";
    this.companyTour = null;
    this.companyTourToken = 0;
    this.companySpeakingId = null;
    this.worldTransitioning = false;
    this.activeWorld = WORLDS[0];
    this.activeWorldLive = false;
    this.ready = false;
    this.frames = [];
    this.startAt = performance.now();

    this.setupLights();
    this.worldLayer = new WorldLayer(this.scene, { renderer: this.renderer, quality, onStatus: onWorldLayerStatus });
    this.ambient = new AmbientLife(this.scene);
    this.player = new LearnerAvatar();
    this.guide = new ProceduralAvatar({ coat: 0x1a312d, accent: 0xd8ff42, skin: 0xa66f55, name: "Mira" });
    this.player.group.position.set(0.8, 0, 5.2);
    this.guide.group.position.set(-0.7, 0, 3.4);
    this.scene.add(this.player.group, this.guide.group);
    this.director = new GuideDirector({ avatar: this.guide, onState: (event) => this.handleGuideState(event) });
    this.companyDirectors = new Map([["mira", this.director]]);
    this.bindInput();
    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
  }

  async init() {
    this.ready = true;
    this.animate();
    const world = this.setWorld(WORLDS[0].id);
    const learner = this.player.load().catch(() => null);
    const companions = this.setCompanions(this.companionIds).catch(() => null);
    const [activeWorld] = await Promise.all([world, learner, companions]);
    return activeWorld;
  }

  setupLights() {
    this.scene.add(new THREE.HemisphereLight(0xeef7ef, 0x2e3833, 2.2));
    const sun = new THREE.DirectionalLight(0xfff3dc, 3.1);
    sun.position.set(4, 10, 7);
    this.scene.add(sun);
  }

  async setWorld(worldId) {
    const token = ++this.worldToken;
    const world = WORLDS.find((item) => item.id === worldId) || WORLDS[0];
    this.worldTransitioning = true;
    this.cancelCompanyTour({ pauseDirectors: true, resetActiveSpeaker: true });
    this.ambient.clear();
    try {
      await this.showSalonCharacters(false);
      if (token !== this.worldToken) return this.activeWorld;
      this.applyWorldProfile(world, false);
      const archiveLive = await this.worldLayer.build(world);
      if (token !== this.worldToken) return this.activeWorld;
      this.activeWorld = world;
      this.activeWorldLive = archiveLive && this.worldLayer.isLive(world.id);
      this.applyWorldProfile(world, true);
      this.ambient.setWorld(world.sceneId, { bounds: world.profile.bounds });
      if (token !== this.worldToken) return this.activeWorld;
      return world;
    } finally {
      if (token === this.worldToken) {
        this.worldTransitioning = false;
        for (const director of this.companyDirectors?.values?.() || [this.director]) director.paused = false;
      }
    }
  }

  isWorldReady(worldId = this.activeWorld.id) {
    return this.activeWorld.id === worldId
      && this.activeWorldLive === true
      && this.worldLayer.isLive(worldId);
  }

  applyWorldProfile(world, snapToCollider) {
    const profile = world.profile;
    this.activeWorld = world;
    this.partyFormationCache = null;
    if (!snapToCollider) this.activeWorldLive = false;
    this.camera.far = profile.cameraFar;
    this.camera.updateProjectionMatrix();
    this.cameraYaw = -profile.yaw;
    this.cameraPitch = Number.isFinite(profile.cameraPitch) ? profile.cameraPitch : -0.14;
    this.cameraDistance = Number.isFinite(profile.cameraDistance) ? profile.cameraDistance : 5.6;
    const right = new THREE.Vector3(Math.cos(profile.yaw), 0, Math.sin(profile.yaw));
    this.player.group.position.set(profile.spawn.x, profile.groundY, profile.spawn.z).addScaledVector(right, 0.5);
    this.guide.group.position.set(profile.guideSpawn.x, profile.groundY, profile.guideSpawn.z);
    if (snapToCollider) {
      this.player.group.position.y = this.worldLayer.groundHeightAt(this.player.group.position.x, this.player.group.position.z);
      this.guide.group.position.y = this.worldLayer.groundHeightAt(this.guide.group.position.x, this.guide.group.position.z);
    }
    this.player.group.rotation.y = profile.yaw + Math.PI;
    this.guide.group.rotation.y = profile.yaw + Math.PI;
    this.placePartyAtFormation(snapToCollider);
  }

  async setCompanions(ids) {
    const selected = [...new Set(ids)].map(getCompanion).filter(Boolean).slice(0, 3);
    if (!selected.length) throw new Error("companions_required");
    this.cancelCompanyTour({ pauseDirectors: this.worldTransitioning === true, resetActiveSpeaker: true });
    const token = ++this.companionToken;
    this.companionIds = selected.map((item) => item.id);
    const pending = [];
    let guide = this.guide;
    let createdGuide = false;

    if (!(guide instanceof ArchivedAvatar) || guide.companion.id !== selected[0].id) {
      const previous = guide;
      const avatar = new ArchivedAvatar({
        companion: selected[0],
        onStatus: (event) => {
          if (this.guide === avatar) this.onCompanionStatus(event);
        }
      });
      avatar.group.position.copy(previous.group.position);
      avatar.group.rotation.copy(previous.group.rotation);
      avatar.group.visible = false;
      this.scene.add(avatar.group);
      this.scene.remove(previous.group);
      this.guide = avatar;
      this.director.setAvatar(avatar);
      previous.dispose?.();
      guide = avatar;
      createdGuide = true;
      pending.push(trackArchivedActorLoad(avatar));
    } else if (guide[ARCHIVED_ACTOR_LOAD]) {
      pending.push(guide[ARCHIVED_ACTOR_LOAD]);
    }

    const retiredParty = this.partyActors;
    const partyActors = selected.slice(1).map((companion) => {
      let actor;
      actor = new ArchivedAvatar({
        companion,
        onStatus: (event) => {
          if (this.partyActors.includes(actor)) this.onCompanionStatus(event);
        }
      });
      actor.group.visible = false;
      this.scene.add(actor.group);
      pending.push(trackArchivedActorLoad(actor));
      return actor;
    });
    this.partyActors = partyActors;
    this.retireActors(retiredParty);
    if (this.companyDirectors instanceof Map) this.refreshCompanyDirectors();
    this.placePartyAtFormation(true);
    if (this.salonVisible) pending.push(this.showSalonCharacters(true));
    await Promise.all(pending);
    if (token !== this.companionToken) {
      if (createdGuide && this.guide !== guide) this.retireActors([guide]);
      this.retireActors(partyActors.filter((actor) => !this.partyActors.includes(actor)));
      return selected[0];
    }
    this.setPermanentPartyVisible(!this.salonVisible);
    return selected[0];
  }

  permanentCompanyActors() {
    return [this.guide, ...this.partyActors].filter((actor) => actor?.group);
  }

  refreshCompanyDirectors() {
    const previous = this.companyDirectors instanceof Map ? this.companyDirectors : new Map();
    const directors = new Map();
    for (const actor of this.permanentCompanyActors()) {
      const companionId = actor.companion?.id || (actor === this.guide ? "mira" : null);
      if (!companionId) continue;
      const existing = previous.get(companionId);
      const director = existing?.avatar === actor
        ? existing
        : new GuideDirector({
            avatar: actor,
            onState: (event) => this.handleCompanyDirectorState(companionId, event)
          });
      resetDirectorNavigation(director, this.worldTransitioning === true);
      directors.set(companionId, director);
    }
    this.companyDirectors = directors;
    if (!directors.has(this.activeSpeakerId)) this.activeSpeakerId = directors.keys().next().value || null;
    this.director = directors.get(this.activeSpeakerId) || directors.values().next().value || this.director;
    return directors;
  }

  cancelCompanyTour({ pauseDirectors = false, resetActiveSpeaker = false } = {}) {
    this.companyTourToken = (Number(this.companyTourToken) || 0) + 1;
    this.companyTour = null;
    this.activeStopId = null;
    const directors = new Set(this.companyDirectors?.values?.() || []);
    if (this.director) directors.add(this.director);
    for (const director of directors) resetDirectorNavigation(director, pauseDirectors);
    if (resetActiveSpeaker) {
      this.activeSpeakerId = this.guide?.companion?.id || "mira";
      this.director = this.companyDirectors?.get?.(this.activeSpeakerId) || this.director;
    }
    this.companySpeakingId = null;
  }

  handleCompanyDirectorState(companionId, event) {
    const tour = this.companyTour;
    const belongsToTour = tour
      && tour.token === this.companyTourToken
      && event.stopId === tour.artworkId
      && tour.memberStates.has(companionId);
    if (!belongsToTour) {
      if (companionId === this.activeSpeakerId) {
        this.handleGuideState({ ...event, speakerId: companionId, artworkId: null });
      }
      return;
    }

    tour.memberStates.set(companionId, event.state);
    if (event.state === "arriving") {
      const index = tour.speakerOrder.indexOf(companionId);
      const stage = tour.stages[index];
      const routeIndex = tour.routeProgress.get(companionId) || 0;
      if (stage?.route?.[routeIndex + 1]) {
        const director = this.companyDirectors.get(companionId);
        const nextTarget = stage.route[routeIndex + 1];
        tour.routeProgress.set(companionId, routeIndex + 1);
        tour.memberStates.set(companionId, "walking");
        director.goTo({ id: tour.artworkId, guideAnchor: [...nextTarget], lookAt: [...stage.lookAt] });
        return;
      }
      this.launchCompanyMember(tour, index + 1);
    }
    if (event.state === "asking") tour.ready.add(companionId);

    if (companionId === this.activeSpeakerId && event.state !== "asking") {
      this.handleGuideState({ ...event, speakerId: companionId, artworkId: tour.artworkId });
    }
    this.publishCompanyReady(tour);
  }

  async showSalonCharacters(visible = true) {
    if (!visible) {
      this.salonVisible = false;
      this.salonToken += 1;
      const retired = this.salonActors;
      this.salonActors = [];
      this.retireActors(retired);
      this.setPermanentPartyVisible(true);
      this.placePartyAtFormation(true);
      return;
    }
    this.salonVisible = true;
    this.setPermanentPartyVisible(false);
    if (sameActorRoster(this.salonActors, this.companionIds)) {
      const actors = this.salonActors;
      await Promise.all(actors.map((actor) => actor[ARCHIVED_ACTOR_LOAD]).filter(Boolean));
      if (this.salonVisible && this.salonActors === actors) {
        for (const actor of actors) actor.group.visible = true;
      }
      return;
    }
    const token = ++this.salonToken;
    this.retireActors(this.salonActors);
    const yaw = this.activeWorld.profile.yaw;
    const forward = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
    const center = this.player.group.position.clone().addScaledVector(forward, 3.4);
    const companions = this.companionIds.map(getCompanion).filter(Boolean);
    const actors = [];
    this.salonActors = actors;
    const pending = companions.map((companion, index) => {
      let actor;
      actor = new ArchivedAvatar({
        companion,
        height: 1.68,
        onStatus: (event) => {
          if (this.salonVisible && this.salonActors.includes(actor)) this.onCompanionStatus(event);
        }
      });
      const spread = [-1.65, 0, 1.65][index] || 0;
      actor.group.position.copy(center).addScaledVector(right, spread);
      const salonGround = typeof this.worldLayer.walkableGroundHeightAt === "function"
        ? this.worldLayer.walkableGroundHeightAt(actor.group.position.x, actor.group.position.z, this.player.group.position.y, MAX_PARTY_GROUND_DELTA)
        : this.worldLayer.groundHeightAt(actor.group.position.x, actor.group.position.z);
      actor.group.position.y = Number.isFinite(salonGround) ? salonGround : this.player.group.position.y;
      actor.group.lookAt(this.player.group.position.x, actor.group.position.y, this.player.group.position.z);
      actor.setMotion(0, "open");
      actor.group.visible = false;
      this.scene.add(actor.group);
      actors.push(actor);
      return trackArchivedActorLoad(actor);
    });
    await Promise.all(pending);
    if (token !== this.salonToken || !this.salonVisible) {
      this.retireActors(actors);
      if (this.salonActors === actors) this.salonActors = [];
      return;
    }
    for (const actor of actors) actor.group.visible = true;
  }

  setPermanentPartyVisible(visible) {
    this.guide.group.visible = Boolean(visible);
    for (const actor of this.partyActors) {
      actor.group.visible = Boolean(visible);
      if (!visible) actor.setMotion(0, "open");
    }
  }

  placePartyAtFormation(snapToCollider = true) {
    const groundY = this.activeWorld.profile.groundY;
    const groundedTargets = snapToCollider && this.partyActors.length ? this.groundedPartyTargets() : [];
    for (const [index, actor] of this.partyActors.entries()) {
      const target = snapToCollider
        ? groundedTargets[index]
        : { ...resolvePartyFormation(this.player.group.position, this.player.group.rotation.y, index, this.activeWorld.profile.bounds), y: groundY };
      actor.group.position.set(target.x, target.y, target.z);
      actor.group.rotation.y = target.yaw;
      actor.setMotion(0, "open");
    }
  }

  groundedPartyTarget(index) {
    return this.groundedPartyTargets()[index];
  }

  groundedPartyTargets() {
    const position = this.player.group.position;
    const yaw = this.player.group.rotation.y;
    const key = [
      this.activeWorld.id,
      Math.round(position.x * 2),
      Math.round(position.z * 2),
      Math.round(position.y * 4),
      Math.round(yaw / (Math.PI / 8)),
      this.partyActors.length
    ].join(":");
    if (this.partyFormationCache?.key === key) return this.partyFormationCache.targets;
    const groundAt = (x, z, referenceY, maxDelta) => {
      if (typeof this.worldLayer.walkableGroundHeightAt === "function") {
        return this.worldLayer.walkableGroundHeightAt(x, z, referenceY, maxDelta);
      }
      return this.worldLayer.groundHeightAt(x, z);
    };
    const slotCount = Math.max(1, this.partyActors.length);
    const previousPatterns = this.partyFormationCache?.worldId === this.activeWorld.id
      && this.partyFormationCache?.slotCount === slotCount
      && Array.isArray(this.partyFormationCache?.patterns)
      ? this.partyFormationCache?.patterns
      : initialPartyPatterns(this.activeWorld, position, slotCount);
    const preferred = previousPatterns
      ? resolvePreferredPartyFormations(position, yaw, this.activeWorld.profile.bounds, groundAt, previousPatterns)
      : null;
    const safeTargets = preferred
      || resolveGroundedPartyFormations(position, yaw, this.activeWorld.profile.bounds, groundAt, slotCount);
    const targets = safeTargets.length
      ? safeTargets
      : this.partyActors.map((actor) => ({
          x: actor.group.position.x,
          y: actor.group.position.y,
          z: actor.group.position.z,
          yaw: actor.group.rotation.y
        }));
    this.partyFormationCache = {
      key,
      worldId: this.activeWorld.id,
      slotCount,
      targets,
      patterns: safeTargets.length
        ? safeTargets.map(({ factor, angleOffset }) => ({ factor, angleOffset }))
        : null
    };
    return targets;
  }

  updateParty(dt) {
    if (this.salonVisible || this.companyTour) return;
    const groundedTargets = this.partyActors.length ? this.groundedPartyTargets() : [];
    for (const [index, actor] of this.partyActors.entries()) {
      const target = groundedTargets[index];
      const dx = target.x - actor.group.position.x;
      const dz = target.z - actor.group.position.z;
      const distance = Math.hypot(dx, dz);
      let speed = 0;
      if (distance > 0.08) {
        speed = Math.min(3.65, Math.max(0.65, distance * 3.2));
        const step = Math.min(distance, speed * dt);
        const nextX = actor.group.position.x + dx / distance * step;
        const nextZ = actor.group.position.z + dz / distance * step;
        const nextGround = typeof this.worldLayer.walkableGroundHeightAt === "function"
          ? this.worldLayer.walkableGroundHeightAt(nextX, nextZ, actor.group.position.y, MAX_PARTY_GROUND_DELTA)
          : this.worldLayer.groundHeightAt(nextX, nextZ);
        if (Number.isFinite(nextGround)) {
          actor.group.position.set(nextX, nextGround, nextZ);
          const targetYaw = Math.atan2(dx, dz);
          actor.group.rotation.y += shortestAngle(targetYaw - actor.group.rotation.y) * Math.min(1, dt * 9);
        } else {
          speed = 0;
        }
      } else {
        actor.group.position.y = target.y;
        actor.group.rotation.y += shortestAngle(target.yaw - actor.group.rotation.y) * Math.min(1, dt * 7);
      }
      actor.setMotion(speed, "open");
    }
  }

  retireActors(actors) {
    for (const actor of actors) {
      this.scene.remove(actor.group);
      actor.dispose?.();
    }
  }

  navigateTo(stopId) {
    const stop = getSceneStop(stopId, this.activeWorld.id);
    if (!stop) throw new Error(`unknown_scene_stop:${stopId}`);
    this.cancelCompanyTour();
    this.activeSpeakerId = this.guide.companion?.id || "mira";
    this.director = this.companyDirectors?.get?.(this.activeSpeakerId) || this.director;
    this.activeStopId = stopId;
    this.worldLayer.highlight(stopId, "focus");
    const pose = this.worldLayer.stopPose(stopId);
    const target = pose ? { ...stop, ...pose } : stop;
    const guideAnchor = [...target.guideAnchor];
    const guideGroundY = typeof this.worldLayer.walkableGroundHeightAt === "function"
      ? this.worldLayer.walkableGroundHeightAt(guideAnchor[0], guideAnchor[2], guideAnchor[1], MAX_PARTY_GROUND_DELTA)
      : this.worldLayer.groundHeightAt(guideAnchor[0], guideAnchor[2]);
    if (Number.isFinite(guideGroundY)) guideAnchor[1] = guideGroundY;
    this.director.goTo({ ...target, guideAnchor });
  }

  navigateCompanyToArtwork(artworkId, speakerOrder = this.companionIds) {
    const pose = this.worldLayer.artworkPose?.(artworkId) || this.worldLayer.stopPose?.(artworkId);
    if (!pose) throw new Error(`unknown_artwork_pose:${artworkId}`);
    const available = new Set(this.companyDirectors?.keys?.() || []);
    const order = [...new Set(Array.isArray(speakerOrder) ? speakerOrder : [])]
      .map((id) => String(id || "").trim())
      .filter((id) => id && available.has(id));
    if (!order.length) throw new Error("artwork_navigation_requires_available_speaker");
    const groundAt = (x, z, referenceY, maxDelta) => typeof this.worldLayer.walkableGroundHeightAt === "function"
      ? this.worldLayer.walkableGroundHeightAt(x, z, referenceY, maxDelta)
      : this.worldLayer.groundHeightAt(x, z);
    const origins = new Map(order.map((companionId) => {
      const position = this.companyDirectors.get(companionId).object.position;
      return [companionId, { x: position.x, y: position.y, z: position.z }];
    }));
    const stages = resolveArtworkPartyStages(
      pose,
      order,
      groundAt,
      this.activeWorld?.profile?.bounds,
      {
        origins,
        pathIsClear: (from, target, radius) => this.companyPathIsClear(from, target, radius)
      }
    );
    this.cancelCompanyTour();
    this.activeStopId = artworkId;
    this.activeSpeakerId = order[0];
    this.director = this.companyDirectors.get(this.activeSpeakerId);
    this.companyTour = {
      token: this.companyTourToken,
      artworkId: pose.artwork?.id || artworkId,
      pose,
      speakerOrder: order,
      stages,
      launched: new Set(),
      ready: new Set(),
      routeProgress: new Map(),
      memberStates: new Map(order.map((companionId) => [companionId, "pending"])),
      businessEventPublished: false
    };
    this.worldLayer.highlight(this.companyTour.artworkId, "focus");
    this.launchCompanyMember(this.companyTour, 0);
    return {
      artworkId: this.companyTour.artworkId,
      speakerId: this.activeSpeakerId,
      speakerOrder: [...order],
      stages: stages.map((stage) => ({
        ...stage,
        guideAnchor: [...stage.guideAnchor],
        lookAt: [...stage.lookAt],
        route: stage.route.map((point) => [...point])
      }))
    };
  }

  updateCompanyTour(dt) {
    const tour = this.companyTour;
    if (!tour || tour.token !== this.companyTourToken) return;
    for (const companionId of [...tour.launched]) {
      const director = this.companyDirectors.get(companionId);
      if (!director) continue;
      const previous = director.object.position.clone();
      director.update(dt);
      if (typeof this.worldLayer.resolveHorizontalMove === "function") {
        const desired = director.object.position.clone();
        director.object.position.copy(this.worldLayer.resolveHorizontalMove(previous, desired, PARTY_FOOTPRINT_RADIUS));
      }
      this.updateActorGround(director.avatar, previous);
    }
    this.applyCompanySpeakerGestures(tour);
    this.publishCompanyReady(tour);
  }

  launchCompanyMember(tour, index) {
    if (tour !== this.companyTour || tour.token !== this.companyTourToken || index < 0 || index >= tour.stages.length) return false;
    const stage = tour.stages[index];
    if (tour.launched.has(stage.companionId)) return false;
    const director = this.companyDirectors.get(stage.companionId);
    if (!director) return false;
    tour.launched.add(stage.companionId);
    tour.memberStates.set(stage.companionId, "walking");
    tour.routeProgress.set(stage.companionId, 0);
    director.paused = false;
    const firstTarget = stage.route[0] || stage.guideAnchor;
    director.goTo({
      id: tour.artworkId,
      guideAnchor: [...firstTarget],
      lookAt: [...stage.lookAt]
    });
    return true;
  }

  publishCompanyReady(tour = this.companyTour) {
    if (!tour
      || tour !== this.companyTour
      || tour.token !== this.companyTourToken
      || tour.businessEventPublished
      || tour.ready.size !== tour.speakerOrder.length) return false;
    const leadStage = tour.stages[0];
    if (!leadStage || !this.isVisitorReadyForCompany(tour)) return false;
    const visitorDistance = this.companyVisitorDistance(tour);
    const leadDirector = this.companyDirectors.get(tour.speakerOrder[0]);
    if (!leadDirector || leadDirector.state !== "asking" || !leadDirector.correspondence().synced) return false;
    tour.businessEventPublished = true;
    this.activeSpeakerId = tour.speakerOrder[0];
    this.director = leadDirector;
    this.handleGuideState({
      state: "asking",
      stopId: tour.artworkId,
      speakerId: this.activeSpeakerId,
      artworkId: tour.artworkId,
      companyReady: true,
      visitorReady: true,
      visitorDistance,
      memberStates: Object.fromEntries(tour.memberStates)
    });
    return true;
  }

  companyVisitorDistance(tour = this.companyTour) {
    const leadStage = tour?.stages?.[0];
    const playerPosition = this.player?.group?.position;
    if (!leadStage || !playerPosition) return Infinity;
    return Math.hypot(playerPosition.x - leadStage.x, playerPosition.z - leadStage.z);
  }

  isVisitorReadyForCompany(tour = this.companyTour) {
    return this.companyVisitorDistance(tour) <= COMPANY_VISITOR_READY_RADIUS;
  }

  setCompanySpeaker(companionId, speaking) {
    const id = String(companionId || "").trim();
    const director = this.companyDirectors?.get?.(id);
    if (!director || director.state === "walking") return false;
    if (speaking) this.companySpeakingId = id;
    else if (this.companySpeakingId === id) this.companySpeakingId = null;
    this.applyCompanySpeakerGestures(this.companyTour);
    return true;
  }

  applyCompanySpeakerGestures(tour = this.companyTour) {
    if (!tour || !(this.companyDirectors instanceof Map)) return;
    for (const [companionId, director] of this.companyDirectors) {
      const state = tour.memberStates?.get?.(companionId) || director.state;
      if (state === "walking" || state === "pending" || director.state === "walking") continue;
      director.avatar?.setMotion?.(0, companionId === this.companySpeakingId ? "point" : "open");
    }
  }

  companyPathIsClear(from, target, radius = PARTY_FOOTPRINT_RADIUS) {
    if (typeof this.worldLayer.resolveHorizontalMove !== "function") return true;
    const origin = new THREE.Vector3(from.x, from.y, from.z);
    const desired = new THREE.Vector3(target.x, target.y, target.z);
    this.worldLayer.horizontalCollisionCache = null;
    const resolved = this.worldLayer.resolveHorizontalMove(origin, desired, radius);
    return Math.hypot(resolved.x - desired.x, resolved.z - desired.z) <= 0.04;
  }

  applyEffect(stopId, effect) {
    this.worldLayer.highlight(stopId, effect);
    const stop = getSceneStop(stopId, this.activeWorld.id);
    if (!stop) return;
    const color = effect === "warmth" ? 0xff6b4a : effect === "ripple" ? 0x63dfe0 : 0xd8ff42;
    const pose = this.worldLayer.stopPose(stopId);
    const anchor = new THREE.Vector3().fromArray(pose?.guideAnchor || stop.guideAnchor);
    anchor.y = this.worldLayer.groundHeightAt(anchor.x, anchor.z) + 0.04;
    for (let i = 0; i < 3; i += 1) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.55 + i * 0.38, 0.58 + i * 0.38, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(anchor);
      ring.userData.age = -i * 0.16;
      this.scene.add(ring);
      this.effects.push(ring);
    }
  }

  setFollow(enabled) {
    this.followGuide = Boolean(enabled);
    this.onFollowChange(this.followGuide);
  }

  setTouchVector(x, y) {
    this.touchVector.x = THREE.MathUtils.clamp(x, -1, 1);
    this.touchVector.y = THREE.MathUtils.clamp(y, -1, 1);
  }

  handleGuideState(event) {
    const metrics = this.director.correspondence();
    this.onMetrics(metrics);
    this.onGuideState({ ...event, correspondence: metrics });
  }

  updatePlayer(dt) {
    let forward = (this.keys.has("KeyW") || this.keys.has("ArrowUp") ? 1 : 0) - (this.keys.has("KeyS") || this.keys.has("ArrowDown") ? 1 : 0) - this.touchVector.y;
    let side = (this.keys.has("KeyD") || this.keys.has("ArrowRight") ? 1 : 0) - (this.keys.has("KeyA") || this.keys.has("ArrowLeft") ? 1 : 0) + this.touchVector.x;
    const manual = Math.abs(forward) + Math.abs(side) > 0.08;
    if (manual && this.followGuide) {
      this.followGuide = false;
      this.onFollowChange(false);
    }
    const velocity = new THREE.Vector3();
    if (manual) {
      const cameraForward = new THREE.Vector3(Math.sin(this.cameraYaw), 0, Math.cos(this.cameraYaw) * -1);
      const cameraRight = new THREE.Vector3(cameraForward.z * -1, 0, cameraForward.x);
      velocity.addScaledVector(cameraForward, forward).addScaledVector(cameraRight, side).normalize().multiplyScalar(LEARNER_WALK_SPEED);
    } else if (this.followGuide && this.director.state === "walking") {
      const lead = this.director.avatar || this.guide;
      const behind = new THREE.Vector3(0, 0, -1.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), lead.group.rotation.y);
      const target = lead.group.position.clone().add(behind);
      const delta = target.sub(this.player.group.position);
      delta.y = 0;
      if (delta.length() > 0.25) velocity.copy(delta.normalize().multiplyScalar(Math.min(LEARNER_FOLLOW_CATCHUP_SPEED, delta.length() * 1.7)));
    }
    const previous = this.player.group.position.clone();
    const desired = previous.clone().addScaledVector(velocity, dt);
    const bounds = this.activeWorld.profile.bounds;
    desired.x = THREE.MathUtils.clamp(desired.x, bounds.minX + PLAYER_COLLISION_RADIUS, bounds.maxX - PLAYER_COLLISION_RADIUS);
    desired.z = THREE.MathUtils.clamp(desired.z, bounds.minZ + PLAYER_COLLISION_RADIUS, bounds.maxZ - PLAYER_COLLISION_RADIUS);
    const resolved = typeof this.worldLayer.resolveHorizontalMove === "function"
      ? this.worldLayer.resolveHorizontalMove(previous, desired, PLAYER_COLLISION_RADIUS)
      : desired;
    const groundY = typeof this.worldLayer.walkableGroundHeightAt === "function"
      ? this.worldLayer.walkableGroundHeightAt(resolved.x, resolved.z, previous.y, MAX_PARTY_GROUND_DELTA)
      : this.worldLayer.groundHeightAt(resolved.x, resolved.z);
    if (Number.isFinite(groundY)) this.player.group.position.set(resolved.x, groundY, resolved.z);
    else this.player.group.position.copy(previous);
    if (velocity.lengthSq() > 0.001) {
      const yaw = Math.atan2(velocity.x, velocity.z);
      this.player.group.rotation.y += shortestAngle(yaw - this.player.group.rotation.y) * Math.min(1, dt * 10);
    }
    this.player.setMotion(velocity.length(), "open");
  }

  updateGuideGround(previousPosition = null) {
    this.updateActorGround(this.guide, previousPosition);
  }

  updateActorGround(actor, previousPosition = null) {
    const position = actor.group.position;
    const groundY = typeof this.worldLayer.walkableGroundHeightAt === "function"
      ? this.worldLayer.walkableGroundHeightAt(position.x, position.z, position.y, MAX_PARTY_GROUND_DELTA)
      : this.worldLayer.groundHeightAt(position.x, position.z);
    if (Number.isFinite(groundY)) position.y = groundY;
    else if (previousPosition) position.copy(previousPosition);
  }

  updateCamera(dt) {
    const target = this.player.group.position.clone().add(new THREE.Vector3(0, 1.45, 0));
    const offset = new THREE.Vector3(
      Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance,
      1.25 + Math.sin(-this.cameraPitch) * this.cameraDistance,
      Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance
    );
    const desired = target.clone().add(offset);
    this.camera.position.lerp(desired, 1 - Math.exp(-dt * 5));
    this.camera.lookAt(target);
  }

  updateEffects(dt) {
    for (const ring of [...this.effects]) {
      ring.userData.age += dt;
      if (ring.userData.age < 0) continue;
      const scale = 1 + ring.userData.age * 2.2;
      ring.scale.setScalar(scale);
      ring.material.opacity = Math.max(0, 0.6 - ring.userData.age * 0.45);
      if (ring.userData.age > 1.4) {
        this.scene.remove(ring);
        ring.geometry.dispose();
        ring.material.dispose();
        this.effects.splice(this.effects.indexOf(ring), 1);
      }
    }
  }

  animate = () => {
    if (!this.ready) return;
    requestAnimationFrame(this.animate);
    const dt = frameDeltas(this.clock.getDelta());
    this.elapsed += dt.raw;
    if (this.companyTour) this.updateCompanyTour(dt.navigation);
    else {
      const guidePrevious = this.guide.group.position.clone();
      this.director.update(dt.navigation);
      this.updateGuideGround(guidePrevious);
    }
    this.updatePlayer(dt.movement);
    this.updateParty(dt.movement);
    this.player.update(dt.visual, this.elapsed);
    this.guide.update(dt.visual, this.elapsed);
    for (const actor of this.partyActors) actor.update(dt.visual, this.elapsed);
    for (const actor of this.salonActors) actor.update(dt.visual, this.elapsed);
    const ambientMetrics = this.ambient.update(this.elapsed);
    this.updateCamera(dt.movement);
    this.updateEffects(dt.visual);
    this.renderer.render(this.scene, this.camera);
    this.frames.push(dt.raw);
    if (!window.__MUSE_METRICS__) {
      window.__MUSE_METRICS__ = {
        readyMs: Math.round(performance.now() - this.startAt),
        medianFps: null,
        actors: 2,
        archivedWorld: null,
        archivedCompanion: null,
        archivedCompanions: [],
        canvas: { width: this.renderer.domElement.width, height: this.renderer.domElement.height }
      };
    }
    const companionMetrics = resolveCompanionMetrics({
      guide: this.guide,
      partyActors: this.partyActors,
      salonActors: this.salonActors,
      salonVisible: this.salonVisible
    });
    window.__MUSE_METRICS__.actors = companionMetrics.actors;
    window.__MUSE_METRICS__.archivedWorld = this.worldLayer.isLive(this.activeWorld.id) ? this.activeWorld.id : null;
    window.__MUSE_METRICS__.archiveType = this.worldLayer.archive?.type || null;
    window.__MUSE_METRICS__.quality = this.quality;
    window.__MUSE_METRICS__.archivedCompanion = companionMetrics.archivedCompanion;
    window.__MUSE_METRICS__.archivedCompanions = companionMetrics.archivedCompanions;
    window.__MUSE_METRICS__.ambient = ambientMetrics;
    if (this.frames.length >= 120 && this.frames.length % 30 === 0) {
      const sample = this.frames.slice(-120).sort((a, b) => a - b);
      window.__MUSE_METRICS__.medianFps = Math.round(1 / sample[Math.floor(sample.length / 2)]);
      if (this.frames.length > 180) this.frames = this.frames.slice(-120);
    }
  };

  bindInput() {
    window.addEventListener("keydown", (event) => this.keys.add(event.code));
    window.addEventListener("keyup", (event) => this.keys.delete(event.code));
    const canvas = this.renderer.domElement;
    canvas.addEventListener("pointerdown", (event) => { this.dragging = true; this.lastPointer = [event.clientX, event.clientY]; canvas.setPointerCapture(event.pointerId); });
    canvas.addEventListener("pointermove", (event) => {
      if (!this.dragging) return;
      const dx = event.clientX - this.lastPointer[0];
      const dy = event.clientY - this.lastPointer[1];
      this.cameraYaw -= dx * 0.005;
      this.cameraPitch = THREE.MathUtils.clamp(this.cameraPitch - dy * 0.003, -0.5, 0.32);
      this.lastPointer = [event.clientX, event.clientY];
    });
    canvas.addEventListener("pointerup", () => { this.dragging = false; });
    canvas.addEventListener("wheel", (event) => { this.cameraDistance = THREE.MathUtils.clamp(this.cameraDistance + event.deltaY * 0.005, 3.8, 9); }, { passive: true });
  }

  resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }
}

export function resolveArtworkPartyStages(pose, speakerOrder, groundAt = null, bounds = null, options = {}) {
  const guideAnchor = Array.isArray(pose?.guideAnchor) ? pose.guideAnchor : [];
  const lookAt = Array.isArray(pose?.lookAt) ? pose.lookAt : [];
  const order = Array.isArray(speakerOrder)
    ? speakerOrder.map((id) => String(id || "").trim()).filter(Boolean).slice(0, 3)
    : [];
  if (guideAnchor.length !== 3 || lookAt.length !== 3 || !order.length) {
    throw new TypeError("artwork_party_stage_requires_pose_and_speakers");
  }
  const values = [...guideAnchor, ...lookAt];
  if (!values.every(Number.isFinite)) throw new TypeError("artwork_party_stage_requires_finite_pose");

  const towardX = lookAt[0] - guideAnchor[0];
  const towardZ = lookAt[2] - guideAnchor[2];
  const distance = Math.hypot(towardX, towardZ);
  if (distance < 0.001) throw new RangeError("artwork_party_stage_requires_view_direction");
  const forwardX = towardX / distance;
  const forwardZ = towardZ / distance;
  const rightX = -forwardZ;
  const rightZ = forwardX;
  const slots = [
    { side: 0, retreat: 0 },
    { side: -COMPANY_LISTENER_SPREAD, retreat: COMPANY_LISTENER_RETREAT },
    { side: COMPANY_LISTENER_SPREAD, retreat: COMPANY_LISTENER_RETREAT }
  ];

  const origins = normalizeCompanyOrigins(options?.origins, order);
  const pools = order.map((companionId, index) => artworkStageCandidates({
    companionId,
    sequenceIndex: index,
    slot: slots[index],
    guideAnchor,
    lookAt,
    forwardX,
    forwardZ,
    rightX,
    rightZ,
    bounds,
    groundAt,
    origin: origins.get(companionId),
    pathIsClear: options?.pathIsClear
  }));
  if (pools.some((pool) => !pool.length)) throw new RangeError("artwork_party_stage_unavailable");
  const stages = selectArtworkStageCombination(pools);
  if (!stages) throw new RangeError("artwork_party_stage_unavailable");
  return stages.map(({ score, ...stage }) => stage);
}

function artworkStageCandidates({
  companionId,
  sequenceIndex,
  slot,
  guideAnchor,
  lookAt,
  forwardX,
  forwardZ,
  rightX,
  rightZ,
  bounds,
  groundAt,
  origin,
  pathIsClear
}) {
  const specs = [];
  const seen = new Set();
  for (const side of COMPANY_STAGE_SIDE_OFFSETS) {
    for (const retreat of COMPANY_STAGE_RETREATS) {
      const rawX = guideAnchor[0] + rightX * side - forwardX * retreat;
      const rawZ = guideAnchor[2] + rightZ * side - forwardZ * retreat;
      const x = clampFormationCoordinate(rawX, bounds?.minX, bounds?.maxX);
      const z = clampFormationCoordinate(rawZ, bounds?.minZ, bounds?.maxZ);
      const key = `${x.toFixed(3)}:${z.toFixed(3)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const sideCrossingPenalty = slot.side && Math.sign(side) !== Math.sign(slot.side) ? 1.4 : 0;
      specs.push({
        x,
        z,
        score: (side - slot.side) ** 2 + (retreat - slot.retreat) ** 2 + sideCrossingPenalty
      });
    }
  }
  specs.sort((left, right) => left.score - right.score);

  const candidates = [];
  for (const spec of specs) {
    const y = typeof groundAt === "function"
      ? groundAt(spec.x, spec.z, guideAnchor[1], MAX_PARTY_GROUND_DELTA)
      : guideAnchor[1];
    if (!Number.isFinite(y)) continue;
    const candidate = {
      companionId,
      sequenceIndex,
      x: spec.x,
      y,
      z: spec.z,
      yaw: Math.atan2(lookAt[0] - spec.x, lookAt[2] - spec.z),
      guideAnchor: [spec.x, y, spec.z],
      lookAt: [...lookAt],
      score: spec.score
    };
    if (typeof groundAt === "function" && !artworkStageFootprintIsSupported(candidate, groundAt)) continue;
    const route = origin
      ? resolveArtworkStageRoute(origin, candidate, bounds, groundAt, pathIsClear)
      : [candidate];
    if (!route) continue;
    candidate.route = route.map(({ x, y, z }) => [x, y, z]);
    candidate.score += Math.max(0, routeLength(origin, route) - planarDistance(origin, candidate)) * 0.2;
    candidates.push(candidate);
    if (candidates.length >= MAX_COMPANY_STAGE_CANDIDATES) break;
  }
  return candidates;
}

function selectArtworkStageCombination(pools) {
  let best = null;
  const visit = (index, selected, score) => {
    if (best && score >= best.score) return;
    if (index === pools.length) {
      best = { score, stages: [...selected] };
      return;
    }
    for (const candidate of pools[index]) {
      if (selected.some((stage) => Math.hypot(stage.x - candidate.x, stage.z - candidate.z) < COMPANY_STAGE_MIN_SEPARATION)) continue;
      selected.push(candidate);
      visit(index + 1, selected, score + candidate.score);
      selected.pop();
    }
  };
  visit(0, [], 0);
  return best?.stages || null;
}

function normalizeCompanyOrigins(value, order) {
  const origins = new Map();
  for (const companionId of order) {
    const source = value instanceof Map ? value.get(companionId) : value?.[companionId];
    const position = normalizeCompanyPosition(source);
    if (position) origins.set(companionId, position);
  }
  return origins;
}

function normalizeCompanyPosition(value) {
  const x = Array.isArray(value) ? value[0] : value?.x;
  const y = Array.isArray(value) ? value[1] : value?.y;
  const z = Array.isArray(value) ? value[2] : value?.z;
  return [x, y, z].every(Number.isFinite) ? { x, y, z } : null;
}

function artworkStageFootprintIsSupported(candidate, groundAt) {
  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI / 4;
    const x = candidate.x + Math.cos(angle) * PARTY_FOOTPRINT_RADIUS;
    const z = candidate.z + Math.sin(angle) * PARTY_FOOTPRINT_RADIUS;
    if (!Number.isFinite(groundAt(x, z, candidate.y, PARTY_FOOTPRINT_VARIATION))) return false;
  }
  return true;
}

function resolveArtworkStageRoute(origin, target, bounds, groundAt, pathIsClear) {
  if (artworkStageSegmentIsSupported(origin, target, groundAt)
    && (typeof pathIsClear !== "function" || pathIsClear(origin, target, PARTY_FOOTPRINT_RADIUS))) {
    return [target];
  }
  if (typeof groundAt !== "function") return null;

  const dx = target.x - origin.x;
  const dz = target.z - origin.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.001) return null;
  const normalX = -dz / distance;
  const normalZ = dx / distance;
  const waypointSpecs = [];
  for (const fraction of [0.3, 0.5, 0.7]) {
    for (const offset of [-3, 3, -2.4, 2.4, -1.8, 1.8, -1.2, 1.2, -0.6, 0.6]) {
      waypointSpecs.push({ fraction, offset });
    }
  }
  waypointSpecs.sort((left, right) => Math.abs(left.offset) - Math.abs(right.offset));
  let best = null;
  const seen = new Set();
  for (const spec of waypointSpecs) {
    const x = clampFormationCoordinate(origin.x + dx * spec.fraction + normalX * spec.offset, bounds?.minX, bounds?.maxX);
    const z = clampFormationCoordinate(origin.z + dz * spec.fraction + normalZ * spec.offset, bounds?.minZ, bounds?.maxZ);
    const key = `${x.toFixed(3)}:${z.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const y = artworkStageSegmentEndY(origin, { x, z }, groundAt);
    if (!Number.isFinite(y)) continue;
    const waypoint = { x, y, z };
    if (!artworkStageFootprintIsSupported(waypoint, groundAt)) continue;
    if (typeof pathIsClear === "function" && !pathIsClear(origin, waypoint, PARTY_FOOTPRINT_RADIUS)) continue;
    if (!artworkStageSegmentIsSupported(waypoint, target, groundAt)) continue;
    if (typeof pathIsClear === "function" && !pathIsClear(waypoint, target, PARTY_FOOTPRINT_RADIUS)) continue;
    const score = planarDistance(origin, waypoint) + planarDistance(waypoint, target);
    if (!best || score < best.score) best = { score, route: [waypoint, target] };
  }
  return best?.route || null;
}

function artworkStageSegmentIsSupported(origin, target, groundAt) {
  if (typeof groundAt !== "function") return true;
  const endY = artworkStageSegmentEndY(origin, target, groundAt);
  return Number.isFinite(endY) && (!Number.isFinite(target.y) || Math.abs(endY - target.y) <= PARTY_FOOTPRINT_VARIATION);
}

function artworkStageSegmentEndY(origin, target, groundAt) {
  const dx = target.x - origin.x;
  const dz = target.z - origin.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.001) return origin.y;
  const normalX = -dz / distance;
  const normalZ = dx / distance;
  const sampleCount = Math.max(1, Math.ceil(distance / COMPANY_STAGE_PATH_SPACING));
  let centerEndY = null;
  for (const lane of [-PARTY_FOOTPRINT_RADIUS, 0, PARTY_FOOTPRINT_RADIUS]) {
    let referenceY = origin.y;
    for (let index = 1; index <= sampleCount; index += 1) {
      const fraction = index / sampleCount;
      const x = origin.x + dx * fraction + normalX * lane;
      const z = origin.z + dz * fraction + normalZ * lane;
      const y = groundAt(x, z, referenceY, MAX_PARTY_GROUND_DELTA);
      if (!Number.isFinite(y)) return null;
      referenceY = y;
    }
    if (lane === 0) centerEndY = referenceY;
  }
  return centerEndY;
}

function routeLength(origin, route) {
  if (!origin || !Array.isArray(route)) return 0;
  let distance = 0;
  let previous = origin;
  for (const point of route) {
    distance += planarDistance(previous, point);
    previous = point;
  }
  return distance;
}

function planarDistance(left, right) {
  if (!left || !right) return 0;
  return Math.hypot(right.x - left.x, right.z - left.z);
}

export function resolvePartyFormation(position, yaw, slotIndex, bounds = null) {
  const slot = PARTY_FORMATION_SLOTS[slotIndex];
  if (!slot) throw new RangeError(`unknown_party_slot:${slotIndex}`);
  const heading = Number.isFinite(yaw) ? yaw : 0;
  const forwardX = Math.sin(heading);
  const forwardZ = Math.cos(heading);
  const rightX = Math.cos(heading);
  const rightZ = -Math.sin(heading);
  const rawX = (Number(position?.x) || 0) - forwardX * slot.behind + rightX * slot.side;
  const rawZ = (Number(position?.z) || 0) - forwardZ * slot.behind + rightZ * slot.side;
  return {
    x: clampFormationCoordinate(rawX, bounds?.minX, bounds?.maxX),
    z: clampFormationCoordinate(rawZ, bounds?.minZ, bounds?.maxZ),
    yaw: heading
  };
}

export function resolveGroundedPartyFormation(position, yaw, slotIndex, bounds, groundAt, maxGroundDelta = MAX_PARTY_GROUND_DELTA) {
  const candidates = supportedPartyCandidates(position, yaw, slotIndex, bounds, groundAt, maxGroundDelta);
  return candidates.next().value || null;
}

export function resolveGroundedPartyFormations(position, yaw, bounds, groundAt, slotCount = PARTY_FORMATION_SLOTS.length) {
  const count = Math.min(PARTY_FORMATION_SLOTS.length, Math.max(1, slotCount));
  const iterators = Array.from({ length: count }, (_, index) => supportedPartyCandidates(
    position, yaw, index, bounds, groundAt, MAX_PARTY_GROUND_DELTA
  ));
  const pools = Array.from({ length: count }, () => []);
  const exhausted = Array(count).fill(false);

  for (let round = 0; round < MAX_SUPPORTED_PARTY_CANDIDATES; round += 1) {
    for (let index = 0; index < count; index += 1) {
      if (exhausted[index]) continue;
      const next = iterators[index].next();
      if (next.done) exhausted[index] = true;
      else pools[index].push(next.value);
    }
    if (count === 1 && pools[0][0]) return [pools[0][0]];
    if (count === 2) {
      const pairs = [];
      for (const left of pools[0]) {
        for (const right of pools[1]) {
          if (Math.hypot(left.x - right.x, left.z - right.z) < PARTY_MIN_SEPARATION) continue;
          pairs.push({ targets: [left, right], score: left.score + right.score });
        }
      }
      pairs.sort((left, right) => left.score - right.score);
      if (pairs[0]) return pairs[0].targets;
    }
    if (exhausted.every(Boolean)) break;
  }
  return [];
}

export function resolvePreferredPartyFormations(position, yaw, bounds, groundAt, patterns) {
  if (!Array.isArray(patterns) || !patterns.length) return null;
  const targets = patterns.map((pattern, slotIndex) => {
    if (!Number.isFinite(pattern?.factor) || !Number.isFinite(pattern?.angleOffset)) return null;
    const nominal = resolvePartyFormation(position, yaw, slotIndex, bounds);
    const playerX = Number(position?.x) || 0;
    const playerZ = Number(position?.z) || 0;
    const offsetX = nominal.x - playerX;
    const offsetZ = nominal.z - playerZ;
    return groundedPartyCandidate(
      position,
      nominal,
      Math.atan2(offsetZ, offsetX),
      Math.hypot(offsetX, offsetZ),
      pattern.factor,
      pattern.angleOffset,
      bounds,
      groundAt,
      MAX_PARTY_GROUND_DELTA
    );
  });
  if (targets.some((target) => !target)) return null;
  if (targets.length > 1 && Math.hypot(targets[0].x - targets[1].x, targets[0].z - targets[1].z) < PARTY_MIN_SEPARATION) return null;
  if (!targets.every((target) => partyCandidateIsSupported(position, target, groundAt))) return null;
  return targets;
}

function* supportedPartyCandidates(position, yaw, slotIndex, bounds, groundAt, maxGroundDelta) {
  for (const spec of groundedPartyCandidateSpecs(position, yaw, slotIndex, bounds)) {
    const y = groundAt(spec.x, spec.z, Number.isFinite(position?.y) ? position.y : 0, maxGroundDelta);
    if (!Number.isFinite(y)) continue;
    const candidate = { ...spec, y };
    if (partyCandidateIsSupported(position, candidate, groundAt)) yield candidate;
  }
}

function groundedPartyCandidateSpecs(position, yaw, slotIndex, bounds) {
  const nominal = resolvePartyFormation(position, yaw, slotIndex, bounds);
  const playerX = Number(position?.x) || 0;
  const playerZ = Number(position?.z) || 0;
  const offsetX = nominal.x - playerX;
  const offsetZ = nominal.z - playerZ;
  const radius = Math.hypot(offsetX, offsetZ);
  const angle = Math.atan2(offsetZ, offsetX);
  const seen = new Set();
  const candidates = [];

  for (const factor of PARTY_RADIUS_FACTORS) {
    for (const angleOffset of PARTY_ANGLE_OFFSETS) {
      const x = clampFormationCoordinate(playerX + Math.cos(angle + angleOffset) * radius * factor, bounds?.minX, bounds?.maxX);
      const z = clampFormationCoordinate(playerZ + Math.sin(angle + angleOffset) * radius * factor, bounds?.minZ, bounds?.maxZ);
      if (Math.hypot(x - playerX, z - playerZ) < PARTY_MIN_PLAYER_DISTANCE) continue;
      const key = `${x.toFixed(3)}:${z.toFixed(3)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push({
        x,
        z,
        yaw: nominal.yaw,
        score: (x - nominal.x) ** 2 + (z - nominal.z) ** 2,
        factor,
        angleOffset
      });
    }
  }
  candidates.sort((left, right) => left.score - right.score);
  return candidates;
}

function groundedPartyCandidate(position, nominal, angle, radius, factor, angleOffset, bounds, groundAt, maxGroundDelta) {
  const playerX = Number(position?.x) || 0;
  const playerZ = Number(position?.z) || 0;
  const referenceY = Number.isFinite(position?.y) ? position.y : 0;
  const x = clampFormationCoordinate(playerX + Math.cos(angle + angleOffset) * radius * factor, bounds?.minX, bounds?.maxX);
  const z = clampFormationCoordinate(playerZ + Math.sin(angle + angleOffset) * radius * factor, bounds?.minZ, bounds?.maxZ);
  if (Math.hypot(x - playerX, z - playerZ) < PARTY_MIN_PLAYER_DISTANCE) return null;
  const y = groundAt(x, z, referenceY, maxGroundDelta);
  if (!Number.isFinite(y) || Math.abs(y - referenceY) > maxGroundDelta) return null;
  return {
    x,
    y,
    z,
    yaw: nominal.yaw,
    score: (x - nominal.x) ** 2 + (z - nominal.z) ** 2,
    factor,
    angleOffset
  };
}

function partyCandidateIsSupported(position, candidate, groundAt) {
  for (const [x, z] of [
    [candidate.x + PARTY_FOOTPRINT_RADIUS, candidate.z],
    [candidate.x - PARTY_FOOTPRINT_RADIUS, candidate.z],
    [candidate.x, candidate.z + PARTY_FOOTPRINT_RADIUS],
    [candidate.x, candidate.z - PARTY_FOOTPRINT_RADIUS]
  ]) {
    if (!Number.isFinite(groundAt(x, z, candidate.y, PARTY_FOOTPRINT_VARIATION))) return false;
  }
  const playerX = Number(position?.x) || 0;
  const playerZ = Number(position?.z) || 0;
  const playerY = Number.isFinite(position?.y) ? position.y : 0;
  for (const fraction of PARTY_PATH_FRACTIONS) {
    const x = playerX + (candidate.x - playerX) * fraction;
    const z = playerZ + (candidate.z - playerZ) * fraction;
    const referenceY = playerY + (candidate.y - playerY) * fraction;
    if (!Number.isFinite(groundAt(x, z, referenceY, MAX_PARTY_GROUND_DELTA + 0.1))) return false;
  }
  return true;
}

function initialPartyPatterns(world, position, slotCount) {
  const profile = world?.profile;
  if (!profile?.spawn || !Number.isFinite(profile.yaw)) return null;
  const rightX = Math.cos(profile.yaw);
  const rightZ = Math.sin(profile.yaw);
  const spawnX = profile.spawn.x + rightX * 0.5;
  const spawnZ = profile.spawn.z + rightZ * 0.5;
  if (Math.hypot((Number(position?.x) || 0) - spawnX, (Number(position?.z) || 0) - spawnZ) > 0.75) return null;
  const patterns = INITIAL_PARTY_PATTERN_OVERRIDES[world.sceneId] || NOMINAL_PARTY_PATTERNS;
  return patterns.slice(0, slotCount);
}

export function resolveCompanionMetrics({ guide = null, partyActors = [], salonActors = [], salonVisible = false } = {}) {
  const active = (salonVisible ? salonActors : [guide, ...partyActors]).filter((actor) => actor?.group && actor.group.visible !== false);
  const archivedCompanions = [...new Set(active
    .filter((actor) => actor?.ready === true && actor?.companion?.id)
    .map((actor) => actor.companion.id))];
  const primary = active[0];
  return {
    actors: 1 + active.length,
    archivedCompanion: primary?.ready === true ? primary.companion?.id || null : null,
    archivedCompanions
  };
}

function sameActorRoster(actors, companionIds) {
  return actors.length === companionIds.length
    && actors.every((actor, index) => actor.companion?.id === companionIds[index] && !actor.disposed);
}

function trackArchivedActorLoad(actor) {
  if (actor[ARCHIVED_ACTOR_LOAD]) return actor[ARCHIVED_ACTOR_LOAD];
  const pending = actor.load();
  actor[ARCHIVED_ACTOR_LOAD] = pending;
  const clear = () => {
    if (actor[ARCHIVED_ACTOR_LOAD] === pending) actor[ARCHIVED_ACTOR_LOAD] = null;
  };
  pending.then(clear, clear);
  return pending;
}

function resetDirectorNavigation(director, paused = false) {
  if (!director) return;
  director.paused = Boolean(paused);
  director.state = "idle";
  director.stateTime = 0;
  director.stopId = null;
  if (director.object?.position && director.target?.copy) director.target.copy(director.object.position);
  if (director.object?.position && director.lookAt?.copy) director.lookAt.copy(director.object.position);
  director.avatar?.setMotion?.(0, "open");
}

function clampFormationCoordinate(value, min, max) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return value;
  const low = min + PARTY_BOUNDS_MARGIN;
  const high = max - PARTY_BOUNDS_MARGIN;
  if (low > high) return (min + max) / 2;
  return THREE.MathUtils.clamp(value, low, high);
}

function shortestAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function frameDeltas(value) {
  const raw = Number.isFinite(value) && value > 0 ? value : 0;
  return {
    raw,
    visual: Math.min(0.05, raw),
    movement: Math.min(0.1, raw),
    navigation: Math.min(0.25, raw)
  };
}
