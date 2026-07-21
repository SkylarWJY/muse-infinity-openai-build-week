# OpenAI Build Week submission package

## Category

Education

## Public repository

<https://github.com/baizhiyuan/muse>

## One-line pitch

MUSE turns a question someone genuinely carries into a walkable impossible museum: GPT-5.6
brings cross-temporal AI interpretive lenses into real artwork encounters, lets their
disagreement sharpen the visitor's thinking, and transforms the evidence from that unique walk
into a personal answer concept with a prepared ninth-world realization.

## Project description

Most AI learning experiences stop at dialogue. MUSE makes reasoning spatial and inspectable.
A learner asks one real question, chooses up to three AI interpretive companions/lenses, and
enters a bounded exhibition across eight freely navigable process worlds followed by one
separately gated answer world. The eight-world evidence method is an Education deepening of the
[original MUSE Infinity story](https://github.com/SkylarWJY/muse-infinity/blob/main/README.md#L55-L76)
and [product thesis](https://github.com/SkylarWJY/muse-infinity/blob/main/docs/LATEST_PRODUCT_SPEC.md#L3-L21),
not a story about completing eight teaching tasks.

GPT-5.6 returns a strict curation contract for the known eight-scene spine. It can write the
companions' bounded prompts, choices, gestures and effects, but it cannot invent a scene, reorder
the digest or provide coordinates. Deterministic Three.js code loads the corresponding inherited
full-detail world asset behind a 1672 x 941 readiness-transition poster. Atlas cross-world
comparisons use the same transition, and the following canonical poster is prefetched once at
low priority after the current image decodes. Each process world then
requires the first three of its four artworks. Companion speaker order rotates by station; every
selected actor has an independent director and leaves with the company for a separated,
collider-grounded conversation position that preserves the artwork sightline. A station opens
only after the company and visitor arrive. The visitor can then select an evidence stance, write
a short observation, or skip that work without fabricating evidence; resolving all three stations
with at least one real record unlocks one scene reflection.

After all eight scene reflections, Summoning exposes the complete evidence ledger. The selected
AI interpretive companions convene at the Roundtable, where GPT-5.6 must cite observations that
actually appeared earlier before returning one perspective per selected lens plus a provisional
title, synthesis, principle and visual prompt grounded in all eight scene IDs. The learner then
chooses the unresolved contradiction between `perception`, `emotion` or `invention`. On the live
path, that choice triggers a second GPT-5.6 Responses API request whose strict schema locks
the selected axis and whose instructions require a material rewrite of the concept. Only the
validated replacement passes through Transformation to the Manifesto and the prepared
Fantasy Realm of Shimmering Spheres; no-key mode uses the matching curated transformation.

That final claim is deliberately bounded: GPT generates the personalized **concept**; the
Shimmering Spheres **geometry is a pre-generated spatial realization**. The session does not
generate a new 3D world live, and there is no manual Van Gogh/Infinity ending chooser. The
Finale hides its artwork group and stages the complete selected company facing the visitor.

The complete path also works without credentials. A credential at one of two exact disclosed
remote origins activates GPT-5.6 curation, station dialogue, provisional synthesis and
decision-triggered transformation: official OpenAI at `https://api.openai.com`, or the
authorized OpenAI-compatible gateway at `https://api.baizhiyuan.cloud`. Local judging may instead
explicitly reuse the current user's Codex auth and loopback `/v1` Responses transport. Compatible
transports are reasoning-only; Realtime and OpenAI TTS are official-origin-only. Missing, late or invalid output
activates a visibly labeled, schema-validated curated contract. Browser speech and MiniMax
provide voice I/O/rendering without adding a reasoning model. World Labs also offers an optional
admin-gated Forge for isolated spatial variations; Tripo was used offline for character and a
now-retired white-dove asset experiment. The Official Rules permit those authorized third-party services;
every runtime language and judgment request remains GPT-5.6.

The companions are **AI interpretive companions/lenses**, not simulations authorized by the
named people. Their text is generated interpretation rather than quotation or historical
testimony, their voices are synthetic cast voices rather than clones, and no endorsement is
implied. Yayoi Kusama is living: the final process region is presented as an
`infinity and repetition` lens and never as Kusama herself speaking. This implements the
[original representation boundary](https://github.com/SkylarWJY/muse-infinity/blob/main/docs/LATEST_PRODUCT_SPEC.md#L76-L79).

## What each AI system actually contributes

These are three separate chains, not one blended generation claim:

1. **GPT-5.6 runtime core:** question -> strict structured eight-world curation -> dialogue
   grounded in trusted artwork facts -> Roundtable over the observations carried from the walk
   -> second GPT-5.6 transformation triggered by the visitor's contradiction choice. The UI must
   accurately distinguish `GPT-5.6 · OPENAI LIVE` from `CURATED FALLBACK` / `CURATED DEMO`.
2. **GPT Image 2 offline asset references:** image generation does not directly produce a GLB.
   The retained adult learner follows GPT Image 2 T-pose/reference -> Tripo four views -> Tripo
   v3.1 `multiview_to_model` -> GLB -> rig/animation -> QA. The retired white-dove experiment used
   GPT Image 2 reference generation and Tripo v3.1 reconstruction but had no embedded clip and is
   no longer visible. The default little-girl learner is a user-provided Tripo asset and must not
   be credited to GPT Image 2. All eight local procedural living-artwork v1 visuals failed visual QA and are
   runtime-ineligible; they must not be credited to GPT Image 2, Tripo or Marble.
3. **Codex / OMX engineering:** Deep Interview -> consensus plan -> implementation -> targeted
   tests -> adversarial QA -> review. A 3-5 second making-of insert may show prompts,
   specifications, test output, a failure and its fix, and the final result. It must not present
   hidden reasoning or chain-of-thought.

The redacted, repository-linked experiment record is public in
[`BUILD_PROCESS_EVIDENCE.md`](BUILD_PROCESS_EVIDENCE.md). It contains no credentials, private
logs or hidden reasoning.

## Build Week development record

The core MUSE concept, nine prepared worlds, colliders, scene imagery, thumbnails,
interpretive-companion GLBs and portraits are pre-Submission Period materials controlled by the
entrant or lawfully sourced under the recorded terms. Submission Period development added the
strict ten-beat/8+1 state machine,
GPT-5.6 Structured Outputs and two-stage synthesis, three-station process tours, independently
directed selected-companion movement, grounded artwork correspondence, high-resolution
readiness transitions, conditional OpenAI Realtime plus MiniMax/OpenAI narration, reviewed
public-domain museum music, ambient approval gates, abstract dots/fireflies, responsive presentation and verification.

This record follows the [OpenAI Build Week Official Rules](https://openai.devpost.com/rules):
under `Project Requirements > Third Party Integrations`, third-party SDKs, APIs and data are
allowed when the entrant is authorized under their terms; existing projects identify Submission
Period work; demo music must be authorized; and the README identifies the Codex and GPT-5.6
contribution.

Source-control evidence is recorded in commits `62a7f59`, `9ab9062`, `7602267` and `55fdeed`.
The majority core-functionality Codex evidence session is
`019f7e53-4039-7cc1-9162-01906bec47b7`; the file-level asset record is
`docs/PROVENANCE.md`.

## Technical implementation

- A modular GPT-5.6 runtime with exact allowlists for the official OpenAI origin and disclosed
  authorized compatible gateway; the latter is reasoning-only.
- A strict ten-beat state machine and independent 8+1 exhibition manifest.
- An eight-stop GPT-5.6 Structured Output contract that cannot change canonical scene identities,
  digest order or coordinates, plus an honest no-key fallback with the same shape. Atlas still
  lets the visitor explore the eight process worlds in any order.
- Three required artwork stations per process scene, each with three evidence-bearing stances
  and a short free observation path behind the same spatial correspondence gate. One reflection
  per scene enters the existing eight-scene digest.
- Official-origin OpenAI Realtime for live conversation, MiniMax role-cast narration with
  official-origin OpenAI TTS fallback, and browser speech fallback; recognized text reuses
  GPT-5.6 dialogue or the labeled curated local fallback, while MiniMax performs no reasoning.
- An optional two-credential, admin-gated World Labs Forge for isolated spatial variations,
  kept outside the canonical nine-world journey and all language reasoning.
- Independent station behavior for the complete selected company: rotating speaker order,
  simultaneous departures and separated collider-grounded conversation positions, with an
  unduplicated Roundtable staging roster.
- A provisional Roundtable schema followed by a separate decision-triggered GPT-5.6 strict
  transformed-concept request for `perception`, `emotion` or `invention`.
- Official Spark quality RAD hierarchies built from the full 2.40M-4.32M source SPZs for
  scenes 1-7, the scene-8 SPZ fallback, and scene-8/final mesh geometry
  with 8192 x 8192 JPEG-repacked textures.
- A practical default balanced tier at desktop DPR 1.5 / 1M Spark and mobile DPR 1.25 / 400K,
  plus an explicit high tier at desktop DPR 2 / 4.32M and mobile DPR 1.5 / 750K for verified
  recording hardware; all tiers retain `NoToneMapping` and explicit world disposal.
- A source-asset acceptance gate: procedural scenery cannot create process evidence, and a
  failed answer-world load preserves the manifesto for retry instead of committing entry.
- A full-viewport transition veil using the inherited 1672 x 941 scene poster; it remains over
  normal loading until the high-fidelity world and cast are ready, Atlas cross-world changes
  reuse it, and the next poster is prefetched at low priority. A presentation-quality failure
  retains the matching poster background, blocks evidence and exposes retry instead of flashing
  the coarse canvas.
- Bounded character/texture/GLB fallback loads plus tracked Spark initialization, pager-fetch,
  worker and terminal-disposal lifecycles.
- Byte-range and immutable-cache serving for large local spatial assets.
- Collider-grounded learner and selected-company placement across all nine worlds.
- Browser-optimized copies of all eight 57-60 MB interpretive-companion Tripo GLBs.
- Shader-driven interpretive-companion limb deformation, root movement and guide-state
  integration behind the same interface as the procedural fallback.
- Speed-coupled interpretive-companion gait plus a visible listening-to-reflection transition.
- Real-frame companion verification covers root travel, simultaneous station launches and changing
  shader-limb phases.
- Honest ambient configuration: only abstract infinity dots and answer-world fireflies remain
  visible. Earlier procedural creatures and the unskinned, clipless white dove are retired.
  Future concrete subjects require a GPT Image 2 reference, multiview, Tripo GLB, named embedded
  animation clip and approved visual QA; missing or rejected assets have no primitive fallback.
- A retained adult learner generated from a GPT Image 2 reference and reconstructed with Tripo
  v3.1, with a semantic 41-joint biped skin plus baked wait/walk clips; dense offline QA keeps
  runtime skin weights immutable. This is not the default user-provided little-girl learner.
- Eight local living-artwork v1 artifacts retained as rejected evidence. Approved-only production
  lookup returns no visual for them, and the rejected path is tested to make zero loader calls.
- Two versioned Marble experiments for `aic-111436`: the image-conditioned world is rejected;
  the text-conditioned world is only `approved-for-browser-qa` after a 9/10 preliminary Hermes
  static review. Neither is described as production-deployed.
- An isolated, evidence-triggered five-second frame-portal candidate that returns fully to the
  original painting and remains gated from production until formal browser and visual QA pass.
- Deterministic scene correspondence gates for distance and evidence-facing direction.
- Summoning over eight scene reflections and a final-concept schema requiring all eight scene IDs
  plus exactly the selected companion perspectives.
- Desktop/mobile canvas, asset, state-flow, Range-serving and provider-boundary verification.

World Labs Marble Record exports MP4 capture, not an animated GLB. The submission therefore
uses the inherited poster-to-live-world transition and does not claim a Marble-generated
transition GLB.

## Under-three-minute demo script

The [Official Rules](https://openai.devpost.com/rules) require a clear demo with audio that
explains both Codex and GPT-5.6, and judges need not watch beyond three minutes. The cut therefore
ends at 2:58. Roughly 85% is the real MUSE experience; the making-of is limited to the final
17 seconds, plus a six-second closing claim.

The product has **no precompleted demo mode**. Use time-compressed recordings of the real path;
cuts may remove repeated walking or loading, but the edit must not imply that a gate was skipped
or that a fallback response was live.

| Time | Picture and narration |
| --- | --- |
| 0:00-0:10 | Open over the threshold: **"Humanity built an answer machine. But understanding is not something you can simply read."** Establish the impossible museum, not an eight-task checklist. |
| 0:10-0:30 | Enter a real question and choose three AI interpretive lenses. Show the museum beginning to form around that question; do not call the lenses historical people speaking. |
| 0:30-0:50 | Show GPT-5.6 returning the bounded curation. Keep the exact on-screen provenance visible: `GPT-5.6 · OPENAI LIVE` when live, or `CURATED FALLBACK` / `CURATED DEMO` on the fallback surfaces. Explain that GPT shapes the inquiry while deterministic code protects scene and asset boundaries. |
| 0:50-1:25 | Show one complete artwork encounter: observe a real AIC work, hear genuinely divergent interpretations and record a visitor observation. Include the five-second frame portal only if its production browser/visual-QA gate has passed before recording; otherwise omit it rather than implying a completed dynamic artwork. Keep `CURATED FACT` distinct from `IMAGINED REENACTMENT · NOT HISTORICAL TESTIMONY`. |
| 1:25-1:45 | Montage the eight-chapter thought spine. Show that evidence is continuously carried forward; do not frame the montage as eight teaching tasks. |
| 1:45-2:13 | Convene the Roundtable. Visibly connect at least one line to an observation shown earlier, display the ordered evidence references, and retain the correct live/fallback label. |
| 2:13-2:35 | Choose the unresolved contradiction and show the second GPT-5.6 transformation materially revising the concept. Unlock the gated ninth world only after the result validates. |
| 2:35-2:52 | Compress the making-of into 17 seconds: GPT Image 2 reference imagery, the truthful Tripo asset chain, then Codex/OMX Deep Interview -> plan -> implementation -> targeted test -> failed check/fix -> QA/review. Do not show hidden reasoning. |
| 2:52-2:58 | Close on: **"GPT-5.6 personalized concept - prepared spatial realization."** The wording deliberately separates live concept generation from prepared geometry. |

### Shotcraft finishing boundary

[video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft/tree/09a832f33277c328d4079a2c3149f8922b1711e1#readme) is an optional
Remotion motion-design library, not a recorder or one-click editor. Do not install or adapt it
until the real MUSE WebGL master recording is locked.

- Keep about 80% of final footage as direct MUSE WebGL capture. Do not import its Ink Press
  visual skin into MUSE.
- If used, pin upstream commit
  [`09a832f33277c328d4079a2c3149f8922b1711e1`](https://github.com/Vincentwei1021/video-shotcraft/tree/09a832f33277c328d4079a2c3149f8922b1711e1)
  and work in an
  isolated Remotion directory. Do not modify MUSE's `package.json`, dev-server configuration or
  port `4175`.
- Limit borrowed motion patterns to `speed-ramp-freeze`, `page-waterfall-wall` and
  `ui-strip-away-outro`. Treat `diagram-cascade` as visual reference only, not an approved
  component, until its exact implementation and asset rights are separately reviewed.
- Do not use `pop.mp3`, `typewriter.mp3` or the old BGM. Shotcraft's own
  [pinned audio attribution ledger](https://github.com/Vincentwei1021/video-shotcraft/blob/09a832f33277c328d4079a2c3149f8922b1711e1/assets/audio/ATTRIBUTION.md)
  marks the two effects' sources as unresolved, and the competition requires authorized demo
  music and materials.
- Before installation or rendering, confirm that the intended team size and use comply with
  Remotion's [current official license terms](https://www.remotion.dev/). This check remains open;
  Shotcraft's Apache-2.0 license does not replace Remotion's separate license.

### Recording gate

Before Shotcraft or final editing: complete browser/visual QA for any frame portal shown, verify
that every approved visual file and manifest intended for submission is tracked, and lock the
real main recording. Rejected v1 or browser-QA-only Marble candidates must not appear as deployed
features. Motion packaging begins only after those conditions hold.

## Release closeout: two loops maximum

This four-quadrant record starts **now**. The repository has no prior four-quadrant history, and
ignored `.omx/` state is not public evidence, so the Devpost entry must not imply that this method
was used throughout earlier development.

| Quadrant | Current closeout record |
| --- | --- |
| Known knowns | Original MUSE story, official rules, eight-world spine, GPT schemas and prepared geometry boundaries. |
| Known unknowns | Frame-portal browser/visual QA, deployment, audio behavior and the final recording. |
| Unknown knowns | Existing manifests, provider task IDs and QA evidence already in the repository but not yet used in the public story. |
| Unknown unknowns | WebGL/device behavior, network variance, encoding, YouTube upload and judge-environment failures, exposed through external-browser and adversarial QA. |

Run at most two closeout loops:

1. Verify the complete experience -> fix blockers -> run targeted tests.
2. Record the main footage -> conduct an independent watch-through and frame-sampling QA ->
   make the final bounded fixes -> freeze.

## Technical claims to show, not merely say

- `window.__MUSE_METRICS__.archivedWorld` reports each initialized canonical world ID.
- `window.__MUSE_METRICS__.archivedCompanion` reports the active guide asset.
- `window.__MUSE_METRICS__.archivedCompanions` reports every live member of the selected company.
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
- The provider audit verifies both exact allowed origins, GPT-5.6 model allowlists and the
  reasoning-only gateway boundary for Realtime/OpenAI TTS.
- Contract tests prove three required station records precede each scene reflection, free
  observations enter the digest and the chosen contradiction locks the second strict
  transformation result.
- The required no-key E2E run must traverse all eight scenes with the selected company before
  the gated answer world and inject failed process/final world loads to exercise both retry
  gates.

## Devpost checklist

- [x] Public repository: <https://github.com/baizhiyuan/muse>
- [ ] Working deployment URL added.
- [ ] Education category selected.
- [ ] Public demo video is under three minutes and retains three-station evidence plus the
  reflection from all eight process worlds.
- [ ] Video labels live GPT-5.6 and curated fallback accurately.
- [ ] Video distinguishes GPT concept generation from the prepared final geometry.
- [ ] Video calls companions AI interpretive lenses and never presents Kusama as speaking.
- [ ] Video distinguishes the adult/dove GPT Image 2 workflows from the user-provided default
  learner, rejected v1 artwork artifacts and browser-QA-only Marble candidate.
- [ ] README setup tested from a clean install.
- [x] `/feedback` session ID included: `019f7e53-4039-7cc1-9162-01906bec47b7`.
- [x] Canonical bundled assets have byte counts and SHA-256 hashes.
- [ ] An untracked credential and one exact allowed GPT-5.6 origin are configured for judging;
  use official `api.openai.com` if Realtime/OpenAI TTS will be demonstrated.
- [ ] Third-party notices and asset manifest are included with the submission.
- [ ] Confirm no secrets are committed.

## Evidence to capture for the final video/entry

- Grand Conservatory threshold and complete eight-scene route rail.
- Selection surface with all eight AI interpretive lens identities and visible representation
  boundary.
- At least one complete three-artwork cycle with rotating independent companion movement,
  including one visitor-written observation and the scene reflection.
- Initialized world status from each of the eight process worlds.
- Summoning ledger containing eight ordered scene reflections.
- Roundtable containing exactly the selected company and provisional grounded synthesis.
- Decision, second GPT-5.6 transformation provenance, materially revised concept and
  Manifesto gates.
- Atlas without the answer world, then gated Shimmering Spheres entry.
- Mobile exploration state with route, dialogue and joystick non-overlapping.
- Terminal output from `npm run check`, `npm test`, `npm run audit:providers`,
  `npm run test:e2e` and `npm audit --audit-level=high`.
