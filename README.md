# MUSE: Nine Worlds, One Living Question

MUSE turns a question someone genuinely carries into a walkable "impossible museum." GPT-5.6
curates real artworks into a bounded journey; up to three AI interpretive companions bring
cross-temporal artistic and philosophical lenses into the same room, disagree around what the
visitor actually notices, and carry those observations into an answer concept that could exist
only after this walk.

The eight-world spine is the Education deepening of the original MUSE Infinity idea, not a
checklist of lessons. Its three artwork encounters, evidence chain, contradiction choice and
second GPT transformation make the original arc inspectable: cross space and time, let
disagreement create thought, then enter the concept shaped by the visitor's own attention.

The high-fidelity spatial environments and embodied characters are the main interaction, not a
thumbnail gallery. GPT-5.6 supplies bounded curation, provisional synthesis and a
decision-locked transformation; deterministic code owns canonical scene identities and digest order, asset IDs,
movement, coordinates, grounding, rendering and gates.

Built with Codex for the **Education** track of
[OpenAI Build Week](https://openai.com/zh-Hans-CN/build-week/).
Public repository: <https://github.com/baizhiyuan/muse>

This version preserves the original product thesis and extends it with an observable learning
method. See the original [MUSE Infinity story](https://github.com/SkylarWJY/muse-infinity/blob/main/README.md#L55-L76)
and [product specification](https://github.com/SkylarWJY/muse-infinity/blob/main/docs/LATEST_PRODUCT_SPEC.md#L3-L21).

<table>
  <tr>
    <td><img src="assets/thumbs/grand-conservatory-with-lush-gardens.jpg" alt="Grand Conservatory with Lush Gardens" width="240" /></td>
    <td><img src="assets/thumbs/elegant-floral-palace-interior.jpg" alt="Elegant Floral Palace Interior" width="240" /></td>
    <td><img src="assets/thumbs/enchanted-water-garden-sanctuary.jpg" alt="Enchanted Water Garden Sanctuary" width="240" /></td>
  </tr>
  <tr>
    <td><img src="assets/thumbs/dreamlike-coastal-villa-gardens.jpg" alt="Dreamlike Coastal Villa Gardens" width="240" /></td>
    <td><img src="assets/thumbs/van-gogh-inspired-gallery-interior.jpg" alt="Van Gogh Inspired Gallery Interior" width="240" /></td>
    <td><img src="assets/thumbs/sunlit-palace-gardens.jpg" alt="Sunlit Palace Gardens" width="240" /></td>
  </tr>
  <tr>
    <td><img src="assets/thumbs/mexican-courtyard-bedroom-fantasy.jpg" alt="Mexican Courtyard Bedroom Fantasy" width="240" /></td>
    <td><img src="assets/thumbs/yellow-polka-dot-infinity-room.jpg" alt="Yellow Polka Dot Infinity Room" width="240" /></td>
    <td><img src="assets/thumbs/fantasy-realm-of-shimmering-spheres.jpg" alt="Fantasy Realm of Shimmering Spheres" width="240" /></td>
  </tr>
</table>

## The complete MUSE flow

The implementation follows ten state-machine beats, but the visitor-facing story remains one
continuous arc from a real question to a personal answer:

```text
threshold
  -> life_question
  -> companion_selection
  -> ai_curation
  -> world_exploration (eight canonical worlds, freely navigable)
  -> summoning
  -> roundtable
  -> decision
  -> world_transformation
  -> manifesto
  -> gated ANSWER world
```

1. Cross the threshold and ask the life question the museum should hold.
2. Choose one to three AI interpretive companions from eight bounded lenses associated with
   Monet, Van Gogh, Socrates, Frida Kahlo, Picasso, Freud, Qi Baishi and infinity/repetition.
   These are generated interpretations, never authentic quotations, endorsements or the named
   people speaking.
3. Let GPT-5.6, or the visibly labeled curated fallback, bind that question to the fixed
   eight-world exhibition spine. The model shapes the inquiry, not the scene identities or
   geometry.
4. Explore the process worlds with the selected interpretive companions physically present. Each
   world contains four globally unique Art Institute of Chicago Open Access works; the first
   three form the evidence route and the fourth remains available in the scene. Companion roles
   rotate by station. All independent actors leave together for separated, collider-grounded,
   visitor-facing conversation positions. After arrival and
   facing synchronize, the companions develop distinct, evidence-based interpretations before the
   visitor records a bounded choice or a short observation. A visitor may skip a work without
   creating evidence; resolving all three stations with at least one real observation opens
   one scene reflection, which is the single record carried forward. This mechanic deepens the
   encounter; it is not presented as completing a classroom task. Frames
   are spaced along validated routes and use a real collider-backed wall only when the full
   frame passes the backing check; otherwise the display is moved to a scene edge without legs.
5. Review the carried observations at Summoning, then convene the AI interpretive companions at
   the Roundtable. GPT-5.6 must cite evidence from encounters that actually occurred before it
   can form a provisional concept.
6. Choose the unresolved contradiction between perception, emotion and invention. On the live path,
   that choice starts a second GPT-5.6 Responses API request with a strict
   transformed-concept schema. It locks the chosen axis and instructs GPT to materially revise
   the title, synthesis, principle and visual prompt before Transformation can complete and
   the Manifesto can be published. No-key mode applies the matching validated curated
   transformation.
7. Enter **Your Dream World**, the separately gated ninth scene. It is not available in Atlas
   and there is no manual Van Gogh/Infinity ending chooser. The Finale hides the artwork group
   and stages the whole selected company facing the visitor for a ceremonial close.

Every process station is also gated on a successfully initialized inherited MUSE world asset.
A full-viewport transition veil shows that world's 1672 x 941 scene poster while the RAD/GLB,
collider and cast prepare. It does not reveal the coarse procedural scene or character fallback
during the normal preload. The veil decodes the poster, holds through world readiness, then uses
a slow image push and crossfade into the live scene. Atlas reuses the same veil when it changes
worlds, and the next canonical poster is prefetched once at low priority after the current poster
decodes. If a world misses its presentation-quality gate, the matching high-resolution poster
remains as the world background instead of exposing the coarse canvas; evidence stays blocked
and the scene remains retryable. A failed ninth-world load likewise preserves the published
manifesto without committing final-world entry.

The complete curated path works without credentials. Missing credentials are reported
honestly: local assets and validated contracts remain active, and no paid request is sent.

Sound follows that same ten-beat progression. Three reviewed public-domain recordings inherited
from MUSE Infinity score the threshold, exploration and salon acts, with a quiet deterministic
Web Audio texture underneath. Visible guide and companion lines are narrated one turn at a time with the expressive
MiniMax `speech-2.8-turbo` cast when configured, official OpenAI `gpt-4o-mini-tts` as the server
fallback, and browser `SpeechSynthesis` as the final speech-only fallback. The same text always
remains visible. Narration automatically lowers the score and does not replace the separate
microphone conversation.

## Canonical nine-scene spine

The first eight worlds are the process. The ninth is the answer and cannot be entered early.

| # | Chapter | Exhibition scene | Spatial asset | Canonical lens | Primary format |
| ---: | --- | --- | --- | --- | --- |
| 1 | ARRIVAL | The Threshold Conservatory | Grand Conservatory with Lush Gardens | Cross-temporal salon | Quality RAD from 4.32M-splat SPZ |
| 2 | QUESTION | The Court of Light | Elegant Floral Palace Interior | Sigmund Freud | Quality RAD from 4.32M-splat SPZ |
| 3 | PERCEPTION | The Garden of Water and Light | Enchanted Water Garden Sanctuary | Claude Monet | Quality RAD from 4.32M-splat SPZ |
| 4 | INVENTION | The Sunset Frame Gallery | Dreamlike Coastal Villa Gardens | Pablo Picasso | Quality RAD from 2.40M-splat SPZ |
| 5 | INTENSITY | The Studio of the Burning Sky | Van Gogh Inspired Gallery Interior | Vincent van Gogh | Quality RAD from 3.84M-splat SPZ |
| 6 | TRANSFORMATION | The Petal Transition Hall | Sunlit Palace Gardens | Qi Baishi | Quality RAD from 4.32M-splat SPZ |
| 7 | IDENTITY | The Courtyard of Living Memory | Mexican Courtyard Bedroom Fantasy | Frida Kahlo | Quality RAD from 4.32M-splat SPZ |
| 8 | INFINITY | The Infinite Repetition Chamber | Yellow Polka Dot Infinity Room | Infinity and repetition; AI interpretive lens | 8K texture GLB; 1.92M-splat fallback |
| 9 | ANSWER | Your Dream World | Fantasy Realm of Shimmering Spheres | Visitor + selected company | 8K texture GLB |

Bright Gallery is a noncanonical local asset. It is not the threshold, a
process scene, the default route or the final answer in this nine-scene build.

Yayoi Kusama is living. MUSE does not present the infinity/repetition lens, avatar, text or
synthetic voice as Kusama herself speaking, approving the experience or offering historical
testimony. This follows the representation boundary in the
[original product specification](https://github.com/SkylarWJY/muse-infinity/blob/main/docs/LATEST_PRODUCT_SPEC.md#L76-L79).

## High-fidelity world delivery

The current route preserves the inherited `muse-infinity` spaces at source-detail quality. The
first seven process worlds are prebuilt from 2.40M-4.32M SPZ files with Spark's official quality
RAD builder instead of making the browser construct LOD data during a visit. RAD preserves a
quality hierarchy and lets the browser fetch visible chunks by byte range. Scene 8 uses its
exact 598,495-triangle
texture-mesh geometry, and scene 9 uses its exact 593,231-triangle texture-mesh geometry. Both retain their
8192 x 8192 texture dimensions; only the embedded PNG was re-encoded as JPEG quality 88 to
stay below GitHub's 100 MB per-file limit:

- `yellow-infinity-room-texture-mesh.glb`: **73,136,900 bytes**;
- `fantasy-shimmering-spheres-texture-mesh.glb`: **93,404,352 bytes**.

The default `balanced` tier uses DPR 1.5 and a 1M Spark LOD target on desktop, DPR 1.25 and a
400K target on mobile, preserving the source assets while avoiding a multi-million-splat startup
budget on typical judging devices. `?quality=high` restores DPR 2 / 4.32M on desktop and DPR 1.5 /
750K on mobile for recording or verified high-end hardware; `?quality=performance` is the
lower-budget fallback. No tier applies tone mapping that would alter source colors, and only one
decoded world is retained at a time.

The local server supports HTTP byte ranges (`206`, `Content-Range`, `Accept-Ranges`) and
immutable asset caching for the large RAD/SPZ/GLB files. Hidden collider meshes
provide locally continuous ground-height raycasts so the learner and full selected company
stay on the same terrain layer instead of snapping to water, props or upper surfaces. A
dense radius-wide sweep stops and slides the learner around nearby vertical collider faces,
including narrow 2 cm obstacles at varied offsets. Ground and blocking triangles are indexed
once so per-frame queries stay local.

Texture, character and GLB loaders settle to visible fallbacks within bounded time and dispose
late resolutions. Spark retirement tracks initialization, pager fetches and worker work through
terminal disposal, including client-aborted archive streams.

Exact byte counts, SHA-256 hashes, original source sizes, colliders and reproduction commands
are in [docs/PROVENANCE.md](docs/PROVENANCE.md).

## Learner avatars

The default visitor is the user-provided little-girl Tripo export, optimized from 58,341,140
bytes to a browser-ready 2,066,968-byte GLB with 56,770 vertices and 88,379 triangles. It has
no skin or baked clips, so the runtime applies the same bounded shader-limb articulation used
for static interpretive-companion assets while root motion follows the real collider. Its source and
output hashes are locked in [the learner-girl manifest](assets/generated/learner-girl/manifest.json).

The prior adult learner remains available as the `original` profile. It was reconstructed from
a strict GPT Image 2 T-pose source and Tripo four-view turnaround; its 5,009,688-byte GLB has a
semantic 41-joint biped and baked wait/walk clips. Dense offline QA covers skin regions,
deformation, foot contact, knee motion and limb separation across 832 samples. See
[the production pipeline](docs/CHARACTER_PIPELINE.md) and
[the v2 manifest](assets/generated/learner-v2/manifest.json).

## Scene-specific ambient life

Visible ambient life is deliberately narrower than earlier prototypes. The old procedural birds,
butterflies, dragonflies, koi and the unskinned, clipless white-dove GLB have been removed from
the visible scene configuration. Only the abstract infinity dots and answer-world fireflies
remain. The retired dove manifest stays in the provenance ledger; it is not evidence of a
currently deployed ambient character.

Any future concrete ambient subject must pass the complete gate recorded in code: GPT Image 2
reference, identity-consistent multiview, Tripo GLB reconstruction, a named embedded animation
clip and approved visual QA. Unapproved, missing or static candidates remain invisible and have
no procedural primitive fallback.
`window.__MUSE_METRICS__.ambient` reports the active scene, kinds, count and motion state.
See the [retired dove production manifest](assets/generated/ambient-avian-v1/manifest.json) and
[current public build evidence](docs/BUILD_PROCESS_EVIDENCE.md).

## GPT-5.6 model and provider boundary

Every language and judgment request is locked to GPT-5.6 (`gpt-5.6` or the explicitly allowed
`gpt-5.6-sol`). The server accepts exactly two remote HTTPS origins: the official OpenAI Platform at
`https://api.openai.com`, or the disclosed authorized OpenAI-compatible gateway at
`https://api.baizhiyuan.cloud`. Local development may explicitly reuse the current user's
`~/.codex/auth.json` and selected loopback `/v1` Responses provider. Compatible providers are
reasoning-only. OpenAI Realtime and OpenAI TTS are enabled only when the official origin is configured; this prevents a compatible
Responses endpoint from being misrepresented as support for unrelated speech endpoints. No
alternate reasoning-model family or open provider registry is supported.

- **AI curation:** GPT-5.6 uses the Responses API and strict Structured Outputs. It can write
  bounded prompts, choices, gestures and effects, but it cannot change the eight scene IDs,
  their order or any coordinates.
- **Roundtable synthesis:** GPT-5.6 receives the capped evidence digest from all eight visits
  and returns a provisional title, synthesis, principle, philosophy axis, visual prompt,
  ordered evidence IDs and one perspective for each selected companion.
- **Decision transformation:** on the configured live path, choosing `perception`, `emotion`
  or `invention` sends the digest and provisional concept through a second GPT-5.6 Responses
  API strict Structured Output. The schema fixes `philosophy_axis` to that choice; the prompt
  requires a rewrite of `world_title`, `synthesis`, `principle` and `visual_prompt`; validation
  rejects the result unless every one of those fields differs from the provisional concept.
  Only the validated replacement concept advances to the Manifesto.
- **Scene dialogue:** a visitor can ask a free-form question about the current scene and
  focused artwork. GPT-5.6 Responses returns one strict-schema perspective for each selected
  companion, grounded in trusted scene metadata and the visitor's recent evidence.
- **Guide narration:** MiniMax `speech-2.8-turbo` gives the nine-character cast distinct voices;
  official-origin OpenAI `gpt-4o-mini-tts` is the server fallback and browser
  `SpeechSynthesis` is the final fallback. Only already-visible text and an allowlisted speaker
  ID are sent. Returned MP3 data is used only for immediate playback and is not persisted.
  MiniMax and both fallback renderers perform no language reasoning.
- **Voice:** the separate Voice control starts a live microphone conversation. Optional
  official OpenAI Realtime WebRTC carries the same scene, artwork, companion and evidence
  context into that continuing spoken exchange. Context refreshes through
  `session.update`, Realtime transcripts appear in the inquiry thread, and responses follow
  the visitor's language. When Realtime is unavailable, supported browsers can use
  `SpeechRecognition` and `SpeechSynthesis`; recognized text still goes through the same
  configured GPT-5.6 dialogue endpoint or its labeled curated local fallback. Browser speech
  supplies no separate reasoning model. The built-in `marin` voice is not a cloned historical
  voice, and text inquiry remains available throughout. Realtime is deliberately unavailable
  when the authorized compatible gateway is selected.
- **Fallback:** unavailable, invalid or incomplete output is labeled `CURATED DEMO` and uses
  the same contracts and gates.

Tripo is used only in offline asset-production workflows; the recorded white-dove result is no
longer visible in the current ambient configuration. World
Labs produced the inherited prepared spatial assets and also has an optional admin-gated Forge
endpoint for isolated spatial variations; Forge is outside the canonical journey and performs
no language reasoning. The competition's
[Official Rules, Project Requirements > Third Party Integrations](https://openai.devpost.com/rules)
permit third-party integrations when the entrant is authorized under the applicable terms;
every runtime language and judgment request in MUSE remains GPT-5.6.

World Labs Marble's **Record** output is an MP4 capture, not an animated GLB export. MUSE
therefore does not describe Marble as the source of a loopable transition GLB. The implemented
transition deliberately reuses the inherited MUSE approach: a high-resolution scene poster and
readiness veil bridge into the actual local high-fidelity world. An MP4 may be evaluated later
as authored transition media, but only after visual and rights review and without changing this
asset claim.

The final claim is intentionally precise: **GPT personalizes the concept** (`world_title`,
`synthesis`, `principle` and `visual_prompt`); **the ninth scene's geometry is the prepared,
pre-generated Shimmering Spheres realization**. MUSE does not claim that GPT generates new
final geometry during the session.

## Three distinct AI production chains

MUSE keeps runtime reasoning, offline asset production and software engineering separate so
the demo never credits one tool for another tool's output.

1. **GPT-5.6 runtime core:** visitor question -> strict structured curation over the known
   eight-world spine -> artwork-fact-grounded dialogue -> Roundtable over the carried evidence
   -> a second, contradiction-triggered concept transformation. The UI visibly distinguishes
   `GPT-5.6 · OPENAI LIVE` from `CURATED FALLBACK` / `CURATED DEMO`; fallback content is never
   presented as a live model response.
2. **GPT Image 2 offline references:** GPT Image 2 creates images, not GLBs. The retained adult
   learner follows GPT Image 2 T-pose/reference -> Tripo four-view turnaround -> Tripo v3.1
   `multiview_to_model` -> GLB -> rig/animation -> offline QA. The retired white-dove experiment
   followed the image/reference and Tripo reconstruction boundary but produced no embedded clip,
   so it is not visible now. The default little-girl learner is
   a user-provided Tripo model and is not credited to GPT Image 2. See
   [the character pipeline](docs/CHARACTER_PIPELINE.md) and the
   [GPT Image 2 model documentation](https://developers.openai.com/api/docs/models/gpt-image-2).
3. **Codex / OMX engineering:** Deep Interview -> consensus plan -> implementation -> targeted
   tests -> adversarial QA -> review. A redacted record of user-input summaries, constraints,
   rejected candidates, test repairs and remaining gates is published in
   [docs/BUILD_PROCESS_EVIDENCE.md](docs/BUILD_PROCESS_EVIDENCE.md); it excludes hidden
   chain-of-thought, credentials and private runtime logs.

All eight local living-artwork v1 visuals failed visual QA. Production lookup is approved-only,
therefore every v1 visual is runtime-ineligible and the rejected-visual loader path makes zero
calls. Their files remain inspectable evidence, not deployed dynamic artworks.

For `aic-111436`, an image-conditioned Marble candidate was rejected. A second text-conditioned
Marble candidate earned a 9/10 preliminary Hermes static review and is only
`approved-for-browser-qa`; it is not production-approved or deployed. The current experiment is
an evidence-triggered, five-second frame portal inspired by Musée du Monde: it opens from the
painting, performs a bounded camera passage and returns fully to the frame. It remains isolated
behind the browser-QA path until desktop, mobile, reduced-motion, frame-return and an independent
visual review pass. Exact World IDs, credit use and local paths are in
[docs/BUILD_PROCESS_EVIDENCE.md](docs/BUILD_PROCESS_EVIDENCE.md).

## Three-minute demonstration

The planned 2:58 submission cut keeps about 85% of its duration on the real visitor experience:
question, three interpretive lenses, bounded curation, one full artwork encounter, the
eight-chapter thought spine, evidence-grounded Roundtable, contradiction transformation and
the ninth-world reveal. GPT Image 2, Codex, tests and QA appear only in the final 17-second
making-of, followed by the bounded closing claim: **GPT-5.6 personalized concept - prepared
spatial realization**. This is designed to satisfy the
[Build Week video requirement](https://openai.devpost.com/rules) to explain both Codex and
GPT-5.6 without displacing the product demonstration.

The exact shot timings, current four-quadrant release record, two-loop closeout and optional
Shotcraft constraints are in [docs/SUBMISSION.md](docs/SUBMISSION.md). Shotcraft is not installed
or part of the MUSE runtime; it may be used in an isolated Remotion directory only after the
real WebGL master recording is locked.

## Run locally

Requirements: Node.js 20.12 or newer.

```bash
npm install
cp .env.example .env
npm start
```

Open <http://127.0.0.1:4175>. `.env` is optional for the complete curated path.

```bash
# Optional: override stale OPENAI_* values with ~/.codex/auth.json and config.toml
MUSE_OPENAI_CONFIG=codex
# Otherwise configure the remote provider directly
OPENAI_API_KEY=...
# Exact allowlist: official OpenAI, or the authorized reasoning-only gateway
OPENAI_BASE_URL=https://api.openai.com
OPENAI_MODEL=gpt-5.6
# Optional expressive cast narration
MINIMAX_API_KEY=...
# Optional auxiliary World Labs Forge; both values are required
WORLDLABS_API_KEY=...
INTEGRATION_ADMIN_TOKEN=...
PORT=4175
HOST=127.0.0.1
```

Secrets remain server-side. `OPENAI_API_KEY` is sent only to the configured allowlisted GPT
origin. In Codex mode the auth file must be owned by the current user and inaccessible to group
or other users, and only an exact loopback `/v1` Responses provider is accepted.
`MINIMAX_API_KEY` is sent only to MiniMax's documented T2A endpoint.
Set `HOST=0.0.0.0` only for container or hosted deployment. All nine canonical worlds load
from local assets and do not require a world-generation service.

The request budget trusts forwarding headers only when the TCP peer is loopback. A local
reverse proxy must append the actual client address to the right side of
`X-Forwarded-For`; when both forwarding formats are present, that proxy-appended XFF node
takes precedence over `Forwarded`. Do not pass an unmodified client-supplied XFF chain.

### Run in the background with PM2

PM2 must be installed and available on `PATH`. Install it globally when it is not already
available:

```bash
npm install -g pm2
```

The checked-in process file pins PM2 to this checkout and keeps one server listening on
`127.0.0.1:4175`:

```bash
npm run pm2:start
pm2 save
```

Use `npm run pm2:restart` after changing environment variables, `npm run pm2:logs` to follow
output, and `npm run pm2:stop` to stop the service. The process automatically restarts after
a crash; file edits do not trigger restarts because static assets are read per request.

## Controls

- `W A S D` or arrow keys: walk and turn.
- Pointer drag: look around.
- Mobile joystick: move without a keyboard.
- Sound: enable or mute the public-domain museum score, ambient texture and synthetic guide narration.
- Voice: start or stop the live microphone conversation; this is independent of passive
  guide narration.
- Atlas: jump freely among all eight process worlds without fabricating visit evidence. The
  ninth world is deliberately excluded.
- URL quality control: `?quality=balanced` (default), `?quality=high` or `?quality=performance`.

## Architecture

```text
Browser                                  Server
src/main.js                              server.mjs
  JourneySession (10 beats)                services/openai.js
  LessonSession (8 visits)                 services/rooms.js
  SceneTourSession (3 stations/scene)      shared/contracts.js
  MuseumEngine
    independent GuideDirector per companion
    ArchivedAvatar / LearnerAvatar
    WorldLayer -> Spark paged RAD / SPZ fallback / 8K GLB / collider
    artworkPlacements -> wall and leg-free edge-display anchors
    sceneCollections -> 36 local AIC images (32 process, 4 provenance-only Finale records)
  AmbientLife / transition veil          Responses dialogue / Realtime WebRTC
  MuseumScore / ambient texture          MiniMax / official OpenAI narration
  AppView / Profile / Voice / API
```

`shared/contracts.js` is the model boundary. `src/config/exhibitionSpine.js` owns the exact
8+1 narrative order. `src/config/legacyAssets.js` owns world transforms, spawn
profiles, bounds, render formats, companions and portraits. `GuideDirector` translates a
validated stop into deterministic movement and correspondence evidence.

## Verify

```bash
npm run check
npm test
npm run audit:providers
npm run test:e2e
npm audit --audit-level=high
```

The suite locks the nine-scene manifest, quality-RAD headers and exact asset metadata, 8K
texture dimensions, ten-beat and archive-required retry gates, free-form grounded evidence,
the three-station-per-scene evidence gate, eight-reflection digest, strict
initial/transformed GPT schemas, independent selected-companion movement,
the 36-work gallery cast with real JPEG aspect ratios and collider-backed placements,
context-grounded dialogue and Realtime session updates, high-quality renderer policy,
Range/late-load/Spark-pager disposal and desktop/mobile behavior. The independent acceptance
findings and their final disposition are recorded in
[docs/ACCEPTANCE_CROSS_VALIDATION.md](docs/ACCEPTANCE_CROSS_VALIDATION.md).

## License and asset notices

Source code and authored documentation are released under the [MIT License](LICENSE).
Bundled generated and third-party assets retain their applicable source terms; see
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and
[docs/PROVENANCE.md](docs/PROVENANCE.md).

## Build Week development record

The core MUSE concept, nine prepared spatial worlds, collider files, scene images, thumbnails,
interpretive-companion assets and portraits are pre-Submission Period materials controlled by
the entrant or lawfully sourced under the terms recorded in this repository. During the
Submission Period, Codex was used to implement and verify the
strict ten-beat/8+1 journey, three-station scene tours, GPT-5.6 curation and two-stage synthesis,
independent embodied party movement, artwork correspondence, high-resolution readiness
transitions, conditional OpenAI Realtime plus MiniMax/OpenAI narration, public-domain music,
ambient approval gates, abstract dots/fireflies, responsive UI and automated test coverage.

This record follows the [OpenAI Build Week Official Rules](https://openai.devpost.com/rules):
the Project Requirements permit third-party SDKs, APIs and data when the entrant is authorized
under their terms; existing projects identify Submission Period work; demo music must be
authorized; and this README identifies the Codex and GPT-5.6 contribution.

The repository did not historically use a documented four-quadrant planning method. Starting
with the current release closeout, known knowns, known unknowns, recovered repository evidence
and newly exposed risks are tracked explicitly in
[the submission plan](docs/SUBMISSION.md#release-closeout-two-loops-maximum). This is a current
practice, not a retrospective claim about earlier development.

Repository evidence includes Submission Period commits `62a7f59`, `9ab9062`, `7602267` and
`55fdeed`, plus Codex `/feedback` session
`019f7e53-4039-7cc1-9162-01906bec47b7`. The detailed file manifest remains in
[docs/PROVENANCE.md](docs/PROVENANCE.md).

## Codex session

Majority core-functionality session for `/feedback`:

`019f7e53-4039-7cc1-9162-01906bec47b7`
