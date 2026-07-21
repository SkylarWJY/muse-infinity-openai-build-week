import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { withTimeout } from "./withTimeout.js";

const DEFAULT_LOAD_TIMEOUT_MS = 12_000;
const DEFAULT_STORY_DURATION_MS = 20_000;
const VALID_STATES = new Set(["idle", "loading", "ambient", "story", "completed", "failed", "cleared"]);
const IDENTITY_FRAME = Object.freeze({
  atMs: 0,
  position: Object.freeze([0, 0, 0]),
  rotation: Object.freeze([0, 0, 0]),
  scale: Object.freeze([1, 1, 1]),
  opacity: 1
});

export class ArtworkStoryDirector {
  constructor(scene, {
    loader = new GLTFLoader(),
    onStatus = () => {},
    loadTimeoutMs = DEFAULT_LOAD_TIMEOUT_MS,
    reducedMotion = false
  } = {}) {
    if (!scene?.add || !scene?.remove) throw new TypeError("artwork_story_scene_required");
    if (!loader?.loadAsync) throw new TypeError("artwork_story_loader_required");

    this.scene = scene;
    this.loader = loader;
    this.onStatus = typeof onStatus === "function" ? onStatus : () => {};
    this.loadTimeoutMs = Number.isFinite(loadTimeoutMs) && loadTimeoutMs >= 0
      ? loadTimeoutMs
      : DEFAULT_LOAD_TIMEOUT_MS;
    this.reducedMotion = Boolean(reducedMotion);
    this.group = new THREE.Group();
    this.group.name = "artwork-story";
    this.group.userData.forwardAxis = "+z";
    this.scene.add(this.group);

    this.state = "idle";
    this.sceneId = null;
    this.artworkId = null;
    this.config = null;
    this.asset = null;
    this.model = null;
    this.mixer = null;
    this.actions = { ambient: null, story: null };
    this.motionSpecs = { ambient: null, story: null };
    this.motion = "none";
    this.loaded = false;
    this.pendingTrigger = false;
    this.paused = false;
    this.storyElapsed = 0;
    this.ambientElapsed = 0;
    this.storyDuration = 0;
    this.nextCueIndex = 0;
    this.cues = [];
    this.error = null;
    this.generation = 0;
    this.loadPromise = null;
    this.modelBaseMatrix = new THREE.Matrix4();
    this.motionMatrix = new THREE.Matrix4();
    this.motionPosition = new THREE.Vector3();
    this.motionQuaternion = new THREE.Quaternion();
    this.motionScale = new THREE.Vector3();
    this.motionEuler = new THREE.Euler();
    this.projectionInverse = new THREE.Matrix4();
    this.projectionPoint = new THREE.Vector3();
    this.originalMaterials = new Map();
    this.disposed = false;
  }

  setWorld({ sceneId = null, artworkId = null, anchorMatrix = null, config = null } = {}) {
    if (this.disposed) return this.snapshot();
    this.releaseCurrent();
    const token = ++this.generation;
    this.sceneId = sceneId == null ? null : String(sceneId);
    this.artworkId = artworkId == null ? null : String(artworkId);
    this.config = config && typeof config === "object" ? config : null;
    this.asset = resolveAsset(this.config);
    this.applyAnchor(anchorMatrix);

    if (!this.config) {
      this.transition("idle", "world-without-living-artwork");
      return this.snapshot();
    }
    if (!this.artworkId || !this.asset) {
      this.fail(new Error("artwork_story_config_invalid"), "configuration");
      return this.snapshot();
    }

    this.motionSpecs = resolveMotionSpecs(this.config);
    this.cues = normalizeCues(this.config.cues);
    this.storyDuration = resolveDurationSeconds(this.config, this.motionSpecs.story);
    this.transition("loading", "asset-load-started");
    this.loadPromise = this.loadCurrent(token).catch(() => {}).finally(() => {
      if (token === this.generation) this.loadPromise = null;
    });
    return this.snapshot();
  }

  trigger(artworkId) {
    if (this.disposed || !this.artworkId || (artworkId != null && String(artworkId) !== this.artworkId)) return false;
    if (this.state === "loading") {
      this.pendingTrigger = true;
      this.emit({ type: "control", action: "trigger-pending" });
      return true;
    }
    if (this.state === "ambient") return this.startStory("trigger");
    return false;
  }

  pause(paused) {
    if (this.disposed) return false;
    const next = Boolean(paused);
    if (next === this.paused) return true;
    this.paused = next;
    if (this.mixer) this.mixer.timeScale = next ? 0 : 1;
    this.emit({ type: "control", action: next ? "pause" : "resume" });
    return true;
  }

  skip() {
    if (this.disposed) return false;
    if (this.state === "loading" && this.pendingTrigger) {
      this.pendingTrigger = false;
      this.emit({ type: "control", action: "skip-pending" });
      return true;
    }
    if (this.state !== "story") return false;
    this.completeStory("skip");
    return true;
  }

  replay() {
    if (this.disposed || !this.artworkId) return false;
    if (this.state === "loading") {
      this.pendingTrigger = true;
      this.emit({ type: "control", action: "replay-pending" });
      return true;
    }
    if (!["ambient", "story", "completed"].includes(this.state)) return false;
    return this.startStory("replay");
  }

  update(dt) {
    if (this.disposed || this.paused || !this.loaded) return this.snapshot();
    const delta = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    if (delta === 0) return this.snapshot();

    if (this.state === "story") {
      const previous = this.storyElapsed;
      this.storyElapsed = Math.min(this.storyDuration, this.storyElapsed + delta);
      if (!this.reducedMotion && !this.updateVisual("story", delta, this.storyElapsed)) return this.snapshot();
      this.emitCues(previous, this.storyElapsed);
      if (this.storyElapsed >= this.storyDuration) this.completeStory("finished");
    } else if (this.state === "ambient" || this.state === "completed") {
      this.ambientElapsed += delta;
      if (!this.reducedMotion) this.updateVisual("ambient", delta, this.ambientElapsed);
    }
    return this.snapshot();
  }

  clear() {
    if (this.disposed) return this.snapshot();
    this.generation += 1;
    this.releaseCurrent();
    this.transition("cleared", "clear");
    return this.snapshot();
  }

  dispose() {
    if (this.disposed) return;
    this.clear();
    this.scene.remove(this.group);
    this.disposed = true;
  }

  snapshot() {
    return {
      state: this.state,
      sceneId: this.sceneId,
      artworkId: this.artworkId,
      asset: this.asset,
      loaded: this.loaded,
      pendingTrigger: this.pendingTrigger,
      paused: this.paused,
      elapsed: this.storyElapsed,
      duration: this.storyDuration,
      reducedMotion: this.reducedMotion,
      motion: this.motion,
      error: this.error ? String(this.error.message || this.error) : null
    };
  }

  async loadCurrent(token) {
    let candidate = null;
    try {
      const gltf = await withTimeout(
        this.loader.loadAsync(this.asset),
        this.loadTimeoutMs,
        "artwork_story_timeout",
        { onLateResolve: (lateGltf) => disposeAssetTree(lateGltf?.scene) }
      );
      candidate = gltf?.scene;
      if (!candidate?.traverse) throw new Error("artwork_story_scene_required");
      if (this.disposed || token !== this.generation) {
        disposeAssetTree(candidate);
        candidate = null;
        return;
      }

      this.prepareModel(candidate, gltf?.animations || []);
      if (this.disposed || token !== this.generation) {
        disposeAssetTree(candidate);
        candidate = null;
        return;
      }
      this.model = candidate;
      candidate = null;
      this.group.add(this.model);
      this.loaded = true;
      this.error = null;
      if (!this.activateAmbientVisual()) return;
      this.transition("ambient", "asset-ready");
      if (this.pendingTrigger) {
        this.pendingTrigger = false;
        this.startStory("pending-trigger");
      }
    } catch (error) {
      disposeAssetTree(candidate);
      if (!this.disposed && token === this.generation) this.fail(error, "asset-load");
    }
  }

  prepareModel(model, animations) {
    applyModelDefaults(model, this.config?.frameLocalTransform || this.config?.localTransform || this.config?.transform);
    model.updateMatrix();
    this.modelBaseMatrix.copy(model.matrix);
    this.captureMaterialDefaults(model);

    const ambientClip = resolveClip(animations, this.motionSpecs.ambient, "ambient");
    const storyClip = resolveClip(animations, this.motionSpecs.story, "story");
    if (ambientClip || storyClip) this.mixer = new THREE.AnimationMixer(model);
    if (!Number.isFinite(this.storyDuration) || this.storyDuration <= 0) {
      this.storyDuration = storyClip?.duration > 0 ? storyClip.duration : DEFAULT_STORY_DURATION_MS / 1000;
    }
    const ambientDuration = motionDurationMs(this.motionSpecs.ambient, (ambientClip?.duration || 0) * 1000) / 1000;
    this.actions.ambient = ambientClip
      ? createAction(this.mixer, ambientClip, this.motionSpecs.ambient, true, ambientDuration)
      : null;
    this.actions.story = storyClip
      ? createAction(this.mixer, storyClip, this.motionSpecs.story, false, this.storyDuration)
      : null;
  }

  captureMaterialDefaults(model) {
    this.originalMaterials.clear();
    model.traverse((object) => {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!material || this.originalMaterials.has(material)) continue;
        this.originalMaterials.set(material, {
          opacity: Number.isFinite(material.opacity) ? material.opacity : 1,
          transparent: Boolean(material.transparent)
        });
      }
    });
  }

  startStory(reason) {
    if (!this.loaded || !this.model) return false;
    this.pendingTrigger = false;
    this.paused = false;
    this.model.visible = true;
    if (this.mixer) this.mixer.timeScale = 1;
    this.storyElapsed = 0;
    this.nextCueIndex = 0;
    this.stopActions();

    if (this.reducedMotion) {
      this.applyRepresentativeFrame("story");
      this.motion = "static";
    } else {
      this.restoreModelTransform();
      if (this.actions.story) this.actions.story.reset().play();
      this.mixer?.update(0);
      if (hasProceduralMotion(this.motionSpecs.story)) this.applyProceduralFrame(this.motionSpecs.story, 0);
      if (hasProceduralHandler(this.motionSpecs.story)
        && !this.invokeProceduralHandler(this.motionSpecs.story.handler, "story", 0, 0)) return false;
      this.enforceProjectionLimit();
      this.motion = motionKind(this.actions.story, this.motionSpecs.story);
    }

    this.transition("story", reason);
    this.emitCues(-Number.EPSILON, 0);
    return true;
  }

  completeStory(reason) {
    if (this.state !== "story") return;
    if (!this.reducedMotion && reason === "finished" && hasProceduralMotion(this.motionSpecs.story)) {
      this.applyProceduralFrame(this.motionSpecs.story, this.storyDuration);
    }
    this.paused = false;
    if (this.mixer) this.mixer.timeScale = 1;
    if (!this.activateAmbientVisual()) return;
    this.transition("completed", reason);
  }

  activateAmbientVisual() {
    this.stopActions();
    this.ambientElapsed = 0;
    if (this.model) this.model.visible = false;
    if (this.reducedMotion) {
      this.applyRepresentativeFrame("ambient");
      this.motion = "static";
    } else {
      this.restoreModelTransform();
      if (this.actions.ambient) this.actions.ambient.reset().play();
      this.mixer?.update(0);
      if (hasProceduralMotion(this.motionSpecs.ambient)) this.applyProceduralFrame(this.motionSpecs.ambient, 0);
      if (hasProceduralHandler(this.motionSpecs.ambient)
        && !this.invokeProceduralHandler(this.motionSpecs.ambient.handler, "ambient", 0, 0)) return false;
      this.enforceProjectionLimit();
      this.motion = motionKind(this.actions.ambient, this.motionSpecs.ambient);
    }
    return true;
  }

  updateVisual(phase, delta, elapsed) {
    const action = this.actions[phase];
    if (action) this.mixer?.update(delta);
    const motionSpec = this.motionSpecs[phase];
    if (hasProceduralMotion(motionSpec)) this.applyProceduralFrame(motionSpec, elapsed);
    if (hasProceduralHandler(motionSpec)
      && !this.invokeProceduralHandler(motionSpec.handler, phase, delta, elapsed)) return false;
    this.enforceProjectionLimit();
    return true;
  }

  applyRepresentativeFrame(phase) {
    this.stopActions();
    const motionSpec = this.motionSpecs[phase];
    const representativeSeconds = representativeTimeSeconds(this.config, motionSpec, phase, this.storyDuration);
    const action = this.actions[phase] || this.actions.story || this.actions.ambient;
    this.restoreModelTransform();
    if (action) {
      action.reset().play();
      action.time = Math.min(
        action.getClip().duration,
        representativeSeconds * Math.max(0, action.getEffectiveTimeScale())
      );
      this.mixer?.update(0);
      action.paused = true;
    }
    if (hasProceduralMotion(motionSpec)) this.applyProceduralFrame(motionSpec, representativeSeconds);
    this.enforceProjectionLimit();
  }

  applyProceduralFrame(spec, elapsedSeconds) {
    const durationMs = motionDurationMs(spec, this.storyDuration * 1000);
    const rawMs = Math.max(0, elapsedSeconds * 1000);
    const timeMs = spec.loop && durationMs > 0 ? rawMs % durationMs : Math.min(rawMs, durationMs);
    const frame = sampleTimeline(spec.timeline, timeMs);
    this.motionPosition.fromArray(frame.position);
    this.motionEuler.set(frame.rotation[0], frame.rotation[1], frame.rotation[2]);
    this.motionQuaternion.setFromEuler(this.motionEuler);
    this.motionScale.fromArray(frame.scale);
    this.motionMatrix.compose(this.motionPosition, this.motionQuaternion, this.motionScale);
    this.motionMatrix.premultiply(this.modelBaseMatrix);
    this.motionMatrix.decompose(this.model.position, this.model.quaternion, this.model.scale);
    this.model.updateMatrix();
    this.applyOpacity(frame.opacity);
  }

  enforceProjectionLimit() {
    const maxProjection = Number(this.config?.maxProjectionM);
    if (!this.model || !Number.isFinite(maxProjection) || maxProjection < 0) return;
    this.group.updateWorldMatrix(true, false);
    this.model.updateWorldMatrix(false, true);
    this.projectionInverse.copy(this.group.matrixWorld).invert();
    let furthestZ = -Infinity;

    this.model.traverse((object) => {
      if (!object.visible || !object.geometry) return;
      let bounds;
      if (object.isSkinnedMesh && typeof object.computeBoundingBox === "function") {
        object.computeBoundingBox();
        bounds = object.boundingBox;
      } else {
        if (!object.geometry.boundingBox) object.geometry.computeBoundingBox?.();
        bounds = object.geometry.boundingBox;
      }
      if (!bounds || bounds.isEmpty()) return;
      for (const x of [bounds.min.x, bounds.max.x]) {
        for (const y of [bounds.min.y, bounds.max.y]) {
          for (const z of [bounds.min.z, bounds.max.z]) {
            this.projectionPoint.set(x, y, z)
              .applyMatrix4(object.matrixWorld)
              .applyMatrix4(this.projectionInverse);
            furthestZ = Math.max(furthestZ, this.projectionPoint.z);
          }
        }
      }
    });

    if (furthestZ <= maxProjection) return;
    this.model.position.z -= furthestZ - maxProjection;
    this.model.updateMatrix();
    this.model.updateWorldMatrix(false, true);
  }

  invokeProceduralHandler(handler, phase, delta, elapsed) {
    try {
      handler({
        root: this.model,
        model: this.model,
        group: this.group,
        phase,
        state: this.state,
        time: elapsed,
        elapsed,
        dt: delta,
        duration: phase === "story" ? this.storyDuration : motionDurationMs(this.motionSpecs.ambient) / 1000,
        progress: phase === "story" && this.storyDuration > 0 ? Math.min(1, elapsed / this.storyDuration) : 0,
        config: this.config
      });
      return true;
    } catch (error) {
      this.fail(error, "procedural-motion");
      return false;
    }
  }

  applyOpacity(factor) {
    const safeFactor = THREE.MathUtils.clamp(Number.isFinite(factor) ? factor : 1, 0, 1);
    for (const [material, defaults] of this.originalMaterials) {
      material.opacity = defaults.opacity * safeFactor;
      material.transparent = defaults.transparent || material.opacity < 1;
      material.needsUpdate = true;
    }
  }

  restoreModelTransform() {
    if (!this.model) return;
    this.modelBaseMatrix.decompose(this.model.position, this.model.quaternion, this.model.scale);
    this.model.updateMatrix();
    this.applyOpacity(1);
  }

  stopActions() {
    this.mixer?.stopAllAction();
    for (const action of Object.values(this.actions)) {
      if (action) action.paused = false;
    }
  }

  emitCues(previousSeconds, currentSeconds) {
    const previousMs = previousSeconds * 1000;
    const currentMs = currentSeconds * 1000;
    while (this.nextCueIndex < this.cues.length) {
      const cue = this.cues[this.nextCueIndex];
      if (cue.atMs > currentMs) break;
      this.nextCueIndex += 1;
      if (cue.atMs >= previousMs) this.emit({ type: "cue", cue });
    }
  }

  applyAnchor(anchorMatrix) {
    this.group.position.set(0, 0, 0);
    this.group.quaternion.identity();
    this.group.scale.set(1, 1, 1);
    const matrix = toMatrix4(anchorMatrix);
    matrix.decompose(this.group.position, this.group.quaternion, this.group.scale);
    this.group.updateMatrix();
    this.group.updateMatrixWorld(true);
  }

  fail(error, reason) {
    this.error = error instanceof Error ? error : new Error(String(error || "artwork_story_failed"));
    this.pendingTrigger = false;
    this.paused = false;
    this.motion = "none";
    if (this.model) this.model.visible = false;
    this.transition("failed", reason, { error: this.error });
  }

  transition(state, reason, details = {}) {
    if (!VALID_STATES.has(state)) return;
    const previousState = this.state;
    this.state = state;
    this.emit({ type: "state", state, previousState, reason, ...details });
  }

  emit(event) {
    try {
      this.onStatus({ ...this.snapshot(), ...event });
    } catch {
      // Status consumers cannot interrupt the render lifecycle.
    }
  }

  releaseCurrent() {
    this.stopActions();
    if (this.mixer && this.model) this.mixer.uncacheRoot(this.model);
    if (this.model) {
      this.group.remove(this.model);
      disposeAssetTree(this.model);
    }
    this.group.clear();
    this.sceneId = null;
    this.artworkId = null;
    this.config = null;
    this.asset = null;
    this.model = null;
    this.mixer = null;
    this.actions = { ambient: null, story: null };
    this.motionSpecs = { ambient: null, story: null };
    this.motion = "none";
    this.loaded = false;
    this.pendingTrigger = false;
    this.paused = false;
    this.storyElapsed = 0;
    this.ambientElapsed = 0;
    this.storyDuration = 0;
    this.nextCueIndex = 0;
    this.cues = [];
    this.error = null;
    this.loadPromise = null;
    this.originalMaterials.clear();
  }
}

function resolveAsset(config) {
  return config?.asset || config?.url || config?.glb || null;
}

function resolveMotionSpecs(config) {
  const formal = config?.motion || {};
  const clips = config?.clips || {};
  const legacyTimeline = config?.proceduralTimeline || config?.procedural || null;
  return {
    ambient: normalizeMotionSpec(formal.ambient, clips.ambient || config?.ambientClip, legacyTimeline?.ambient),
    story: normalizeMotionSpec(formal.story, clips.story || config?.storyClip, legacyTimeline?.story || (typeof legacyTimeline === "function" ? legacyTimeline : null))
  };
}

function normalizeMotionSpec(spec, legacyClip, legacyHandler) {
  if (spec?.type === "clip") return { ...spec, type: "clip" };
  if (spec?.type === "procedural") {
    return {
      ...spec,
      type: "procedural",
      timeline: normalizeTimeline(spec.timeline),
      handler: typeof spec.handler === "function" ? spec.handler : null
    };
  }
  if (typeof spec === "string") return { type: "clip", clip: spec };
  if (legacyClip) {
    return {
      type: "clip",
      clip: typeof legacyClip === "string" ? legacyClip : legacyClip.name,
      handler: typeof legacyHandler === "function" ? legacyHandler : null
    };
  }
  if (typeof legacyHandler === "function") return { type: "procedural", timeline: [], handler: legacyHandler };
  return null;
}

function normalizeTimeline(timeline) {
  if (!Array.isArray(timeline) || timeline.length === 0) return [];
  return timeline.map((entry) => ({
    atMs: Math.max(0, Number(entry?.atMs) || 0),
    position: finiteVector(entry?.position, [0, 0, 0]),
    rotation: finiteVector(entry?.rotation, [0, 0, 0]),
    scale: finiteVector(entry?.scale, [1, 1, 1]),
    opacity: Number.isFinite(entry?.opacity) ? THREE.MathUtils.clamp(entry.opacity, 0, 1) : 1
  })).sort((left, right) => left.atMs - right.atMs);
}

function normalizeCues(cues) {
  if (!Array.isArray(cues)) return [];
  return cues.map((cue, order) => ({
    cue: Object.freeze({
      ...cue,
      atMs: Math.max(0, Number.isFinite(cue?.atMs) ? cue.atMs : (Number(cue?.at) || 0) * 1000)
    }),
    order
  })).sort((left, right) => left.cue.atMs - right.cue.atMs || left.order - right.order)
    .map(({ cue }) => cue);
}

function resolveDurationSeconds(config, storySpec) {
  const milliseconds = firstPositive(
    storySpec?.durationMs,
    storySpec?.timeline?.at?.(-1)?.atMs,
    config?.durationMs,
    Number(config?.storyDuration) * 1000,
    Number(config?.duration) * 1000
  );
  return milliseconds / 1000;
}

function motionDurationMs(spec, fallback = DEFAULT_STORY_DURATION_MS) {
  if (Number.isFinite(spec?.durationMs) && spec.durationMs > 0) return spec.durationMs;
  const finalFrame = spec?.timeline?.at?.(-1);
  return Number.isFinite(finalFrame?.atMs) && finalFrame.atMs > 0 ? finalFrame.atMs : fallback;
}

function representativeTimeSeconds(config, spec, phase, storyDuration) {
  const configured = typeof config?.representativeAtMs === "object"
    ? config.representativeAtMs?.[phase]
    : config?.representativeAtMs;
  if (Number.isFinite(configured) && configured >= 0) return configured / 1000;
  const fallbackMs = phase === "story" ? storyDuration * 1000 : DEFAULT_STORY_DURATION_MS;
  return motionDurationMs(spec, fallbackMs) / 2000;
}

function firstPositive(...values) {
  return values.find((value) => Number.isFinite(value) && value > 0) || 0;
}

function resolveClip(animations, spec, phase) {
  if (!spec || !Array.isArray(animations) || (spec.type !== "clip" && !spec.clip)) return null;
  const requested = String(spec.clip || "").trim().toLowerCase();
  if (requested) {
    return animations.find((clip) => String(clip?.name || "").toLowerCase() === requested)
      || animations.find((clip) => String(clip?.name || "").toLowerCase().includes(requested))
      || null;
  }
  const terms = phase === "ambient" ? ["ambient", "idle", "loop"] : ["story", "action", "main"];
  return animations.find((clip) => terms.some((term) => String(clip?.name || "").toLowerCase().includes(term))) || null;
}

function createAction(mixer, clip, spec, defaultLoop, phaseDuration) {
  const action = mixer.clipAction(clip);
  const shouldLoop = typeof spec?.loop === "boolean" ? spec.loop : defaultLoop;
  action.enabled = true;
  action.clampWhenFinished = !shouldLoop;
  action.setLoop(shouldLoop ? THREE.LoopRepeat : THREE.LoopOnce, shouldLoop ? Infinity : 1);
  const normalizedDuration = Number.isFinite(phaseDuration) && phaseDuration > 0 ? phaseDuration : clip.duration;
  action.setEffectiveTimeScale(clip.duration > 0 && normalizedDuration > 0 ? clip.duration / normalizedDuration : 1);
  return action;
}

function hasProceduralMotion(spec) {
  return spec?.type === "procedural" && Array.isArray(spec.timeline) && spec.timeline.length > 0;
}

function hasProceduralHandler(spec) {
  return typeof spec?.handler === "function";
}

function motionKind(action, spec) {
  const procedural = hasProceduralMotion(spec) || hasProceduralHandler(spec);
  if (action && procedural) return "hybrid";
  if (action) return "clip";
  if (procedural) return "procedural";
  return "static";
}

function sampleTimeline(timeline, atMs) {
  if (!timeline?.length) return IDENTITY_FRAME;
  if (atMs <= timeline[0].atMs) return timeline[0];
  const last = timeline[timeline.length - 1];
  if (atMs >= last.atMs) return last;
  let rightIndex = 1;
  while (rightIndex < timeline.length && timeline[rightIndex].atMs < atMs) rightIndex += 1;
  const left = timeline[rightIndex - 1];
  const right = timeline[rightIndex];
  const span = Math.max(1, right.atMs - left.atMs);
  const alpha = THREE.MathUtils.clamp((atMs - left.atMs) / span, 0, 1);
  return {
    atMs,
    position: interpolateVector(left.position, right.position, alpha),
    rotation: interpolateVector(left.rotation, right.rotation, alpha),
    scale: interpolateVector(left.scale, right.scale, alpha),
    opacity: THREE.MathUtils.lerp(left.opacity, right.opacity, alpha)
  };
}

function interpolateVector(left, right, alpha) {
  return [
    THREE.MathUtils.lerp(left[0], right[0], alpha),
    THREE.MathUtils.lerp(left[1], right[1], alpha),
    THREE.MathUtils.lerp(left[2], right[2], alpha)
  ];
}

function applyModelDefaults(model, transform) {
  const position = finiteVector(transform?.position, [0, 0, 0]);
  const rotation = finiteVector(transform?.rotation, [0, 0, 0]);
  const scale = Number.isFinite(transform?.scale)
    ? [transform.scale, transform.scale, transform.scale]
    : finiteVector(transform?.scale, [1, 1, 1]);
  model.position.fromArray(position);
  model.rotation.fromArray(rotation);
  model.scale.fromArray(scale);
}

function finiteVector(value, fallback) {
  if (Array.isArray(value) && value.length >= 3 && value.slice(0, 3).every(Number.isFinite)) return value.slice(0, 3);
  if (value && [value.x, value.y, value.z].every(Number.isFinite)) return [value.x, value.y, value.z];
  return [...fallback];
}

function toMatrix4(value) {
  if (value?.isMatrix4 && value.elements.every(Number.isFinite)) return value;
  if (Array.isArray(value) && value.length === 16 && value.every(Number.isFinite)) return new THREE.Matrix4().fromArray(value);
  if (ArrayBuffer.isView(value) && value.length === 16 && [...value].every(Number.isFinite)) return new THREE.Matrix4().fromArray(value);
  return new THREE.Matrix4();
}

function disposeAssetTree(root) {
  if (!root?.traverse) return;
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  root.traverse((object) => {
    if (object.geometry?.dispose) geometries.add(object.geometry);
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of objectMaterials) {
      if (!material?.dispose) continue;
      materials.add(material);
      collectMaterialTextures(material, textures);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) texture.dispose();
  root.removeFromParent?.();
}

function collectMaterialTextures(material, textures) {
  for (const value of Object.values(material)) {
    if (value?.isTexture) textures.add(value);
  }
  for (const uniform of Object.values(material.uniforms || {})) {
    const value = uniform?.value;
    if (value?.isTexture) textures.add(value);
    else if (Array.isArray(value)) for (const item of value) if (item?.isTexture) textures.add(item);
  }
}
