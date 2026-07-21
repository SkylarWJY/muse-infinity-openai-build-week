# 27-point acceptance review

This is the implementation-to-request cross-check for the 27 numbered comments supplied after
the full-flow review. `Complete` means the requested user-visible behavior has an implementation
contract and test evidence. `Partial` means the symptom is reduced but a source-asset or geometry
limit remains. Point 21 is a factual clarification rather than a requested change.

| # | Acceptance intent | Implemented behavior and evidence | Status |
| ---: | --- | --- | --- |
| 1 | Open as MUSE Infinity and identify the experience before asking anything. | The threshold names `MUSE∞`, describes the one-question immersive museum, and precedes the question screen. Covered by `tests/app-view-ux.test.mjs`. | Complete |
| 2 | Ask “What question are you carrying?”, with presets or a custom question, before choosing company. | `showLifeQuestion` exposes three presets and a custom field; `JourneySession` then advances to the AI-lens chooser. | Complete |
| 3 | Restore the quieter inherited visual language, reduce top-right clutter, add music, and use the girl learner. | The opening uses the inherited light editorial palette; four primary tools plus `More` replace the dense toolbar; `MuseumScore` starts after user unlock; the girl learner is the default embodied visitor. | Complete |
| 4 | Do not block for minutes while “Preparing the route”. | A complete curated route is installed synchronously and becomes enterable immediately; GPT enrichment runs in the background and replaces the plan only if its generation is still current. | Complete |
| 5 | Use a feminine guide voice and introduce the experience with audio from the beginning. | The first threshold action narrates the museum and question immediately. Mira has an explicitly feminine narration contract; audio still waits for the required user gesture. Covered by audio/provider tests. | Complete |
| 6 | Replace long reading with a short, turn-by-turn group conversation. | Companion perspectives are normalized into short turns, rendered one at a time, narrated one at a time, and advanced by click. Long evidence controls remain in a separate response tray. | Complete |
| 7 | Keep the opening question causally connected to every later scene. | The immutable learner question is carried separately as `carrying_question`, included in every fallback station prompt, GPT dialogue context, route synthesis, roundtable, and ending. Covered by `tests/openai.test.mjs`. | Complete |
| 8 | Let the visitor jump worlds instead of waiting through only one linear path. | Atlas exposes all eight process worlds while exploration is active; each artwork also has a direct skip. The final world remains evidence-gated. Covered by AppView and journey E2E. | Complete |
| 9 | Put dialogue on the person who is speaking and click through to the next person. | Permanent actor head landmarks project through the live camera into viewport coordinates. The current `speakerId` drives actor gesture, narration, portrait, and an anchored conversation bubble with viewport fallback. Covered by `tests/dialogue-anchor.test.mjs`, `tests/app-view-ux.test.mjs`, and party visual QA. | Complete |
| 10 | Replace the long Learning Path with compact progress. | The persistent rail shows one question, percentage, a compact meter, and world count; the full route lives in Atlas. | Complete |
| 11 | Progress should mean exploration of the question, not forced route completion. | Progress counts recorded or explicitly skipped artwork moments independently from visited worlds. | Complete |
| 12 | Always show how far the inquiry has gone and what remains. | The meter reports `explored / 24`, percentage, and `worlds / 8`, with ARIA min/max/current values. | Complete |
| 13 | Remove or avoid the anomalous central pile in the Monet garden. | The spawn and camera were moved to a cleaner readable corridor and high-quality RAD loading is verified. The inherited World Labs reconstruction artifact itself was not regenerated, so some source irregularity remains. | Partial |
| 14 | Remove the two supports below freestanding pictures. | Artwork construction no longer creates support legs; wall and fallback displays share a leg-free frame. Covered by artwork navigation/collection tests. | Complete |
| 15 | Prefer the frames already authored into the 3D worlds. | Strict collider-backed mounting validates the full frame center and corners within 0.10 m. Only 4 of 36 works currently satisfy that honest native-wall contract; no false mount is claimed for the other 32. | Partial |
| 16 | If a native frame cannot be used, keep art away from the center of the scene. | Authored fallbacks use route-edge placements with measured separation from the active corridor and retain a clear visitor approach. | Complete |
| 17 | Side-facing works should sit along a wall or spatial edge, not in the middle. | Fallback yaw and position are authored as edge displays; full-frame sightline, ground, bounds, separation, and approach-route checks reject unsafe placements. | Complete |
| 18 | Enforce the priority: no supports, native frame first, edge fallback second. | Runtime resolves strict wall backing first and otherwise labels the work as an edge display; it never promotes a 0.3–0.6 m wall gap to a wall mount. | Complete |
| 19 | Make the visitor and all three companions explore together, rather than watching NPCs complete a task. | Each companion gets an independent director and safe route; all routes launch together, manual visitor movement pauses shared travel, and discussion waits for visitor readiness. | Complete |
| 20 | Overlay authored frames where possible; otherwise use leg-free, edge-aligned displays. | The fallback behavior is complete and measurable, but native-frame occupancy remains 4/36 because the open World Labs colliders do not provide 36 validated backing surfaces. | Partial |
| 21 | Clarify whether the sharper render came from World Labs. | The experience reuses inherited World Labs/Marble spatial assets and now loads their higher-quality prepared derivatives. It does not claim that this iteration generated new worlds. | Fact clarification |
| 22 | Hide blurred world-model boundaries with camera and staging when possible. | Bounds-clamped spawn/camera profiles and station staging keep normal play inside the strongest reconstructed region. The finite inherited splat/mesh boundaries still exist and cannot be erased without a new source reconstruction. | Partial |
| 23 | Keep characters from blocking close inspection of artworks. | Station staging enforces artwork sightline clearance and visual QA ray-tests a 3 x 3 sample across each audited picture against all three actors. | Complete |
| 24 | Make the company face the visitor in a conversational formation. | The three actors form a separated visitor-facing arc; the current speaker changes gesture without collapsing the formation. Covered by `tests/museum-party.test.mjs` and party visual QA. | Complete |
| 25 | Leave movement room around question triggers and prevent easy exits from the world. | Staging enforces trigger clearance, actor separation, local terrain support, bounds margin, clear routes, and eight visitor movement probes. Player collision sweeps/slides against local collider walls. | Complete |
| 26 | Make scene nine a ritual finale without paintings, with everyone facing the visitor. | `enterFinale` hides the artwork group, ends navigation/follow, and stages the selected AI lenses in a visitor-facing arc before the personalized answer. | Complete |
| 27 | Provide a real ending, reduce top-right controls, and remove the useless Follow control. | The flow now closes through recap, roundtable, contradiction, manifesto, answer-world entry, and a final answer/look-back. The toolbar is compact and no Follow button is exposed. | Complete |

## Honest boundary

Current target classification is **22 Complete, 4 Partial, and 1 Fact clarification**. The four
partials are not hidden behind softer wording:

1. The Monet source reconstruction still contains inherited visual irregularities.
2. Strict native-frame occupancy is 4/36, not 36/36.
3. Point 20 repeats that same native-frame limitation even though its fallback is complete.
4. Finite World Labs source boundaries can be staged away from normal play, not removed in code.

The project also rejects the current locally generated living-artwork relief candidates from
runtime because visual QA found that they obscure the paintings. Their narrative specs and
offline artifacts remain inspectable, but rejected media is neither loaded nor shown. This is a
quality decision, not a claim that the requested high-quality dynamic GLB has already been made.

## Verification set

- `npm run check`
- `npm test`
- `npm run audit:providers`
- `node --test tests/dialogue-anchor.test.mjs tests/app-view-ux.test.mjs tests/museum-party.test.mjs`
- `node --test tests/artwork-navigation.test.mjs tests/artwork-collections.test.mjs`
- `npx playwright test e2e/party-visual.spec.mjs --config=e2e/playwright.config.mjs`
- `npm run test:e2e`
- `git diff --check`

The browser evidence is stored under `artifacts/screenshots/party-visual-baseline/`; geometry
metrics are stored beside the screenshots. The full journey E2E covers eight process worlds,
24 artwork moments, the roundtable, and the gated ninth-world finale.
