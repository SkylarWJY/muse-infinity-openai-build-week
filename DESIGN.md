# MUSE Design Source of Truth

## Product intent

MUSE is a learning world, not a museum dashboard and not a chatbot over 3D wallpaper. The
archived environment is the primary surface. Interface, GPT output and character behavior
exist to direct attention inside a sequence of worlds.

The product keeps the full `muse-infinity` concept: one life question moves through ten
narrative beats, eight process worlds and one gated answer world. This rebuild adds the
missing embodied correspondence. The learner and guide move through each archived space;
dialogue waits for physical arrival and facing; colliders keep bodies on the visible ground;
the other selected companions physically follow the learner/guide formation; and the
Roundtable is grounded in the observations made across the whole walk.

### Inheritance boundary

The narrative vocabulary, eight process worlds, gated ninth world, colliders, spatial
profiles, historical-character files, portraits and scene imagery are inherited from
`muse-infinity`. Build Week work is the new OpenAI-only executable system around them: strict
8+1 gates, quality-RAD derivation and Range delivery, collider-grounded party movement,
free-form observations, provisional synthesis, decision-triggered concept transformation and
verification. Inherited assets are never presented as newly generated during this event.

## Product invariants

- The canonical spatial structure is eight ordered process scenes plus one independently
  gated answer scene. Bright Gallery is not part of this structure.
- The first eight scene IDs and their order are deterministic and cannot be changed by model
  output, Atlas navigation or an observation choice.
- The answer world is excluded from Atlas and cannot load before all eight observations,
  Summoning, Roundtable, Decision, Transformation and Manifesto are complete.
- At least one and no more than three of the eight archived historical companions are chosen
  before curation.
- Every selected companion remains embodied during world exploration: the first selected
  companion is the active guide and up to two others follow in formation. The same selected
  roster appears at the Roundtable without duplicate persistent/staged actors.
- Observation precedes interpretation. Dialogue cannot claim spatial correspondence until
  the guide reaches and faces the declared evidence point. A visitor may then choose a
  bounded response or record their own short observation.
- GPT-5.6 is the only language/reasoning model. World Labs and Tripo identify asset
  provenance, not reasoning providers.
- GPT personalizes the final concept. The final geometry is an inherited, pre-generated
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

| # | Scene ID | Exhibition title | World ID | Historical lens | Archive |
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

### Source-detail archives

- Scenes 1-7 use Spark 2.1.0 quality RAD hierarchies built from the original archived
  2.40M-4.32M SPZs. The canonical route does not use the older uniform 500K derivatives.
- RAD is prebuilt with `build-lod --quality --rad` and loaded with `paged: true`; this moves
  the expensive Bhatt hierarchy build out of the browser and enables view-dependent Range
  requests without substituting a fixed low-resolution archive.
- Scene 8 prefers the archived 598,495-triangle unlit GLB and keeps its 1.92M-splat SPZ as a
  load fallback.
- Scene 9 uses the archived 593,231-triangle unlit GLB.
- Scene 8 and 9 retain 8192 x 8192 textures. Their embedded PNGs were re-encoded to JPEG
  quality 88; mesh geometry and texture dimensions were not reduced.
- One decoded archive is resident at a time. Build tokens and explicit disposal prevent a
  late world load from replacing a newer selection.

### Runtime quality tiers

`high` is the default. URL parameters may select `balanced` or `performance` without
changing the source assets.

| Mode | Desktop DPR / Spark target / render scale / LOD scale | Mobile DPR / Spark target / render scale / LOD scale |
| --- | --- | --- |
| `high` | 2 / 2,500,000 / 1 / 2 | 1.5 / 750,000 / 1 / 2 |
| `balanced` | 1.5 / 1,000,000 / 1.15 / 1.75 | 1.25 / 400,000 / 1.25 / 1.5 |
| `performance` | 1.25 / 650,000 / 1.35 / 1.25 | 1 / 300,000 / 1.5 / 1 |

All tiers retain adaptive quality LOD. The desktop high target restores the expected Spark
detail budget instead of imposing the previous 130K hard cap. Splats and archived unlit mesh
materials use `NoToneMapping`; 8K mesh textures use available anisotropic filtering.

### Delivery and grounding

The static server advertises `Accept-Ranges: bytes`, returns valid `206` / `Content-Range`
responses, and gives `/assets/` immutable cache headers. This supports resumable, cacheable
delivery of large archives and paged RAD rendering; it is not a claim that GLB decoding
itself is progressive.

Every canonical world has its inherited collider. Collider meshes remain invisible and are
raycast downward for learner/guide ground height. Declared native-scale transforms, spawn,
bounds, yaw and camera range stay in the archived manifest. Movement is still bounds-based:
colliders provide surface height, not navmesh route planning or obstacle avoidance.

Procedural architecture and an articulated fallback avatar appear during loading or failure.
They are hidden only after the requested archive reports successful initialization.
For process worlds, that initialization is an evidence gate: procedural scenery may preserve
orientation, but it cannot unlock a question or create a visit. The retry surface retains the
current walking stop. For world 9, the manifesto is preserved and `finalWorldEntered` remains
false until the archived answer mesh is live.

## Interaction and movement language

### Learner

The learner is a local high-detail Tripo v3.1 GLB reconstructed from a GPT Image 2 source and
an identity-consistent four-view turnaround. A semantic 41-joint biped skin and baked
`preset:biped:wait` / `preset:biped:walk` clips run through `THREE.AnimationMixer`; an
articulated procedural learner remains the load fallback. Skin validation and the bounded
24-vertex cross-region correction happen offline, so runtime animation never rewrites weights.
Learner and guide navigation use a 1.33 m/s walking pace calibrated to the baked foot-contact
travel; the rejected run clip is not used because it failed the bind-ground gate.

### Archived companions

The selectable company consists of Monet, Van Gogh, Socrates, Frida Kahlo, Picasso, Freud,
Qi Baishi and Yayoi Kusama. Their browser GLBs are optimized copies of static Tripo meshes
from `muse-infinity`; they contain no inherited skeleton or animation clips. The runtime
therefore uses bounded shader-region deformation plus spatial root motion.

Selection is also a spatial commitment. With one to three selected companions, the first is
the correspondence guide and the remaining one or two occupy left/right follow slots behind
the learner. Each follower updates its root position, heading, walk/idle deformation and
collider-derived ground height as the learner moves. At the Roundtable the persistent party
is temporarily hidden while the same roster is staged, so selection does not create visible
duplicates.

The supported readable vocabulary is:

```text
walking -> arriving -> facing -> pointing/opening/reflecting
        -> asking -> listening -> reflecting
```

It must be described as shader-deformed motion, not skeletal character animation, IK,
mocap, lip sync or a newly rigged historical figure.

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
load gives it a prepared embodied form in the archived Shimmering Spheres geometry. Product
copy must use language such as "archived realization" or "prepared spatial form", not "your
world was generated live".

## Model and provider boundaries

- GPT-5.6 Responses API: strict lesson, provisional-concept and transformed-concept Structured
  Outputs. The decision transformation is a second concept request, not a client-side label
  change.
- OpenAI Realtime: optional voice transport/model; never required for the text path.
- World Labs: provenance for the nine local worlds. A separately gated Forge adapter may
  send an explicit spatial-generation request only with both provider and admin credentials;
  it is outside the canonical path and performs no language reasoning.
- Tripo: provenance for eight inherited companion GLBs and the newer rigged learner. There is
  no Tripo runtime API in the judging path.
- Claude, Gemini, MiniMax and configurable OpenAI-compatible LLM endpoints: prohibited.

All Responses API calls use `store: false`, a hashed `safety_identifier`, a strict schema,
bounded timeout and at most one transient retry. Deterministic code owns scene order,
coordinates, movement, rendering, validation and fallback labels.

## Visual and layout system

- Full-bleed real-time world; no decorative world preview frame.
- Archived color is dominant. Neutral charcoal UI preserves scene inspection.
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
- Realtime unavailable: report it concisely; text and movement remain unchanged.
- World Labs credentials absent: Forge remains locked; all local archives remain available.
- Process RAD/SPZ/GLB decode or WebGL failure: retain procedural spatial fallback for
  orientation, block evidence, and expose an archive retry without advancing the stop.
- Final GLB failure: preserve the published manifesto and keep final-world entry uncommitted
  until the archived 8K realization loads successfully.
- Retired Spark worlds: stop pager driving, track initialization/fetch/worker work through one
  bounded retirement, then dispose terminally; late GLTF/texture resolutions are also disposed.
- Collider failure: use the declared ground height rather than blocking the scene.
- Historical GLB failure: use the matching procedural avatar interface.
- Room expiry: return to solo without mutating the local journey.

## Non-goals for this Build Week version

- Runtime generation of the ninth scene's geometry.
- Runtime historical-character generation, rigging or skeletal retargeting.
- Navmesh pathfinding, obstacle avoidance, full-body IK, mocap or lip sync.
- Production multiplayer persistence.
- Claiming that inherited worlds or characters were generated during Build Week.
- Claiming upstream redistribution rights beyond the incomplete records in
  `docs/PROVENANCE.md`.
