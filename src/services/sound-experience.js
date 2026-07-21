const FULL_VOLUME = 0.16;
const DUCKED_VOLUME = 0.035;
const FADE_SECONDS = 1.2;
const NARRATION_LIMIT = 280;

const MUSEUM_SCORE_TRACKS = Object.freeze({
  promenade: "/assets/audio/promenade.ogg",
  "clair-de-lune": "/assets/audio/clair-de-lune.opus",
  gymnopedie: "/assets/audio/gymnopedie.ogg"
});

const MUSEUM_SCORE_STAGES = Object.freeze({
  threshold: "promenade",
  life_question: "promenade",
  companion_selection: "promenade",
  ai_curation: "promenade",
  world_exploration: "clair-de-lune",
  summoning: "gymnopedie",
  roundtable: "gymnopedie",
  decision: "gymnopedie",
  world_transformation: "promenade",
  manifesto: "promenade",
  final_answer: "promenade"
});

const SCORE_FULL_VOLUME = 0.18;
const SCORE_DUCKED_VOLUME = 0.04;
const SCORE_FADE_TICK_MS = 60;
const SCORE_FADE_RATE = 0.22;
const SCORE_SNAP_EPSILON = 0.005;

const STAGE_PROFILES = Object.freeze({
  threshold: "threshold",
  life_question: "threshold",
  companion_selection: "threshold",
  ai_curation: "threshold",
  world_exploration: "exploration",
  summoning: "salon",
  roundtable: "salon",
  decision: "salon",
  world_transformation: "answer",
  manifesto: "answer",
  final_answer: "answer"
});

// Original deterministic pitch fields. No samples, reference audio, or inherited melody are used.
const SCORE_PROFILES = Object.freeze({
  threshold: Object.freeze({
    bpm: 46,
    root: 130.81,
    filter: 920,
    wave: "sine",
    sequence: Object.freeze([[0, 7, 14], [0, 9, 16], [2, 7, 14], [-3, 7, 12]])
  }),
  exploration: Object.freeze({
    bpm: 52,
    root: 146.83,
    filter: 1320,
    wave: "triangle",
    sequence: Object.freeze([[0, 5, 12], [2, 7, 14], [-2, 5, 9], [0, 7, 11], [4, 9, 16]])
  }),
  salon: Object.freeze({
    bpm: 42,
    root: 110,
    filter: 760,
    wave: "sine",
    sequence: Object.freeze([[0, 3, 10], [-2, 5, 12], [0, 7, 15], [3, 10, 14]])
  }),
  answer: Object.freeze({
    bpm: 48,
    root: 164.81,
    filter: 1580,
    wave: "triangle",
    sequence: Object.freeze([[0, 7, 16], [4, 11, 19], [2, 9, 14], [7, 12, 21], [0, 9, 19]])
  })
});

const VOICE_CAST = Object.freeze({
  mira: Object.freeze({ rate: 0.96, pitch: 1.04, offset: 0 }),
  monet: Object.freeze({ rate: 0.91, pitch: 1.08, offset: 1 }),
  "van-gogh": Object.freeze({ rate: 0.97, pitch: 0.94, offset: 2 }),
  socrates: Object.freeze({ rate: 0.88, pitch: 0.9, offset: 3 }),
  frida: Object.freeze({ rate: 0.94, pitch: 1.02, offset: 4 }),
  picasso: Object.freeze({ rate: 1.01, pitch: 0.97, offset: 5 }),
  freud: Object.freeze({ rate: 0.9, pitch: 0.86, offset: 6 }),
  "qi-baishi": Object.freeze({ rate: 0.86, pitch: 1.0, offset: 7 }),
  "yayoi-kusama": Object.freeze({ rate: 0.95, pitch: 1.1, offset: 8 })
});

export function soundtrackProfileForStage(stage) {
  return STAGE_PROFILES[stage] || "threshold";
}

export function museumScoreTrackForStage(stage) {
  return MUSEUM_SCORE_STAGES[stage] || "promenade";
}

/**
 * Recorded public-domain score inherited from MUSE Infinity. Playback remains
 * gesture-gated, changes only between narrative acts, and ducks under speech.
 */
export class MuseumScore {
  constructor({
    audioFactory = (url) => new Audio(url),
    setIntervalImpl = (...args) => globalThis.setInterval(...args),
    clearIntervalImpl = (id) => globalThis.clearInterval(id),
    enabled = true,
    fullVolume = SCORE_FULL_VOLUME,
    duckedVolume = SCORE_DUCKED_VOLUME
  } = {}) {
    this.audioFactory = audioFactory;
    this.setInterval = setIntervalImpl;
    this.clearInterval = clearIntervalImpl;
    this.enabled = Boolean(enabled);
    this.fullVolume = fullVolume;
    this.duckedVolume = duckedVolume;
    this.unlocked = false;
    this.stage = "threshold";
    this.activeKey = null;
    this.players = new Map();
    this.speakingSources = new Set();
    this.fadeTimer = null;
  }

  async unlock() {
    this.unlocked = true;
    if (!this.enabled) return false;
    return this.syncTrack();
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (this.enabled && this.unlocked) void this.syncTrack();
    else this.ensureFade();
    return this.enabled;
  }

  setStage(stage) {
    this.stage = MUSEUM_SCORE_STAGES[stage] ? stage : "threshold";
    const nextKey = museumScoreTrackForStage(this.stage);
    if (nextKey === this.activeKey) return false;
    if (this.enabled && this.unlocked) void this.syncTrack();
    return true;
  }

  setSpeaking(source, speaking) {
    const key = String(source || "voice").slice(0, 40);
    if (speaking) this.speakingSources.add(key);
    else this.speakingSources.delete(key);
    this.ensureFade();
  }

  snapshot() {
    return {
      enabled: this.enabled,
      unlocked: this.unlocked,
      stage: this.stage,
      track: museumScoreTrackForStage(this.stage),
      ducked: this.speakingSources.size > 0,
      speakingSources: [...this.speakingSources].sort(),
      targetVolume: this.targetVolume(this.activeKey)
    };
  }

  dispose() {
    if (this.fadeTimer != null) this.clearInterval(this.fadeTimer);
    this.fadeTimer = null;
    for (const player of this.players.values()) {
      player.pause?.();
      player.src = "";
    }
    this.players.clear();
    this.activeKey = null;
    this.unlocked = false;
    this.speakingSources.clear();
  }

  async syncTrack() {
    const key = museumScoreTrackForStage(this.stage);
    this.activeKey = key;
    let player = this.players.get(key);
    if (!player) {
      try {
        player = this.audioFactory(MUSEUM_SCORE_TRACKS[key]);
      } catch {
        return false;
      }
      if (!player) return false;
      player.loop = true;
      player.preload = "auto";
      player.volume = 0;
      this.players.set(key, player);
    }
    let ready = true;
    if (player.paused !== false) {
      try { await Promise.resolve(player.play?.()); } catch { ready = false; }
    }
    this.ensureFade();
    return ready;
  }

  targetVolume(key) {
    if (!this.enabled || !this.unlocked || key !== this.activeKey) return 0;
    return this.speakingSources.size ? this.duckedVolume : this.fullVolume;
  }

  ensureFade() {
    if (this.fadeTimer != null || !this.players.size) return;
    this.fadeTimer = this.setInterval(() => {
      let settled = true;
      for (const [key, player] of this.players) {
        const target = this.targetVolume(key);
        const diff = target - player.volume;
        if (Math.abs(diff) <= SCORE_SNAP_EPSILON) {
          player.volume = target;
          if (target === 0 && player.paused === false) player.pause?.();
          continue;
        }
        settled = false;
        player.volume = clampVolume(player.volume + diff * SCORE_FADE_RATE);
      }
      if (settled) {
        this.clearInterval(this.fadeTimer);
        this.fadeTimer = null;
      }
    }, SCORE_FADE_TICK_MS);
  }
}

export class ProceduralSoundscape {
  constructor({
    audioContextFactory = defaultAudioContextFactory,
    setIntervalImpl = (...args) => globalThis.setInterval(...args),
    clearIntervalImpl = (id) => globalThis.clearInterval(id),
    setTimeoutImpl = (...args) => globalThis.setTimeout(...args),
    clearTimeoutImpl = (id) => globalThis.clearTimeout(id),
    enabled = true,
    fullVolume = FULL_VOLUME,
    duckedVolume = DUCKED_VOLUME
  } = {}) {
    this.audioContextFactory = audioContextFactory;
    this.setInterval = setIntervalImpl;
    this.clearInterval = clearIntervalImpl;
    this.setTimeout = setTimeoutImpl;
    this.clearTimeout = clearTimeoutImpl;
    this.enabled = Boolean(enabled);
    this.fullVolume = fullVolume;
    this.duckedVolume = duckedVolume;
    this.stage = "threshold";
    this.profile = soundtrackProfileForStage(this.stage);
    this.context = null;
    this.master = null;
    this.layer = null;
    this.retiring = new Set();
    this.speakingSources = new Set();
  }

  async unlock() {
    if (!this.enabled) return false;
    try {
      if (!this.context) {
        const context = this.audioContextFactory?.();
        if (!context) return false;
        const master = context.createGain();
        master.gain.value = 0;
        master.connect(context.destination);
        this.context = context;
        this.master = master;
      }
      await this.context.resume?.();
      if (!this.enabled) return false;
      if (!this.layer) this.layer = this.createLayer(this.profile);
      else if (this.layer.profileName !== this.profile) this.transitionTo(this.profile);
      this.updateMaster();
      return true;
    } catch {
      return false;
    }
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      if (this.layer) this.destroyLayer(this.layer);
      this.layer = null;
      for (const record of this.retiring) {
        this.clearTimeout(record.timer);
        this.destroyLayer(record.layer);
      }
      this.retiring.clear();
    }
    if (this.enabled && this.context) {
      void Promise.resolve(this.context.resume?.()).catch(() => {});
      try {
        if (!this.layer) this.layer = this.createLayer(this.profile);
        else if (this.layer.profileName !== this.profile) this.transitionTo(this.profile);
      } catch {
        // Narration remains available even when the browser cannot construct the score graph.
      }
    }
    this.updateMaster();
    return this.enabled;
  }

  setStage(stage) {
    const nextStage = STAGE_PROFILES[stage] ? stage : "threshold";
    const nextProfile = soundtrackProfileForStage(nextStage);
    this.stage = nextStage;
    if (this.profile === nextProfile) return false;
    this.profile = nextProfile;
    if (this.context && this.enabled) {
      try { this.transitionTo(nextProfile); } catch {}
    }
    return true;
  }

  setSpeaking(source, speaking) {
    const key = String(source || "voice").slice(0, 40);
    if (speaking) this.speakingSources.add(key);
    else this.speakingSources.delete(key);
    this.updateMaster();
  }

  snapshot() {
    return {
      enabled: this.enabled,
      unlocked: Boolean(this.context),
      stage: this.stage,
      profile: this.profile,
      ducked: this.speakingSources.size > 0,
      speakingSources: [...this.speakingSources].sort(),
      targetVolume: this.targetVolume()
    };
  }

  dispose() {
    if (this.layer) this.destroyLayer(this.layer);
    for (const record of this.retiring) {
      this.clearTimeout(record.timer);
      this.destroyLayer(record.layer);
    }
    this.retiring.clear();
    this.master?.disconnect?.();
    void Promise.resolve(this.context?.close?.()).catch(() => {});
    this.context = null;
    this.master = null;
    this.layer = null;
    this.speakingSources.clear();
  }

  targetVolume() {
    if (!this.enabled) return 0;
    return this.speakingSources.size ? this.duckedVolume : this.fullVolume;
  }

  updateMaster() {
    if (!this.master || !this.context) return;
    const now = this.context.currentTime || 0;
    const parameter = this.master.gain;
    parameter.cancelScheduledValues?.(now);
    parameter.setTargetAtTime?.(this.targetVolume(), now, this.speakingSources.size ? 0.12 : 0.32);
  }

  transitionTo(profileName) {
    const previous = this.layer;
    this.layer = this.createLayer(profileName);
    if (!previous) return;
    const now = this.context.currentTime || 0;
    previous.bus.gain.cancelScheduledValues?.(now);
    previous.bus.gain.setValueAtTime?.(previous.bus.gain.value, now);
    previous.bus.gain.linearRampToValueAtTime?.(0, now + FADE_SECONDS);
    const record = { layer: previous, timer: null };
    this.retiring.add(record);
    record.timer = this.setTimeout(() => {
      this.retiring.delete(record);
      this.destroyLayer(previous);
    }, FADE_SECONDS * 1000 + 80);
  }

  createLayer(profileName) {
    const profile = SCORE_PROFILES[profileName];
    const context = this.context;
    const bus = context.createGain();
    const filter = context.createBiquadFilter();
    bus.gain.value = 0;
    filter.type = "lowpass";
    filter.frequency.value = profile.filter;
    filter.Q.value = 0.7;
    bus.connect(filter);
    filter.connect(this.master);

    const amplitudes = [0.065, 0.032, 0.018];
    const types = ["sine", profile.wave, "sine"];
    const voices = amplitudes.map((amplitude, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = types[index];
      oscillator.frequency.value = midiOffset(profile.root, profile.sequence[0][index]);
      oscillator.detune.value = index === 2 ? 4 : index === 1 ? -3 : 0;
      gain.gain.value = amplitude;
      oscillator.connect(gain);
      gain.connect(bus);
      oscillator.start();
      return { oscillator, gain };
    });

    const layer = { profileName, profile, bus, filter, voices, step: 0, interval: null };
    const now = context.currentTime || 0;
    bus.gain.setValueAtTime?.(0, now);
    bus.gain.linearRampToValueAtTime?.(1, now + FADE_SECONDS);
    const intervalMs = Math.round(60_000 / profile.bpm);
    layer.interval = this.setInterval(() => this.advanceLayer(layer), intervalMs);
    return layer;
  }

  advanceLayer(layer) {
    if (!this.context || !layer?.voices?.length) return;
    layer.step = (layer.step + 1) % layer.profile.sequence.length;
    const chord = layer.profile.sequence[layer.step];
    const now = this.context.currentTime || 0;
    layer.voices.forEach(({ oscillator }, index) => {
      oscillator.frequency.setTargetAtTime?.(midiOffset(layer.profile.root, chord[index]), now, 0.55);
    });
  }

  destroyLayer(layer) {
    if (!layer) return;
    if (layer.interval != null) this.clearInterval(layer.interval);
    for (const { oscillator, gain } of layer.voices || []) {
      try { oscillator.stop?.(); } catch {}
      oscillator.disconnect?.();
      gain.disconnect?.();
    }
    layer.filter?.disconnect?.();
    layer.bus?.disconnect?.();
  }
}

export function splitNarration(text, limit = NARRATION_LIMIT) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const sentences = clean.match(/[^.!?。！？…]+[.!?。！？…]*\s*/gu) || [clean];
  const segments = [];
  let current = "";
  for (const sentenceValue of sentences) {
    let sentence = sentenceValue.trim();
    while (sentence.length > limit) {
      if (current) { segments.push(current); current = ""; }
      const boundary = sentence.lastIndexOf(" ", limit);
      const end = boundary > Math.floor(limit * 0.55) ? boundary : limit;
      segments.push(sentence.slice(0, end).trim());
      sentence = sentence.slice(end).trim();
    }
    if (!sentence) continue;
    if (current && `${current} ${sentence}`.length > limit) {
      segments.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) segments.push(current);
  return segments;
}

export class NarrationSession {
  constructor({
    synthesize = null,
    remoteEnabled = false,
    speechSynthesis = globalThis.speechSynthesis || null,
    utteranceFactory = (text) => {
      const Utterance = globalThis.SpeechSynthesisUtterance;
      return Utterance ? new Utterance(text) : null;
    },
    audioFactory = (url) => new Audio(url),
    createObjectURL = (blob) => URL.createObjectURL(blob),
    revokeObjectURL = (url) => URL.revokeObjectURL(url),
    setTimeoutImpl = (...args) => globalThis.setTimeout(...args),
    clearTimeoutImpl = (id) => globalThis.clearTimeout(id),
    onSpeaking = () => {},
    onLineStart = () => {},
    onLineEnd = () => {},
    enabled = true
  } = {}) {
    this.synthesize = synthesize;
    this.remoteEnabled = Boolean(remoteEnabled);
    this.speechSynthesis = speechSynthesis;
    this.utteranceFactory = utteranceFactory;
    this.audioFactory = audioFactory;
    this.createObjectURL = createObjectURL;
    this.revokeObjectURL = revokeObjectURL;
    this.setTimeout = setTimeoutImpl;
    this.clearTimeout = clearTimeoutImpl;
    this.onSpeaking = onSpeaking;
    this.onLineStart = onLineStart;
    this.onLineEnd = onLineEnd;
    this.enabled = Boolean(enabled);
    this.queue = [];
    this.playing = false;
    this.generation = 0;
    this.currentAudio = null;
    this.currentUtterance = null;
    this.settleCurrent = null;
    this.pendingControllers = new Set();
    this.preparedRecords = new Set();
    this.drainPromise = Promise.resolve();
    this.activeDrainGeneration = null;
    this.speaking = false;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) this.stop();
    return this.enabled;
  }

  setRemoteEnabled(enabled) {
    this.remoteEnabled = Boolean(enabled);
  }

  enqueue(lines, { replace = false } = {}) {
    if (replace) this.stop();
    if (!this.enabled) return Promise.resolve();
    for (const line of lines || []) {
      const speakerId = String(line?.speakerId || "mira").slice(0, 48);
      const remote = line?.remote !== false;
      for (const text of splitNarration(line?.text)) this.queue.push({ speakerId, text, remote });
    }
    if (this.activeDrainGeneration !== this.generation && this.queue.length) {
      this.activeDrainGeneration = this.generation;
      this.drainPromise = this.drain(this.generation);
    }
    return this.drainPromise;
  }

  stop() {
    this.generation += 1;
    this.queue = [];
    for (const controller of this.pendingControllers) controller.abort();
    this.pendingControllers.clear();
    this.preparedRecords.clear();
    if (this.currentAudio) {
      this.currentAudio.pause?.();
      this.currentAudio.src = "";
      this.currentAudio = null;
    }
    if (this.currentUtterance) {
      this.speechSynthesis?.cancel?.();
      this.currentUtterance = null;
    }
    this.settleCurrent?.();
    this.activeDrainGeneration = null;
    this.playing = false;
    this.setSpeaking(false);
  }

  snapshot() {
    return {
      enabled: this.enabled,
      remoteEnabled: this.remoteEnabled,
      speaking: this.speaking,
      queued: this.queue.length + this.preparedRecords.size
    };
  }

  async drain(generation) {
    this.playing = true;
    let prepared = null;
    while (this.enabled && generation === this.generation && (prepared || this.queue.length)) {
      if (!prepared) prepared = this.prepareQueuedLine(generation);
      const item = await prepared.promise;
      this.preparedRecords.delete(prepared);
      prepared = null;
      if (generation !== this.generation) return;

      // Fetch one line ahead while the current line is playing, matching the legacy seamless cadence.
      if (this.queue.length) prepared = this.prepareQueuedLine(generation);
      this.notifyLineObserver(this.onLineStart, item.line);
      try {
        await this.speakPrepared(item, generation);
      } finally {
        this.notifyLineObserver(this.onLineEnd, item.line);
      }
    }
    if (generation !== this.generation) return;
    this.activeDrainGeneration = null;
    this.playing = false;
    this.setSpeaking(false);
  }

  prepareQueuedLine(generation) {
    const record = { promise: this.prepareLine(this.queue.shift(), generation) };
    this.preparedRecords.add(record);
    return record;
  }

  async prepareLine(line, generation) {
    if (!this.remoteEnabled || line.remote === false || typeof this.synthesize !== "function") {
      return { line, blob: null };
    }
    const controller = typeof AbortController === "function"
      ? new AbortController()
      : { signal: undefined, abort() {} };
    this.pendingControllers.add(controller);
    try {
      const blob = await this.synthesize({ speakerId: line.speakerId, text: line.text }, { signal: controller.signal });
      return generation === this.generation ? { line, blob } : { line, blob: null };
    } catch {
      return { line, blob: null };
    } finally {
      this.pendingControllers.delete(controller);
    }
  }

  async speakPrepared({ line, blob }, generation) {
    if (blob && generation === this.generation) {
      try {
        await this.playBlob(blob, generation, line.text);
        return;
      } catch {
        // Official speech is optional; retain the same line through the system voice.
      }
    }
    if (generation === this.generation) await this.speakSystem(line, generation);
  }

  playBlob(blob, generation, text) {
    return new Promise((resolve, reject) => {
      if (!blob || generation !== this.generation) return resolve();
      let url;
      let audio;
      try {
        url = this.createObjectURL(blob);
        audio = this.audioFactory(url);
      } catch (error) {
        if (url) this.revokeObjectURL(url);
        reject(error);
        return;
      }
      this.currentAudio = audio;
      this.setSpeaking(true);
      let settled = false;
      const timeout = () => {
        audio.pause?.();
        done(new Error("narration_playback_timeout"));
      };
      let watchdog = this.setTimeout(timeout, narrationWatchdogMs(text));
      const cleanup = () => {
        this.clearTimeout(watchdog);
        this.revokeObjectURL(url);
        if (this.currentAudio === audio) this.currentAudio = null;
        if (this.settleCurrent === done) this.settleCurrent = null;
      };
      function done(error) {
        if (settled) return;
        settled = true;
        cleanup();
        if (error) reject(error);
        else resolve();
      }
      this.settleCurrent = done;
      audio.addEventListener?.("loadedmetadata", () => {
        const duration = Number(audio.duration);
        if (!Number.isFinite(duration) || duration <= 0) return;
        this.clearTimeout(watchdog);
        watchdog = this.setTimeout(timeout, Math.min(120_000, duration * 1000 + 2_500));
      }, { once: true });
      audio.addEventListener?.("ended", () => done(), { once: true });
      audio.addEventListener?.("error", () => done(new Error("narration_playback_failed")), { once: true });
      try {
        Promise.resolve(audio.play?.()).catch(done);
      } catch (error) {
        done(error);
      }
    });
  }

  speakSystem(line, generation) {
    return new Promise((resolve) => {
      const utterance = this.utteranceFactory?.(line.text);
      if (!utterance || !this.speechSynthesis?.speak || generation !== this.generation) return resolve();
      const chinese = /[\u3400-\u9fff]/u.test(line.text);
      const cast = VOICE_CAST[line.speakerId] || VOICE_CAST.mira;
      utterance.lang = chinese ? "zh-CN" : (globalThis.navigator?.language || "en-US");
      utterance.rate = cast.rate;
      utterance.pitch = cast.pitch;
      utterance.voice = selectSystemVoice(this.speechSynthesis.getVoices?.() || [], utterance.lang, cast.offset);
      let settled = false;
      const timeout = () => {
        if (this.currentUtterance === utterance) this.speechSynthesis.cancel?.();
        done();
      };
      const watchdog = this.setTimeout(timeout, narrationWatchdogMs(line.text));
      const cleanup = () => {
        this.clearTimeout(watchdog);
        if (this.currentUtterance === utterance) this.currentUtterance = null;
        if (this.settleCurrent === done) this.settleCurrent = null;
      };
      function done() {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      }
      this.settleCurrent = done;
      this.currentUtterance = utterance;
      this.setSpeaking(true);
      utterance.onend = done;
      utterance.onerror = done;
      try { this.speechSynthesis.speak(utterance); } catch { done(); }
    });
  }

  setSpeaking(speaking) {
    const next = Boolean(speaking);
    if (this.speaking === next) return;
    this.speaking = next;
    this.onSpeaking(next);
  }

  notifyLineObserver(observer, line) {
    try {
      observer?.({ ...line });
    } catch {
      // Visual speaker cues are optional and cannot interrupt narration.
    }
  }
}

function defaultAudioContextFactory() {
  const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
  return Context ? new Context({ latencyHint: "playback" }) : null;
}

function midiOffset(root, semitones) {
  return root * (2 ** (semitones / 12));
}

function clampVolume(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function narrationWatchdogMs(text) {
  const value = String(text || "");
  const cjkCharacters = (value.match(/[\u3400-\u9fff]/gu) || []).length;
  const spokenWords = value.replace(/[\u3400-\u9fff]/gu, " ").trim().split(/\s+/u).filter(Boolean).length;
  const estimatedMs = 8_000 + cjkCharacters * 420 + spokenWords * 620;
  return Math.max(22_000, Math.min(120_000, estimatedMs));
}

function selectSystemVoice(voices, language, offset) {
  if (!voices.length) return null;
  const prefix = String(language || "en").slice(0, 2).toLowerCase();
  const matching = voices.filter((voice) => String(voice.lang || "").toLowerCase().startsWith(prefix));
  const pool = matching.length ? matching : voices;
  return pool[offset % pool.length] || null;
}
