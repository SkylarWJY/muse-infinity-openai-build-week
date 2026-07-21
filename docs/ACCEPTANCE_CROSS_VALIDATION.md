# Acceptance Feedback Cross-Validation

This record preserves the independent acceptance reports as evidence and separates a visual
observation from a verified implementation cause. It covers:

| Report | SHA-256 at review | Lines |
| --- | --- | ---: |
| `ACCEPTANCE_FEEDBACK_1_full-flow.md` | `3e1da50173c800d49cdf8a1411153f077d82eacc213ee7ad66e533bfb13d62b9` | 150 |
| `ACCEPTANCE_FEEDBACK_2_artwork-walls.md` | `5e331c3c9301e0ddca7377e122c158298fd4eed19cd59d15e8097c63e317182a` | 174 |
| `ACCEPTANCE_FEEDBACK_3_character-animation.md` | `40d2d899d4b7f7d6916e48a7ef5823d1ee3011efc0510a44477b6d45e81b3796` | 107 |
| `ACCEPTANCE_FEEDBACK_4_ambient-creatures.md` | `2d7a80b237d191385b577a8a360435072734d2fdcb6bebbe375ade5556534019` | 168 |

## Full-flow report

| Finding | Cross-validation | Disposition |
| --- | --- | --- |
| Speaker remained Monet across scenes | Reproduced: scene activation did not update the dialogue identity. | Each process scene now selects its canonical lens; final uses Mira and clears stale dialogue semantics. |
| Freud, Qi Baishi and Kusama cards showed four-view sheets | Reproduced from the shipped 1672 x 941 images. | The cards use documented single-view crops while preserving the inherited originals. |
| Characters floated, stood on props/water or split across terrain layers | Reproduced against the real colliders. A highest-hit ray can select an unrelated surface. | Ground sampling follows a reference-height continuity window; party candidates validate paired footprints and their route. |
| Player could walk through collider walls | Reproduced: movement previously had only bounds and vertical grounding. | A dense radius-wide horizontal sweep stops/slides at vertical faces and catches 2 cm obstacles at varied offsets. This remains local collision, not navmesh. |
| Socrates or scene-8 Monet needed a model-specific scale patch | Not supported. All inherited character meshes already normalize to the same 1.75 m height. | No identity-specific scale hack was added; scene-8 camera distance and stale unused scale configuration were corrected. |
| Scene 8 was a flat image | Refuted by the deployed asset: it is a 598,495-triangle GLB with an 8192 x 8192 texture. | Kept the full mesh and increased camera distance; no false realtime-reflection claim is made. |
| Scene 6 looked soft | Visually credible, but not caused by selecting the old 500K derivative. The runtime already uses a quality RAD derived from the 4.32M source. | Desktop high now targets 4.32M splats. The inherited reconstruction remains the limiting source. |
| Footer chapter and final dialogue labels stayed stale | Some DOM state was stale even when hidden; the reported visible failure was not consistently reproduced. | Stage labels and final dialogue state are explicitly reset and covered at desktop, mobile and 1280 x 600. |
| Suggested-answer click should call Ask | Interaction mismatch rather than a failed model request: answers record evidence; Ask is a separate free inquiry. | Copy and E2E assertions distinguish evidence recording from free GPT inquiry. |

## Artwork-wall report

The report correctly identified the visible symptom: many frames were generated as stands and
some old placements followed unsuitable collider layers. Its proposed global fixes were not
accepted without geometry validation:

- Raising `MAX_WALL_FRAME_GAP` from 0.10 m to 0.60 m would allow supports to disappear while
  frames remain 0.30-0.48 m away from the collider. That is a false wall mount.
- Requiring an absolute world `centerY` of 1.2-1.7 m is invalid across independently authored
  archives with different origins and terrain elevations. The correct invariant is frame
  center minus local viewing-ground height = 1.50 m.
- A null/default texture aspect in the first geometry test hid corner occlusion for portrait
  works. Final QA loads dimensions from every real JPEG before validating sightlines.

The deterministic result is:

| Scene | Mounted | Stands | Reason |
| --- | ---: | ---: | --- |
| Threshold Conservatory | 2 | 2 | Two collider-backed mounts; open-axis works use stands. |
| Court of Light | 1 | 3 | One complete frame has strict wall backing; three use grounded stands. |
| Garden of Water and Light | 1 | 3 | One complete frame has strict wall backing; three use reachable stands. |
| Sunset Frame Gallery | 0 | 4 | No four reachable, unobstructed wall anchors in the open garden. |
| Studio of the Burning Sky | 1 | 3 | One complete frame has strict wall backing; three use grounded stands. |
| Petal Transition Hall | 4 | 0 | Four true wall anchors with a continuous first-guide route. |
| Courtyard of Living Memory | 0 | 4 | Open courtyard geometry; honest locally grounded stands. |
| Infinite Repetition Chamber | 0 | 4 | Full textured mesh has no validated route-facing wall set. |
| Your Dream World | 0 | 4 | Open answer world; locally grounded stands. |

Across all 36 works, the real-collider test requires finite authored coordinates, bounds,
minimum 1.99 m separation, grounded guide positions, real source aspect ratios, unobstructed
center and four-corner sightlines, a 2.2 m minimum viewing distance, locally relative 1.50 m
center height and a near-vertical backing collider within 0.10 m behind the center and all four
corners whenever supports are hidden. The strict result is 9 wall mounts and 27 grounded
stands. The route from guide spawn to the first artwork is sampled for terrain continuity in
every world.

The runtime repeats the full-frame sightline and backing-wall checks for authored placements.
While a collider is loading or unavailable, a nominal mount keeps visible floor supports; it
switches to wall-mounted only after the collider passes validation.

The answer world also protects its default camera corridor. A browser isolation capture showed
that the second stand's backing panel occupied the lower foreground even though its guide view
was valid. The stand now sits behind the initial camera on the same real collider, and a
regression reconstructs the runtime camera path and rejects any frame footprint entering it.

## Character-animation report

The asset inspection is correct: each of the eight inherited historical GLBs is one static
mesh with zero skins, animation clips and morph targets. The learner is a separate 41-joint
asset with baked wait/walk clips. The report's claim that all remaining stiffness was purely
an asset problem was too broad:

- `reflect` was overwritten by `open` on the next director update. Reflection now remains the
  active gesture until a real state transition.
- `listen()` and `reflect()` previously ran in the same synchronous answer handler, so the
  listening beat had no visible frame. The director now holds a distinct listening pose for
  0.55 seconds before entering sustained reflection.
- Static-mesh gait cadence previously remained fixed while root speed ranged from 0.65 to
  3.65 m/s. Cadence now follows locomotion speed with a bounded range, and body rise uses the
  same cadence as the shader-deformed limbs.
- The learner telemetry label now distinguishes its v3.1 mesh from the accepted v1 rig. The
  report's `biped-v2` description contradicted the canonical generation manifest.

The journey E2E holds the real movement key and waits on `requestAnimationFrame`; it requires
both selected followers to change world position, enter walking state and change limb phase.
It no longer advances player or party internals from test code.

These changes improve correspondence without changing the provenance claim. Historical
figures remain bounded shader-deformed static meshes, not newly rigged characters, IK, mocap
or skeletal animation. A future rigged derivative must be retargeted and QA'd per character;
an arbitrary human rig cannot be assumed compatible with the learner's bone names and bind
pose.

## Ambient-life report

The reported absence was reproduced: no world previously contained ambient life. Its sample
GLB loader was not accepted because it would call the loader for particle-only entries, used
an invalid `THREE.SkeletonUtils` access, omitted stale/late disposal, required CSP/server
changes and relied on unverified external asset licences.

The bounded implementation uses deterministic code-native geometry instead: articulated
wings or tails for small distant life and a single efficient particle field for abstract dots
or fireflies. It adds no dependency, generated model or third-party asset. Themes remain
scene-specific and restrained:

| Scene | Ambient cast |
| --- | --- |
| Threshold Conservatory | 2 butterflies, 1 distant garden bird |
| Court of Light | 2 butterflies |
| Garden of Water and Light | 3 koi, 1 dragonfly in an authored water-garden volume |
| Sunset Frame Gallery | 2 distant gulls |
| Studio of the Burning Sky | 3 crow silhouettes in a bounded distant flyby |
| Petal Transition Hall | 2 dragonflies, 1 distant bird |
| Courtyard of Living Memory | 1 tropical bird, 2 butterflies |
| Infinite Repetition Chamber | 24 abstract moving dots, no realistic animal |
| Your Dream World | 24 low-intensity fireflies, no extra bird |

Point fields carry one conservative authored bounding sphere for their complete activity
volume, so moving dots and fireflies cannot disappear from stale first-frame frustum bounds.
Resource keys remain unique even for repeated specs, and world-switch tests require every
geometry and material to dispose exactly once.

The water-garden invariant applies to complete rendered geometry, not only path roots. A
0-120 second Box3 sweep now verifies all three koi bodies and tails remain below the measured
pond surface; the tail silhouette was reduced to the body scale after this regression first
reproduced a visible surface breach.

The labels describe an atmosphere, not the authorship of all four works in a scene. In
particular, the Van Gogh environment is an interior gallery and does not contain *Wheatfield
with Crows*, so its silhouettes remain a distant motif rather than a literal outdoor flock.

## Final verification evidence

- `npm test`: 167/167 tests pass, including real-collider artwork, navigation, animation,
  ambient-life lifecycle, official provider, audio ordering and late-load disposal suites.
- `npm run audit:providers`: 1/1 passes. Runtime, environment template and public documentation
  reject alternate model providers and legacy gateways; language, Realtime and narration use
  only fixed official OpenAI endpoints and model constants.
- `npm run check` and `git diff --check`: pass.
- `npm run test:e2e`: 3/3 Chromium journeys pass on port 4175. The suite covers audio, all 36
  artworks across nine inherited worlds and the complete ten-stage 8+1 route. A second
  cross-window run also passed 3/3 after the same interaction changes.
- `npm audit --audit-level=high`: zero vulnerabilities.
- The latest structured visual verdict is 94/100, `pass`, with desktop/mobile canvas variance,
  layout and final-camera composition checked against real captures.
- After the final PM2 restart, only `127.0.0.1:4175` listens. `/api/status` reports the fixed
  official OpenAI boundary and an honest no-key fallback; port 4176 has no listener and the
  `muse` error log is empty.

No billable OpenAI request was made during automated verification. The local environment does
not currently contain a valid official `OPENAI_API_KEY`, so the judging machine must configure
one to demonstrate live GPT-5.6, Realtime and `gpt-4o-mini-tts`; without it, the complete local
8+1 experience remains available and is explicitly labeled as curated fallback.

## Verification boundary

The automated checks prove deterministic geometry and state contracts. Browser screenshots
remain necessary for composition, legibility, motion and asset-loading confirmation.
Navigation has local terrain continuity and learner collision sweep/slide, but no semantic
water mask, navmesh, general rigid-body physics, guide/party obstacle planner or historical
character skeletons.
