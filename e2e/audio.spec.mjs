import { expect, test } from "@playwright/test";
import { createFallbackLesson } from "../shared/contracts.js";
import { splitNarration } from "../src/services/sound-experience.js";

const appUrl = process.env.MUSE_E2E_BASE_URL || "/?quality=performance";
const lessonGoal = "How composition moves my attention";
const lesson = {
  ...createFallbackLesson(lessonGoal),
  opening: "Mira opens the curated route by asking you to observe where each composition directs your attention before naming an interpretation or deciding what the image means. Carry that evidence through all eight rooms, compare every guide's perspective with what you can actually see, and let the final answer emerge from those differences."
};
const openingSegments = splitNarration(lesson.opening);

test("sound unlocks on entry and synthetic narration follows the real curation flow", async ({ page }) => {
  const narrationRequests = [];
  await installDeterministicBrowserAudio(page);
  await page.route("**/api/**", (route) => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ error: "e2e_api_endpoint_disabled" })
  }));
  await page.route("**/api/status", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      configured: true,
      openai: true,
      gateway: "official",
      model: "gpt-5.6",
      dialogue: true,
      realtime: false,
      narration: true,
      narration_provider: "openai",
      narration_model: "gpt-4o-mini-tts",
      world_forge: false,
      rooms: true
    })
  }));
  await page.route("**/api/lesson/plan", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: lesson, live: false, model: "curated-demo", reason: "not_configured" })
  }));
  await page.route("**/api/narration", async (route) => {
    narrationRequests.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: "audio/mpeg",
      body: Buffer.from("deterministic synthetic speech")
    });
  });
  await page.route("**/*", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith(".rad") || pathname.endsWith(".spz") || pathname.endsWith("-texture-mesh.glb")) {
      await route.abort("blockedbyclient");
    } else {
      await route.fallback();
    }
  });

  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__MUSE_APP__));

  const soundButton = page.locator("#sound-tool");
  await expect(soundButton).toHaveAttribute("aria-pressed", "true");
  await expect(soundButton).toHaveAttribute("data-sound-state", "armed");
  expect(await soundState(page)).toMatchObject({
    soundscape: {
      enabled: true,
      unlocked: false,
      stage: "threshold",
      profile: "threshold",
      ducked: false,
      targetVolume: 0.16
    },
    narration: { enabled: true, speaking: false, queued: 0 }
  });
  await expect.poll(() => soundState(page)).toMatchObject({ narration: { remoteEnabled: true } });
  expect(await audioMetrics(page)).toMatchObject({ contexts: 0, resumes: 0, oscillatorsStarted: 0 });

  await page.locator("[data-entry-action='cross-threshold']").click();
  await expect(page.locator("#entry-panel")).toHaveAttribute("data-stage", "life-question");
  await expect.poll(() => soundState(page)).toMatchObject({
    soundscape: {
      enabled: true,
      unlocked: true,
      stage: "life_question",
      profile: "threshold",
      targetVolume: 0.16
    }
  });
  await expect(soundButton).toHaveAttribute("data-sound-state", "on");
  expect(await audioMetrics(page)).toMatchObject({ contexts: 1, resumes: 1, oscillatorsStarted: 3 });

  await soundButton.click();
  await expect(soundButton).toHaveAttribute("aria-pressed", "false");
  await expect(soundButton.locator(".tool-label")).toHaveText("Muted");
  expect(await soundState(page)).toMatchObject({
    soundscape: { enabled: false, targetVolume: 0 },
    narration: { enabled: false, speaking: false }
  });

  await soundButton.click();
  await expect(soundButton).toHaveAttribute("aria-pressed", "true");
  await expect(soundButton.locator(".tool-label")).toHaveText("Sound");
  expect(await soundState(page)).toMatchObject({
    soundscape: { enabled: true, unlocked: true, targetVolume: 0.16 },
    narration: { enabled: true, speaking: false }
  });

  const thresholdOscillators = (await audioMetrics(page)).oscillatorsStarted;
  await page.getByRole("button", { name: lessonGoal }).click();
  await expect(page.locator("#entry-panel")).toHaveAttribute("data-stage", "company");
  expect(await soundState(page)).toMatchObject({
    soundscape: { stage: "companion_selection", profile: "threshold" }
  });
  expect((await audioMetrics(page)).oscillatorsStarted).toBe(thresholdOscillators);

  await page.locator("[data-entry-action='curate']").click();
  await expect(page.locator("#entry-panel")).toHaveAttribute("data-stage", "curation");
  await expect(page.locator("#toast")).toContainText("AI-generated interpretations");
  await expect(page.locator("#toast")).toBeVisible();
  await expect.poll(() => audioMetrics(page)).toMatchObject({
    remoteAudioStarted: 1,
    activeRemoteAudio: 1,
    maxConcurrentRemoteAudio: 1,
    spoken: []
  });
  expect(openingSegments).toHaveLength(2);
  expect(narrationRequests[0]).toMatchObject({ speaker_id: "mira", text: openingSegments[0] });
  await page.waitForTimeout(100);
  expect(await audioMetrics(page)).toMatchObject({
    remoteAudioStarted: 1,
    activeRemoteAudio: 1,
    maxConcurrentRemoteAudio: 1
  });
  expect(await soundState(page)).toMatchObject({
    soundscape: { stage: "ai_curation", profile: "threshold", ducked: true, targetVolume: 0.035 },
    narration: { remoteEnabled: true, speaking: true, queued: 1 }
  });
  await expect(soundButton).toHaveAttribute("data-sound-state", "speaking");
  await expect(soundButton).toHaveAttribute("title", "Synthetic guide narration speaking");

  await page.evaluate(() => window.__AUDIO_TEST__.finishCurrentAudio());
  await expect.poll(() => audioMetrics(page)).toMatchObject({
    remoteAudioStarted: 2,
    activeRemoteAudio: 1,
    maxConcurrentRemoteAudio: 1,
    completedRemoteAudio: 1,
    spoken: []
  });
  expect(narrationRequests.map(({ speaker_id, text }) => ({ speaker_id, text }))).toEqual(
    openingSegments.map((text) => ({ speaker_id: "mira", text }))
  );
  expect((await soundState(page)).soundscape.targetVolume).toBe(0.035);

  await page.evaluate(() => window.__AUDIO_TEST__.finishCurrentAudio());
  await expect.poll(() => soundState(page)).toMatchObject({
    soundscape: { ducked: false, speakingSources: [], targetVolume: 0.16 },
    narration: { speaking: false, queued: 0 }
  });
  await expect(soundButton).toHaveAttribute("data-sound-state", "on");
  expect(await audioMetrics(page)).toMatchObject({
    remoteAudioStarted: 2,
    activeRemoteAudio: 0,
    maxConcurrentRemoteAudio: 1,
    completedRemoteAudio: 2,
    spoken: []
  });

  await expect(page.locator("[data-entry-action='enter-walk']")).toBeEnabled();
  await page.locator("[data-entry-action='enter-walk']").click();
  await expect.poll(() => soundState(page)).toMatchObject({
    soundscape: { stage: "world_exploration", profile: "exploration", targetVolume: 0.16 }
  });
  expect((await audioMetrics(page)).oscillatorsStarted).toBe(thresholdOscillators + 3);
});

async function soundState(page) {
  return page.evaluate(() => window.__MUSE_APP__.soundState());
}

async function audioMetrics(page) {
  return page.evaluate(() => window.__AUDIO_TEST__.snapshot());
}

async function installDeterministicBrowserAudio(page) {
  await page.addInitScript(() => {
    class FakeAudioParam {
      constructor(value = 0) {
        this.value = value;
        this.events = [];
      }

      cancelScheduledValues(time) { this.events.push(["cancel", time]); }
      setValueAtTime(value, time) { this.value = value; this.events.push(["set", value, time]); }
      linearRampToValueAtTime(value, time) { this.value = value; this.events.push(["ramp", value, time]); }
      setTargetAtTime(value, time, constant) {
        this.value = value;
        this.events.push(["target", value, time, constant]);
      }
    }

    class FakeAudioNode {
      constructor() {
        this.connections = [];
        this.disconnected = false;
      }

      connect(node) { this.connections.push(node); return node; }
      disconnect() { this.disconnected = true; }
    }

    class FakeAudioContext {
      constructor() {
        this.currentTime = 1;
        this.state = "suspended";
        this.destination = new FakeAudioNode();
        window.__AUDIO_TEST__.contexts.push(this);
      }

      createGain() {
        const node = new FakeAudioNode();
        node.gain = new FakeAudioParam();
        return node;
      }

      createBiquadFilter() {
        const node = new FakeAudioNode();
        node.frequency = new FakeAudioParam();
        node.Q = new FakeAudioParam();
        node.type = "lowpass";
        return node;
      }

      createOscillator() {
        const node = new FakeAudioNode();
        node.frequency = new FakeAudioParam();
        node.detune = new FakeAudioParam();
        node.start = () => { window.__AUDIO_TEST__.oscillatorsStarted += 1; };
        node.stop = () => { window.__AUDIO_TEST__.oscillatorsStopped += 1; };
        return node;
      }

      async resume() {
        window.__AUDIO_TEST__.resumes += 1;
        this.state = "running";
      }

      async close() { this.state = "closed"; }
    }

    class FakeUtterance {
      constructor(text) {
        this.text = text;
        this.lang = "";
        this.rate = 1;
        this.pitch = 1;
        this.voice = null;
        this.onend = null;
        this.onerror = null;
      }
    }

    class FakeAudio {
      constructor(src = "") {
        this.src = src;
        this.duration = 0.4;
        this.listeners = new Map();
        this.started = false;
      }

      addEventListener(type, listener, options = {}) {
        const listeners = this.listeners.get(type) || [];
        listeners.push({ listener, once: options.once === true });
        this.listeners.set(type, listeners);
      }

      dispatch(type) {
        const listeners = [...(this.listeners.get(type) || [])];
        this.listeners.set(type, listeners.filter(({ once }) => !once));
        for (const { listener } of listeners) listener.call(this, { type, target: this });
      }

      async play() {
        this.started = true;
        harness.remoteAudioStarted += 1;
        harness.activeRemoteAudio.push(this);
        harness.maxConcurrentRemoteAudio = Math.max(
          harness.maxConcurrentRemoteAudio,
          harness.activeRemoteAudio.length
        );
        queueMicrotask(() => this.dispatch("loadedmetadata"));
      }

      pause() {
        const index = harness.activeRemoteAudio.indexOf(this);
        if (index >= 0) harness.activeRemoteAudio.splice(index, 1);
      }
    }

    const harness = {
      contexts: [],
      resumes: 0,
      oscillatorsStarted: 0,
      oscillatorsStopped: 0,
      spoken: [],
      completed: [],
      active: [],
      maxConcurrentUtterances: 0,
      cancellations: 0,
      remoteAudioStarted: 0,
      completedRemoteAudio: 0,
      activeRemoteAudio: [],
      maxConcurrentRemoteAudio: 0,
      finishCurrent() {
        const utterance = this.active.shift();
        if (!utterance) throw new Error("no_active_utterance");
        this.completed.push(utterance.text);
        utterance.onend?.();
      },
      finishCurrentAudio() {
        const audio = this.activeRemoteAudio.shift();
        if (!audio) throw new Error("no_active_remote_audio");
        this.completedRemoteAudio += 1;
        audio.dispatch("ended");
      },
      snapshot() {
        return {
          contexts: this.contexts.length,
          resumes: this.resumes,
          oscillatorsStarted: this.oscillatorsStarted,
          oscillatorsStopped: this.oscillatorsStopped,
          spoken: [...this.spoken],
          completed: [...this.completed],
          activeUtterances: this.active.length,
          maxConcurrentUtterances: this.maxConcurrentUtterances,
          cancellations: this.cancellations,
          remoteAudioStarted: this.remoteAudioStarted,
          completedRemoteAudio: this.completedRemoteAudio,
          activeRemoteAudio: this.activeRemoteAudio.length,
          maxConcurrentRemoteAudio: this.maxConcurrentRemoteAudio
        };
      }
    };

    const speechSynthesis = {
      getVoices: () => [
        { name: "Museum Voice One", lang: "en-US", localService: true },
        { name: "Museum Voice Two", lang: "en-GB", localService: true }
      ],
      speak(utterance) {
        harness.spoken.push(utterance.text);
        harness.active.push(utterance);
        harness.maxConcurrentUtterances = Math.max(harness.maxConcurrentUtterances, harness.active.length);
      },
      cancel() {
        harness.cancellations += 1;
        const active = harness.active.splice(0);
        for (const utterance of active) utterance.onerror?.({ error: "canceled" });
      }
    };

    window.__AUDIO_TEST__ = harness;
    Object.defineProperty(window, "AudioContext", { configurable: true, value: FakeAudioContext });
    Object.defineProperty(window, "webkitAudioContext", { configurable: true, value: FakeAudioContext });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: FakeUtterance });
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: speechSynthesis });
    Object.defineProperty(window, "Audio", { configurable: true, writable: true, value: FakeAudio });
  });
}
