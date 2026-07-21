# MUSE Design Source of Truth

## Product intent

MUSE is a learning world, not a museum dashboard and not a chatbot over 3D wallpaper. The
spatial environment is the primary surface. Interface, GPT output and character behavior
exist to direct attention inside a sequence of worlds.

One life question moves through ten narrative beats, eight process worlds and one gated answer
world. The learner and independently directed selected companions move through each
high-fidelity space;
dialogue waits for physical arrival and facing; colliders keep bodies on the visible ground;
the station speaker rotates while the other actors take separated listening positions; and the
Roundtable is grounded in three artwork stations plus one reflection from every process world.

## Product invariants

- The canonical spatial structure is eight ordered process scenes plus one independently
  gated answer scene. Bright Gallery is not part of this structure.
- The first eight scene IDs and their order are deterministic and cannot be changed by model
  output, Atlas navigation or an observation choice.
- The answer world is excluded from Atlas and cannot load before all eight scene reflections,
  Summoning, Roundtable, Decision, Transformation and Manifesto are complete.
- At least one and no more than three of the eight historical companions are chosen
  before curation.
- Every process scene contains three required artwork stations. Only after all three station
  evidence records exist does one scene reflection enter the eight-scene digest.
- Every selected companion remains embodied during world exploration. Speaker order rotates
  by station; each actor owns an independent director, staggered departure and grounded stage
  position. The same roster appears at the Roundtable without duplicate persistent/staged actors.
- Observation precedes interpretation. Dialogue cannot claim spatial correspondence until the
  active speaker reaches and faces the declared artwork. A visitor may then choose a bounded
  evidence stance or record a short observation.
- GPT-5.6 is the only language/reasoning model. Those requests use either the exact official
  OpenAI origin or the exact disclosed authorized compatible gateway; the latter is
  reasoning-only. Browser speech services and MiniMax provide voice rendering only. Optional
  World Labs Forge generates isolated spatial variations outside the canonical journey and
  performs no language reasoning.
- GPT personalizes the final concept. The final geometry is a prepared, pre-generated
  Shimmering Spheres world and must never be labeled live-generated geometry.
- No-key mode completes the same gates and scene order with explicit curated provenance.

## Ten-beat journey

The state machine preserves the original vocabulary without compressing several concepts
into generic `walk`, `salon` or `rewrite` stages.

| Order | State | Required behavior and exit gate |
| ---: | --- | --- |
| 1 | `threshold` | Establish the museum premise; crossing advances to the life question. |
| 2 | `life_question` | Capture a non-empty question before company can be selected. |
| 3 | `companion_selection` | Select one to three known companion IDs; begin curation explicitly. |
| 4 | `ai_curation` | Validate a strict eight-stop GPT/fallback contract; accept it before walking. |
| 5 | `world_exploration` | Complete three artwork stations and one reflection in each of eight process scenes, in canonical order. |
| 6 | `summoning` | Surface the complete eight-reflection ledger and selected company. |
| 7 | `roundtable` | Produce one perspective per selected companion and a provisional grounded concept. |
| 8 | `decision` | Choose the unresolved axis: `perception`, `emotion` or `invention`. |
| 9 | `world_transformation` | Send the provisional concept and chosen axis through a second strict GPT/fallback transformation; accept the validated replacement. |
| 10 | `manifesto` | Publish the final principle; only then enable answer-world entry. |

`enterFinalWorld()` is a gate after the tenth beat, not an alternate ending selector. It
always resolves to `personal-dream-world` / Fantasy Realm of Shimmering Spheres.

## Canonical spatial spine

| # | Scene ID | Exhibition title | World ID | Historical lens | Format |
| ---: | --- | --- | --- | --- | --- |
| 1 | `threshold-conservatory` | The Threshold Conservatory | `grand-conservatory-with-lush-gardens` | Cross-temporal salon | Quality RAD from 4.32M SPZ |
| 2 | `court-of-light` | The Court of Light | `elegant-floral-palace-interior` | Sigmund Freud | Quality RAD from 4.32M SPZ |
| 3 | `water-and-light` | The Garden of Water and Light | `enchanted-water-garden-sanctuary` | Claude Monet | Quality RAD from 4.32M SPZ |
| 4 | `sunset-frames` | The Sunset Frame Gallery | `dreamlike-coastal-villa-gardens` | Pablo Picasso | Quality RAD from 2.40M SPZ |
| 5 | `burning-sky` | The Studio of the Burning Sky | `van-gogh-inspired-gallery-interior` | Vincent van Gogh | Quality RAD from 3.84M SPZ |
| 6 | `petal-transition` | The Petal Transition Hall | `sunlit-palace-gardens` | Qi Baishi | Quality RAD from 4.32M SPZ |
| 7 | `living-memory` | The Courtyard of Living Memory | `mexican-courtyard-bedroom-fantasy` | Frida Kahlo | Quality RAD from 4.32M SPZ |
| 8 | `infinite-repetition` | The Infinite Repetition Chamber | `yellow-polka-dot-infinity-room` | Yayoi Kusama | 8K GLB; 1.92M SPZ fallback |
| 9 | `personal-dream-world` | Your Dream World | `fantasy-realm-of-shimmering-spheres` | Visitor + selected company | 8K GLB |

The first eight entries live in `EXHIBITION_SPINE`. The ninth lives in `FINAL_SCENE` so
lesson generation and Atlas cannot accidentally expose it as a process stop.

## World loading and image-quality policy

### Source-detail assets

- Scenes 1-7 use Spark 2.1.0 quality RAD hierarchies built from the 2.40M-4.32M source
  SPZs. The canonical route does not use uniform 500K derivatives.
- RAD is prebuilt with `build-lod --quality --rad` and loaded with `paged: true`; this moves
  the expensive Bhatt hierarchy build out of the browser and enables view-dependent Range
  requests without substituting a fixed low-resolution asset.
- Scene 8 prefers the 598,495-triangle unlit GLB and keeps its 1.92M-splat SPZ as a
  load fallback.
- Scene 9 uses the 593,231-triangle unlit GLB.
- Scene 8 and 9 retain 8192 x 8192 textures. Their embedded PNGs were re-encoded to JPEG
  quality 88; mesh geometry and texture dimensions were not reduced.
- One decoded world is resident at a time. Build tokens and explicit disposal prevent a
  late world load from replacing a newer selection.

### Runtime quality tiers

`high` is the default. URL parameters may select `balanced` or `performance` without
changing the source assets.

| Mode | Desktop DPR / Spark target / render scale / LOD scale | Mobile DPR / Spark target / render scale / LOD scale |
| --- | --- | --- |
| `high` | 2 / 4,320,000 / 1 / 2 | 1.5 / 750,000 / 1 / 2 |
| `balanced` | 1.5 / 1,000,000 / 1.15 / 1.75 | 1.25 / 400,000 / 1.25 / 1.5 |
| `performance` | 1.25 / 650,000 / 1.35 / 1.25 | 1 / 300,000 / 1.5 / 1 |

All tiers retain adaptive quality LOD. The desktop high target restores the expected Spark
detail budget instead of imposing a 130K hard cap. Splats and unlit mesh
materials use `NoToneMapping`; 8K mesh textures use available anisotropic filtering.

### Readiness transition

The live canvas is not used as a loading indicator. At boot, every canonical world change and
every Atlas cross-world comparison, a fixed readiness veil covers the canvas and presents the
matching inherited 1672 x 941 scene PNG. The image is decoded with a bounded fallback, uses a
slow scale-down and 760 ms opacity crossfade, and makes the rest of the application inert while
the requested world initializes. Once the current poster decodes, the next canonical poster is
requested once at low priority. The veil begins leaving only after the real RAD/GLB is
presentation-ready and companion setup has settled. This prevents coarse procedural world and
character placeholders from flashing during the successful preload path. If the world misses
the quality gate, the same poster becomes the world background, the canvas remains hidden and
the current process or manifesto is retained for retry. Reduced-motion mode retains the
readiness gate but removes the decorative movement and long fade.

The current design intentionally favors this inherited MUSE transition language over new
generated media. World Labs Marble **Record** exports MP4 capture, not an animated GLB, so no
loopable transition GLB is attributed to Marble. A future MP4 transition would need separate
composition, performance and rights validation before replacing the poster veil.

### Delivery and grounding

The static server advertises `Accept-Ranges: bytes`, returns valid `206` / `Content-Range`
responses, and gives `/assets/` immutable cache headers. This supports resumable, cacheable
delivery of large assets and paged RAD rendering; it is not a claim that GLB decoding
itself is progressive.

Every canonical world has its own collider. Collider meshes remain invisible and are
raycast downward for learner, guide and party ground height. A reference-height filter keeps
each actor on a locally continuous surface and rejects abrupt decorative or water layers.
The learner also uses center and radius-offset horizontal rays to stop and slide at vertical
collider faces. Declared native-scale transforms, spawn, bounds, yaw and camera range stay in
the asset manifest. This is bounded local collision, not navmesh route planning, semantic
surface classification or general physics.

### Artwork correspondence

Each of the nine scenes owns four deterministic Art Institute of Chicago works and four
authored placements in `src/config/artworkPlacements.js`. The first three artworks in each
process scene are required stations; the fourth remains present without blocking completion.
Placement QA loads each real JPEG
dimension and scene collider, checks the full frame sightline, bounds, separation,
grounded guide anchor and first-guide route, and requires any hidden supports to have a real
near-vertical backing wall behind the frame center and all four corners within 0.10 m. The
frame center is always 1.50 m above the local viewing ground; absolute world Y is intentionally
not normalized because the worlds use different origins and terrain elevations.

| Scene | True wall mounts | Grounded stands |
| --- | ---: | ---: |
| Threshold Conservatory | 2 | 2 |
| Court of Light | 1 | 3 |
| Garden of Water and Light | 1 | 3 |
| Sunset Frame Gallery | 0 | 4 |
| Studio of the Burning Sky | 1 | 3 |
| Petal Transition Hall | 4 | 0 |
| Courtyard of Living Memory | 0 | 4 |
| Infinite Repetition Chamber | 0 | 4 |
| Your Dream World | 0 | 4 |

Open gardens and the two answer-scale spaces retain honest freestanding displays where the
collider contains no reachable wall. Increasing the wall tolerance to make those frames look
mounted is prohibited because it would hide supports while leaving a visible 0.3-0.48 m gap.

Procedural architecture and articulated fallback avatars exist for bounded load failure, but
the readiness veil prevents them from flashing during a successful normal preload. They are
retired only after the requested world asset reports successful initialization.
For process worlds, that initialization is an evidence gate: procedural scenery may preserve
orientation, but it cannot unlock a question or create a visit. The retry surface retains the
current walking stop. For world 9, the manifesto is preserved and `finalWorldEntered` remains
false until the answer mesh is live.

## Interaction and movement language

### Learner

The learner is a local high-detail Tripo v3.1 GLB reconstructed from a GPT Image 2 source and
an identity-consistent four-view turnaround. A semantic 41-joint biped skin and baked
`preset:biped:wait` / `preset:biped:walk` clips run through `THREE.AnimationMixer`; an
articulated procedural learner remains the load fallback. Skin validation and the bounded
24-vertex cross-region correction happen offline, so runtime animation never rewrites weights.
Learner and guide navigation use a 1.33 m/s walking pace calibrated to the baked foot-contact
travel; the rejected run clip is not used because it failed the bind-ground gate.

### Historical companions

The selectable company consists of Monet, Van Gogh, Socrates, Frida Kahlo, Picasso, Freud,
Qi Baishi and Yayoi Kusama. Their browser GLBs are optimized static Tripo meshes; they contain
no skeleton or animation clips. The runtime
therefore uses bounded shader-region deformation plus spatial root motion.

Selection is also a spatial commitment. While the visitor freely walks, selected companions
may occupy collider-grounded formation slots. During a station tour, however, they stop being
followers: the station index rotates the lead speaker, each selected actor owns a separate
`GuideDirector`, and departures are staggered so the speaker arrives first. Collider-validated
party staging places the lead at the evidence center and listeners in separated side/retreat
positions. Each actor updates its own root position, heading, walk/idle deformation and locally
continuous ground height. At the Roundtable the persistent party
is temporarily hidden while the same roster is staged, so selection does not create visible
duplicates.

The supported readable vocabulary is:

```text
walking -> arriving -> facing -> pointing -> asking
        -> listening (0.55 s) -> reflecting
```

It must be described as shader-deformed motion, not skeletal character animation, IK,
mocap, lip sync or a newly rigged historical figure.

Static-mesh gait cadence follows the actor's root speed instead of running on one global fixed
cycle. Listening and reflection are persistent director states with distinct bounded poses;
this improves readable timing without changing the asset capability claim.

### Ambient life

`src/config/ambientLife.js` owns deterministic, authored activity volumes for all nine scenes.
Threshold, Sunset and Petal load the checked-in high-detail white rock-dove PBR GLB generated
through Tripo's hosted GPT Image 2 source-image task and Tripo v3.1 reconstruction. The selected
asset has no skin or baked clip (`skins: 0`, `animations: 0`), but a dedicated PBR vertex-shader
deformation visibly bends its two wing regions on every flight cycle. Deterministic root paths,
yaw, pitch and bank provide the larger flight path without a false skeletal-animation claim. A
concrete procedural white-dove fallback is used only on detailed-asset load failure. Other
distant birds, butterflies, dragonflies and koi use code-native articulated geometry; scene-8
dots and final fireflies use efficient point fields.

Counts stay between two and four physical creatures per world; the two point-only worlds use
24 motifs in one field. Every switch clears the previous world's geometry and material
resources. These paths are atmosphere, not navigation agents or semantic assertions about the
collider. Scene 5's crows are a bounded distant motif inside the authored volume, not a claim
that the interior world contains *Wheatfield with Crows*.

### Correspondence gate

`GuideDirector` receives only validated stop IDs and gesture verbs. It resolves positions
from the active world manifest, moves to the anchor and turns toward the evidence point.
The prompt opens only after correspondence reports distance <= 0.6 m and facing error <= 20
degrees. Model output never supplies arbitrary world coordinates.

After that gate, the visitor may select one of three evidence-bearing stances or write a short
observation in their own words. The scene tour records the focused artwork, rotating speaker
order and companion perspectives. After three required station records, one bounded scene
reflection continues to the same canonical next world. Neither a free observation nor a station
choice can bypass correspondence, skip the other required artworks or rewrite route order.
Atlas is inspect-only and never writes a visit record.

## Final concept semantics

The Roundtable input is a capped digest containing the selected companion IDs and exactly
eight ordered scene-reflection visit records. Its GPT-5.6 strict result is provisional and
contains:

```text
world_title
synthesis
principle
philosophy_axis
visual_prompt
evidence_scene_ids (all eight, in order)
perspectives (exactly one per selected companion)
```

Choosing `perception`, `emotion` or `invention` does not merely append a label to this result.
On the configured live path, it triggers a second GPT-5.6 Responses API concept request with
the provisional concept, complete digest and chosen contradiction. The transformed schema
restricts `philosophy_axis` to that single axis; the transformation prompt requires
`world_title`, `synthesis`, `principle` and `visual_prompt` to embody the decision, and the
validator requires every one of those fields to differ from the provisional concept.
Evidence order and the exact selected companion perspectives are revalidated before the
replacement concept can complete Transformation. No-key mode produces an axis-specific
replacement through the same validator and journey gate.

The validated replacement is the personalized **concept** published at Manifesto. The final
load gives it a prepared embodied form in the pre-generated Shimmering Spheres geometry.
Product copy must use language such as "prepared spatial form", not "your
world was generated live".

## Model and provider boundaries

- GPT-5.6 Responses API: strict lesson, provisional-concept and transformed-concept Structured
  Outputs plus artwork dialogue. The decision transformation is a second concept request, not
  a client-side label change. The only accepted origins are `https://api.openai.com` and the
  disclosed authorized compatible gateway `https://api.baizhiyuan.cloud`; the only accepted
  reasoning models are `gpt-5.6` and `gpt-5.6-sol`.
- OpenAI Realtime: official-origin-only voice transport and spoken-response model for the
  microphone experience; it is disabled for the reasoning-only compatible gateway. Text
  interaction remains available when Realtime is not configured.
- MiniMax `speech-2.8-turbo`: primary role-cast narration for visible guide and companion text;
  it receives no questions, evidence, prompts or reasoning tasks.
- OpenAI `gpt-4o-mini-tts`: official-origin-only server-side narration fallback when MiniMax is
  unavailable.
- Browser `SpeechRecognition` and `SpeechSynthesis`: speech-only fallbacks. Recognized text
  reuses the GPT-5.6 dialogue path or its labeled curated local fallback.
- GPT Image 2: source-image generation for the learner and white-dove asset pipelines; the dove
  used Tripo's hosted `gpt_image_2` task after the configured compatible image gateway returned
  no output.
- World Labs: source of prepared spatial assets plus an optional two-credential, admin-gated
  Forge endpoint for isolated spatial variations. Forge is outside the canonical journey and
  receives no visitor question, evidence or conversation data.
- Tripo: offline character and white-dove asset production only; there is no Tripo runtime API.
- All runtime language and judgment requests use GPT-5.6 through one of the two exact
  allowlisted origins. No alternate reasoning-model family is supported. The competition
  [Project Requirements](https://openai.devpost.com/rules) permit third-party SDKs, APIs and
  data when the entrant is authorized under their terms; provider roles remain disclosed and
  separated.

All Responses API calls use `store: false`, a hashed `safety_identifier`, a strict schema,
bounded timeout and a single billable POST attempt. Deterministic code owns scene order,
coordinates, movement, rendering, validation and fallback labels.

## Visual and layout system

- Full-bleed real-time world; no decorative world preview frame.
- World color is dominant. Neutral charcoal UI preserves scene inspection.
- Signal yellow-green communicates synchronization and active commands; coral identifies the
  learner; cyan identifies recorded evidence.
- Georgia is reserved for reflective display text; system sans serif is used for commands and
  telemetry. Corners remain 4 px or less.
- Companion portraits are identity controls, not decorative stock imagery.
- The desktop mission rail displays all eight process chapters in a stable scroll region.
- The final answer is shown only in the gated Manifesto/entry surface, never as an Atlas card.
- A full-viewport 1672 x 941 scene poster and readiness veil cover successful world preloads
  and Atlas cross-world changes; coarse fallbacks must not flash before the high-fidelity scene
  is ready, and quality-gate failure retains the poster rather than revealing them.
- On mobile, route and dialogue become bounded sheets above the joystick/follow control zone;
  there is no horizontal document overflow at 390 x 844.

Accessibility constraints: visible focus, accessible names/titles on controls, text as the
authoritative voice fallback, useful portrait alt text, reduced-motion CSS support, and no
viewport-width font scaling.

## Failure states

- GPT unavailable/invalid: label `CURATED DEMO`; preserve the ten beats, eight visits,
  chosen-axis transformation and final gate with the same validated contracts.
- Realtime unavailable: use browser speech I/O when supported; recognized text still uses the
  GPT-5.6 dialogue path or curated local fallback, and visible text remains available.
- Process RAD/SPZ/GLB decode, quality-gate or WebGL failure: keep the matching high-resolution
  poster as the world background, hide the coarse canvas, block evidence, and expose a world
  retry without advancing the stop.
- Final GLB failure: preserve the published manifesto and keep final-world entry uncommitted
  until the prepared 8K realization loads successfully.
- Retired Spark worlds: stop pager driving, track initialization/fetch/worker work through one
  bounded retirement, then dispose terminally; late GLTF/texture resolutions are also disposed.
- Collider failure: use declared terrain references, keep nominal wall mounts on visible floor
  supports and avoid claiming collider-backed placement.
- Historical GLB failure: use the matching procedural avatar interface.
- Room expiry: return to solo without mutating the local journey.

## Non-goals

- Runtime generation of the ninth scene's geometry.
- Runtime historical-character generation, rigging or skeletal retargeting.
- Navmesh pathfinding, semantic surface classification, guide/party obstacle planning,
  general physics, full-body IK, mocap or lip sync.
- Production multiplayer persistence.
- Claiming that the prepared worlds or character GLBs are generated during a live visitor
  session.
- Claiming Marble Record produces an animated GLB; its recorded export is MP4 media.
