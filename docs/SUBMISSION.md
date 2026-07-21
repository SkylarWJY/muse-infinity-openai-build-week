# OpenAI Build Week submission package

## Category

Education

## Public repository

<https://github.com/baizhiyuan/muse>

## One-line pitch

MUSE turns one GPT-5.6-guided life question into an embodied walk through eight process
worlds, then gives the learner's evidence-grounded concept a gated ninth-world realization.

## Project description

Most AI learning experiences stop at dialogue. MUSE makes reasoning spatial and inspectable.
A learner asks one question, chooses up to three of eight historical companion
interpretations, and enters the complete ordered exhibition: eight process worlds followed by
one separately gated answer world.

GPT-5.6 returns a strict curation contract for the known eight-scene spine. It can write the
guide's bounded prompt, choices, gesture and effect, but it cannot invent a scene, reorder
the route or provide coordinates. Deterministic Three.js code loads the corresponding
full-detail local world asset, moves the embodied guide to the evidence anchor, grounds the
guide, learner and every selected companion against the scene collider, and releases each
question only after distance and facing checks pass. The visitor can then select a bounded
answer or write a short observation in their own words; both become grounded evidence without
changing the canonical route.

After all eight observations, Summoning exposes the complete evidence ledger. The selected
company convenes at the Roundtable, where GPT-5.6 returns one perspective per selected
companion plus a provisional title, synthesis, principle and visual prompt grounded in all
eight scene IDs. The learner then chooses `perception`, `emotion` or `invention`. On the live
path, that choice triggers a second GPT-5.6 Responses API request whose strict schema locks
the selected axis and whose instructions require a material rewrite of the concept. Only the
validated replacement passes through Transformation to the Manifesto and the prepared
Fantasy Realm of Shimmering Spheres; no-key mode uses the matching curated transformation.

That final claim is deliberately bounded: GPT generates the personalized **concept**; the
Shimmering Spheres **geometry is a pre-generated spatial realization**. The session does not
generate a new 3D world live, and there is no manual Van Gogh/Infinity ending chooser.

The complete path also works without credentials. For judging, an official OpenAI Platform
credential at `api.openai.com` activates GPT-5.6
curation, provisional synthesis and decision-triggered transformation; missing, late or
invalid output activates a visibly labeled, schema-validated curated contract. Runtime
language and judgment use official GPT-5.6 only. Browser speech APIs provide voice I/O without
adding a reasoning model. World Labs also offers an optional admin-gated auxiliary Forge for
isolated spatial variations; Tripo is used only in the character-asset production workflow.

## Build Week development record

The core MUSE concept, nine prepared worlds, colliders, scene imagery, thumbnails,
historical-character GLBs and portraits are pre-Submission Period materials controlled by the
entrant or lawfully sourced under the recorded terms. Submission Period development added the
strict ten-beat/8+1 state machine,
GPT-5.6 Structured Outputs and two-stage synthesis, all-selected-companion movement, grounded
artwork correspondence, cinematic transitions, official OpenAI Realtime/TTS voice,
deterministic procedural music and ambient life, responsive presentation and verification.

This record follows the [OpenAI Build Week Official Rules](https://openai.devpost.com/rules):
authorized third-party SDKs, APIs and data remain subject to their terms; existing projects
identify Submission Period work; demo music must be authorized; and the README identifies the
Codex and GPT-5.6 contribution.

Source-control evidence is recorded in commits `62a7f59`, `9ab9062`, `7602267` and `55fdeed`.
The majority core-functionality Codex evidence session is
`019f7e53-4039-7cc1-9162-01906bec47b7`; the file-level asset record is
`docs/PROVENANCE.md`.

## Technical implementation

- A modular GPT-5.6 runtime with an official OpenAI judging configuration.
- A strict ten-beat state machine and independent 8+1 exhibition manifest.
- An eight-stop GPT-5.6 Structured Output contract that cannot change scene order or
  coordinates, plus an honest no-key fallback with the same shape.
- A free-form observation path, capped at 80 characters and held behind the same spatial
  correspondence gate as bounded answers.
- Official OpenAI Realtime/TTS synthetic narration and browser speech fallback;
  recognized text reuses official GPT-5.6 dialogue or the labeled curated local fallback.
- An optional two-credential, admin-gated World Labs Forge for isolated spatial variations,
  kept outside the canonical nine-world journey and all language reasoning.
- Physical follow behavior for the complete selected company: one active guide plus up to two
  collider-grounded companions, with an unduplicated Roundtable staging roster.
- A provisional Roundtable schema followed by a separate decision-triggered GPT-5.6 strict
  transformed-concept request for `perception`, `emotion` or `invention`.
- Official Spark quality RAD hierarchies built from the full 2.40M-4.32M source SPZs for
  scenes 1-7, the scene-8 SPZ fallback, and scene-8/final mesh geometry
  with 8192 x 8192 JPEG-repacked textures.
- Desktop high quality at DPR 2 and a 4.32M Spark target, mobile high quality at DPR 1.5 and a
  750K target, `NoToneMapping`, quality tiers and explicit world disposal.
- A source-asset acceptance gate: procedural scenery cannot create process evidence, and a
  failed answer-world load preserves the manifesto for retry instead of committing entry.
- Bounded character/texture/GLB fallback loads plus tracked Spark initialization, pager-fetch,
  worker and terminal-disposal lifecycles.
- Byte-range and immutable-cache serving for large local spatial assets.
- Collider-grounded learner and selected-company placement across all nine worlds.
- Browser-optimized copies of all eight 57-60 MB historical Tripo GLBs.
- Shader-driven historical-character limb deformation, root movement and guide-state
  integration behind the same interface as the procedural fallback.
- Speed-coupled historical-character gait plus a visible listening-to-reflection transition.
- Real-frame follower verification covers both root travel and changing shader-limb phases.
- Deterministic, theme-specific ambient life in all nine worlds using code-native articulated
  geometry and bounded point fields, with no added third-party model or dependency.
- A regenerated GPT Image 2-designed learner reconstructed with Tripo v3.1 and shipped with a
  semantic 41-joint biped skin plus baked wait/walk clips; dense offline QA keeps runtime skin
  weights immutable.
- Deterministic scene correspondence gates for distance and evidence-facing direction.
- Summoning over eight observations and a final-concept schema requiring all eight scene IDs
  plus exactly the selected companion perspectives.
- Desktop/mobile canvas, asset, state-flow, Range-serving and provider-boundary verification.

## Under-three-minute demo script

The product has **no skip or precompleted demo mode**. The submission video should use a
time-compressed recording of the normal path: retain every scene and every narrative gate,
but cut or accelerate only repeated walking/loading intervals. Do not claim that the product
can jump from scene 1 to scene 8.

### 0:00-0:20: One question, full company

Open in the Grand Conservatory. Cross the threshold, ask `What makes a life meaningful?`,
and choose Monet, Socrates and Frida. Say: "MUSE carries one question through eight embodied
worlds before it can become an answer."

### 0:20-0:38: GPT binds the eight-world spine

Show the GPT-5.6 or clearly labeled curated curation result. Pan over the complete route rail:
Arrival, Question, Perception, Invention, Intensity, Transformation, Identity and Infinity.
State that GPT writes bounded inquiry content but cannot reorder or skip these worlds.

### 0:38-1:35: Eight real worlds, one embodied method

Show one full correspondence cycle in the Water and Light scene: the guide walks, collider
grounding follows the surface, all three selected companions remain physically present, the
guide faces the evidence, and responses unlock only when distance/facing synchronize. Record
one visitor-written observation instead of a preset answer. Then use short cuts from the same
normal-path recording to show the other seven initialized worlds and one answer in each.
Keep the route counter visible so the video demonstrates `1/8` through `8/8`; cuts remove wait
time, not states.

Call out the source-detail formats during the montage: paged quality RAD hierarchies derived
from 2.40M-4.32M SPZs, then the 8K Yellow Infinity texture mesh.

### 1:35-2:05: Evidence becomes a Roundtable

Open Summoning and show all eight observations. Convene the selected company. Show the
result label (`GPT-5.6 LIVE` or `CURATED DEMO`), the selected companion perspectives and the
ordered eight-scene evidence list behind the provisional world title and synthesis.

### 2:05-2:30: Decision becomes manifesto

Choose one contradiction axis and show that Transformation makes a second GPT-5.6 request,
not a cosmetic label change. Compare the provisional and transformed title/synthesis, then
publish the principle. Emphasize that the strict result must use the chosen axis and that the
ninth world remains locked until these steps complete; it does not appear in Atlas.

### 2:30-2:47: Enter the answer

Enter Fantasy Realm of Shimmering Spheres and move inside it. Say: "GPT personalized this
concept from the eight observations. The prepared 8K spatial form is not geometry generated
during the live session."

### 2:47-2:58: Technical close

End on the provider audit, nine-scene asset tests and real canvas metrics: "GPT plans and
synthesizes attention; deterministic space proves where the learner and guide actually were."

## Technical claims to show, not merely say

- `window.__MUSE_METRICS__.archivedWorld` reports each initialized canonical world ID.
- `window.__MUSE_METRICS__.archivedCompanion` reports the active guide asset.
- `window.__MUSE_METRICS__.archivedCompanions` reports every live member of the
  selected company, including the two follow actors when three are selected.
- `window.__MUSE_METRICS__.ambient` reports the active scene, thematic kinds, instance count
  and whether its deterministic motion has advanced.
- Scene sync exposes guide distance and facing correspondence.
- Manifest/header tests prove exact 8+1 order, seven valid RAD0 process assets tied to the
  documented 2.40M-4.32M sources, and the scene-8 1.92M SPZ fallback.
- GLB tests prove scene 8/final retain 8192 x 8192 textures and the exact 598,495 /
  593,231 triangle counts.
- Quality tests lock desktop high at DPR 2 / 4.32M target and mobile high at DPR 1.5 / 750K.
- Server tests prove byte-range responses for large world assets.
- The learner tests prove a real 41-joint skin, valid regional weights, named wait/walk
  animations and zero hard edge explosions across dense animation sampling.
- The provider audit verifies the official OpenAI origin and the checked-in GPT model allowlist.
- Contract tests prove free observations enter the digest and the chosen contradiction locks
  the second strict transformation result.
- The no-key E2E path traverses all eight scenes with the selected company before the gated
  answer world, and injects failed process/final world loads to prove both retry gates.

## Devpost checklist

- [x] Public repository: <https://github.com/baizhiyuan/muse>
- [ ] Working deployment URL added.
- [ ] Education category selected.
- [ ] Public demo video is under three minutes and retains evidence from all eight worlds.
- [ ] Video labels live GPT-5.6 and curated fallback accurately.
- [ ] Video distinguishes GPT concept generation from the prepared final geometry.
- [ ] README setup tested from a clean install.
- [x] `/feedback` session ID included: `019f7e53-4039-7cc1-9162-01906bec47b7`.
- [x] Canonical bundled assets have byte counts and SHA-256 hashes.
- [ ] Official `api.openai.com` Platform key is configured for the judging deployment.
- [ ] Third-party notices and asset manifest are included with the submission.
- [ ] Confirm no secrets are committed.

## Evidence to capture for the final video/entry

- Grand Conservatory threshold and complete eight-scene route rail.
- Selection surface with all eight companion identities.
- At least one uncut all-selected-companion walking/facing/gesture/answer correspondence
  cycle, including one visitor-written observation.
- Initialized world status from each of the eight process worlds.
- Summoning ledger containing eight ordered observations.
- Roundtable containing exactly the selected company and provisional grounded synthesis.
- Decision, second GPT-5.6 transformation provenance, materially revised concept and
  Manifesto gates.
- Atlas without the answer world, then gated Shimmering Spheres entry.
- Mobile exploration state with route, dialogue, joystick and follow control non-overlapping.
- Terminal output from `npm run check`, `npm test`, `npm run audit:providers`,
  `npm run test:e2e` and `npm audit --audit-level=high`.
