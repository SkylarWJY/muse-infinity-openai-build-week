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
| Suggested-answer click should call Ask | Interaction mismatch rather than a failed model request: station choices record evidence; Ask is a separate free GPT inquiry. | Every process world now requires three artwork stations. Each station keeps a distinct Ask form, three detailed evidence stances and a written-observation path before the scene reflection. |

## Artwork-wall report

The report correctly identified the visible symptom: many frames were generated as stands and
some old placements followed unsuitable collider layers. Its proposed global fixes were not
accepted without geometry validation:

- Raising `MAX_WALL_FRAME_GAP` from 0.10 m to 0.60 m would label frames as wall-mounted while
  frames remain 0.30-0.48 m away from the collider. That is a false wall mount.
- Requiring an absolute world `centerY` of 1.2-1.7 m is invalid across independently authored
  archives with different origins and terrain elevations. The correct invariant is frame
  center minus local viewing-ground height = 1.50 m.
- A null/default texture aspect in the first geometry test hid corner occlusion for portrait
  works. Final QA loads dimensions from every real JPEG before validating sightlines.

The deterministic result is:

| Scene | Mounted | Leg-free edge displays | Reason |
| --- | ---: | ---: | --- |
| Threshold Conservatory | 1 | 3 | One collider-backed mount; open-axis works use edge displays. |
| Court of Light | 0 | 4 | The accessible route has no strict full-frame wall backing. |
| Garden of Water and Light | 1 | 3 | One complete frame has strict wall backing; three use reachable edge displays. |
| Sunset Frame Gallery | 0 | 4 | No four reachable, unobstructed wall anchors in the open garden. |
| Studio of the Burning Sky | 1 | 3 | One complete frame has strict wall backing; three use grounded edge displays. |
| Petal Transition Hall | 1 | 3 | One true wall anchor and a continuous route across the remaining edge displays. |
| Courtyard of Living Memory | 0 | 4 | Open courtyard geometry; honest locally grounded edge displays. |
| Infinite Repetition Chamber | 0 | 4 | Full textured mesh has no validated route-facing wall set. |
| Your Dream World | 0 | 4 | Authored provenance placements; hidden during the visitor-facing Finale. |

Across all 36 works, the real-collider test requires finite authored coordinates, bounds,
minimum 1.99 m separation, grounded guide positions, real source aspect ratios, unobstructed
center and four-corner sightlines, a 2.2 m minimum viewing distance, locally relative 1.50 m
center height and a near-vertical backing collider within 0.10 m behind the center and all four
corners for every wall mount. The strict result is 4 wall mounts and 32 grounded, leg-free edge
displays. The route from guide spawn to the first artwork is sampled for terrain continuity in
every world.

The runtime repeats the full-frame sightline and backing-wall checks for authored placements.
While a collider is loading or unavailable, a nominal mount is treated as a leg-free edge
display; it switches to wall-mounted only after the collider passes validation.

The answer-world authored placements also protect its default camera corridor, and a regression
rejects any frame footprint entering it. The Finale then hides the complete artwork group and
stages the selected company facing the visitor.

## Character-animation report

The asset inspection is correct: each of the eight inherited named-companion GLBs is one static
mesh with zero skins, animation clips and morph targets. The default little-girl learner is also
a static mesh and uses bounded v4 shader-region articulation; the retained original learner is
the separate 41-joint asset with baked wait/walk clips. The report's claim that all remaining
stiffness was purely an asset problem was too broad:

- `reflect` was overwritten by `open` on the next director update. Reflection now remains the
  active gesture until a real state transition.
- `listen()` and `reflect()` previously ran in the same synchronous answer handler, so the
  listening beat had no visible frame. The director now holds a distinct listening pose for
  0.55 seconds before entering sustained reflection.
- Static-mesh gait cadence previously remained fixed while root speed ranged from 0.65 to
  3.65 m/s. Cadence now follows locomotion speed with a bounded range, and body rise uses the
  same cadence as the shader-deformed limbs.
- Learner telemetry now distinguishes the default static little-girl profile from the retained
  original skeletal rig. The report's `biped-v2` description contradicted the canonical manifests.

The station-tour contract no longer treats two companions as permanent followers. Each selected
actor has an independent director; speaker order rotates with the artwork index, the company
launches simultaneously on independent safe routes, and conversation targets are spatially
separated. The movement tests exercise speaker rotation, target separation and simultaneous
launch without advancing actor internals from test code.

These changes improve correspondence without changing the provenance claim. Named companions
remain bounded shader-deformed static meshes, not newly rigged characters, IK, mocap
or skeletal animation. A future rigged derivative must be retargeted and QA'd per character;
an arbitrary human rig cannot be assumed compatible with the learner's bone names and bind
pose.

## Ambient-life report

The reported absence was reproduced: no world previously contained ambient life. Its sample
GLB loader was not accepted because it would call the loader for particle-only entries, used
an invalid `THREE.SkeletonUtils` access, omitted stale/late disposal, required CSP/server
changes and relied on unverified external asset licences.

The report correctly asked for concrete, theme-specific animals rather than generic primitives.
The bounded implementation now combines deterministic code-native life with one locally shipped,
high-detail white rock-dove PBR GLB. Tripo's hosted GPT Image 2 task produced the source image;
Tripo v3.1 produced the 12,098-vertex, 19,598-triangle mesh. The pre-rig check returned
`rig_type: others`, so an incompatible biped/avian animation was not fabricated. The selected
GLB has no skin or baked animation clip, but its deployed PBR materials receive an independent
vertex-shader deformation that visibly flaps the detailed mesh's wing regions. Deterministic
root paths, heading, pitch and bank provide the larger flight path without a false skeletal-rig
claim. A species-specific articulated white-dove fallback appears only on detailed-asset load
failure. Themes remain scene-specific and restrained:

| Scene | Ambient cast |
| --- | --- |
| Threshold Conservatory | 2 butterflies, 1 high-detail white dove |
| Court of Light | 2 butterflies |
| Garden of Water and Light | 3 koi, 1 dragonfly in an authored water-garden volume |
| Sunset Frame Gallery | 2 high-detail white doves |
| Studio of the Burning Sky | 3 crow silhouettes in a bounded distant flyby |
| Petal Transition Hall | 2 dragonflies, 1 high-detail white dove |
| Courtyard of Living Memory | 1 tropical bird, 2 butterflies |
| Infinite Repetition Chamber | 24 abstract moving dots, no realistic animal |
| Your Dream World | 24 low-intensity fireflies, no extra bird |

Point fields carry one conservative authored bounding sphere for their complete activity
volume, so moving dots and fireflies cannot disappear from stale first-frame frustum bounds.
Resource keys remain unique even for repeated specs. The dove loader deep-clones disposable
mesh/material/texture resources per instance, rejects stale scene tokens and disposes late
timeout resolutions; the procedural fallback remains visible if the asset does not settle.

The water-garden invariant applies to complete rendered geometry, not only path roots. A
0-120 second Box3 sweep now verifies all three koi bodies and tails remain below the measured
pond surface; the tail silhouette was reduced to the body scale after this regression first
reproduced a visible surface breach.

The labels describe an atmosphere, not the authorship of all four works in a scene. In
particular, the Van Gogh environment is an interior gallery and does not contain *Wheatfield
with Crows*, so its silhouettes remain a distant motif rather than a literal outdoor flock.

## Preload-presentation follow-up

The reported rough world/character silhouettes are valid fallback geometry, but they should not
be the normal first impression. Boot and every world activation now place an inert full-viewport
veil over the canvas, decode the matching inherited 1672 x 941 scene poster, and hold it while
the real RAD/GLB world and selected cast initialize. A slow image push and 760 ms crossfade reveal
the high-fidelity live world only after readiness. Reduced-motion users retain the readiness gate
without the decorative motion. Atlas cross-world comparisons reuse that veil. After the current
poster decodes, the next canonical poster is requested once at low priority rather than competing
with the active world load. If a scene misses its presentation-quality gate, the matching poster
remains as the world background, the coarse canvas stays hidden, evidence remains blocked and the
retry or preserved-manifesto workflow remains available.

World Labs Marble **Record** exports MP4 capture rather than animated GLB. The current fix
therefore reuses the inherited MUSE poster transition instead of claiming a Marble-generated
loopable GLB. Any future MP4 use remains a separate visual/performance/rights evaluation.

This provider boundary is also consistent with the [OpenAI Build Week Official
Rules](https://openai.devpost.com/rules): `Project Requirements > Third Party Integrations`
allows third-party SDKs, APIs and data when the entrant is authorized under their applicable
terms. MUSE keeps those roles disclosed while GPT-5.6 owns runtime language and judgment.

## Final verification boundary

The final release run must capture fresh results rather than relying on the superseded counts in
earlier feedback. The required commands are `npm run check`, `npm test`,
`npm run audit:providers`, `npm run test:e2e`, `npm audit --audit-level=high` and
`git diff --check`. Browser evidence must cover desktop/mobile transition readiness, all three
stations in at least one scene, independent companion staging, the generated dove, the full
eight-reflection flow and the gated ninth world. Deployment evidence must separately verify that
PM2 owns only port 4175 and report `/api/status` without implying Realtime or OpenAI TTS when the
reasoning-only compatible gateway is configured.

Automated provider tests mock billable services. Judging deployments must provide their own
untracked credentials; without them, the complete local 8+1 experience remains available and is
explicitly labeled as curated fallback.

The automated checks prove deterministic geometry and state contracts. Browser screenshots
remain necessary for composition, legibility, motion and asset-loading confirmation.
Navigation has local terrain continuity and learner collision sweep/slide, but no semantic
water mask, navmesh, general rigid-body physics, guide/party obstacle planner or companion
skeletons.
