# MUSE: Nine Worlds, One Living Question

MUSE turns one life question into an embodied inquiry across the complete
`muse-infinity` exhibition. The visitor chooses up to three historical companions, walks
with the whole selected company through eight ordered process worlds, gathers one grounded
observation in each world, convenes the company, and enters a gated ninth world only after
forming a manifesto.

The archived World Labs environments and Tripo characters are the main interaction, not a
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

The rebuild preserves the ten narrative beats from `muse-infinity` instead of compressing
them into a shorter route:

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
2. Invite one to three companions from eight archived historical interpretations: Monet,
   Van Gogh, Socrates, Frida Kahlo, Picasso, Freud, Qi Baishi and Yayoi Kusama.
3. Let GPT-5.6, or the validated curated fallback, bind that question to the fixed
   eight-world exhibition spine.
4. Walk every process world in order with all selected companions physically present. The
   first companion guides; the other selected companions follow in a grounded formation. The
   guide moves to the declared evidence point, faces it, gestures, asks, listens and reflects
   before either a bounded choice or an 80-character visitor-written observation is accepted.
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

Every process observation is also gated on a successfully initialized MUSE Infinity archive.
Procedural scenery keeps the interface responsive during loading or failure, but it cannot
create evidence. A failed archive remains retryable, and a failed ninth-world load preserves
the published manifesto without committing final-world entry.

The complete curated path works without credentials. Missing credentials are reported
honestly: local assets and validated contracts remain active, and no paid request is sent.

## Canonical nine-scene spine

The first eight worlds are the process. The ninth is the answer and cannot be entered early.

| # | Chapter | Exhibition scene | Archived spatial asset | Canonical lens | Primary format |
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

Bright Gallery is an inherited, noncanonical archive file. It is not the threshold, a
process scene, the default route or the final answer in this nine-scene build.

## High-fidelity world delivery

The current route restores the source-detail hierarchy. The first seven process worlds are
prebuilt from the archived 2.40M-4.32M SPZ files with Spark's official quality RAD builder,
instead of shipping the earlier uniform 500K reductions or making the browser build LOD for
nearly a minute. RAD preserves a quality hierarchy and lets the browser fetch visible chunks
by byte range. Scene 8 uses its exact archived 598,495-triangle texture-mesh geometry, and
scene 9 uses its exact archived 593,231-triangle texture-mesh geometry. Both retain their
8192 x 8192 texture dimensions; only the embedded PNG was re-encoded as JPEG quality 88 to
stay below GitHub's 100 MB per-file limit:

- `yellow-infinity-room-texture-mesh.glb`: **73,136,900 bytes**;
- `fantasy-shimmering-spheres-texture-mesh.glb`: **93,404,352 bytes**.

Default high quality uses DPR 2 and a 2.5M Spark LOD target on desktop, DPR 1.5 and a 750K
target on mobile, `lodRenderScale: 1`, `lodScale: 2`, and no tone mapping that would alter the
archived colors. `?quality=balanced` and `?quality=performance` provide explicit lower GPU
budgets without replacing the source files. Only one decoded world is retained at a time.

The local server supports HTTP byte ranges (`206`, `Content-Range`, `Accept-Ranges`) and
immutable asset caching for the large RAD/SPZ/GLB files. Hidden inherited collider meshes
provide ground-height raycasts so the learner and full selected company follow the archived
surface rather than a single flat plane.

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

## OpenAI-only reasoning boundary

OpenAI GPT models are the only language and reasoning runtime in this repository.

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
- **Voice:** optional OpenAI Realtime WebRTC is additive; text remains authoritative.
- **Fallback:** unavailable, invalid or incomplete output is labeled `CURATED DEMO` and uses
  the same contracts and gates.

World Labs and Tripo are disclosed providers of pre-generated spatial and character assets;
they are not reasoning providers. The separately gated World Labs Forge adapter is outside
the judging path, requires both a provider key and admin token, and does not produce language
reasoning. Claude, Gemini, MiniMax and configurable OpenAI-compatible LLM endpoints are absent
from this runtime.

The final claim is intentionally precise: **GPT personalizes the concept** (`world_title`,
`synthesis`, `principle` and `visual_prompt`); **the ninth scene's geometry is the archived,
pre-generated Shimmering Spheres realization**. MUSE does not claim that GPT or World Labs
generates new final geometry during the session.

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
OPENAI_MODEL=gpt-5.6
OPENAI_REALTIME_MODEL=gpt-realtime
WORLDLABS_API_KEY=...
INTEGRATION_ADMIN_TOKEN=...
PORT=4175
HOST=127.0.0.1
```

Secrets remain server-side. Set `HOST=0.0.0.0` only for container or hosted deployment.
World Labs generation is not needed to load any of the nine local canonical worlds.

### Run in the background with PM2

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
- Atlas: inspect the eight process worlds without recording progress. The ninth world is
  deliberately excluded.
- URL quality control: `?quality=high`, `?quality=balanced` or `?quality=performance`.

## Architecture

```text
Browser                                  Server
src/main.js                              server.mjs
  JourneySession (10 beats)                services/openai.js
  LessonSession (8 visits)                 services/worldLabs.js
  MuseumEngine                             services/rooms.js
    GuideDirector                          shared/contracts.js
    ArchivedAvatar / LearnerAvatar
    WorldLayer -> Spark paged RAD / SPZ fallback / 8K GLB / collider
  AppView / Profile / Voice / API
```

`shared/contracts.js` is the model boundary. `src/config/exhibitionSpine.js` owns the exact
8+1 narrative order. `src/config/legacyAssets.js` owns archived world transforms, spawn
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
high-quality renderer policy, Range/late-load/Spark-pager disposal and desktop/mobile behavior.

## Prior work and limits

The nine archived worlds, colliders, scene concepts, thumbnails, eight historical character
assets and the original MUSE narrative came from `muse-infinity`. This repository does not
present them as Build Week generation. The Build Week additions are the Codex-built
OpenAI-only runtime, restored strict 8+1 flow, all-selected-companion movement, natural
free-form observation path, deterministic evidence gates, high-fidelity delivery, collider
grounding, two-phase final-concept transformation and verification.

Known limits:

- The eight inherited historical GLBs contain static meshes. Their bounded motion is
  shader-deformed, not skeletal animation, IK or mocap. The learner is a separate 41-joint
  skinned GLB with baked wait/walk clips; it does not use full-body IK.
- Navigation uses inherited colliders for height and declared bounds for movement; it does
  not provide navmesh obstacle avoidance or full-body IK.
- There is no lip sync. Realtime voice is optional.
- Collaboration rooms are in-memory demo infrastructure.
- Live OpenAI/Realtime/Forge requests and real-hardware GPU performance require external
  credentials or hardware.
- Complete World Labs generation IDs, prompts, receipts and explicit redistribution records
  for the inherited worlds have not been recovered. Several inherited Tripo and portrait
  source records are also incomplete. Do not infer redistribution rights from hackathon
  credit access.

Source code and authored documentation are released under the [MIT License](LICENSE).
Bundled generated and third-party assets are excluded from that grant; see
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and
[docs/PROVENANCE.md](docs/PROVENANCE.md).

## Codex session

Majority core-functionality session for `/feedback`:

`019f7e53-4039-7cc1-9162-01906bec47b7`
