import * as THREE from "three";
import { withTimeout } from "./withTimeout.js";

const DEFAULT_LOAD_TIMEOUT_MS = 15_000;
const DEFAULT_DURATION_MS = 5_000;
const REVEAL_END_SECONDS = 0.65;
const CAMERA_END_SECONDS = 4.2;
const VALID_STATES = new Set(["idle", "loading", "ready", "story", "completed", "failed", "cleared"]);

export class ArtworkVisionDirector {
  constructor(container, {
    onStatus = () => {},
    runtimeFactory = createArtworkVisionRuntime,
    loadTimeoutMs = DEFAULT_LOAD_TIMEOUT_MS,
    reducedMotion = defaultReducedMotion(),
    mobile = defaultMobileAsset()
  } = {}) {
    if (!container?.appendChild) throw new TypeError("artwork_vision_container_required");
    if (typeof runtimeFactory !== "function") throw new TypeError("artwork_vision_runtime_factory_required");
    this.container = container;
    this.onStatus = typeof onStatus === "function" ? onStatus : () => {};
    this.runtimeFactory = runtimeFactory;
    this.loadTimeoutMs = Number.isFinite(loadTimeoutMs) && loadTimeoutMs >= 0
      ? loadTimeoutMs
      : DEFAULT_LOAD_TIMEOUT_MS;
    this.reducedMotion = Boolean(reducedMotion);
    this.mobile = Boolean(mobile);

    this.state = "idle";
    this.sceneId = null;
    this.artworkId = null;
    this.config = null;
    this.source = null;
    this.runtime = null;
    this.loadingRuntime = null;
    this.loaded = false;
    this.pendingTrigger = false;
    this.paused = false;
    this.elapsed = 0;
    this.duration = 0;
    this.nextCueIndex = 0;
    this.cues = [];
    this.error = null;
    this.revealOrigin = { x: 0.5, y: 0.5 };
    this.generation = 0;
    this.loadPromise = null;
    this.disposed = false;
  }

  setWorld({ sceneId = null, artworkId = null, config = null } = {}) {
    if (this.disposed) return this.snapshot();
    const token = ++this.generation;
    this.releaseCurrent();
    this.sceneId = sceneId == null ? null : String(sceneId);
    this.artworkId = artworkId == null ? null : String(artworkId);
    this.config = config && typeof config === "object" ? config : null;
    this.source = this.reducedMotion
      ? representativeFrame(this.config)
      : selectArtworkVisionAsset(this.config, this.mobile);

    if (!this.config) {
      this.transition("idle", "world-without-artwork-vision");
      return this.snapshot();
    }
    if (!this.artworkId || !this.source || !this.config.vision) {
      this.fail(new Error("artwork_vision_config_invalid"), "configuration");
      return this.snapshot();
    }

    this.duration = resolveDurationSeconds(this.config);
    this.cues = normalizeCues(this.config.vision.cues);
    this.transition("loading", "asset-load-started");
    const pending = this.loadCurrent(token);
    const tracked = pending.finally(() => {
      if (token === this.generation && this.loadPromise === tracked) this.loadPromise = null;
    });
    this.loadPromise = tracked;
    return this.snapshot();
  }

  async whenReady() {
    const pending = this.loadPromise;
    if (pending) await pending.catch(() => {});
    return this.snapshot();
  }

  trigger(artworkId) {
    if (this.disposed || !this.artworkId || (artworkId != null && String(artworkId) !== this.artworkId)) return false;
    if (this.state === "loading") {
      this.pendingTrigger = true;
      this.emit({ type: "control", action: "trigger-pending" });
      return true;
    }
    if (this.state === "ready") return this.start("trigger");
    return false;
  }

  setRevealOrigin(origin = {}) {
    const x = Number(origin.x);
    const y = Number(origin.y);
    this.revealOrigin = {
      x: Number.isFinite(x) ? clamp01(x) : 0.5,
      y: Number.isFinite(y) ? clamp01(y) : 0.5
    };
    return { ...this.revealOrigin };
  }

  pause(paused) {
    if (this.disposed || this.state !== "story") return false;
    const next = Boolean(paused);
    if (next === this.paused) return true;
    this.paused = next;
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
    this.complete("skip");
    return true;
  }

  replay() {
    if (this.disposed || !this.artworkId) return false;
    if (this.state === "loading") {
      this.pendingTrigger = true;
      this.emit({ type: "control", action: "replay-pending" });
      return true;
    }
    if (!["ready", "story", "completed"].includes(this.state)) return false;
    return this.start("replay");
  }

  update(dt) {
    if (this.disposed || this.paused || this.state !== "story" || !this.runtime) return this.snapshot();
    const delta = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    if (delta === 0) return this.snapshot();
    const previous = this.elapsed;
    this.elapsed = Math.min(this.duration, this.elapsed + delta);
    this.applyFrame(this.elapsed);
    this.emitCues(previous, this.elapsed);
    if (this.elapsed >= this.duration) this.complete("finished");
    return this.snapshot();
  }

  resize() {
    const width = Math.max(1, Number(this.container.clientWidth) || 1);
    const height = Math.max(1, Number(this.container.clientHeight) || 1);
    const dprCap = this.mobile ? 1.25 : 1.6;
    const pixelRatio = Math.min(defaultDevicePixelRatio(), dprCap);
    this.runtime?.resize?.(width, height, pixelRatio);
    if (this.loadingRuntime !== this.runtime) this.loadingRuntime?.resize?.(width, height, pixelRatio);
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
    this.disposed = true;
  }

  snapshot() {
    return {
      state: this.state,
      sceneId: this.sceneId,
      artworkId: this.artworkId,
      asset: this.source,
      loaded: this.loaded,
      pendingTrigger: this.pendingTrigger,
      paused: this.paused,
      elapsed: this.elapsed,
      duration: this.duration,
      reducedMotion: this.reducedMotion,
      mobile: this.mobile,
      error: this.error ? String(this.error.message || this.error) : null,
      revealOrigin: { ...this.revealOrigin }
    };
  }

  async loadCurrent(token) {
    let candidate = null;
    try {
      candidate = await withTimeout(this.runtimeFactory({
        container: this.container,
        source: this.source,
        config: this.config,
        reducedMotion: this.reducedMotion,
        mobile: this.mobile
      }), this.loadTimeoutMs, "artwork_vision_runtime_timeout", {
        onLateResolve: (runtime) => safeDispose(runtime)
      });
      if (!candidate?.ready || typeof candidate?.setVisible !== "function" || typeof candidate?.render !== "function") {
        throw new Error("artwork_vision_runtime_invalid");
      }
      if (this.disposed || token !== this.generation) {
        safeDispose(candidate);
        return;
      }
      this.loadingRuntime = candidate;
      candidate.setVisible(false);
      candidate.setOpacity?.(0);
      this.resize();
      await withTimeout(candidate.ready, this.loadTimeoutMs, "artwork_vision_asset_timeout", {
        onLateResolve: () => safeDispose(candidate)
      });
      if (this.disposed || token !== this.generation || this.loadingRuntime !== candidate) {
        safeDispose(candidate);
        return;
      }

      this.loadingRuntime = null;
      this.runtime = candidate;
      candidate = null;
      this.loaded = true;
      this.error = null;
      this.transition("ready", "asset-ready");
      if (this.pendingTrigger) {
        this.pendingTrigger = false;
        this.start("pending-trigger");
      }
    } catch (error) {
      if (this.loadingRuntime === candidate) this.loadingRuntime = null;
      safeDispose(candidate);
      if (!this.disposed && token === this.generation) this.fail(error, "asset-load");
    }
  }

  start(reason) {
    if (!this.loaded || !this.runtime) return false;
    this.pendingTrigger = false;
    this.paused = false;
    this.elapsed = 0;
    this.nextCueIndex = 0;
    this.runtime.setOpacity?.(0);
    this.runtime.setReveal?.(this.reducedMotion ? 1 : 0, this.revealOrigin);
    this.runtime.setVisible(true);
    this.applyFrame(0);
    this.transition("story", reason);
    this.emitCues(-Number.EPSILON, 0);
    return true;
  }

  complete(reason) {
    if (this.state !== "story") return;
    this.paused = false;
    this.runtime?.setOpacity?.(0);
    this.runtime?.setReveal?.(0, this.revealOrigin);
    this.runtime?.setVisible?.(false);
    this.transition("completed", reason);
  }

  applyFrame(elapsed) {
    if (!this.runtime) return;
    const revealProgress = this.reducedMotion ? 1 : visionReveal(elapsed, this.duration);
    const opacity = this.reducedMotion ? 1 : revealProgress;
    const cameraProgress = this.reducedMotion
      ? 0
      : smoothstep(clamp01((elapsed - REVEAL_END_SECONDS) / (CAMERA_END_SECONDS - REVEAL_END_SECONDS)));
    this.runtime.setOpacity?.(opacity);
    this.runtime.setReveal?.(revealProgress, this.revealOrigin);
    this.runtime.render({
      elapsed,
      duration: this.duration,
      opacity,
      cameraProgress,
      reducedMotion: this.reducedMotion
    });
  }

  emitCues(previousSeconds, currentSeconds) {
    const previousMs = previousSeconds * 1_000;
    const currentMs = currentSeconds * 1_000;
    while (this.nextCueIndex < this.cues.length) {
      const cue = this.cues[this.nextCueIndex];
      if (cue.atMs > currentMs) break;
      this.nextCueIndex += 1;
      if (cue.atMs >= previousMs) this.emit({ type: "cue", cue });
    }
  }

  fail(error, reason) {
    this.error = error instanceof Error ? error : new Error(String(error || "artwork_vision_failed"));
    this.pendingTrigger = false;
    this.paused = false;
    this.loaded = false;
    this.runtime?.setVisible?.(false);
    safeDispose(this.runtime);
    this.runtime = null;
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
      // Presentation callbacks cannot interrupt renderer cleanup.
    }
  }

  releaseCurrent() {
    const runtimes = new Set([this.runtime, this.loadingRuntime].filter(Boolean));
    for (const runtime of runtimes) {
      runtime.setVisible?.(false);
      safeDispose(runtime);
    }
    this.runtime = null;
    this.loadingRuntime = null;
    this.sceneId = null;
    this.artworkId = null;
    this.config = null;
    this.source = null;
    this.loaded = false;
    this.pendingTrigger = false;
    this.paused = false;
    this.elapsed = 0;
    this.duration = 0;
    this.nextCueIndex = 0;
    this.cues = [];
    this.error = null;
    this.revealOrigin = { x: 0.5, y: 0.5 };
    this.loadPromise = null;
  }
}

export function selectArtworkVisionAsset(config, mobile = false) {
  const assets = config?.vision?.assets;
  const value = mobile ? assets?.mobile : assets?.desktop;
  return typeof value === "string" && value ? value : null;
}

async function createArtworkVisionRuntime(options) {
  return options.reducedMotion
    ? createStaticVisionRuntime(options)
    : createSparkVisionRuntime(options);
}

function createStaticVisionRuntime({ container, source }) {
  const image = document.createElement("img");
  image.className = "artwork-vision-frame";
  image.alt = "";
  image.decoding = "async";
  image.hidden = true;
  image.setAttribute("aria-hidden", "true");
  image.style.pointerEvents = "none";
  const ready = new Promise((resolve, reject) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", () => reject(new Error("artwork_vision_frame_failed")), { once: true });
  });
  image.src = source;
  container.appendChild(image);
  let disposed = false;
  return {
    element: image,
    ready,
    setVisible: (visible) => setElementVisible(image, visible),
    setOpacity: (opacity) => { image.style.opacity = String(clamp01(opacity)); },
    setReveal: (progress, origin) => setElementReveal(image, progress, origin),
    resize() {},
    render() {},
    dispose() {
      if (disposed) return;
      disposed = true;
      setElementVisible(image, false);
      image.remove();
    }
  };
}

async function createSparkVisionRuntime({ container, source, config }) {
  const { SparkRenderer, SplatMesh } = await import("@sparkjsdev/spark");
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    powerPreference: "high-performance"
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.domElement.className = "artwork-vision-canvas";
  renderer.domElement.hidden = true;
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.style.pointerEvents = "none";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x536b60);
  const vision = config?.vision || {};
  const camera = new THREE.PerspectiveCamera(Number(vision.camera?.fov) || 54, 1, 0.01, 1_000);
  const spark = new SparkRenderer({
    renderer,
    enableLod: false,
    lodRaycast: 0,
    minSortIntervalMs: 24
  });
  const splat = new SplatMesh({
    url: source,
    lod: false,
    enableLod: false,
    editable: false,
    raycastable: false
  });
  const metricScale = positiveNumber(vision.metricScale, 1);
  const groundPlaneOffset = Number.isFinite(vision.groundPlaneOffset) ? vision.groundPlaneOffset : 0;
  splat.scale.setScalar(metricScale);
  scene.add(spark, splat);

  let disposed = false;
  let framed = false;
  let bounds = null;
  const target = new THREE.Vector3();
  let baseDistance = 4;
  const ready = Promise.resolve(splat.initialized).then(() => {
    if (disposed) return;
    const box = splat.getBoundingBox?.();
    if (!box?.isBox3 || box.isEmpty()) throw new Error("artwork_vision_bounds_required");
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).multiplyScalar(metricScale);
    splat.position.set(
      -center.x * metricScale,
      -groundPlaneOffset * metricScale,
      -center.z * metricScale
    );
    target.set(0, (center.y - groundPlaneOffset) * metricScale, 0);
    bounds = size;
    framed = true;
    frameCamera();
    renderer.render(scene, camera);
  });

  function frameCamera() {
    if (!framed || !bounds) return;
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * Math.max(0.1, camera.aspect));
    const verticalDistance = (bounds.y * 0.52) / Math.max(0.01, Math.tan(verticalFov / 2));
    const horizontalDistance = (bounds.x * 0.52) / Math.max(0.01, Math.tan(horizontalFov / 2));
    baseDistance = Math.max(0.75, verticalDistance, horizontalDistance) + bounds.z * 0.5;
    camera.near = Math.max(0.005, baseDistance * 0.015);
    camera.far = Math.max(50, baseDistance + bounds.z * 4);
    camera.updateProjectionMatrix();
  }

  return {
    element: renderer.domElement,
    ready,
    setVisible: (visible) => setElementVisible(renderer.domElement, visible),
    setOpacity: (opacity) => { renderer.domElement.style.opacity = String(clamp01(opacity)); },
    setReveal: (progress, origin) => setElementReveal(renderer.domElement, progress, origin),
    resize(nextWidth, nextHeight, pixelRatio) {
      if (disposed) return;
      const width = Math.max(1, nextWidth);
      const height = Math.max(1, nextHeight);
      renderer.setPixelRatio(Math.max(0.5, Number(pixelRatio) || 1));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      frameCamera();
    },
    render({ cameraProgress = 0 } = {}) {
      if (disposed || !framed) return;
      const progress = clamp01(cameraProgress);
      const push = clamp01(Number(vision.camera?.pushFraction) || 0.28);
      const parallax = clamp01(Number(vision.camera?.parallaxFraction) || 0.075);
      const x = THREE.MathUtils.lerp(-bounds.x * parallax, bounds.x * parallax, progress);
      const y = target.y + bounds.y * THREE.MathUtils.lerp(0.025, -0.015, progress);
      const z = baseDistance * (1 - push * progress);
      camera.position.set(x, y, z);
      camera.lookAt(
        target.x + bounds.x * THREE.MathUtils.lerp(-0.015, 0.025, progress),
        target.y,
        target.z
      );
      renderer.render(scene, camera);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      setElementVisible(renderer.domElement, false);
      renderer.domElement.remove();
      scene.remove(spark, splat);
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        safeDispose(splat);
        safeDispose(spark);
        safeDispose(spark.geometry);
        const materials = Array.isArray(spark.material) ? spark.material : [spark.material];
        for (const material of materials) safeDispose(material);
        safeDispose(renderer);
      };
      if (splat.isInitialized) finish();
      else {
        const terminalCleanup = setTimeout(finish, 30_000);
        Promise.resolve(splat.initialized).catch(() => {}).finally(() => {
          clearTimeout(terminalCleanup);
          finish();
        });
      }
    }
  };
}

function setElementVisible(element, visible) {
  if (!element) return;
  element.hidden = !visible;
  element.style.pointerEvents = "none";
  element.setAttribute?.("aria-hidden", String(!visible));
}

function setElementReveal(element, progress, origin = {}) {
  if (!element) return;
  const x = clamp01(Number(origin.x)) * 100;
  const y = clamp01(Number(origin.y)) * 100;
  const radius = clamp01(progress) * 150;
  element.style.clipPath = `circle(${radius}% at ${x}% ${y}%)`;
}

function visionReveal(elapsed, duration) {
  if (elapsed <= REVEAL_END_SECONDS) return smoothstep(clamp01(elapsed / REVEAL_END_SECONDS));
  if (elapsed < CAMERA_END_SECONDS) return 1;
  const closeDuration = Math.max(0.001, duration - CAMERA_END_SECONDS);
  return 1 - smoothstep(clamp01((elapsed - CAMERA_END_SECONDS) / closeDuration));
}

function normalizeCues(cues) {
  return (Array.isArray(cues) ? cues : [])
    .filter((cue) => Number.isFinite(cue?.atMs) && cue.atMs >= 0 && typeof cue?.text === "string")
    .map((cue) => ({ ...cue, atMs: Math.round(cue.atMs) }))
    .sort((left, right) => left.atMs - right.atMs);
}

function representativeFrame(config) {
  const value = config?.vision?.assets?.representativeFrame;
  return typeof value === "string" && value ? value : null;
}

function resolveDurationSeconds(config) {
  const durationMs = Number(config?.vision?.durationMs);
  return Number.isFinite(durationMs) && durationMs > 0
    ? durationMs / 1_000
    : DEFAULT_DURATION_MS / 1_000;
}

function defaultReducedMotion() {
  return globalThis.window?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

function defaultMobileAsset() {
  return globalThis.window?.matchMedia?.("(max-width: 820px), (pointer: coarse)")?.matches === true;
}

function defaultDevicePixelRatio() {
  const value = Number(globalThis.window?.devicePixelRatio);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function positiveNumber(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function clamp01(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function smoothstep(value) {
  const clamped = clamp01(value);
  return clamped * clamped * (3 - 2 * clamped);
}

function safeDispose(value) {
  try { value?.dispose?.(); } catch { /* terminal cleanup must continue */ }
}
