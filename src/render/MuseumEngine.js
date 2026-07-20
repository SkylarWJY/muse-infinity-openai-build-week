import * as THREE from "three";
import { getCompanion } from "../config/legacyAssets.js";
import { GuideDirector } from "./GuideDirector.js";
import { ArchivedAvatar } from "./ArchivedAvatar.js";
import { LearnerAvatar } from "./LearnerAvatar.js";
import { ProceduralAvatar } from "./ProceduralAvatar.js";
import { WorldLayer } from "./WorldLayer.js";
import { WORLDS, getSceneStop } from "../config/scenes.js";

export class MuseumEngine {
  constructor(container, { onGuideState = () => {}, onMetrics = () => {}, onFollowChange = () => {}, onWorldLayerStatus = () => {}, onCompanionStatus = () => {} } = {}) {
    this.container = container;
    this.onGuideState = onGuideState;
    this.onMetrics = onMetrics;
    this.onFollowChange = onFollowChange;
    this.onWorldLayerStatus = onWorldLayerStatus;
    this.onCompanionStatus = onCompanionStatus;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(52, 1, 0.08, 90);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
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
    this.salonActors = [];
    this.companionIds = ["monet", "van-gogh", "socrates"];
    this.companionToken = 0;
    this.worldToken = 0;
    this.salonToken = 0;
    this.activeStopId = null;
    this.activeWorld = WORLDS[0];
    this.ready = false;
    this.frames = [];
    this.startAt = performance.now();

    this.setupLights();
    this.worldLayer = new WorldLayer(this.scene, { renderer: this.renderer, onStatus: onWorldLayerStatus });
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
    const world = await this.setWorld(WORLDS[0].id);
    await Promise.all([this.player.load(), this.setCompanions(this.companionIds)]);
    this.ready = true;
    this.animate();
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
    await this.worldLayer.build(world);
    if (token !== this.worldToken) return this.activeWorld;
    this.activeWorld = world;
    const profile = world.profile;
    this.camera.far = profile.cameraFar;
    this.camera.updateProjectionMatrix();
    this.cameraYaw = -profile.yaw;
    const right = new THREE.Vector3(Math.cos(profile.yaw), 0, Math.sin(profile.yaw));
    this.player.group.position.set(profile.spawn.x, profile.groundY, profile.spawn.z).addScaledVector(right, 0.5);
    this.player.group.rotation.y = profile.yaw + Math.PI;
    this.guide.group.position.set(profile.guideSpawn.x, profile.groundY, profile.guideSpawn.z);
    this.guide.group.rotation.y = profile.yaw + Math.PI;
    this.director.paused = false;
    if (this.activeStopId) this.navigateTo(this.activeStopId);
    return world;
  }

  async setCompanions(ids) {
    const selected = [...new Set(ids)].map(getCompanion).filter(Boolean).slice(0, 3);
    if (!selected.length) throw new Error("companions_required");
    this.companionIds = selected.map((item) => item.id);
    if (this.guide instanceof ArchivedAvatar && this.guide.companion.id === selected[0].id) return selected[0];
    const token = ++this.companionToken;
    const previous = this.guide;
    const avatar = new ArchivedAvatar({
      companion: selected[0],
      onStatus: (event) => {
        if (token !== this.companionToken) return;
        this.onCompanionStatus(event);
      }
    });
    avatar.group.position.copy(previous.group.position);
    avatar.group.rotation.copy(previous.group.rotation);
    this.scene.add(avatar.group);
    this.scene.remove(previous.group);
    this.guide = avatar;
    this.director.setAvatar(avatar);
    await avatar.load();
    if (token !== this.companionToken) {
      this.scene.remove(avatar.group);
      avatar.dispose();
      return selected[0];
    }
    if (previous instanceof ArchivedAvatar) previous.dispose();
    return selected[0];
  }

  async showSalonCharacters(visible = true) {
    if (!visible) {
      this.salonToken += 1;
      const retired = this.salonActors;
      this.salonActors = [];
      for (const actor of retired) {
        this.scene.remove(actor.group);
        actor.dispose?.();
      }
      return;
    }
    if (this.salonActors.length) return;
    const token = ++this.salonToken;
    const yaw = this.activeWorld.profile.yaw;
    const forward = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
    const center = this.player.group.position.clone().addScaledVector(forward, 3.4);
    const companions = this.companionIds.map(getCompanion).filter(Boolean);
    const actors = [];
    this.salonActors = actors;
    const pending = companions.map((companion, index) => {
      const actor = new ArchivedAvatar({ companion, height: 1.68, onStatus: this.onCompanionStatus });
      const spread = [-1.65, 0, 1.65][index] || 0;
      actor.group.position.copy(center).addScaledVector(right, spread);
      actor.group.position.y = this.activeWorld.profile.groundY;
      actor.group.lookAt(this.player.group.position.x, actor.group.position.y, this.player.group.position.z);
      actor.setMotion(0, "open");
      this.scene.add(actor.group);
      actors.push(actor);
      return actor.load();
    });
    await Promise.all(pending);
    if (token !== this.salonToken) {
      for (const actor of actors) {
        this.scene.remove(actor.group);
        actor.dispose?.();
      }
      if (this.salonActors === actors) this.salonActors = [];
    }
  }

  navigateTo(stopId) {
    const stop = getSceneStop(stopId, this.activeWorld.id);
    if (!stop) throw new Error(`unknown_scene_stop:${stopId}`);
    this.activeStopId = stopId;
    this.worldLayer.highlight(stopId, "focus");
    this.director.goTo(stop);
  }

  applyEffect(stopId, effect) {
    this.worldLayer.highlight(stopId, effect);
    const stop = getSceneStop(stopId, this.activeWorld.id);
    if (!stop) return;
    const color = effect === "warmth" ? 0xff6b4a : effect === "ripple" ? 0x63dfe0 : 0xd8ff42;
    const anchor = new THREE.Vector3().fromArray(stop.guideAnchor).add(new THREE.Vector3(0, 0.04, 0));
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
      velocity.addScaledVector(cameraForward, forward).addScaledVector(cameraRight, side).normalize().multiplyScalar(2.9);
    } else if (this.followGuide && this.director.state === "walking") {
      const behind = new THREE.Vector3(0, 0, -1.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.guide.group.rotation.y);
      const target = this.guide.group.position.clone().add(behind);
      const delta = target.sub(this.player.group.position);
      delta.y = 0;
      if (delta.length() > 0.25) velocity.copy(delta.normalize().multiplyScalar(Math.min(2.7, delta.length() * 1.7)));
    }
    this.player.group.position.addScaledVector(velocity, dt);
    const bounds = this.activeWorld.profile.bounds;
    this.player.group.position.x = THREE.MathUtils.clamp(this.player.group.position.x, bounds.minX + 0.25, bounds.maxX - 0.25);
    this.player.group.position.z = THREE.MathUtils.clamp(this.player.group.position.z, bounds.minZ + 0.25, bounds.maxZ - 0.25);
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
    this.updatePlayer(dt.movement);
    this.player.update(dt.visual, this.elapsed);
    this.guide.update(dt.visual, this.elapsed);
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
        canvas: { width: this.renderer.domElement.width, height: this.renderer.domElement.height }
      };
    }
    window.__MUSE_METRICS__.actors = 2 + this.salonActors.length;
    window.__MUSE_METRICS__.archivedWorld = this.worldLayer.splat?.splat?.isInitialized ? this.activeWorld.id : null;
    window.__MUSE_METRICS__.archivedCompanion = this.guide.ready ? this.companionIds[0] : null;
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
