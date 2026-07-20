# Provenance, reuse and asset ledger

## Authorship boundary

This repository is the OpenAI Build Week implementation created with Codex, including the
renderer integration, six-stage journey state, guide behavior, OpenAI service boundary, UI,
fallbacks and tests. Majority core-functionality Codex session:
`019f7e53-4039-7cc1-9162-01906bec47b7`.

The earlier `/Users/expansioai/project/muse-infinity` project contains prior mixed-agent work.
It is not this repository's source tree, but it is intentionally the source of the product
spine and bundled digital assets. This is reuse, not research-only inspiration.

### Reused from the prior MUSE project

- The question -> companions -> curation -> world walk -> roundtable -> transformed-world
  narrative flow.
- Three pre-generated World Labs scene outputs and their thumbnails.
- Five pre-generated Tripo character GLBs and five portrait images.
- Three Art Institute of Chicago artwork images.
- Verified coordinate transforms, spawn points, world bounds and camera profiles.
- Provider request-shape knowledge for the separately gated World Labs Forge adapter.

### Newly implemented in this repository

- A clean OpenAI-only language/reasoning runtime.
- A compact `threshold -> company -> curation -> walk -> salon -> rewrite` state machine.
- The Bright Gallery SPZ as the default first-screen and route world.
- Manifest-driven loading, runtime adaptive LOD and switching among all three archived SPZs.
- Offline reduction and browser deployment of the five archived GLBs.
- Shader-deformed companion walking/gestures behind the same interface as the procedural
  fallback avatar.
- A new fictional learner designed with GPT Image 2, reconstructed and textured with Tripo
  P1, then rigged with a 52-joint biped skeleton and baked idle/walk clips.
- Deterministic anchor movement, artwork facing and dialogue correspondence gating.
- Observation-driven physical route branching.
- Selected-character Salon presence and second-world rewrite outcome.
- New security boundaries, tests and desktop/mobile E2E coverage.

No legacy application module, server module, stylesheet, MiniMax narration path, Claude model
path or configurable OpenAI-compatible LLM endpoint is included.

## Model-provider boundary

OpenAI GPT is the only language and reasoning runtime. World Labs and Tripo identify where the
pre-generated scene and character files came from; neither is used as a language model.

The server retains an isolated Forge adapter that can send an explicit spatial-generation
request to World Labs only when both `WORLDLABS_API_KEY` and `INTEGRATION_ADMIN_TOKEN` are
configured. It is not called by the judging path, never supplies reasoning text and remains
locked without credentials. There is no Tripo runtime endpoint in this repository.

## Shipped World Labs scene ledger

All deployed SPZs are regular repository files, not symlinks. The source-splat counts below
were verified from the archived source SPZ headers; deployed counts are verified by tests.

| Shipped file | Archived source name | Source -> deployed splats | Bytes | SHA-256 |
| --- | --- | ---: | ---: | --- |
| `assets/worlds/bright-gallery.spz` | `Bright Gallery Hall.spz` | 500,000 -> 500,000 | 7,706,088 | `94581444a2d4ff67efc4cc2f092972f51ac2bd2afbecfb6118dd053d6a84a499` |
| `assets/worlds/van-gogh-gallery.spz` | `Van Gogh Inspired Gallery Interior.spz` | 3,840,000 -> 500,000 | 7,833,032 | `2f3f319084f9656fd600d1c367dd16f01cbf34cdb8e235f9beb5fb91f0b6a307` |
| `assets/worlds/infinity-room.spz` | `Yellow Polka Dot Infinity Room.spz` | 1,920,000 -> 500,000 | 7,513,971 | `3d3f10d1b17d7a6988e3d9c510e19ca6aff2b617131d4dc60e83c523cd08a409` |

These are World Labs Marble outputs generated for the earlier MUSE work. The prior records
retain only the Bright Gallery world ID prefix `705b7748...`; complete World Labs world IDs,
generation prompts, account receipts and explicit redistribution records for all three files
have not been recovered. Hackathon credit access is not itself a redistribution license.

## Shipped Tripo character ledger

Each output was optimized from the corresponding full-size GLB in the prior MUSE asset
archive. The original files were approximately 58-60 MB. The shipped outputs are regular
repository files.

| Shipped file | Archived source name | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `assets/characters/monet.glb` | `Claude Monet.glb` | 1,913,284 | `63d9679b1732b57b5c48e053a5878cd6baa37250720ad1f691aa76adf0e6128c` |
| `assets/characters/van-gogh.glb` | `Vincent van Gogh.glb` | 1,943,768 | `fa3587b770321f1b4cc1da52db028d459a2d82990cc9cbd61203fb455eebb50e` |
| `assets/characters/socrates.glb` | `Socrates.glb` | 2,110,500 | `dc914545447986289efb6e3cdd818efdb4e4b8a9e69db36a72c745ec35789682` |
| `assets/characters/frida.glb` | `Frida Kahlo.glb` | 2,128,676 | `c95ff3d82acdda5c324f2beff10031e749aa46c836822adb0620ce3808d24002` |
| `assets/characters/picasso.glb` | `Pablo Picasso.glb` | 1,903,588 | `1de8cf1f73004181a14f79af21e74ced43934f110f814b0e2873d2e17132f8fb` |

The prior MUSE project identifies these files as Tripo-generated interpretive characters.
The original Tripo task IDs, model IDs, exact generation settings and explicit redistribution
records have not been recovered. The figures are interpretations, not authentic likeness
reconstructions or endorsements by the named people.

## Newly generated learner ledger

The learner is new work for this repository, not an inherited `muse-infinity` asset. A single
identity-consistent turnaround was generated through Tripo's `generate_image` task with
`model_version: gpt_image_2`, cropped into `front`, character-left, `back`, character-right,
and passed to Tripo's multiview P1 pipeline. Rig v2.5 produced a 52-joint biped skin; retargeting
baked `preset:idle` and `preset:walk` into the shipped GLB.

| Shipped file | Bytes | Triangles | SHA-256 |
| --- | ---: | ---: | --- |
| `assets/characters/learner.glb` | 6,636,988 | 18,269 | `3d1dd1967ce41ebb1079a200345b2fdb0089513143a178b1d3d11a4eb5f81f5b` |

Generation task IDs, exact model versions, request parameters, prompt, view hashes and the
source sheet hash are retained in `assets/generated/learner-v1/manifest.json`. The human is an
original fictional character and is not intended to reproduce a real person's likeness. The
pipeline is documented in `docs/CHARACTER_PIPELINE.md`; no generation credential or runtime
Tripo route is shipped. The final retargeted GLB contains 126 upper/lateral vertices with a
lower-leg influence above 2%; `LearnerAvatar` removes and renormalizes only those weights at
load to prevent stretched geometry during the baked clips.

## Portrait ledger

The five portraits are direct copies from the prior `muse-infinity` museum asset set.

| Shipped file | Bytes | SHA-256 | Prior source record |
| --- | ---: | --- | --- |
| `assets/portraits/monet.jpg` | 273,567 | `0b86b2d30be83cfe6a17e8bd0293628676409696665017ad67abce83dd3fbb65` | [Monet self-portrait reproduction](https://commons.wikimedia.org/wiki/File:Autoportret_Claude_Monet.jpg) |
| `assets/portraits/van-gogh.jpg` | 235,512 | `395005107ab6f908346f60e137b8d8c6c7d5a9cad029b0c2b50aff095fe68499` | [Van Gogh self-portrait reproduction](https://commons.wikimedia.org/wiki/File:Van_Gogh_self_portrait_1889.jpg) |
| `assets/portraits/socrates.jpg` | 2,196,932 | `57e89af7a476787b96e54ab6548ec4c2abdbcad5107451fa1e64326fe7543ae1` | [Classical Socrates bust photograph](https://commons.wikimedia.org/wiki/File:Bust_Socrates_Musei_Capitolini_MC1163.jpg), not a true-life portrait |
| `assets/portraits/frida.jpg` | 1,156,272 | `5e867b395b4871caa8e6b0371f5cddd17364598e83595d6b5967741ad9252d8a` | [Portrait attributed to Guillermo Kahlo](https://commons.wikimedia.org/wiki/File:Frida_Kahlo,_by_Guillermo_Kahlo.jpg) |
| `assets/portraits/picasso.jpg` | 193,854 | `c045320141c4297e1e45509da5a7560c6020f2fffb218a4f5f85bfbf809132ed` | [1908 Picasso portrait photograph](https://commons.wikimedia.org/wiki/File:Portrait_de_Picasso,_1908.jpg) |

The prior manifest marked these records public domain. Downstream redistributors should verify
the current file-page status and jurisdiction-specific terms instead of relying only on that
legacy label.

## Scene thumbnail ledger

| Shipped file | Bytes | SHA-256 |
| --- | ---: | --- |
| `assets/thumbs/bright-gallery.jpg` | 44,607 | `e9393b71eb6040e9068ca11e775b09a2c7a39f57f4284b3d851957aeaa56ac29` |
| `assets/thumbs/van-gogh-gallery.jpg` | 187,427 | `f61723663686e953e5a4d9c611375321320287722a67a269dee16692f3a282a8` |
| `assets/thumbs/infinity-room.jpg` | 232,248 | `08b6f119380142810f94902474be5bc747ad35eeb125e84ff8279f47f079cbb1` |

These thumbnails came from the same prior MUSE World Labs asset set. Their independent
generation/export records were not retained.

## Open-access artwork ledger

| Shipped file | Source | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `assets/art/water-lilies.jpg` | [Art Institute of Chicago, Water Lilies](https://www.artic.edu/artworks/16568/water-lilies) | 278,626 | `06367197ac8d6745537dcfe6722ff4b8ef2cb33e044168d8c471782b55f7dd39` |
| `assets/art/bedroom.jpg` | [Art Institute of Chicago, The Bedroom](https://www.artic.edu/artworks/28560/the-bedroom) | 235,077 | `cb5839d854aa1a092801939b8d732fa653f22a1c87fdbbd7248c9882250ce400` |
| `assets/art/grande-jatte.jpg` | [Art Institute of Chicago, A Sunday on La Grande Jatte](https://www.artic.edu/artworks/27992/a-sunday-on-la-grande-jatte-1884) | 197,727 | `90197c037e6041fcae1c35606b921b5b626d868c2ff21cd653edb640b3f6e2dd` |

The prior MUSE records identify all three as public-domain artwork images obtained through the
Art Institute of Chicago Open Access / IIIF program.

## Reproducible scene reduction

Bright Gallery is the existing 500,000-splat web export and was copied without reduction.
The other two deployable scenes were produced with the repository script:

```bash
npm run assets:downsample-spz -- \
  "/path/to/Van Gogh Inspired Gallery Interior.spz" \
  assets/worlds/van-gogh-gallery.spz 500000

npm run assets:downsample-spz -- \
  "/path/to/Yellow Polka Dot Infinity Room.spz" \
  assets/worlds/infinity-room.spz 500000
```

`scripts/downsample-spz.mjs` selects deterministic evenly spaced source indices. It scales
the retained Gaussian axes by `sqrt(sourceSplats / outputSplats)` to compensate projected
area and then writes a non-LOD SPZ. Runtime Spark LOD, rather than destructive per-frame
editing, targets approximately 130,000 visible splats on desktop and 80,000 on mobile.

Archived source hashes used for traceability:

| Source file | Bytes | SHA-256 |
| --- | ---: | --- |
| `Bright Gallery Hall.spz` | 7,706,088 | `94581444a2d4ff67efc4cc2f092972f51ac2bd2afbecfb6118dd053d6a84a499` |
| `Van Gogh Inspired Gallery Interior.spz` | 55,647,647 | `99f8eb8b1c1f4ed8f144e7cd1d7b2c76976c4ff6996b35e8927f351c7885db56` |
| `Yellow Polka Dot Infinity Room.spz` | 26,658,000 | `12a78875262d4cdb4989dd852d860a9994ad9b7637076bfcdea23444224189a3` |

## Reproducible character optimization

A temporary `@gltf-transform/cli` installation was used offline; it is not a runtime or
package dependency. The same options were applied to each archived GLB:

```bash
npx --yes @gltf-transform/cli optimize "$INPUT" "$OUTPUT" \
  --compress quantize \
  --simplify-ratio 0.045 \
  --simplify-error 0.02 \
  --texture-size 1024 \
  --texture-compress auto
```

Input/output mapping:

```text
Claude Monet.glb      -> assets/characters/monet.glb
Vincent van Gogh.glb -> assets/characters/van-gogh.glb
Socrates.glb          -> assets/characters/socrates.glb
Frida Kahlo.glb       -> assets/characters/frida.glb
Pablo Picasso.glb     -> assets/characters/picasso.glb
```

The five optimized GLBs each contain one node, one mesh, zero skins and zero animation clips.
The browser does not reconstruct missing bones. `ArchivedAvatar` applies approximate
shader-region rotations and root motion for gait and gestures; it is not skeletal animation.

## Coordinate and navigation notes

The deployed transforms are:

```text
Bright Gallery: scale 0.80177665, rotation Rx(pi), translation.y 0.5
Van Gogh Gallery: scale 1.7, no X rotation, translation.y 0
Infinity Dot Room: scale 2.0, no X rotation, translation.y 0
```

Route anchors, artwork positions, spawn points and rectangular walk bounds come from the
central legacy-asset manifest. The current build does not ship the old collider files and
does not implement navmesh pathfinding, collider grounding, obstacle avoidance or lip sync.

## Rights and remaining records

- Source code and documentation authored for this repository are MIT licensed.
- The MIT grant does not relicense World Labs outputs, Tripo outputs, portraits, thumbnails or
  museum files. Those remain subject to their source terms.
- Full World Labs IDs exist only for Bright Gallery as a prefix; the other world IDs are
  missing.
- Task IDs and exact settings are missing for the five inherited companion GLBs. The new
  learner records both.
- Explicit provider output redistribution records were not recovered.
- No claim is made that the historical figures authored, endorsed or spoke the generated
  perspectives.

Anyone redistributing the generated assets outside this hackathon repository should first
recover the provider account records and confirm the applicable output terms.
