# MUSE∞ — OpenAI Build Week submission package

This document contains ready-to-paste English copy for Devpost, the required Codex/GPT-5.6 disclosure, judge testing instructions and the remaining submission checklist.

## Recommended GitHub About description

> An inquiry-based AI learning museum where one student question becomes a walkable 3D lesson, built with Codex and powered by GPT-5.6.

## Devpost basics

- **Project name:** MUSE∞ — The Impossible Museum
- **Category:** Education
- **Tagline:** Ask one question. Learn by walking through the museum it becomes.
- **Repository:** https://github.com/SkylarWJY/muse-infinity-openai-build-week
- **License:** MIT
- **Current public demo video:** https://youtu.be/PlCZUTLrMvI
- **Testing access:** Public repository plus the `worlds-v1` GitHub Release; no account or paid API key is required for the offline judging path.

## Short description

MUSE∞ is an inquiry-based AI learning museum built with Codex and powered by GPT-5.6. A student brings one question, chooses three artist or thinker companions, and walks through generated 3D galleries filled with sourced public-domain artworks. GPT-5.6 produces three grounded but deliberately different interpretations of each selected work, requiring the learner to compare perspectives instead of accepting one AI answer. The closing roundtable synthesizes the learner's actual evidence trail into a reflective final world.

## Full Devpost description

### Inspiration

Students need more than access to information: they need practice asking questions, comparing claims, examining evidence and explaining how they reached a conclusion. Art can teach all of those skills, but many learners encounter it through a static slide, a short textbook paragraph or one authoritative interpretation. Meanwhile, museums and education programs hold rich open-access collections that are difficult to turn into active digital learning experiences.

We wanted to build a learning environment that starts with the student's question rather than a fixed content sequence: one question in, one reflective world out.

### What it does

MUSE∞ turns a learner's question into a walkable, responsive lesson.

The learner begins with a question such as “What makes a life meaningful?” and chooses three companions from a cast of artists and thinkers. They then enter a sequence of generated 3D worlds containing public-domain artworks selected for the journey. Clicking a painting opens a visual-novel-style encounter grounded in the work's real title, artist, date and source.

GPT-5.6 returns three parallel interpretations in one strict-schema response. Each companion has a different authored lens and protected vocabulary, so the result is a designed disagreement rather than three generic variations. Students must compare those claims against the same visible artwork and metadata. The interpretations map to a constrained visual-effect vocabulary that changes the gallery lighting and atmosphere. At the end, a closing roundtable receives a server-clamped digest of the learner's real path—visited works, questions and prior responses—and selects a finale world that reflects that learning journey.

The complete journey remains testable without credentials. Local fallbacks are visibly labeled, live OpenAI responses are visibly labeled `LIVE`, artwork sources remain accessible, and AI interpretations are never presented as authentic historical quotations or authoritative answers.

### Education track impact

MUSE∞ advances AI in education by using generative AI to support inquiry, comparison and reflection rather than simply producing an answer.

- **For students:** it develops visual literacy, evidence-based interpretation, comparative reasoning, question formation and AI literacy. Students see multiple plausible readings and must decide which claims are supported by the artwork.
- **For teachers:** it provides a reusable discussion activity, seminar prompt or reflective assignment. The question-led journey can connect art with history, philosophy, writing and technology, while the offline path makes classroom testing possible without distributing API keys.
- **For educational organizations:** it offers a model for transforming open-access cultural collections into interactive learning experiences while preserving item-level attribution, rights information and source links.

The teacher is not replaced, and GPT-5.6 is not treated as the source of truth. The system exposes model status, labels generated interpretations and keeps deterministic code in control of learning flow, sources and allowed visual effects.

### How we built it

The project is a zero-build web application using vanilla JavaScript, Three.js and a dependency-light Node server. The browser owns deterministic interaction and rendering state. The server protects API keys, validates input, calls the OpenAI Responses API, enforces strict JSON schemas and exposes bounded integration routes.

The default live model is `gpt-5.6`. One shared effect definition in `config/effects.js` generates both the server-side schema enum and the client-side rendering targets, preventing model output and visual behavior from drifting apart. Session history is capped in the browser and independently re-clamped on the server before it reaches GPT-5.6.

World Labs Marble generated the walkable environments, Tripo generated reviewed companion models from project-owned turnaround sheets, MiniMax provides synthetic cast voices, and the Art Institute of Chicago Open Access API supplies public-domain artworks with source and rights metadata. Generated world and character assets are downloaded from a public GitHub Release so judges can run the complete experience without making paid generation calls.

### How we used Codex and GPT-5.6

MUSE∞ was built during the OpenAI Build Week submission period through an iterative human–Codex workflow using GPT-5.6.

Codex accelerated implementation across the Three.js gallery, server routes, strict-schema OpenAI integration, world-specific physics, companion behavior, dialogue flow, tests, performance fixes and documentation. It also helped implement the educational safeguards: source-preserving artwork records, visible AI labels, distinct perspectives, bounded session memory, deterministic learning flow and a reflective ending. The work was repeatedly checked against concrete browser acceptance criteria rather than generated as one unreviewed code dump.

The entrant made the key product, design and engineering decisions: defining the “one question in, one world out” thesis; selecting the master cast and public-domain collection strategy; rejecting visually weak generated worlds; choosing explicit AI interpretation disclaimers; requiring honest live/fallback states; and selecting response quality over raw latency after model comparisons.

GPT-5.6 also powers the live learning experience through the OpenAI Responses API. It generates three structured, artwork-grounded perspectives that students can compare and a closing roundtable constrained to the learner's actual session. The model proposes interpretations; deterministic application code preserves sources, limits allowed effects and prevents invented stops from entering the final reflection. The clean submission commit, build-provenance document, product specification and contract tests document the build and review process.

### Challenges

- Making generated splat worlds behave like a game space required per-world transforms, collider-driven ground detection, walk bounds and many visual acceptance passes.
- Three historical perspectives initially converged into one generic voice. We added authored lenses, quarantined vocabulary and strict positional reconciliation to preserve meaningful disagreement.
- Large generated assets could not live comfortably in the Git tree. We separated source from release assets and kept the full offline judging path reproducible.
- Live AI failures had to be honest. We designed explicit `LIVE` and fallback states, bounded retries, real error responses and boot-time model reporting.
- A personalized finale needed context without sending an unbounded browser history. We created a compact session digest and revalidated it at the server trust boundary.

### Accomplishments

- A complete six-act learning experience rather than a chatbot or technical proof of concept.
- An education design that turns model disagreement into comparative reasoning instead of presenting one generated answer as truth.
- Nine generated spaces with native-scale navigation, artwork placement and companion interaction.
- Three parallel GPT-5.6 perspectives from a single strict-schema response.
- A closing roundtable grounded in the visitor's actual behavior.
- An offline judging path, public MIT repository, executable contract tests and documented rights for bundled media.
- A clean, entrant-authored submission history created inside the Build Week submission window.

### What we learned

The strongest educational AI experiences do not ask the model to control everything or replace the teacher. MUSE∞ became more reliable when GPT-5.6 was responsible for interpretation while deterministic code controlled movement, sources, permissions, scene state and allowed visual effects. We also learned that visible disagreement is a learning feature: carefully designed perspectives invite students to compare evidence instead of accepting the first fluent answer.

Codex was most effective as an implementation and iteration partner when paired with concrete acceptance criteria. Human review of visual worlds, product pacing, rights, honesty and model behavior remained essential.

### What's next

- Add a teacher mode with learning objectives, discussion prompts and downloadable reflection summaries.
- Add classroom accessibility modes for keyboard navigation, captions and reduced motion.
- Create standards-aligned lesson templates for visual literacy, history, philosophy and writing.
- Expand the open-access collection while preserving item-level rights metadata.
- Let students save a private reflection and replay the evidence trail that produced it.
- Give museums and education programs tools to author collection-specific learning journeys.

## Built with

- OpenAI Codex
- OpenAI GPT-5.6
- OpenAI Responses API
- JavaScript
- Node.js
- Three.js
- World Labs Marble
- Tripo
- MiniMax Speech
- Art Institute of Chicago Open Access API / IIIF

## Judge testing instructions

### Requirements

- Node.js 20+
- Approximately 1 GB of free disk space for generated world and character assets
- No test account
- No API key for the offline path

### Install and run

```bash
git clone https://github.com/SkylarWJY/muse-infinity-openai-build-week.git
cd muse-infinity-openai-build-week
npm install

# Download the generated worlds and companion models.
gh release download worlds-v1 --repo SkylarWJY/muse-infinity-openai-build-week
unzip -o worlds.zip -d assets/
unzip -o characters.zip -d assets/

npm start
# Open http://localhost:4173/?demo=true
```

If GitHub CLI is unavailable, download `worlds.zip` and `characters.zip` from the public `worlds-v1` release in a browser, place both archives in the repository root, and run the same `unzip` commands.

### Three-minute judge path

1. Enter a personal question.
2. Choose Monet, Van Gogh and Socrates.
3. Enter the generated gallery and click any painting.
4. Continue the dialogue and observe the three different companion readings.
5. Confirm that a reading visibly changes the room and that live/fallback status is explicit.
6. Use the tour HUD to move between stops.
7. Open the closing roundtable and enter the finale world selected from the walk.

### Optional live GPT-5.6 path

Create a local `.env` file:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.6
```

Restart `npm start`. Live responses display a `LIVE` label. Do not commit `.env` or share an API key in Devpost testing instructions.

## Suggested demonstration video: 2 minutes 30 seconds

The current 44-second video is public and under the three-minute limit, but the Build Week rules also require the video to explain how Codex and GPT-5.6 were used. Record or update the video with audio using the outline below.

**0:00–0:12 — Problem and promise**

“Students need practice asking questions, comparing interpretations and supporting ideas with evidence. MUSE∞ turns one student question into a museum lesson they can walk through.”

**0:12–0:30 — Question and companions**

Show the question gate and companion selection.

“A learner asks what makes a life meaningful and chooses Monet, Van Gogh and Socrates as three perspectives to compare.”

**0:30–1:05 — Walkable product demo**

Enter a world, walk, use the tour HUD and click a painting.

“The lesson is a sequence of generated 3D worlds filled with sourced public-domain artworks. Students explore evidence spatially instead of reading a single generated answer.”

**1:05–1:35 — GPT-5.6 in the product**

Show three live readings and a room transformation.

“The server uses the OpenAI Responses API and GPT-5.6 with a strict JSON schema. One request returns three grounded but deliberately different readings, turning model disagreement into a comparison activity. Deterministic code preserves sources and controls the learning flow.”

**1:35–2:02 — Codex collaboration**

Show the repository, build-provenance document, tests and product specification.

“I built the project with Codex using GPT-5.6. Codex accelerated the Three.js client, server integration, testing and educational safeguards. I designed the learning goals, reviewed every world, preserved source attribution, required visible AI labels and kept GPT-5.6 in the role of perspective generator rather than authority.”

**2:02–2:22 — Personalized ending**

Show the roundtable and finale world.

“The closing roundtable receives only the evidence trail the learner actually created and produces a final reflection. A different route produces a different learning synthesis.”

**2:22–2:30 — Close**

“MUSE∞ — ask one question, learn by walking through the museum it becomes.”

## Rule compliance matrix

| Requirement | Status | Evidence / action |
|---|---|---|
| Built with Codex and GPT-5.6 | Ready | README collaboration section; `server.mjs` defaults to `gpt-5.6` and calls `/v1/responses`. |
| Education track fit | Ready | The project supports students, teachers and education organizations through inquiry-based visual literacy, comparative reasoning, source awareness and reflective learning. |
| New or meaningfully extended during the submission period | Ready | Implementation dates are July 18–21, 2026; the clean competition repository was created July 21, after the July 13 submission start. See `docs/BUILD_PROVENANCE.md`. |
| Working, consistently runnable project | Ready | Offline fallback path, GitHub Release assets, `npm start`, syntax checks and contract tests. |
| English text description | Ready | This document and README. |
| Public repository with relevant license | Ready | Public GitHub repository with MIT license. |
| README explains Codex collaboration and human decisions | Ready | `Built with Codex + GPT-5.6` section in README. |
| Third-party tools, data and rights documented | Ready | README disclosures, `THIRD_PARTY_NOTICES.md`, `docs/ASSET_PIPELINE.md` and `docs/INTEGRATIONS.md`. |
| Public demo video under three minutes | Ready with update recommended | Existing video is public and 44 seconds; update/re-record it to explicitly cover Codex and GPT-5.6 using the script above. |
| Video has audio and demonstrates the working project | Verify before submission | Confirm the final upload includes clear spoken audio and the complete interaction path. |
| Video explains Codex and GPT-5.6 use | Action required | Use the 2:30 script above. |
| Working project access for judges | Ready | Public source and release-based test build; add a hosted URL if available. |
| `/feedback` Codex Session ID | Action required | Run `/feedback` in the primary Codex project task and paste the Session ID into the private Devpost field. Do not invent or publish it here. |
| Devpost registration and final submission | Action required | Join the hackathon, complete all fields and submit before July 21, 2026 at 5:00 PM PDT. |

## Final pre-submit checklist

- [ ] Select **Education**.
- [ ] Paste the short or full English description from this document.
- [ ] Add the public repository URL.
- [ ] Add a hosted demo URL if one is available; otherwise use the public test-build instructions.
- [ ] Upload a public YouTube video under three minutes with audio.
- [ ] Make sure the video explicitly demonstrates Codex and GPT-5.6 usage.
- [ ] Run `/feedback` in the primary Codex build task and paste the Session ID into Devpost.
- [ ] Verify `npm run check` and `npm test` from a clean checkout.
- [ ] Verify the release archives still download and extract into `assets/`.
- [ ] Confirm the repository remains public and the MIT license is visible.
- [ ] Submit before **July 21, 2026 at 5:00 PM PDT**.
