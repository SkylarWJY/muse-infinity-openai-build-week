import * as THREE from "three";
import { getCompanion } from "../config/legacyAssets.js";
import { GuideDirector } from "./GuideDirector.js";
import { ArchivedAvatar } from "./ArchivedAvatar.js";
import { LearnerAvatar } from "./LearnerAvatar.js";
import { ProceduralAvatar } from "./ProceduralAvatar.js";
import { WorldLayer, currentSceneQuality } from "./WorldLayer.js";
import { WORLDS, getSceneStop } from "../config/scenes.js";

const LEARNER_WALK_SPEED = 1.33;
const LEARNER_FOLLOW_CATCHUP_SPEED = 1.6;

const PARTY_FORMATION_SLOTS = Object.freeze([
  Object.freeze({ side: -0.9, behind: 0.65 }),
  Object.freeze({ side: 0.9, behind: 0.65 })
]);
const PARTY_BOUNDS_MARGIN = 0.35;

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
    this.activeStopId = null;
    this.activeWorld = WORLDS[0];
    this.activeWorldLive = false;
    this.ready = false;
    this.frames = [];
    this.startAt = performance.now();

    this.setupLights();
    this.worldLayer = new WorldLayer(this.scene, { renderer: this.renderer, quality, onStatus: onWorldLayerStatus });
    this.player = new LearnerAvatar();
    this.guide = new ProceduralAvatar({ coat: 0x1a312d, accent: 0xd8ff42, skin: 0xa66f55, name: "Mira" });
    this.player.group.position.set(0.8, 0, 5.2);
    this.guide.group.position.set(-0.7, 0, 3.4);
    this.scene.add(this.player.group, this.guide.group);
    this.director = new GuideDirector({ avatar: this.guide, onState: (event) => this.handleGuideState(event) });
    this.bindInput();
    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
  }

  async init() {
    this.ready = true;
    this.animate();
    const world = this.setWorld(WORLDS[0].id);
    this.player.load().catch(() => null);
    this.setCompanions(this.companionIds).catch(() => null);
    return world;
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
    this.director.paused = true;
    await this.showSalonCharacters(false);
    if (token !== this.worldToken) return this.activeWorld;
    this.applyWorldProfile(world, false);
    const archiveLive = await this.worldLayer.build(world);
    if (token !== this.worldToken) return this.activeWorld;
    this.activeWorld = world;
    this.activeWorldLive = archiveLive && this.worldLayer.isLive(world.id);
    this.applyWorldProfile(world, true);
    this.director.paused = false;
    if (this.activeStopId && getSceneStop(this.activeStopId, world.id)) this.navigateTo(this.activeStopId);
    return world;
  }

  isWorldReady(worldId = this.activeWorld.id) {
    return this.activeWorld.id === worldId
      && this.activeWorldLive === true
      && this.worldLayer.isLive(worldId);
  }

  applyWorldProfile(world, snapToCollider) {
    const profile = world.profile;
    this.activeWorld = world;
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
      avatar.group.visible = !this.salonVisible;
      this.scene.add(avatar.group);
      this.scene.remove(previous.group);
      this.guide = avatar;
      this.director.setAvatar(avatar);
      previous.dispose?.();
      guide = avatar;
      createdGuide = true;
      pending.push(avatar.load());
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
      actor.group.visible = !this.salonVisible;
      this.scene.add(actor.group);
      pending.push(actor.load());
      return actor;
    });
    this.partyActors = partyActors;
    this.retireActors(retiredParty);
    this.placePartyAtFormation(true);
    this.setPermanentPartyVisible(!this.salonVisible);

    if (this.salonVisible) pending.push(this.showSalonCharacters(true));
    await Promise.all(pending);
    if (token !== this.companionToken) {
      if (createdGuide && this.guide !== guide) this.retireActors([guide]);
      this.retireActors(partyActors.filter((actor) => !this.partyActors.includes(actor)));
      return selected[0];
    }
    return selected[0];
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
    if (sameActorRoster(this.salonActors, this.companionIds)) return;
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
      actor.group.position.y = this.worldLayer.groundHeightAt(actor.group.position.x, actor.group.position.z);
      actor.group.lookAt(this.player.group.position.x, actor.group.position.y, this.player.group.position.z);
      actor.setMotion(0, "open");
      this.scene.add(actor.group);
      actors.push(actor);
      return actor.load();
    });
    await Promise.all(pending);
    if (token !== this.salonToken || !this.salonVisible) {
      this.retireActors(actors);
      if (this.salonActors === actors) this.salonActors = [];
    }
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
    for (const [index, actor] of this.partyActors.entries()) {
      const target = resolvePartyFormation(this.player.group.position, this.player.group.rotation.y, index, this.activeWorld.profile.bounds);
      actor.group.position.set(target.x, snapToCollider ? this.worldLayer.groundHeightAt(target.x, target.z) : groundY, target.z);
      actor.group.rotation.y = target.yaw;
      actor.setMotion(0, "open");
    }
  }

  updateParty(dt) {
    if (this.salonVisible) return;
    const bounds = this.activeWorld.profile.bounds;
    for (const [index, actor] of this.partyActors.entries()) {
      const target = resolvePartyFormation(this.player.group.position, this.player.group.rotation.y, index, bounds);
      const dx = target.x - actor.group.position.x;
      const dz = target.z - actor.group.position.z;
      const distance = Math.hypot(dx, dz);
      let speed = 0;
      if (distance > 0.08) {
        speed = Math.min(3.65, Math.max(0.65, distance * 3.2));
        const step = Math.min(distance, speed * dt);
        actor.group.position.x += dx / distance * step;
        actor.group.position.z += dz / distance * step;
        const targetYaw = Math.atan2(dx, dz);
        actor.group.rotation.y += shortestAngle(targetYaw - actor.group.rotation.y) * Math.min(1, dt * 9);
      } else {
        actor.group.rotation.y += shortestAngle(target.yaw - actor.group.rotation.y) * Math.min(1, dt * 7);
      }
      actor.group.position.y = this.worldLayer.groundHeightAt(actor.group.position.x, actor.group.position.z);
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
    this.activeStopId = stopId;
    this.worldLayer.highlight(stopId, "focus");
    const pose = this.worldLayer.stopPose(stopId);
    const target = pose ? { ...stop, ...pose } : stop;
    const guideAnchor = [...target.guideAnchor];
    guideAnchor[1] = this.worldLayer.groundHeightAt(guideAnchor[0], guideAnchor[2]);
    this.director.goTo({ ...target, guideAnchor });
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
      const behind = new THREE.Vector3(0, 0, -1.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.guide.group.rotation.y);
      const target = this.guide.group.position.clone().add(behind);
      const delta = target.sub(this.player.group.position);
      delta.y = 0;
      if (delta.length() > 0.25) velocity.copy(delta.normalize().multiplyScalar(Math.min(LEARNER_FOLLOW_CATCHUP_SPEED, delta.length() * 1.7)));
    }
    this.player.group.position.addScaledVector(velocity, dt);
    const bounds = this.activeWorld.profile.bounds;
    this.player.group.position.x = THREE.MathUtils.clamp(this.player.group.position.x, bounds.minX + 0.25, bounds.maxX - 0.25);
    this.player.group.position.z = THREE.MathUtils.clamp(this.player.group.position.z, bounds.minZ + 0.25, bounds.maxZ - 0.25);
    this.player.group.position.y = this.worldLayer.groundHeightAt(this.player.group.position.x, this.player.group.position.z);
    if (velocity.lengthSq() > 0.001) {
      const yaw = Math.atan2(velocity.x, velocity.z);
      this.player.group.rotation.y += shortestAngle(yaw - this.player.group.rotation.y) * Math.min(1, dt * 10);
    }
    this.player.setMotion(velocity.length(), "open");
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
    this.director.update(dt.navigation);
    this.guide.group.position.y = this.worldLayer.groundHeightAt(this.guide.group.position.x, this.guide.group.position.z);
    this.updatePlayer(dt.movement);
    this.updateParty(dt.movement);
    this.player.update(dt.visual, this.elapsed);
    this.guide.update(dt.visual, this.elapsed);
    for (const actor of this.partyActors) actor.update(dt.visual, this.elapsed);
    for (const actor of this.salonActors) actor.update(dt.visual, this.elapsed);
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
