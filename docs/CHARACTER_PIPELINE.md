# Retained adult learner asset pipeline

This document covers the retained adult learner in `assets/characters/learner.glb`. It is a
checked-in, pre-generated asset; the browser and application server never call an image- or
3D-generation API.

The production chain is deliberately stated as separate tools and artifacts:

```text
GPT Image 2 T-pose reference
  -> Tripo four-view turnaround
  -> Tripo v3.1 multiview_to_model
  -> GLB
  -> Tripo rig and animation retarget
  -> offline QA and bounded skin-weight correction
```

GPT Image 2 produces the reference image, not the GLB. The repository's default little-girl
learner is instead a user-provided Tripo export documented in
`assets/generated/learner-girl/manifest.json`; it has no GPT Image 2 provenance. The white dove
is the only other deployed asset with a recorded GPT Image 2 reference plus Tripo reconstruction,
and it uses local shader-authored wing motion rather than this biped rig/retarget path. The eight
living-artwork v1 files are local Three.js-authored GLBs and are outside this pipeline.

## Canonical v2 production chain

1. Generate a strict orthographic T-pose source through Tripo's `generate_image` task with
   `model_version: "gpt_image_2"`. The accepted source has separated legs, horizontal arms,
   simple fitted clothing and no wrist accessories. Task:
   `99ea065b-9ebf-4ea8-906f-ac7b653b97dc`.
2. Ask Tripo's multiview-image task to derive identity-consistent front, character-left,
   back and character-right 1024 x 1024 views. Keep the original four-view result after
   rejecting two side-view edits that changed the arm axis. Task:
   `d0368de5-5b4f-4717-8d85-d648948dd3d2`.
3. Submit the four views to `multiview_to_model` with `v3.1-20260211`, a 40,000-face limit,
   detailed geometry, PBR materials and extreme texture quality. The resulting production
   mesh contains 21,672 vertices and 37,659 triangles. Task:
   `51cd2e5d-c3db-42ab-a5df-b3730ce93aa1`.
4. Run `animate_prerigcheck`, then rig the v3.1 mesh as a legacy Tripo biped with
   `v1.0-20240301`. This produced a stable semantic 41-joint hierarchy after both v2.5
   rigging attempts failed visual motion QA. Rig task:
   `f25c7ad5-a39c-4416-95b9-a1bbb3155857`.
5. Retarget `preset:biped:wait` and `preset:biped:walk`, bake both clips, include geometry and
   keep the walk in place. Idle and standing-relax candidates were rejected for foot sliding.
   Accepted retarget task: `020188c8-61c1-48b3-817a-f0df47fda278`.
   A later `preset:biped:run` candidate was also rejected because its lowest sole remained
   0.110 m above the bind ground. Runtime locomotion instead calibrates the accepted walk to
   its measured contact speed.
6. Inspect the exported skin offline before deployment. Twenty-four upper-torso and shoulder
   vertices retained low thigh-twist influences, at most 0.0482317284. Run
   `scripts/normalize-learner-skin-weights.mjs` to zero only those invalid cross-region weights
   and renormalize the remaining weights in the asset. This is a bounded, reproducible offline
   correction; the runtime does not sanitize or rewrite skin weights.
7. Run the dense bind/animation QA against the deployable GLB:

   ```bash
   npm run assets:qa-learner -- assets/characters/learner.glb \
     --json assets/generated/learner-v2/qa-report.json
   ```

   The accepted file has zero invalid cross-region influences, zero hard edge explosions
   across 832 animation samples, grounded wait motion and separated walking feet/knees.
8. Promote the verified file atomically to `assets/characters/learner.glb`. Keep
   `TRIPO_API_KEY` only in the shell environment; never commit API keys, upload tokens or
   signed output URLs.

The exact prompt, task chain, request parameters, source/view hashes, rejected attempts and
canonical output hash are recorded in `assets/generated/learner-v2/manifest.json`. The v1
manifest remains only as a superseded provenance record.

Official references:

- <https://developers.openai.com/api/docs/models/gpt-image-2>
- <https://platform.tripo3d.ai/docs/generate-image>
- <https://platform.tripo3d.ai/docs/generate-multiview-image>
- <https://platform.tripo3d.ai/docs/upload>
- <https://platform.tripo3d.ai/docs/generation>
- <https://platform.tripo3d.ai/docs/animation>
- <https://www.tripo3d.ai/terms>
