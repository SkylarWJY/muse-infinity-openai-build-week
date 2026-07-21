import test from "node:test";
import assert from "node:assert/strict";
import {
  MuseumScore,
  NarrationSession,
  ProceduralSoundscape,
  museumScoreTrackForStage,
  splitNarration,
  soundtrackProfileForStage
} from "../src/services/sound-experience.js";

test("recorded museum score follows narrative acts, waits for a gesture and ducks for every speaker", async () => {
  const players = [];
  const timers = new Map();
  let timerId = 0;
  const score = new MuseumScore({
    audioFactory: (src) => {
      const player = {
        src,
        paused: true,
        volume: 0,
        playCalls: 0,
        pauseCalls: 0,
        async play() { this.playCalls += 1; this.paused = false; },
        pause() { this.pauseCalls += 1; this.paused = true; }
      };
      players.push(player);
      return player;
    },
    setIntervalImpl: (callback) => { timerId += 1; timers.set(timerId, callback); return timerId; },
    clearIntervalImpl: (id) => timers.delete(id)
  });
  const settle = () => {
    for (let step = 0; step < 80 && timers.size; step += 1) {
      for (const callback of [...timers.values()]) callback();
    }
  };

  assert.equal(museumScoreTrackForStage("life_question"), "promenade");
  assert.equal(museumScoreTrackForStage("world_exploration"), "clair-de-lune");
  assert.equal(museumScoreTrackForStage("roundtable"), "gymnopedie");
  assert.deepEqual(score.snapshot(), {
    enabled: true,
    unlocked: false,
    stage: "threshold",
    track: "promenade",
    ducked: false,
    speakingSources: [],
    targetVolume: 0
  });
  assert.equal(players.length, 0, "the browser must not create media before a gesture");

  assert.equal(await score.unlock(), true);
  settle();
  assert.equal(players[0].src, "/assets/audio/promenade.ogg");
  assert.equal(players[0].volume, 0.18);

  score.setStage("companion_selection");
  assert.equal(players.length, 1, "stages in the same act reuse the current recording");
  score.setSpeaking("narration", true);
  score.setSpeaking("conversation", true);
  settle();
  assert.equal(players[0].volume, 0.04);
  score.setSpeaking("narration", false);
  settle();
  assert.equal(players[0].volume, 0.04, "conversation still owns the duck");
  score.setSpeaking("conversation", false);
  settle();
  assert.equal(players[0].volume, 0.18);

  score.setStage("world_exploration");
  await Promise.resolve();
  settle();
  assert.equal(players.length, 2);
  assert.equal(players[0].volume, 0);
  assert.equal(players[0].paused, true);
  assert.equal(players[1].src, "/assets/audio/clair-de-lune.opus");
  assert.equal(players[1].volume, 0.18);

  score.setEnabled(false);
  settle();
  assert.equal(players[1].volume, 0);
  assert.equal(score.snapshot().targetVolume, 0);
  score.dispose();
  assert.equal(score.snapshot().unlocked, false);
});

test("every narrative stage maps to one of four original soundtrack acts", () => {
  const expected = {
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
  };
  for (const [stage, profile] of Object.entries(expected)) {
    assert.equal(soundtrackProfileForStage(stage), profile, stage);
  }
});

test("procedural score waits for a gesture, preserves same-act music, and aggregates duck sources", async () => {
  const context = new FakeAudioContext();
  let contextCreations = 0;
  const soundscape = new ProceduralSoundscape({
    audioContextFactory: () => { contextCreations += 1; return context; },
    setIntervalImpl: () => 1,
    clearIntervalImpl: () => {},
    setTimeoutImpl: (callback) => { callback(); return 1; },
    clearTimeoutImpl: () => {}
  });

  soundscape.setStage("life_question");
  assert.equal(contextCreations, 0);
  assert.deepEqual(soundscape.snapshot(), {
    enabled: true,
    unlocked: false,
    stage: "life_question",
    profile: "threshold",
    ducked: false,
    speakingSources: [],
    targetVolume: 0.16
  });

  await soundscape.unlock();
  assert.equal(contextCreations, 1);
  assert.equal(context.resumeCalls, 1);
  const thresholdOscillators = context.oscillators.length;
  assert.ok(thresholdOscillators >= 3);

  soundscape.setStage("companion_selection");
  assert.equal(context.oscillators.length, thresholdOscillators, "same act must not restart its motif");
  soundscape.setStage("world_exploration");
  assert.equal(soundscape.snapshot().profile, "exploration");
  assert.ok(context.oscillators.length > thresholdOscillators, "cross-act transition creates a new layer");

  soundscape.setSpeaking("narration", true);
  soundscape.setSpeaking("conversation", true);
  assert.equal(soundscape.snapshot().targetVolume, 0.035);
  soundscape.setSpeaking("narration", false);
  assert.equal(soundscape.snapshot().ducked, true, "conversation still owns the duck");
  soundscape.setSpeaking("conversation", false);
  assert.equal(soundscape.snapshot().targetVolume, 0.16);

  soundscape.setEnabled(false);
  assert.equal(soundscape.snapshot().targetVolume, 0);
  const mutedOscillators = context.oscillators.length;
  soundscape.setStage("final_answer");
  assert.equal(context.oscillators.length, mutedOscillators, "muted stage changes stay silent");
  soundscape.setEnabled(true);
  assert.equal(soundscape.snapshot().profile, "answer");
  assert.ok(context.oscillators.length > mutedOscillators, "reenabling synchronizes the score to the current act");
  soundscape.dispose();
  assert.equal(soundscape.snapshot().unlocked, false);
});

test("muting during the first audio unlock does not leave a hidden score running", async () => {
  const context = new FakeAudioContext();
  let finishResume;
  context.resume = () => new Promise((resolve) => { finishResume = resolve; });
  const soundscape = new ProceduralSoundscape({
    audioContextFactory: () => context,
    setIntervalImpl: () => 1,
    clearIntervalImpl: () => {}
  });

  const unlocking = soundscape.unlock();
  soundscape.setEnabled(false);
  finishResume();
  assert.equal(await unlocking, false);
  assert.equal(context.oscillators.length, 0);
  assert.equal(soundscape.snapshot().targetVolume, 0);
  soundscape.dispose();
});

test("narration is sentence-bounded and system voices speak character lines in order", async () => {
  const spoken = [];
  const states = [];
  const lineEvents = [];
  const synthesis = {
    cancelCalls: 0,
    cancel() { this.cancelCalls += 1; },
    getVoices: () => [
      { name: "Museum One", lang: "en-US", localService: true },
      { name: "Museum Two", lang: "en-GB", localService: true }
    ],
    speak(utterance) {
      spoken.push({ text: utterance.text, voice: utterance.voice?.name, rate: utterance.rate, pitch: utterance.pitch });
      queueMicrotask(() => utterance.onend?.());
    }
  };
  const narrator = new NarrationSession({
    remoteEnabled: false,
    speechSynthesis: synthesis,
    utteranceFactory: (text) => ({ text }),
    onSpeaking: (speaking) => states.push(speaking),
    onLineStart: (line) => lineEvents.push(["start", line.speakerId, line.text]),
    onLineEnd: (line) => lineEvents.push(["end", line.speakerId, line.text])
  });

  narrator.stop();
  assert.equal(synthesis.cancelCalls, 0, "an idle narrator must not cancel unrelated browser speech");

  const longLine = `${"A quiet threshold opens. ".repeat(14)}What becomes visible?`;
  const segments = splitNarration(longLine);
  assert.ok(segments.length > 1);
  assert.equal(segments.every((segment) => segment.length <= 280), true);

  await narrator.enqueue([
    { speakerId: "monet", text: "Look first at the reflected light." },
    { speakerId: "frida", text: "Then notice what the frame protects." }
  ]);
  assert.deepEqual(spoken.map((item) => item.text), [
    "Look first at the reflected light.",
    "Then notice what the frame protects."
  ]);
  assert.deepEqual(states, [true, false]);
  assert.deepEqual(lineEvents, [
    ["start", "monet", "Look first at the reflected light."],
    ["end", "monet", "Look first at the reflected light."],
    ["start", "frida", "Then notice what the frame protects."],
    ["end", "frida", "Then notice what the frame protects."]
  ]);
  assert.equal(spoken.every((item) => Number.isFinite(item.rate) && Number.isFinite(item.pitch)), true);
});

test("stopping narration cancels only its current utterance and drops the remaining generation", async () => {
  const utterances = [];
  const synthesis = {
    cancelCalls: 0,
    cancel() { this.cancelCalls += 1; },
    getVoices: () => [],
    speak(utterance) { utterances.push(utterance); }
  };
  const narrator = new NarrationSession({
    speechSynthesis: synthesis,
    utteranceFactory: (text) => ({ text })
  });

  const firstDrain = narrator.enqueue([
    { speakerId: "mira", text: "This line is active." },
    { speakerId: "mira", text: "This line must be discarded." }
  ]);
  await Promise.resolve();
  assert.deepEqual(utterances.map((item) => item.text), ["This line is active."]);

  narrator.stop();
  assert.equal(synthesis.cancelCalls, 1);
  await firstDrain;
  assert.deepEqual(utterances.map((item) => item.text), ["This line is active."]);

  const nextDrain = narrator.enqueue([{ speakerId: "mira", text: "A new scene can speak immediately." }]);
  await Promise.resolve();
  assert.deepEqual(utterances.map((item) => item.text), [
    "This line is active.",
    "A new scene can speak immediately."
  ]);
  utterances.at(-1).onend();
  await nextDrain;
});

test("a stopped remote request cannot block narration from the next scene", async () => {
  let resolveFirst;
  const requests = [];
  const spoken = [];
  const narrator = new NarrationSession({
    remoteEnabled: true,
    synthesize: ({ text }) => {
      requests.push(text);
      if (text === "Old scene") return new Promise((resolve) => { resolveFirst = resolve; });
      return Promise.reject(new Error("use_system_fallback"));
    },
    speechSynthesis: {
      cancel() {},
      getVoices: () => [],
      speak(utterance) {
        spoken.push(utterance.text);
        queueMicrotask(() => utterance.onend?.());
      }
    },
    utteranceFactory: (text) => ({ text })
  });

  const oldDrain = narrator.enqueue([{ speakerId: "mira", text: "Old scene" }]);
  await Promise.resolve();
  assert.equal(narrator.snapshot().speaking, false, "fetch latency must not duck the score before playback");
  narrator.stop();
  const nextDrain = narrator.enqueue([{ speakerId: "mira", text: "New scene" }]);
  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(requests, ["Old scene", "New scene"]);
  assert.deepEqual(spoken, ["New scene"]);
  resolveFirst(new Blob(["late"]));
  await Promise.all([oldDrain, nextDrain]);
});

test("remote narration falls back to a system voice without dropping the line", async () => {
  const requested = [];
  const spoken = [];
  const narrator = new NarrationSession({
    remoteEnabled: true,
    synthesize: async (line) => { requested.push(line); throw new Error("tts_unavailable"); },
    speechSynthesis: {
      cancel() {},
      getVoices: () => [{ name: "Fallback", lang: "en-US", localService: true }],
      speak(utterance) { spoken.push(utterance.text); queueMicrotask(() => utterance.onend?.()); }
    },
    utteranceFactory: (text) => ({ text })
  });

  await narrator.enqueue([{ speakerId: "mira", text: "Carry this question into the room." }]);
  assert.deepEqual(requested, [{ speakerId: "mira", text: "Carry this question into the room." }]);
  assert.deepEqual(spoken, ["Carry this question into the room."]);
});

test("remote narration prefetches one line while the current line is playing", async () => {
  const requests = [];
  const audios = [];
  let objectUrl = 0;
  const narrator = new NarrationSession({
    remoteEnabled: true,
    synthesize: async (line, { signal }) => {
      requests.push({ text: line.text, signal });
      return new Blob([line.text]);
    },
    speechSynthesis: null,
    audioFactory: () => {
      const listeners = new Map();
      const audio = {
        duration: Number.NaN,
        listeners,
        addEventListener(type, callback) { listeners.set(type, callback); },
        play: async () => {},
        pause() {}
      };
      audios.push(audio);
      return audio;
    },
    createObjectURL: () => `blob:muse-${++objectUrl}`,
    revokeObjectURL: () => {},
    setTimeoutImpl: () => 1,
    clearTimeoutImpl: () => {}
  });

  const drain = narrator.enqueue([
    { speakerId: "mira", text: "First line." },
    { speakerId: "monet", text: "Second line." }
  ]);
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(requests.map(({ text }) => text), ["First line.", "Second line."]);
  assert.equal(audios.length, 1, "only the current prefetched line may play");
  assert.equal(narrator.snapshot().queued, 1);
  audios[0].listeners.get("ended")({ type: "ended" });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(audios.length, 2);
  audios[1].listeners.get("ended")({ type: "ended" });
  await drain;
  assert.equal(narrator.snapshot().queued, 0);
});

test("stopping narration aborts an in-flight remote synthesis request", async () => {
  let signal;
  const narrator = new NarrationSession({
    remoteEnabled: true,
    synthesize: (_line, options) => new Promise((_resolve, reject) => {
      signal = options.signal;
      signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }),
    speechSynthesis: null
  });

  const drain = narrator.enqueue([{ speakerId: "mira", text: "Leave this scene." }]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(signal.aborted, false);
  narrator.stop();
  assert.equal(signal.aborted, true);
  await drain;
  assert.equal(narrator.snapshot().speaking, false);
});

test("local-only narration never sends visitor-authored text to remote synthesis", async () => {
  let remoteCalls = 0;
  const spoken = [];
  const narrator = new NarrationSession({
    remoteEnabled: true,
    synthesize: async () => { remoteCalls += 1; return new Blob(["unexpected"]); },
    speechSynthesis: {
      cancel() {},
      getVoices: () => [],
      speak(utterance) { spoken.push(utterance.text); queueMicrotask(() => utterance.onend?.()); }
    },
    utteranceFactory: (text) => ({ text })
  });

  await narrator.enqueue([{ speakerId: "mira", text: "My private manifesto.", remote: false }]);
  assert.equal(remoteCalls, 0);
  assert.deepEqual(spoken, ["My private manifesto."]);
});

test("remote narration uses media duration for its watchdog and revokes the ephemeral URL", async () => {
  const listeners = new Map();
  const scheduled = [];
  const cleared = [];
  const revoked = [];
  let nextTimer = 0;
  const audio = {
    duration: 31,
    addEventListener(type, callback) { listeners.set(type, callback); },
    play() {
      queueMicrotask(() => {
        listeners.get("loadedmetadata")?.();
        queueMicrotask(() => listeners.get("ended")?.());
      });
      return Promise.resolve();
    },
    pause() {}
  };
  const narrator = new NarrationSession({
    remoteEnabled: true,
    synthesize: async () => new Blob(["mp3"]),
    speechSynthesis: null,
    audioFactory: () => audio,
    createObjectURL: () => "blob:muse-narration",
    revokeObjectURL: (url) => revoked.push(url),
    setTimeoutImpl: (_callback, delay) => {
      const id = ++nextTimer;
      scheduled.push([id, delay]);
      return id;
    },
    clearTimeoutImpl: (id) => cleared.push(id)
  });

  await narrator.enqueue([{ speakerId: "mira", text: "A measured line with enough room to finish." }]);

  assert.equal(scheduled.at(-1)[1], 33_500);
  assert.deepEqual(revoked, ["blob:muse-narration"]);
  assert.ok(cleared.includes(scheduled[0][0]));
  assert.equal(narrator.snapshot().speaking, false);
});

class FakeAudioParam {
  constructor(value = 0) { this.value = value; this.events = []; }
  cancelScheduledValues(time) { this.events.push(["cancel", time]); }
  setValueAtTime(value, time) { this.value = value; this.events.push(["set", value, time]); }
  linearRampToValueAtTime(value, time) { this.value = value; this.events.push(["ramp", value, time]); }
  setTargetAtTime(value, time, constant) { this.value = value; this.events.push(["target", value, time, constant]); }
}

class FakeNode {
  constructor() { this.connections = []; this.disconnected = false; }
  connect(node) { this.connections.push(node); return node; }
  disconnect() { this.disconnected = true; }
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 2;
    this.state = "suspended";
    this.destination = new FakeNode();
    this.oscillators = [];
    this.resumeCalls = 0;
    this.closeCalls = 0;
  }
  createGain() { const node = new FakeNode(); node.gain = new FakeAudioParam(); return node; }
  createBiquadFilter() {
    const node = new FakeNode();
    node.frequency = new FakeAudioParam();
    node.Q = new FakeAudioParam();
    node.type = "lowpass";
    return node;
  }
  createOscillator() {
    const node = new FakeNode();
    node.frequency = new FakeAudioParam();
    node.detune = new FakeAudioParam();
    node.start = () => { node.started = true; };
    node.stop = () => { node.stopped = true; };
    this.oscillators.push(node);
    return node;
  }
  async resume() { this.resumeCalls += 1; this.state = "running"; }
  async close() { this.closeCalls += 1; this.state = "closed"; }
}
