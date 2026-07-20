# MUSE Design Source of Truth

## Product intent

MUSE is a learning world, not a museum dashboard and not a chatbot placed over 3D
wallpaper. The archived world is the primary surface. Interface, model output and character
behavior exist to direct attention inside that world.

The product keeps the successful `muse-infinity` narrative arc while replacing menu-like
scene loading and static companion translation with a continuous embodied lesson: a chosen
companion walks, turns, points, waits for observation, reacts and carries the learner into a
second real scene.

## Product invariants

- The shipped World Labs SPZ is visible from the threshold and is the primary scene after it
  initializes.
- At least one archived Tripo companion is chosen before curation; no more than three can be
  selected.
- The first selected companion is the active guide. Selected companions reappear together in
  the Salon.
- Observation precedes interpretation.
- Dialogue cannot claim spatial correspondence before the guide reaches the declared anchor
  and faces the declared evidence point.
- OpenAI GPT is the only language and reasoning runtime. Spatial assets do not become model
  providers.
- No-key mode must complete the same product arc with explicit curated provenance.

## Preserved journey

The previous ten-stage vocabulary is compressed into six durable journey states. The UI may
retain the original chapter numbers so the new build remains recognizable as MUSE.

| `muse-infinity` stage(s) | Current state | Current behavior |
| --- | --- | --- |
| `threshold`, `life_question` | `threshold` | Bright Gallery loads while the learner asks one question |
| `companion_selection` | `company` | Select one to three archived portraits/GLBs |
| `ai_curation` | `curation` | GPT-5.6 or the curated contract reveals the three-stop route |
| `world_exploration` | `walk` | The guide performs the route and the learner answers from evidence |
| `summoning`, `roundtable`, `decision` | `salon` | Selected companions test the accumulated evidence |
| `world_transformation`, `manifesto` | `rewrite` | The answer selects and opens a second archived world |

This mapping is a product constraint: future revisions can deepen a stage, but should not
replace the question-to-world arc with an unrelated dashboard flow.

## World system

### Primary digital scenes

1. **Bright Gallery Hall** is the threshold, default route and recovery destination.
2. **Van Gogh Gallery** is an alternate Atlas world and rewrite destination.
3. **Infinity Dot Room** is an alternate Atlas world and rewrite destination.

All are World Labs outputs retained from the prior MUSE asset set and deployed as local
500,000-splat SPZ files. The Atlas changes the actual world, not a preview image. Each world
owns a manifest transform, spawn, walk bounds, camera range and route geometry.

Spark adaptive LOD targets 130,000 splats on desktop and 80,000 on mobile. The full local SPZ
stays available to the renderer. Procedural floor, walls and lighting are constructed first,
then hidden only after the SPZ reports successful initialization; they remain the explicit
loading/error fallback.

### Evidence layer

The three open-access artworks remain deterministic Three.js objects positioned inside the
active archived scene. The world is generated visual context; the artwork frames are stable,
clickable evidence anchors. World-specific route stops are calculated from the spatial
profile, so guide movement, artwork placement and camera framing share one coordinate source.

## Character and movement language

### Learner

The learner uses a local Tripo P1 GLB designed from an identity-consistent GPT Image 2
turnaround. A 52-joint biped skin and baked idle/walk clips drive hands, elbows, legs and feet
through `THREE.AnimationMixer`; the articulated procedural avatar remains the load fallback.

### Archived companions

Monet, Van Gogh, Socrates, Frida Kahlo and Picasso use optimized Tripo GLBs from
`muse-infinity`. Each file contains one mesh and no bones, skins or animation clips. The
runtime therefore applies bounded vertex-region transforms in the material shader for arms,
elbows, legs and knees, plus root bob, lean and spatial translation.

This supports a deliberately small, readable motion vocabulary:

```text
walking -> arriving -> facing -> pointing -> asking -> listening -> reflecting
```

It must be described as shader-deformed motion, not skeletal animation, IK, mocap or a rigged
Tripo character. If a GLB cannot load, a procedural avatar takes the same guide interface so
the route remains usable.

### Correspondence gate

`GuideDirector` owns the action sequence. Model output never supplies arbitrary coordinates.
The guide receives only validated stop IDs and gestures, resolves them through the scene
manifest, moves to the anchor and turns toward the target. Dialogue opens only after
`GuideDirector.correspondence()` verifies distance <= 0.6 m and facing error <= 20 degrees.

Navigation is anchor-and-bounds based. There is no navmesh, collider-ground pathfinding,
obstacle avoidance, full-body IK or lip sync in the current build.

## Model and provider boundaries

- GPT-5.6 Responses API: strict lesson and Salon Structured Outputs.
- OpenAI Realtime: optional voice transport and model, never required for text.
- World Labs: provenance for the three local scenes. A separately gated Forge adapter may
  explicitly generate a new spatial asset, but performs no language reasoning and cannot run
  without both provider and admin credentials.
- Tripo: provenance for five inherited companion GLBs and the newly generated rigged learner.
  There is no Tripo runtime API in this repository.
- Claude, Gemini, MiniMax and configurable OpenAI-compatible LLM endpoints: prohibited.

Deterministic code owns coordinates, navigation, rendering, validation and fallback labels.
GPT owns only bounded semantic planning and evidence-grounded perspective text.

## Visual system

- Full-bleed real-time SPZ world; no decorative preview frame.
- Archived scene color remains dominant. Neutral charcoal UI preserves scene inspection.
- Signal yellow-green communicates synchronization and active commands.
- Coral identifies the learner; cyan identifies completed evidence.
- Georgia is reserved for reflective display text. System sans serif is used for commands and
  telemetry.
- Corners remain 4 px or less. Cards are used for individual choices and perspectives, never
  nested page sections.
- Companion portraits are identity controls, not decorative stock imagery.

## Layout

Desktop:

- 64 px top bar: identity, active archived world, sync state and optional tools.
- Left mission rail: the three-stop route and completion state.
- Right-bottom dialogue: active companion, evidence prompt, choices and learning map.
- Right drawer: one optional capability at a time while preserving the world view.
- 30 px status bar: route and provider truth.

Mobile:

- 56 px compact tool bar.
- Dialogue occupies at most 46% of viewport height and ends above the control zone.
- The 88 px joystick and follow control use a stable bottom safe-area band.
- Drawers become bottom sheets.
- Company and rewrite choices wrap vertically without horizontal document overflow.

## Responsive and accessibility constraints

- No viewport-width font scaling.
- No horizontal document overflow at 390 x 844.
- Touch controls cannot overlap observation answers.
- Every tool control has an accessible name and title.
- Focus remains visible with the signal color.
- Reduced-motion preference removes authored CSS animation; state transitions and text remain
  usable.
- Text is authoritative when voice is unavailable.
- Portrait alt text identifies speakers; decorative world thumbnails use surrounding labels.

## Failure states

- GPT unavailable or invalid: `CURATED DEMO`; the same six-stage journey continues.
- Realtime unavailable: concise status message; text and movement are unchanged.
- World Labs credentials absent: Forge remains locked and sends no request; local SPZ files are
  unaffected.
- SPZ decode/WebGL failure: procedural architecture remains rendered and the lesson continues.
- Tripo GLB failure: the matching procedural avatar adapter continues movement and the guide
  state machine.
- Room expiry: return to solo without changing the local lesson.

## Non-goals for this Build Week version

- Runtime character generation or rigging; all learner generation is an offline asset step.
- Runtime skeletal retargeting, mocap authoring, navmesh pathfinding or lip sync.
- Production multiplayer persistence.
- Claiming that the three worlds were generated during this Build Week.
- Claiming upstream redistribution rights beyond the records available in
  `docs/PROVENANCE.md`.
