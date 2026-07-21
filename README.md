# MUSE: Nine Worlds, One Living Question

MUSE turns one life question into an embodied inquiry across a complete nine-world
exhibition. The visitor chooses up to three historical companions, walks
with the whole selected company through eight ordered process worlds, gathers one grounded
observation in each world, convenes the company, and enters a gated ninth world only after
forming a manifesto.

The high-fidelity spatial environments and embodied characters are the main interaction, not a
thumbnail gallery. GPT-5.6 supplies bounded curation, provisional synthesis and a
decision-locked transformation; deterministic code owns the nine-scene order, asset IDs,
movement, coordinates, grounding, rendering and gates.

Built with Codex for the **Education** track of
[OpenAI Build Week](https://openai.com/zh-Hans-CN/build-week/).
Public repository: <https://github.com/baizhiyuan/muse>

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

The experience follows ten narrative beats without compressing them into a shorter route:

```text
threshold
  -> life_question
  -> companion_selection
  -> ai_curation
  -> world_exploration (eight ordered worlds)
  -> summoning
  -> roundtable
  -> decision
  -> world_transformation
  -> manifesto
  -> gated ANSWER world
```

1. Cross the threshold and ask the life question the museum should hold.
2. Invite one to three companions from eight historical interpretations: Monet,
   Van Gogh, Socrates, Frida Kahlo, Picasso, Freud, Qi Baishi and Yayoi Kusama.
3. Let GPT-5.6, or the validated curated fallback, bind that question to the fixed
   eight-world exhibition spine.
4. Walk every process world in order with all selected companions physically present. The
   first companion guides; the other selected companions follow in a grounded formation. The
   guide moves to the current artwork, faces it, gestures, asks, listens and reflects before
   either a bounded choice or an 80-character visitor-written observation is accepted. Every
   world contains four globally unique Art Institute of Chicago Open Access works; their
   frames are placed against collider-tested walls or on grounded freestanding supports.
   The authored nine-world layout uses 9 true wall mounts whose center and four corners all
   have a near-vertical collider backing within 0.10 m, plus 27 honest stands where the
   world geometry has no usable wall; every frame center is 1.50 m above its local viewing
   ground.
5. Review all eight observations at Summoning, then convene the selected company at the
   Roundtable for a provisional evidence-grounded concept.
6. Choose the unresolved axis between perception, emotion and invention. On the live path,
   that choice starts a second GPT-5.6 Responses API request with a strict
   transformed-concept schema. It locks the chosen axis and instructs GPT to materially revise
   the title, synthesis, principle and visual prompt before Transformation can complete and
   the Manifesto can be published. No-key mode applies the matching validated curated
   transformation.
7. Enter **Your Dream World**, the separately gated ninth scene. It is not available in Atlas
   and there is no manual Van Gogh/Infinity ending chooser.

Every process observation is also gated on a successfully initialized MUSE world asset.
Procedural scenery keeps the interface responsive during loading or failure, but it cannot
create evidence. A failed world load remains retryable, and a failed ninth-world load preserves
the published manifesto without committing final-world entry.

The complete curated path works without credentials. Missing credentials are reported
honestly: local assets and validated contracts remain active, and no paid request is sent.

Sound follows that same ten-beat progression. A new four-profile score is synthesized at
runtime with deterministic Web Audio oscillators and crossfades; it contains no samples or
reference audio. Visible guide and companion lines are narrated in sequence with official OpenAI
`gpt-4o-mini-tts` when configured and browser `SpeechSynthesis` as the speech-only fallback. The
same text always remains visible. Narration automatically lowers the score and does not replace
the separate microphone conversation.

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
| 8 | INFINITY | The Infinite Repetition Chamber | Yellow Polka Dot Infinity Room | Yayoi Kusama | 8K texture GLB; 1.92M-splat fallback |
| 9 | ANSWER | Your Dream World | Fantasy Realm of Shimmering Spheres | Visitor + selected company | 8K texture GLB |

Bright Gallery is a noncanonical local asset. It is not the threshold, a
process scene, the default route or the final answer in this nine-scene build.

## High-fidelity world delivery

The current route uses a source-detail hierarchy. The first seven process worlds are prebuilt
from 2.40M-4.32M SPZ files with Spark's official quality RAD builder instead of making the
browser construct LOD data during a visit. RAD preserves a quality hierarchy and lets the
browser fetch visible chunks by byte range. Scene 8 uses its exact 598,495-triangle
texture-mesh geometry, and scene 9 uses its exact 593,231-triangle texture-mesh geometry. Both retain their
8192 x 8192 texture dimensions; only the embedded PNG was re-encoded as JPEG quality 88 to
stay below GitHub's 100 MB per-file limit:

- `yellow-infinity-room-texture-mesh.glb`: **73,136,900 bytes**;
- `fantasy-shimmering-spheres-texture-mesh.glb`: **93,404,352 bytes**.

Default high quality uses DPR 2 and a 4.32M Spark LOD target on desktop, DPR 1.5 and a 750K
target on mobile, `lodRenderScale: 1`, `lodScale: 2`, and no tone mapping that would alter the
source colors. `?quality=balanced` and `?quality=performance` provide explicit lower GPU
budgets without replacing the source files. Only one decoded world is retained at a time.

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

## Rigged learner asset

The learner was regenerated from a strict GPT Image 2 T-pose source and a Tripo-generated
four-view turnaround, then reconstructed with Tripo v3.1. The deployed 5,009,688-byte GLB has
21,672 vertices, 37,659 triangles, a semantic 41-joint biped and baked wait/walk clips. Dense
offline QA checks skin regions, mesh deformation, foot contact, knee motion and limb
separation across 832 animation samples. The only correction was removal of a low invalid
leg-twist influence from 11 shoulder vertices before deployment; runtime code does not rewrite
skin weights. See [the production pipeline](docs/CHARACTER_PIPELINE.md) and
[the v2 manifest](assets/generated/learner-v2/manifest.json).

## Scene-specific ambient life

Every canonical world has a restrained deterministic ambient layer: garden butterflies and
birds, authored water-garden koi and dragonflies, coastal gulls, distant crow silhouettes,
tropical courtyard life, abstract infinity dots or answer-world fireflies. The implementation
uses code-native low-poly articulated geometry and efficient point fields, so it adds no
third-party creature asset, model API or dependency. World switches dispose the old cast, and
dynamic point fields use a stable authored activity bound instead of a stale first-frame bound.
`window.__MUSE_METRICS__.ambient` reports the active scene, kinds, count and motion state.

## Official OpenAI model stack

The runtime uses an official OpenAI Platform key at `api.openai.com`. Every text request is
locked to `gpt-5.6`; no alternate model family or general provider registry is part of the
supported runtime.

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
- **Guide narration:** official OpenAI `gpt-4o-mini-tts` renders the already-visible text;
  browser `SpeechSynthesis` is the final fallback. Returned MP3 data is used only for immediate
  playback and is not persisted. These speech renderers perform no language reasoning.
- **Voice:** the separate Voice control starts a live microphone conversation. Optional
  official OpenAI Realtime WebRTC carries the same scene, artwork, companion and evidence
  context into that continuing spoken exchange. Context refreshes through
  `session.update`, Realtime transcripts appear in the inquiry thread, and responses follow
  the visitor's language. When Realtime is unavailable, supported browsers can use
  `SpeechRecognition` and `SpeechSynthesis`; recognized text still goes through the same
  official GPT-5.6 dialogue endpoint or its labeled curated local fallback. Browser speech
  supplies no separate reasoning model. The built-in `marin` voice is not a cloned historical
  voice, and text inquiry remains available throughout.
- **Fallback:** unavailable, invalid or incomplete output is labeled `CURATED DEMO` and uses
  the same contracts and gates.

Tripo is used only in the character-asset production workflow. World Labs produced prepared
spatial assets and also has an optional admin-gated Forge endpoint for isolated spatial
variations; Forge is outside the canonical journey and performs no language reasoning. All
runtime language and judgment requests use GPT-5.6 through the official OpenAI API.

The final claim is intentionally precise: **GPT personalizes the concept** (`world_title`,
`synthesis`, `principle` and `visual_prompt`); **the ninth scene's geometry is the prepared,
pre-generated Shimmering Spheres realization**. MUSE does not claim that GPT generates new
final geometry during the session.

## Run locally

Requirements: Node.js 20.12 or newer.

```bash
npm install
cp .env.example .env
npm start
```

Open <http://127.0.0.1:4175>. `.env` is optional for the complete curated path.

```bash
OPENAI_API_KEY=...
# Optional auxiliary World Labs Forge; both values are required
WORLDLABS_API_KEY=...
INTEGRATION_ADMIN_TOKEN=...
PORT=4175
HOST=127.0.0.1
```

Secrets remain server-side. `OPENAI_API_KEY` is sent only to the official OpenAI API origin.
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
- Follow control: let the camera follow the guide.
- Mobile joystick: move without a keyboard.
- Sound: enable or mute the original procedural score and synthetic guide narration.
- Voice: start or stop the live microphone conversation; this is independent of passive
  guide narration.
- Atlas: inspect the eight process worlds without recording progress. The ninth world is
  deliberately excluded.
- URL quality control: `?quality=high`, `?quality=balanced` or `?quality=performance`.

## Architecture

```text
Browser                                  Server
src/main.js                              server.mjs
  JourneySession (10 beats)                services/openai.js
  LessonSession (8 visits)                 services/rooms.js
  MuseumEngine                             shared/contracts.js
    GuideDirector
    ArchivedAvatar / LearnerAvatar
    WorldLayer -> Spark paged RAD / SPZ fallback / 8K GLB / collider
    artworkPlacements -> nine-world wall and stand anchors
    sceneCollections -> 36 local AIC Open Access images
  ProceduralSoundscape / Narration       Responses dialogue / Realtime WebRTC
  AppView / Profile / Voice / API        OpenAI speech rendering
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
the eight-visit digest, strict initial/transformed GPT schemas, all-selected-companion movement,
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
historical-character assets and portraits are pre-Submission Period materials controlled by
the entrant or lawfully sourced under the terms recorded in this repository. During the
Submission Period, Codex was used to implement and verify the
strict ten-beat/8+1 journey, GPT-5.6 curation and two-stage synthesis, embodied party movement,
artwork correspondence, transitions, official OpenAI Realtime/TTS voice, procedural music,
ambient life, responsive UI and automated test coverage.

This record follows the [OpenAI Build Week Official Rules](https://openai.devpost.com/rules):
authorized third-party SDKs, APIs and data remain subject to their terms; existing projects
identify Submission Period work; demo music must be authorized; and this README identifies the
Codex and GPT-5.6 contribution.

Repository evidence includes Submission Period commits `62a7f59`, `9ab9062`, `7602267` and
`55fdeed`, plus Codex `/feedback` session
`019f7e53-4039-7cc1-9162-01906bec47b7`. The detailed file manifest remains in
[docs/PROVENANCE.md](docs/PROVENANCE.md).

## Codex session

Majority core-functionality session for `/feedback`:

`019f7e53-4039-7cc1-9162-01906bec47b7`
