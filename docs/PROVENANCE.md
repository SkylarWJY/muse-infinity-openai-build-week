# Provenance, reuse and asset ledger

## Authorship boundary

This repository is the OpenAI Build Week implementation created with Codex: the OpenAI-only
service boundary, ten-beat state machine, 8+1 manifest, high-fidelity loaders, collider
grounding, all-selected-companion movement, free-form grounded observations, two-phase GPT
concept transformation, UI, fallbacks, static Range serving and tests. Majority
core-functionality Codex session:
`019f7e53-4039-7cc1-9162-01906bec47b7`.

The earlier local `/Users/expansioai/project/muse-infinity` project contains prior
mixed-agent work. It is not this repository's source tree, but it is intentionally the source
of the product concept and bundled digital assets. This is reuse, not research-only
inspiration.

### Reused from `muse-infinity`

- The ten narrative beats: threshold, life question, companion selection, AI curation,
  eight-world exploration, summoning, roundtable, decision, transformation and manifesto.
- Eight ordered process worlds and the separately gated Shimmering Spheres answer world.
- Seven primary SPZs, the scene-8 SPZ fallback, two primary texture meshes, nine collider
  GLBs, native transforms, spawns, bounds, yaw and camera profiles.
- Nine interpretive scene images and canonical world thumbnails.
- Eight Tripo-generated historical-character interpretations and eight portraits.
- Three retained Art Institute of Chicago open-access artwork images.
- Provider request-shape knowledge for the separately gated World Labs Forge adapter.

### Newly implemented in this repository

- A clean GPT-5.6-only language/reasoning runtime with no alternate LLM host.
- The strict ten-beat state machine and independent `EXHIBITION_SPINE` / `FINAL_SCENE`
  boundary.
- Eight-stop lesson validation and a final-concept contract that require the exact ordered
  scene IDs and exactly the selected companion perspectives.
- A gated free-form observation input that records visitor language without changing the
  inherited route.
- Runtime follow formations for the complete selected company and duplicate-free Roundtable
  staging. The deployed character files remain static-mesh interpretations; movement is
  runtime behavior.
- A provisional Roundtable GPT-5.6 strict schema plus a second decision-triggered transformed
  schema locked to the chosen `perception`, `emotion` or `invention` axis.
- Quality RAD hierarchies built from the original-source SPZs in place of canonical 500K
  reductions or browser-time LOD construction.
- Geometry-preserving, 8192 x 8192 JPEG repacking for the two GitHub-sized texture meshes.
- High/balanced/performance renderer tiers, DPR restoration, `NoToneMapping`, archive race
  disposal, collider height sampling and byte-range static responses.
- Shader-deformed companion movement and correspondence-gated dialogue.
- A new fictional learner designed with GPT Image 2, reconstructed with Tripo v3.1, rigged
  with a semantic 41-joint biped skeleton and shipped with baked wait/walk clips.
- New security boundaries, tests and desktop/mobile E2E coverage.

No legacy application module, server module, stylesheet, MiniMax narration path, Claude model
path or configurable OpenAI-compatible LLM endpoint is included.

## Provider boundary

OpenAI GPT is the only language and reasoning runtime. World Labs and Tripo identify where
pre-generated scene and character files came from; neither is used as a language model.

The server retains an isolated Forge adapter that can send an explicit spatial-generation
request to World Labs only when both `WORLDLABS_API_KEY` and `INTEGRATION_ADMIN_TOKEN` are
configured. It is not called by the canonical path, never supplies reasoning text and remains
locked without credentials. There is no Tripo runtime endpoint in the judging path.

The ninth-world distinction is material to provenance. On the configured live path, the
Roundtable first asks GPT-5.6 for a provisional concept; the visitor's chosen contradiction
then triggers a second GPT-5.6 Responses API strict-schema request that is instructed to
materially rewrite `world_title`, `synthesis`, `principle` and `visual_prompt` and is validated
against that axis. No-key mode applies an axis-specific curated replacement under the same
contract. The loaded Fantasy Realm of Shimmering Spheres mesh was generated before Build Week
and reused from `muse-infinity`; neither concept request generates new geometry.

## Canonical World Labs archive ledger

All deployed files are regular repository files, not symlinks. Counts for scenes 1-7 were
read from their archived SPZ source headers. Those full-detail inputs remain part of the
disclosed `muse-infinity` source record; the public runtime ships official Spark quality RAD
derivatives so it can page the hierarchy instead of blocking on browser-time Bhatt LOD.

### Source-detail inputs for scenes 1-7

| # | Archived SPZ source name | Detail | Source bytes | Source SHA-256 |
| ---: | --- | ---: | ---: | --- |
| 1 | `Grand Conservatory with Lush Gardens.spz` | 4,320,000 splats | 64,296,322 | `17f00f8855796eff69a47f543caa0920ac1049f8ca1bdbeb5574d9db1545456b` |
| 2 | `Elegant Floral Palace Interior.spz` | 4,320,000 splats | 64,592,504 | `0acf9e9859633df1b9ad1062d9e057aa34dc33f4d3b89c094df34290417a01ef` |
| 3 | `Enchanted Water Garden Sanctuary.spz` | 4,320,000 splats | 64,819,491 | `43cba66b1e6589b230204466649e7502d270aeab6bb8ae2e62c08ae3fca099cf` |
| 4 | `Dreamlike Coastal Villa Gardens.spz` | 2,400,000 splats | 35,937,135 | `6c3d3e298dfc318c944127df1ad69089187e5bfb6d433dfed2ab199dd5009a11` |
| 5 | `Van Gogh Inspired Gallery Interior.spz` | 3,840,000 splats | 55,647,647 | `99f8eb8b1c1f4ed8f144e7cd1d7b2c76976c4ff6996b35e8927f351c7885db56` |
| 6 | `Sunlit Palace Gardens.spz` | 4,320,000 splats | 65,191,251 | `69d04aba292b07ed19fbba667028815d23402b12899b66b59cd1039e24e22574` |
| 7 | `Mexican Courtyard Bedroom Fantasy.spz` | 4,320,000 splats | 64,030,640 | `7e9eddc6197a238a4183f181b09ff0a16167e16e1662543160cd4c7bdbf3b34a` |

### Deployed primary archives

| # | Deployed file | Derivation/detail | Bytes | SHA-256 |
| ---: | --- | --- | ---: | --- |
| 1 | `assets/worlds/grand-conservatory.rad` | Quality RAD from source #1 | 87,503,680 | `a31c62b6d60a033e2663d62938717bc7f7cb302117c108c2c1092c6b6ea0b244` |
| 2 | `assets/worlds/elegant-floral-palace.rad` | Quality RAD from source #2 | 93,239,352 | `f1b58f3d3d42e703509e1b2251cbf14fdf49048c47ec6bada9fe1263de999ba` |
| 3 | `assets/worlds/enchanted-water-garden.rad` | Quality RAD from source #3 | 94,219,328 | `f075b1bab451ff31ea915117caddfa8a412080cb92d2f2a6ecbd634ffbc2b18f` |
| 4 | `assets/worlds/dreamlike-coastal-villa.rad` | Quality RAD from source #4 | 49,590,912 | `c438cae551f7634e66dcc2c727383b2747bbfd8e262b522adae30569ba0890cc` |
| 5 | `assets/worlds/van-gogh-gallery-hd.rad` | Quality RAD from source #5 | 86,051,136 | `fb43e3430d3a529d2d80d34732bd91313a9ab986356896f0fb7a74e577304e78` |
| 6 | `assets/worlds/sunlit-palace-gardens.rad` | Quality RAD from source #6 | 96,949,128 | `3964c0bd9d7c1559c171e0a767b58487d103237b7b5bc6e2d12715cb48e33dd9` |
| 7 | `assets/worlds/mexican-courtyard.rad` | Quality RAD from source #7 | 95,765,920 | `476dddbca6ea07a36830a7d871fee4793cd0e7e29849434675a02ecb2eeac02a` |
| 8 | `assets/worlds/yellow-infinity-room-texture-mesh.glb` | 598,495 triangles; 8K texture | 73,136,900 | `cf1757021b4cd1432ce642d70288fbe258ed03aa53b3949741c9634cddc5ebdc` |
| 8 fallback | `assets/worlds/yellow-infinity-room.spz` | Byte-identical 1,920,000-splat source | 26,658,000 | `12a78875262d4cdb4989dd852d860a9994ad9b7637076bfcdea23444224189a3` |
| 9 | `assets/worlds/fantasy-shimmering-spheres-texture-mesh.glb` | 593,231 triangles; 8K texture | 93,404,352 | `6fbb5d0dc3b81f17efae18c14d8c72ed421195707e354d09bd91f71451927577` |

The scene 1-7 RAD files were reproduced with Spark 2.1.0's official `rust/build-lod`
utility. For each archived source:

```bash
build-lod --quality --rad "/path/to/Archived World.spz"
```

Scene 8 prefers the texture mesh and uses its byte-identical SPZ only if the mesh cannot
initialize. Scene 9 has no deployed SPZ and no source-splat count; it is an indexed unlit
texture mesh.

### Collider files

| # | Deployed file | Bytes | SHA-256 |
| ---: | --- | ---: | --- |
| 1 | `assets/worlds/grand-conservatory-collider.glb` | 4,971,680 | `ca791f87ea8a9d584db4e7a6b1e5e347e0601816258fad0de2ff50c1893a207d` |
| 2 | `assets/worlds/elegant-floral-palace-collider.glb` | 9,467,860 | `76dd1ceb7bee89c96632c1861e52e40149d12db9153c8729d7953a20f0ed4f6f` |
| 3 | `assets/worlds/enchanted-water-garden-collider.glb` | 2,371,536 | `dddc2d582ce1246124587a300781f73247fd97c1e7e8d1b950f690b60332873e` |
| 4 | `assets/worlds/dreamlike-coastal-villa-collider.glb` | 1,675,028 | `e77ea0119d45b83d47daf5dda6d839881608b4d0ae6b78d3b70da0fe8c02d37a` |
| 5 | `assets/worlds/van-gogh-gallery-hd-collider.glb` | 2,240,600 | `1ed8dfed73869a1976acc3b6ef20d647f3ff4013d7854f9b1cb0d70fb69fa673` |
| 6 | `assets/worlds/sunlit-palace-gardens-collider.glb` | 3,364,728 | `76484d1473e5ed9dffd35e7649ee1aaebc0d2e88d25c500cceae621bcb2b1bc3` |
| 7 | `assets/worlds/mexican-courtyard-collider.glb` | 4,957,180 | `b4b903950934f2c1bfd7221ed8dc33afcf51146d24c8feda2fceb1ec8f59d23b` |
| 8 | `assets/worlds/yellow-infinity-room-collider.glb` | 2,007,592 | `992f642a8e7f916b03e8e0056f48bfa4db9a3eb7fee4fdcb1ee7125c4e729c3f` |
| 9 | `assets/worlds/fantasy-shimmering-spheres-collider.glb` | 1,456,868 | `de55cb326873edea64f3850b920943dcfd4b39ff1e127e88e9ff6613dff99515` |

Colliders are inherited geometry used invisibly for downward height raycasts. Their presence
does not imply navmesh pathfinding, obstacle avoidance or physics simulation.

## Geometry-preserving 8K mesh repack

The archived scene-8 and scene-9 GLBs exceeded GitHub's 100 MB per-file limit because they
embedded lossless PNG textures. `scripts/repack-world-mesh.mjs` parses the GLB container,
extracts the PNG, uses macOS `sips` to encode JPEG quality 88, updates the image MIME type and
buffer offsets, and rebuilds the GLB. It does not decimate the mesh or resize the texture.

| Scene | Archived GLB bytes / SHA-256 | Original embedded PNG | Deployed embedded JPEG | Deployed GLB bytes / SHA-256 |
| --- | --- | ---: | ---: | --- |
| 8 | 96,625,264 / `3e310663b5dae8d9e8b7d7360b163009c9c0343fe7246409e97b2f01e0a8f342` | 32,007,568 bytes, 8192 x 8192 | 8,519,204 bytes, 8192 x 8192 | 73,136,900 / `cf1757021b4cd1432ce642d70288fbe258ed03aa53b3949741c9634cddc5ebdc` |
| 9 | 181,220,104 / `00f12e181568183d2d8e97e141fa86d10ecd2834051c89cae93864acacb1e761` | 117,163,400 bytes, 8192 x 8192 | 29,347,648 bytes, 8192 x 8192 | 93,404,352 / `6fbb5d0dc3b81f17efae18c14d8c72ed421195707e354d09bd91f71451927577` |

Reproduction:

```bash
node scripts/repack-world-mesh.mjs \
  "/path/to/Yellow Polka Dot Infinity Room_texture_mesh.glb" \
  assets/worlds/yellow-infinity-room-texture-mesh.glb 88

node scripts/repack-world-mesh.mjs \
  "/path/to/Fantasy Realm of Shimmering Spheres_texture_mesh.glb" \
  assets/worlds/fantasy-shimmering-spheres-texture-mesh.glb 88
```

## Runtime quality and delivery record

The default desktop path uses DPR 2, paged RAD, float32 extended-splat centers, a
2,500,000-splat target, `lodRenderScale: 1`, `lodScale: 2` and `NoToneMapping`. Default
mobile uses DPR 1.5 and a 750,000-splat target with the same render/LOD scales. Lower explicit
quality tiers change the runtime budget, not the deployed archive.

The server supports single HTTP byte ranges for all static assets and returns
`Accept-Ranges`, `Content-Range`, exact `Content-Length`, ETags and immutable cache headers.
RAD rendering uses those byte ranges for view-dependent chunks. GLB Range support remains a
delivery capability and is not a claim that a browser progressively decodes partial GLBs.

### Noncanonical compatibility files

These older assets remain in the repository for traceability/compatibility but are not
referenced by the canonical 8+1 spine or default route:

| File | Detail | Bytes | SHA-256 |
| --- | ---: | ---: | --- |
| `assets/worlds/bright-gallery.spz` | 500,000 splats | 7,706,088 | `94581444a2d4ff67efc4cc2f092972f51ac2bd2afbecfb6118dd053d6a84a499` |
| `assets/worlds/van-gogh-gallery.spz` | old 500,000-splat derivative | 7,833,032 | `2f3f319084f9656fd600d1c367dd16f01cbf34cdb8e235f9beb5fb91f0b6a307` |
| `assets/worlds/infinity-room.spz` | old 500,000-splat derivative | 7,513,971 | `3d3f10d1b17d7a6988e3d9c510e19ca6aff2b617131d4dc60e83c523cd08a409` |

Bright Gallery is explicitly not scene 1, a process world or the answer world.

## Inherited Tripo companion ledger

The eight deployed historical-character GLBs are browser-optimized copies of the
corresponding full-size files in the prior MUSE archive. The prior project identifies the
originals as Tripo outputs. Complete original task IDs, model IDs, prompts, source images,
settings and output redistribution records have not been recovered.

| Companion | Archived source / bytes | Deployed file / bytes | SHA-256 |
| --- | --- | --- | --- |
| Claude Monet | `Claude Monet.glb` / 58,074,880 | `assets/characters/monet.glb` / 1,913,284 | `63d9679b1732b57b5c48e053a5878cd6baa37250720ad1f691aa76adf0e6128c` |
| Vincent van Gogh | `Vincent van Gogh.glb` / 57,941,540 | `assets/characters/van-gogh.glb` / 1,943,768 | `fa3587b770321f1b4cc1da52db028d459a2d82990cc9cbd61203fb455eebb50e` |
| Socrates | `Socrates.glb` / 58,177,896 | `assets/characters/socrates.glb` / 2,110,500 | `dc914545447986289efb6e3cdd818efdb4e4b8a9e69db36a72c745ec35789682` |
| Frida Kahlo | `Frida Kahlo.glb` / 59,546,716 | `assets/characters/frida.glb` / 2,128,676 | `c95ff3d82acdda5c324f2beff10031e749aa46c836822adb0620ce3808d24002` |
| Pablo Picasso | `Pablo Picasso.glb` / 57,641,432 | `assets/characters/picasso.glb` / 1,903,588 | `1de8cf1f73004181a14f79af21e74ced43934f110f814b0e2873d2e17132f8fb` |
| Sigmund Freud | `Sigmund Freud.glb` / 58,255,452 | `assets/characters/freud.glb` / 1,999,648 | `6d179dc147b41fce50a1cba8627b4e49bdfa968eff49067e3a20ff3e9fddca43` |
| Qi Baishi | `Qi Baishi.glb` / 57,222,412 | `assets/characters/qi-baishi.glb` / 2,022,872 | `88796f75654bb222fd682184e4783b1e4ef8308b61a73e04ddbad2b7b951d1cb` |
| Yayoi Kusama | `Yayoi Kusama.glb` / 57,709,916 | `assets/characters/yayoi-kusama.glb` / 1,873,088 | `0fbe17989daf580303b04025570957ad3aa830423aeb901fc6397acee73dee00` |

The browser optimization can be reproduced with the same offline CLI shape; this records the
deployment transformation, not the original Tripo generation:

```bash
npx --yes @gltf-transform/cli optimize "$INPUT" "$OUTPUT" \
  --compress quantize \
  --simplify-ratio 0.045 \
  --simplify-error 0.02 \
  --texture-size 1024 \
  --texture-compress auto
```

The temporary CLI version was not pinned in the prior deployment record, so the command
documents the transformation parameters but does not guarantee byte-identical output from a
future package version.

The deployed companion files contain static meshes rather than inherited skins or animation
clips. Runtime motion is a Build Week addition: approximate shader-region deformation and
root translation make the first selected companion guide and up to two other selected
companions follow in formation, with collider-derived ground height. Roundtable staging uses
the same selected roster. The figures are AI interpretations, not authentic likeness
reconstructions or endorsements by the named people.

## Portrait ledger

| Companion | Deployed file | Bytes | SHA-256 | Prior source record |
| --- | --- | ---: | --- | --- |
| Claude Monet | `assets/portraits/monet.jpg` | 273,567 | `0b86b2d30be83cfe6a17e8bd0293628676409696665017ad67abce83dd3fbb65` | [Monet self-portrait reproduction](https://commons.wikimedia.org/wiki/File:Autoportret_Claude_Monet.jpg) |
| Vincent van Gogh | `assets/portraits/van-gogh.jpg` | 235,512 | `395005107ab6f908346f60e137b8d8c6c7d5a9cad029b0c2b50aff095fe68499` | [Van Gogh self-portrait reproduction](https://commons.wikimedia.org/wiki/File:Van_Gogh_self_portrait_1889.jpg) |
| Socrates | `assets/portraits/socrates.jpg` | 2,196,932 | `57e89af7a476787b96e54ab6548ec4c2abdbcad5107451fa1e64326fe7543ae1` | [Classical Socrates bust photograph](https://commons.wikimedia.org/wiki/File:Bust_Socrates_Musei_Capitolini_MC1163.jpg); not a true-life portrait |
| Frida Kahlo | `assets/portraits/frida.jpg` | 1,156,272 | `5e867b395b4871caa8e6b0371f5cddd17364598e83595d6b5967741ad9252d8a` | [Portrait attributed to Guillermo Kahlo](https://commons.wikimedia.org/wiki/File:Frida_Kahlo,_by_Guillermo_Kahlo.jpg) |
| Pablo Picasso | `assets/portraits/picasso.jpg` | 193,854 | `c045320141c4297e1e45509da5a7560c6020f2fffb218a4f5f85bfbf809132ed` | [1908 Picasso portrait photograph](https://commons.wikimedia.org/wiki/File:Portrait_de_Picasso,_1908.jpg) |
| Sigmund Freud | `assets/portraits/freud.jpg` | 268,788 | `074a72ff0d7b6e2863fad83744703e87e84653640693df0ca28f41d93b357c03` | Browser JPEG from prior archive `Sigmund Freud.png`; upstream URL/rights record not recovered |
| Qi Baishi | `assets/portraits/qi-baishi.jpg` | 284,627 | `6791eddd834dbb0d6074b624e413fcf09bdb387c240834653204c5a74512eb34` | Browser JPEG from prior archive `Qi Baishi.png`; upstream URL/rights record not recovered |
| Yayoi Kusama | `assets/portraits/yayoi-kusama.jpg` | 359,487 | `a4b6a84e8edf295ebb95982389cf1886eba95fbc146823d81055a61ded0eca20` | Browser JPEG from prior archive `Yayoi Kusama.png`; upstream URL/rights record not recovered |

The previous manifest labeled the five linked source records public domain. Downstream users
must verify each current source page, file version and jurisdiction. No rights conclusion is
made for the three archive-only portrait records.

## Newly generated learner ledger

The learner is new work for this repository. Tripo's `generate_image` task invoked
`model_version: gpt_image_2` for the accepted strict T-pose source. A separate Tripo
multiview-image task generated consistent front, character-left, back and character-right
views. Those views drove a detailed `v3.1-20260211` reconstruction. The selected legacy biped
rig has 41 semantic joints; retargeting baked `preset:biped:wait` and
`preset:biped:walk` into the shipped GLB.

| File | Bytes | Detail | SHA-256 |
| --- | ---: | --- | --- |
| `assets/generated/learner-v2/source/learner-front-gpt-image-2.png` | 324,558 | 1024 x 1024 GPT Image 2 source | `e4518e5aa1feeb988c9567d3a7ec07b1720609bcb1d16ba9034c1828d7e5548e` |
| `assets/generated/learner-v2/turnaround/front.png` | 95,806 | 1024 x 1024 front | `cb34d45d2d026f1a704919dcde5d380c40fdef5178f911d75e2fec10962c6168` |
| `assets/generated/learner-v2/turnaround/left.png` | 81,993 | 1024 x 1024 character-left | `fad148cae70c3d73f05033067fc194b6aa0de5389c6fc4d6a311d191997930ea` |
| `assets/generated/learner-v2/turnaround/back.png` | 101,098 | 1024 x 1024 back | `79ea239c7b91394c4b9725f446e972450df7d7e41fd21a7523cfe60129975b45` |
| `assets/generated/learner-v2/turnaround/right.png` | 79,474 | 1024 x 1024 character-right | `f12b3bc67fb99349f19ba93bbd7f904f00f8fb62732b3628ebf9cf40a4812169` |
| `assets/characters/learner.glb` | 5,009,688 | 21,672 vertices; 37,659 triangles; 41 joints | `970134d492d1186dc551e60642cc24778254557571b52b1601423b5cd8965f15` |

The retargeted export left low leg-twist influences on 24 upper-torso and shoulder vertices.
Those influences alone were removed with the checked-in normalizer and the remaining weights
renormalized offline before the asset was promoted. The deployed runtime performs no
skin-weight sanitizer. Dense QA reports zero invalid cross-region weights and zero hard edge
explosions across 832 animation samples.

The exact prompt, task IDs, request parameters, source/view hashes, rejected attempts and
output hash are in `assets/generated/learner-v2/manifest.json`; production and QA notes are in
`docs/CHARACTER_PIPELINE.md`. The superseded v1 chain remains recorded in
`assets/generated/learner-v1/manifest.json`. The learner is a fictional character, not a
real-person likeness.

## Inherited scene-image ledger

These nine PNGs are interpretive concept/evidence images copied from the prior project. They
are not historical artworks and must not be represented as World Labs exports. Complete
image-generation model/task records were not retained.

| # | File | Bytes | SHA-256 |
| ---: | --- | ---: | --- |
| 1 | `assets/scenes/01-entrance-conservatory.png` | 2,960,894 | `ba4b1d22ee27a93ff52c99ec4f615d0ef72a7a9d36184bd74efb097e524e5bcf` |
| 2 | `assets/scenes/02-court-of-light.png` | 2,493,055 | `493aee41eae51c3a1c8afcc0d0438f75442be14efc9868b6d303967848c8bd49` |
| 3 | `assets/scenes/03-monet-water-and-light.png` | 2,807,119 | `f9dd9170e3705d107171df3f7f1bcfce1de73db372c10b7a1d50ffbb7583b3a7` |
| 4 | `assets/scenes/04-sunset-frame-gallery.png` | 2,716,336 | `f82f1843a35971b5af9cecbea7a6e912749d47f65c43d3fbe4f30e46c07518d0` |
| 5 | `assets/scenes/05-van-gogh-burning-sky.png` | 3,156,190 | `14e811514f2c8fe3f54ada0bf97cc14a323ba1193fd5ea8cf4c23f3a420709a9` |
| 6 | `assets/scenes/06-petal-transition-hall.png` | 2,643,163 | `958505b4c1cad14ce353da19a800ab3c857f8e1d62446599ae589601591f400c` |
| 7 | `assets/scenes/07-frida-living-memory.png` | 3,029,670 | `da520bf9c8689f26aba6b735b81f1de026b702efc0070ed6f45ae29fd910a375` |
| 8 | `assets/scenes/08-kusama-infinite-dots.png` | 2,118,045 | `6cda834ccda254d0342e1404ab6f1f8a6bc273c36619c53dd614d3b64c9b10d5` |
| 9 | `assets/scenes/09-final-dream-world.png` | 3,238,383 | `03e655afc6077ed3e2a2e605214737d6060b9b4882cff80d50cfe02a19b9dc6b` |

### Canonical world thumbnails

| World | File | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| Grand Conservatory | `assets/thumbs/grand-conservatory-with-lush-gardens.jpg` | 189,356 | `5bdece0a176ba989517df7f3d3defa39c54e3f5e728270adda70c4836fd542a0` |
| Elegant Floral Palace | `assets/thumbs/elegant-floral-palace-interior.jpg` | 162,324 | `572f6a04d5359f4d72586663d289c0c872ffcc31f51f83b74346817250022d5c` |
| Enchanted Water Garden | `assets/thumbs/enchanted-water-garden-sanctuary.jpg` | 176,876 | `f8127573abde595d36635a0b997c2171413e6af7347544f15eddc43087626d6f` |
| Dreamlike Coastal Villa | `assets/thumbs/dreamlike-coastal-villa-gardens.jpg` | 170,736 | `727518d6ce4e6dd01ab9c42229f227805a22eac1f5f3a3b890f0ec6617f7a366` |
| Van Gogh Gallery | `assets/thumbs/van-gogh-inspired-gallery-interior.jpg` | 187,427 | `f61723663686e953e5a4d9c611375321320287722a67a269dee16692f3a282a8` |
| Sunlit Palace Gardens | `assets/thumbs/sunlit-palace-gardens.jpg` | 152,729 | `49ef4730b2ad9acafe79502705a57e86912c64c00765e07736fd0545ea600e38` |
| Mexican Courtyard | `assets/thumbs/mexican-courtyard-bedroom-fantasy.jpg` | 201,320 | `b70930bd2efc8effe806a0283c8d1ff1f9945c1a5f87dc74dc0694486068d04e` |
| Yellow Infinity Room | `assets/thumbs/yellow-polka-dot-infinity-room.jpg` | 232,248 | `08b6f119380142810f94902474be5bc747ad35eeb125e84ff8279f47f079cbb1` |
| Shimmering Spheres | `assets/thumbs/fantasy-realm-of-shimmering-spheres.jpg` | 220,568 | `19eadff44b31fac8e51ea0016aeefd0c17ba03e73b40ede65fe9244f343902c9` |

Thumbnail generation/export records are incomplete.

## Retained open-access artwork ledger

| File | Source | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `assets/art/water-lilies.jpg` | [Art Institute of Chicago, Water Lilies](https://www.artic.edu/artworks/16568/water-lilies) | 278,626 | `06367197ac8d6745537dcfe6722ff4b8ef2cb33e044168d8c471782b55f7dd39` |
| `assets/art/bedroom.jpg` | [Art Institute of Chicago, The Bedroom](https://www.artic.edu/artworks/28560/the-bedroom) | 235,077 | `cb5839d854aa1a092801939b8d732fa653f22a1c87fdbbd7248c9882250ce400` |
| `assets/art/grande-jatte.jpg` | [Art Institute of Chicago, A Sunday on La Grande Jatte](https://www.artic.edu/artworks/27992/a-sunday-on-la-grande-jatte-1884) | 197,727 | `90197c037e6041fcae1c35606b921b5b626d868c2ff21cd653edb640b3f6e2dd` |

The prior MUSE records identify these as public-domain images obtained through the Art
Institute's Open Access / IIIF program. Users should still verify the current object record
and API terms.

## Coordinate and navigation record

The canonical web-export SPZ worlds are y-up and keep their native frame; there is no blanket
`Rx(pi)` correction. World scales are 1.7 for scenes 1-7, 2.0 for scene 8 and 1.8 for scene
9. Each manifest profile retains its source spawn, ground height, bounds, yaw and camera far
range before this declared scale is applied.

`src/config/legacyAssets.js` is the executable record. `src/config/exhibitionSpine.js` is the
ordered narrative/asset record. The runtime loads the matching inherited collider and uses it
for ground height; route order and movement bounds remain deterministic.

## World Labs records and rights status

The earlier MUSE repository and asset archive identify the canonical spaces as World Labs
Marble outputs. However, the evidence package is incomplete:

- no complete World Labs world ID has been recovered for the canonical nine worlds;
- the prior repository preserves only a `705b7748...` prefix for Bright Gallery, which is not
  part of the canonical spine;
- complete generation prompts, source images, operation logs, account receipts and export
  timestamps have not been recovered for every world;
- explicit World Labs output redistribution records for these bundled exports have not been
  recovered;
- hackathon coupons, credits or account access do not by themselves establish redistribution
  permission.

The repository therefore records inherited provenance without claiming more rights than the
available files and comments support.

## Rights and unresolved records

- Source code and documentation authored for this repository are MIT licensed.
- The MIT grant does not relicense World Labs outputs, Tripo outputs, portraits, thumbnails,
  scene concepts or museum images. Those remain subject to source/provider terms.
- Complete World Labs IDs and output redistribution evidence remain missing.
- Task IDs, original prompts/settings and redistribution evidence remain missing for the eight
  inherited historical-character GLBs. The newer learner records its own task chain.
- Upstream URL/rights records remain missing for the Freud, Qi Baishi and Yayoi Kusama
  portraits.
- Generation task/model records remain incomplete for the nine interpretive scene images and
  world thumbnails.
- No claim is made that historical figures authored, endorsed or spoke the generated
  perspectives.

Anyone redistributing generated assets outside this hackathon repository should first recover
the provider account records and confirm the applicable output, likeness and redistribution
terms.
