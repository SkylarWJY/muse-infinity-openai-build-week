# MUSE Design Source of Truth

## Product intent

MUSE is a learning world, not a museum dashboard and not a chatbot over 3D wallpaper. The
spatial environment is the primary surface. Interface, GPT output and character behavior
exist to direct attention inside a sequence of worlds.

One life question moves through ten narrative beats, eight process worlds and one gated answer
world. The learner and guide move through each high-fidelity space;
dialogue waits for physical arrival and facing; colliders keep bodies on the visible ground;
the other selected companions physically follow the learner/guide formation; and the
Roundtable is grounded in the observations made across the whole walk.

## Product invariants

- The canonical spatial structure is eight ordered process scenes plus one independently
  gated answer scene. Bright Gallery is not part of this structure.
- The first eight scene IDs and their order are deterministic and cannot be changed by model
  output, Atlas navigation or an observation choice.
- The answer world is excluded from Atlas and cannot load before all eight observations,
  Summoning, Roundtable, Decision, Transformation and Manifesto are complete.
- At least one and no more than three of the eight historical companions are chosen
  before curation.
- Every selected companion remains embodied during world exploration: the first selected
  companion is the active guide and up to two others follow in formation. The same selected
  roster appears at the Roundtable without duplicate persistent/staged actors.
- Observation precedes interpretation. Dialogue cannot claim spatial correspondence until
  the guide reaches and faces the declared evidence point. A visitor may then choose a
  bounded response or record their own short observation.
- GPT-5.6 is the only language/reasoning model, and those requests use the official OpenAI
  API. Browser speech services provide voice I/O only. Optional World Labs Forge generates
  isolated spatial variations outside the canonical journey and performs no language reasoning.
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
| 5 | `world_exploration` | Visit and answer all eight process scenes in canonical order. |
| 6 | `summoning` | Surface the complete eight-observation ledger and selected company. |
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
authored placements in `src/config/artworkPlacements.js`. Placement QA loads each real JPEG
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

Procedural architecture and an articulated fallback avatar appear during loading or failure.
They are hidden only after the requested world asset reports successful initialization.
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

Selection is also a spatial commitment. With one to three selected companions, the first is
the correspondence guide and the remaining one or two occupy left/right follow slots behind
the learner. Each follower updates its root position, heading, walk/idle deformation and
locally continuous collider-derived ground height as the learner moves. Formation candidates
require paired foot support and a continuous path from the actor's current terrain layer. At
the Roundtable the persistent party
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

`src/config/ambientLife.js` owns deterministic, authored
activity volumes for all nine scenes. `AmbientLife` uses low-poly articulated wings/tails for
distant birds, butterflies, dragonflies and koi, plus efficient point fields for the abstract
scene-8 dots and final fireflies. It contains no downloaded creature model, runtime generation,
external loader or random path source.

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

After that gate, the visitor may select a bounded observation or write up to 80 characters in
their own words. Both paths create one grounded visit record and continue to the same
canonical next world; a free observation cannot bypass correspondence or rewrite route order.
Atlas is inspect-only and never writes a visit record.

## Final concept semantics

The Roundtable input is a capped digest containing the selected companion IDs and exactly
eight ordered visit records. Its GPT-5.6 strict result is provisional and contains:

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
  Outputs. The decision transformation is a second concept request, not a client-side label
  change.
- OpenAI Realtime: official voice transport and spoken-response model for the microphone
  experience; text interaction remains available when Realtime is not configured.
- OpenAI `gpt-4o-mini-tts`: official synthetic narration for visible guide and companion text.
- Browser `SpeechRecognition` and `SpeechSynthesis`: speech-only fallbacks. Recognized text
  reuses the GPT-5.6 dialogue path or its labeled curated local fallback.
- GPT Image 2: source-image generation for the learner asset pipeline.
- World Labs: source of prepared spatial assets plus an optional two-credential, admin-gated
  Forge endpoint for isolated spatial variations. Forge is outside the canonical journey and
  receives no visitor question, evidence or conversation data.
- Tripo: character-asset production only; there is no Tripo runtime API.
- All runtime language and judgment requests use GPT-5.6 at the official OpenAI origin. No
  alternate reasoning-model family is supported.

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
- Process RAD/SPZ/GLB decode or WebGL failure: retain procedural spatial fallback for
  orientation, block evidence, and expose a world retry without advancing the stop.
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
