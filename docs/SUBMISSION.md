# OpenAI Build Week submission package

## Category

Education

## Public repository

<https://github.com/baizhiyuan/muse>

## One-line pitch

MUSE turns a GPT-5.6 inquiry into a companion who physically guides the learner through
archived AI-generated worlds, then rewrites the answer as a world they can enter.

## Project description

Most AI learning experiences stop at dialogue. MUSE makes reasoning spatial and
inspectable. A learner asks one question, chooses up to three historical perspectives and
enters the real Bright Gallery World Labs scene. GPT-5.6 returns a strict three-stop lesson
contract made only of known artwork, evidence, gesture and effect IDs. Deterministic Three.js
code moves the first selected Tripo companion to the correct anchor, turns the figure toward
the artwork and releases the prompt only after distance and facing checks pass.

The learner's answer changes the route. After three stops, the selected archived companions
materialize in the Perspective Salon to test the session evidence. The learner then chooses
the Van Gogh Gallery or Infinity Dot Room and walks into that second archived scene as the
rewritten answer.

The complete path works without credentials. A live OpenAI key activates GPT-5.6 lesson and
Salon reasoning; missing or invalid model output activates a visibly labeled curated contract.
OpenAI GPT is the only language/reasoning runtime. World Labs and Tripo are disclosed sources
of pre-generated digital assets, not alternate reasoning providers.

## Prior work disclosure

The earlier `muse-infinity` project established the product spine and created the digital
asset collection. This submission intentionally reuses:

- the question -> companions -> curation -> walk -> roundtable -> transformed-world flow;
- three World Labs scene outputs and three scene thumbnails;
- five Tripo character GLBs and five companion portraits;
- three public-domain Art Institute artwork images;
- verified scene transforms and spatial profiles.

Those elements are not represented as newly created during Build Week. Exact files, hashes,
sizes and unresolved upstream records are listed in `docs/PROVENANCE.md`.

The previous application runtime included mixed-agent authorship and non-OpenAI provider
paths. It was not forked into this repository. No legacy application/server module, MiniMax
narration path, Claude runtime or configurable OpenAI-compatible LLM endpoint is shipped.

## What was built during Build Week

- A new modular OpenAI-only runtime around the disclosed legacy assets.
- A compact six-stage journey state that preserves the old ten-stage narrative arc.
- The real Bright Gallery SPZ as the first-screen and main-route world.
- Manifest-driven switching among three archived 500,000-splat worlds.
- Browser-optimized copies of five previously static 58-60 MB Tripo GLBs.
- Shader-driven limb deformation, root motion, gesture poses and guide-state integration for
  the static character meshes.
- A new GPT Image 2-designed learner reconstructed with Tripo P1 and shipped with a 52-joint
  biped skin plus baked idle/walk clips.
- Scene correspondence gates for distance and artwork-facing direction.
- Observation-driven physical branching through three evidence stops.
- An embodied Salon using the learner's selected archived companions.
- A rewrite step that loads a different archived world as the visible outcome.
- Procedural scene/avatar recovery for SPZ or GLB failure.
- Desktop/mobile canvas, asset, stage-flow and OpenAI-provider-boundary verification.

## Under-three-minute demo script

### 0:00-0:20: The inherited world, now active

Open on Bright Gallery already loading behind the question. Say: "These are the original
MUSE digital assets. This Build Week, we made the museum itself perform the lesson."

Show the world name and Evidence state briefly so the local archived scene and model state are
both explicit.

### 0:20-0:45: Choose the company

Ask `What makes a life meaningful?` and select Monet, Van Gogh and Socrates. Point out that
these are the archived portraits and optimized Tripo forms from `muse-infinity`, not newly
generated placeholders.

### 0:45-1:30: Embodied inquiry

Show GPT-5.6 curation or the clearly labeled curated contract. Enter the exhibition. Let the
selected companion walk to *Water Lilies*, turn and point. Emphasize that the observation
choices appear only after the anchor/facing correspondence gate passes.

Choose `A quiet surface` and show that the answer changes the next physical destination.

### 1:30-2:05: Evidence becomes a Salon

Use a prepared tab near the third stop if needed. Complete the route, show the learning map,
then convene the Salon. The learner's selected archived GLBs now share the world and GPT-5.6,
or the same validated local contract, returns three readings grounded in the actual visits.

### 2:05-2:35: Rewrite the world

Choose Van Gogh Gallery. Show the SPZ transition, manifesto and final-world entry. Open Atlas
briefly to compare the Infinity Dot Room and make clear that all three are real local World
Labs assets, not thumbnails.

### 2:35-2:50: Technical close

Show the provider audit and asset tests. End with: "GPT plans the attention; deterministic
space proves that the character, evidence and learner were in the same scene."

## Technical claims to show, not merely say

- `window.__MUSE_METRICS__.archivedWorld` reports the initialized world ID.
- `window.__MUSE_METRICS__.archivedCompanion` reports the live selected guide asset.
- Scene sync exposes guide distance and facing correspondence.
- The SPZ header tests prove three deployable 500,000-splat files.
- The learner GLB test proves a real skin, joint weights and named idle/walk animations.
- The provider audit rejects Claude, Gemini, MiniMax and generic LLM endpoint variables from
  runtime source.
- The no-key E2E path reaches the rewritten world with meaningful canvas pixels.

## Devpost checklist

- [x] Public repository: <https://github.com/baizhiyuan/muse>
- [ ] Working deployment URL added.
- [ ] Education category selected.
- [ ] Public demo video is under three minutes.
- [ ] Video shows both Codex authorship and live/fallback GPT-5.6 provenance.
- [ ] README setup tested from a clean install.
- [x] `/feedback` session ID included: `019f7e53-4039-7cc1-9162-01906bec47b7`.
- [x] New-vs-existing work disclosure matches `docs/PROVENANCE.md`.
- [x] Known bundled assets have byte counts and SHA-256 hashes.
- [ ] Recover or attach upstream World Labs IDs, Tripo task IDs and asset redistribution terms
  if required by the organizer.
- [ ] Confirm no secrets are committed.

## Evidence to capture for the final video/entry

- Threshold with initialized Bright Gallery SPZ.
- Company selection with all five archived portraits.
- Walking and pointing poses from the same camera position.
- Active question with scene correspondence marked synchronized.
- Salon with the selected archived companions.
- Final Van Gogh Gallery and Atlas Infinity Dot Room.
- Mobile question state with joystick and follow control clear of dialogue.
- Terminal output from `npm run check`, `npm test`, `npm run audit:providers`,
  `npm run test:e2e` and `npm audit --audit-level=high`.
