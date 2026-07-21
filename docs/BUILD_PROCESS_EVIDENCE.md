# Public build process evidence

This is a deliberately redacted, repository-verifiable record of the current MUSE closeout. It
publishes user-input summaries, constraints, observable failures, test repairs and release gates.
It does not publish hidden chain-of-thought, credentials, private logs or secret values.

## User-input summary

- Restore the original MUSE arc: one real question, cross-temporal interpretive disagreement,
  evidence from actual artwork encounters, a contradiction-driven second GPT-5.6 transformation
  and a personal answer concept.
- Replace unexpressive shallow-relief animation with a more credible spatial encounter, while
  preserving the original painting as the primary object.
- Attribute GPT Image 2, Tripo, World Labs Marble, GPT-5.6 and Codex only to outputs they actually
  produced.

## Recorded constraints

- A living-artwork visual may enter production only with `visualQa: "approved"`.
- Rejected visuals must not load, mount or obscure the painting.
- The current spatial experiment must begin only after evidence is recorded, last five seconds
  and return completely to the frame.
- Concrete ambient subjects require a GPT Image 2 reference, identity-consistent multiview,
  Tripo GLB reconstruction, a named embedded animation clip and approved visual QA.
- Runtime uses local assets; provider generation remains an offline production step.

## Candidate record

| Attempt | Public artifact | Observable result | Decision |
| --- | --- | --- | --- |
| Eight local shallow-relief v1 GLBs | [`living-artworks-v1/manifest.json`](../assets/generated/living-artworks-v1/manifest.json) and [`livingArtworks.js`](../src/config/livingArtworks.js) | All eight runtime manifests are rejected. The integration test records null production config, zero anchor requests, zero loader calls and no mounted visual. | Retain as inspectable failure evidence; never present as deployed dynamic artwork. |
| Image-conditioned Marble world for `aic-111436` | [`aic-111436-marble/manifest.json`](../assets/generated/living-artworks-v2/aic-111436-marble/manifest.json) | World `a4b12eab-863e-4a96-b5d0-7136017cbad8`; 1,580 credits. Painterly materials, diluted focal composition and no independent hero motion. | Rejected visual QA. |
| Text-conditioned Marble world for `aic-111436` | [`aic-111436-marble-text/manifest.json`](../assets/generated/living-artworks-v2/aic-111436-marble-text/manifest.json) | World `43225634-4b37-474e-bdd6-68ae43d52548`; 1,580 credits. Preliminary Hermes static blind review: 9/10, decision `advance-to-browser-qa`. | `approved-for-browser-qa` only; not deployed or production-approved. |
| Five-second frame portal | [`ArtworkVisionDirector.js`](../src/render/ArtworkVisionDirector.js) and [its focused test](../tests/artwork-vision-director.test.mjs) | Evidence-triggered circular reveal, bounded camera passage, reduced-motion representative frame and full return to the painting. | Isolated QA candidate; production gate remains closed. |

Both Marble directories retain local `world-100k.spz`, `world-500k.spz`, `collider.glb`,
`pano.png` and `thumbnail.webp` files with hashes in their manifests. Collider GLBs are not
claimed as visual-quality meshes.

## Test repair and safety gates

- A source-order regression test initially rejected semantically equivalent optional chaining in
  `src/main.js`. Its expression was corrected to accept the actual syntax while preserving the
  invariant: domain evidence commit -> journey evidence history -> visual/story trigger.
- [`living-artworks.test.mjs`](../tests/living-artworks.test.mjs) locks all v1 visuals out of
  production and limits the Marble result to browser QA.
- [`living-artwork-integration.test.mjs`](../tests/living-artwork-integration.test.mjs) locks the
  rejected path to zero loader calls and keeps evidence ahead of any portal trigger.
- [`ambient-life.test.mjs`](../tests/ambient-life.test.mjs) removes concrete primitive fallbacks
  and requires the complete provider/clip/visual-QA contract for future ambient GLBs.

## Preliminary review and remaining gate

The Hermes 9/10 result is a static preliminary review, not browser acceptance. Production remains
blocked until desktop, mobile, reduced-motion, five-second frame return and a second independent
visual review pass. The portal must also prove that camera motion alone is specific enough to the
artwork rather than a generic scene transition. Until then, public demo material must omit the
portal or label it explicitly as browser-QA footage.

The release closeout is limited to two loops:

1. Verify the complete experience -> fix blockers -> run targeted tests.
2. Record the main footage -> independently watch and sample frames -> make bounded final fixes
   -> freeze.
