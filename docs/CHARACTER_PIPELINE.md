# Learner character asset pipeline

The learner is a checked-in, pre-generated asset. No image or 3D generation request runs in
the browser or application server.

1. Generate one identity-consistent 2x2 turnaround with Tripo's `generate_image` task and
   `model_version: "gpt_image_2"`.
2. Crop the sheet into exactly four views ordered `front`, character-left, `back`,
   character-right. Tripo documents this order and recommends inputs larger than 256 px.
3. Upload the four PNGs with `/v2/openapi/upload/sts`, then submit `multiview_to_model` using
   `P1-20260311`, a 20,000-face limit, PBR textures and `texture_quality: "extreme"`.
4. Require a successful `animate_prerigcheck`, then create a biped GLB with
   `animate_rig` and rig model `v2.5-20260210`.
5. Retarget `preset:idle` and `preset:walk` into one in-place GLB. Download the signed output
   immediately to `assets/characters/learner.glb`.
6. The retargeted export assigns a lower-leg influence above the waist on 126 vertices.
   `LearnerAvatar` removes only those cross-region weights above 2% and renormalizes them once
   at load; structural and visual tests lock the correction against the stretched-triangle
   artifact.
7. Keep `TRIPO_API_KEY` only in the shell environment. Never write API keys, upload tokens or
   signed output URLs into this repository.

The exact prompt, task IDs, parameters, source hashes and output hash are recorded in
`assets/generated/learner-v1/manifest.json`.

Official references:

- <https://platform.tripo3d.ai/docs/generate-image>
- <https://platform.tripo3d.ai/docs/upload>
- <https://platform.tripo3d.ai/docs/generation>
- <https://platform.tripo3d.ai/docs/animation>
- <https://www.tripo3d.ai/terms>
