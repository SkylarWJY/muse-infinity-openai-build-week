# MUSE internal asset manifest

This manifest records verifiable identities, dimensions, hashes, transformations and source
terms for files shipped with MUSE. It is an internal technical ledger rather than a
cross-repository ownership history. All deployed files are regular repository files rather
than symlinks.

## Build Week development record

The core MUSE concept, nine prepared spatial worlds, colliders, scene images, thumbnails,
historical-character assets and portraits are pre-Submission Period materials controlled by
the entrant or lawfully sourced under the terms recorded here. Submission Period work added
the strict ten-beat/8+1 state machine,
GPT-5.6 Structured Outputs and two-stage synthesis, embodied party movement, artwork
correspondence, transitions, official OpenAI Realtime/TTS voice, procedural music, ambient
life, responsive UI and automated verification.

Evidence is recorded in commits `62a7f59`, `9ab9062`, `7602267` and `55fdeed`, and in Codex
`/feedback` session `019f7e53-4039-7cc1-9162-01906bec47b7`. This concise distinction follows
the [OpenAI Build Week Official Rules](https://openai.devpost.com/rules), which allow authorized
third-party SDKs, APIs and data while requiring an existing project to identify work completed
during the Submission Period.

## Runtime and generation boundary

- Runtime language and reasoning requests use GPT-5.6 through the official OpenAI API at
  `api.openai.com`.
- Realtime microphone mode uses the official OpenAI Realtime API, including the checked-in GPT
  Realtime and GPT transcription model constants.
- Visible guide narration uses official OpenAI `gpt-4o-mini-tts`; browser `SpeechSynthesis` can
  render the same visible text when the server renderer is unavailable. No path uses a cloned
  historical voice.
- Supported browsers can fall back from Realtime to `SpeechRecognition` and
  `SpeechSynthesis`. Recognized text uses the same official GPT-5.6 dialogue endpoint or its
  labeled curated local fallback, so browser speech adds no language/reasoning model.
- GPT Image 2 supplies the learner's source image. Tripo is used only to produce checked-in
  character assets and has no runtime API in MUSE.
- World Labs produced prepared spatial assets. Its separate optional Forge endpoint requires
  both a server API key and an exact admin token, generates only isolated spatial variations,
  receives no visitor question/evidence/conversation data and is outside the canonical journey.
- The nine spatial environments and character GLBs are prepared local assets. GPT personalizes
  the inquiry and final concept but does not generate new 3D geometry during a visitor session.

## Audio asset boundary

MUSE does not bundle or play a third-party music recording. The four-profile score in
`src/services/sound-experience.js` is deterministic Web Audio synthesis using checked-in pitch
fields and oscillators, with no recording samples or reference audio. Narration and live
conversation duck that score independently.

Any future recorded or generated soundtrack file must have an asset-level record covering its
source, generator or performer, applicable rights, prompt/reference inputs when relevant,
generation date and SHA-256. AI generation alone is not treated as copyright clearance. This
implements the competition rule that demo-video music must be authorized.

## Dialogue and voice boundary

`POST /api/dialogue` is the text interaction path. The server reconstructs the requested
scene and focused artwork from the local exhibition and AIC collection manifests instead of
trusting client-supplied titles. It bounds the visitor question and recent evidence,
canonicalizes one to three selected companions, and asks GPT-5.6 Responses for a strict JSON
result containing exactly one named perspective and one allowed visual effect per companion.
Invalid output or an absent key returns an explicitly non-live local curated response under
the same shape.

`POST /api/narration` is a speech-rendering path for an already-visible, length-bounded line. It
uses official OpenAI `gpt-4o-mini-tts` and built-in synthetic voices. The service uses no cloned
historical voice and performs no language reasoning. The fully buffered
MP3 response is returned for immediate browser playback; MUSE writes no narration file or cache
entry, and the temporary browser object URL is revoked when playback settles. If remote speech
is unavailable or playback fails, browser `SpeechSynthesis` reads the same visible line.

`POST /api/realtime/call` exchanges the browser's WebRTC SDP only with the official OpenAI
Realtime endpoint. The server session instructions carry the sanitized current scene,
focused artwork, selected companion lenses and recent evidence; ask for visible evidence;
follow the visitor's language; and prohibit impersonation or fabricated quotations. The
browser's `oai-events` data channel sends `session.update` when that museum context changes
and surfaces user/assistant transcript events. Audio output uses OpenAI's built-in `marin`
voice. There is no cloned historical voice or lip synchronization.

When Realtime is not used, supported browsers use `SpeechRecognition` for microphone input,
send the recognized text through `POST /api/dialogue`, and use `SpeechSynthesis` for the
returned perspectives. That dialogue remains official GPT-5.6 when configured or the labeled
curated local fallback; browser speech is not a second reasoning provider.

Passive guide narration is controlled with Sound and stops at scene or process transitions.
The separate Voice control remains the visitor-initiated live microphone conversation
described above; starting it stops passive narration so the input stream does not capture the
guide's own speech. Both narration and live conversation lower the procedural score while
speaking. Browser autoplay policy requires a visitor gesture before Web Audio can begin.

The official Realtime and TTS paths require an untracked OpenAI server credential. Browser
speech remains available where the browser implements it, while text inquiry remains the
authoritative accessible path when microphone permission or speech services are unavailable.

## Spatial world asset ledger

Counts for scenes 1-7 were read from their World Labs SPZ source headers. The runtime ships
Spark quality RAD derivatives so it can page the hierarchy instead of blocking on browser-time
Bhatt LOD construction.

### Source-detail inputs for scenes 1-7

| # | SPZ source name | Detail | Source bytes | Source SHA-256 |
| ---: | --- | ---: | ---: | --- |
| 1 | `Grand Conservatory with Lush Gardens.spz` | 4,320,000 splats | 64,296,322 | `17f00f8855796eff69a47f543caa0920ac1049f8ca1bdbeb5574d9db1545456b` |
| 2 | `Elegant Floral Palace Interior.spz` | 4,320,000 splats | 64,592,504 | `0acf9e9859633df1b9ad1062d9e057aa34dc33f4d3b89c094df34290417a01ef` |
| 3 | `Enchanted Water Garden Sanctuary.spz` | 4,320,000 splats | 64,819,491 | `43cba66b1e6589b230204466649e7502d270aeab6bb8ae2e62c08ae3fca099cf` |
| 4 | `Dreamlike Coastal Villa Gardens.spz` | 2,400,000 splats | 35,937,135 | `6c3d3e298dfc318c944127df1ad69089187e5bfb6d433dfed2ab199dd5009a11` |
| 5 | `Van Gogh Inspired Gallery Interior.spz` | 3,840,000 splats | 55,647,647 | `99f8eb8b1c1f4ed8f144e7cd1d7b2c76976c4ff6996b35e8927f351c7885db56` |
| 6 | `Sunlit Palace Gardens.spz` | 4,320,000 splats | 65,191,251 | `69d04aba292b07ed19fbba667028815d23402b12899b66b59cd1039e24e22574` |
| 7 | `Mexican Courtyard Bedroom Fantasy.spz` | 4,320,000 splats | 64,030,640 | `7e9eddc6197a238a4183f181b09ff0a16167e16e1662543160cd4c7bdbf3b34a` |

### Deployed primary assets

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
utility. For each source:

```bash
build-lod --quality --rad "/path/to/Source World.spz"
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

Colliders are scene geometry used invisibly for downward height raycasts and short-radius
learner collision sweeps. Reference-height filtering keeps actors on a locally continuous
terrain layer. Their presence does not imply navmesh pathfinding, semantic water labels,
guide/party obstacle planning or general physics simulation.

## Geometry-preserving 8K mesh repack

The source scene-8 and scene-9 GLBs exceeded GitHub's 100 MB per-file limit because they
embedded lossless PNG textures. `scripts/repack-world-mesh.mjs` parses the GLB container,
extracts the PNG, uses macOS `sips` to encode JPEG quality 88, updates the image MIME type and
buffer offsets, and rebuilds the GLB. It does not decimate the mesh or resize the texture.

| Scene | Source GLB bytes / SHA-256 | Original embedded PNG | Deployed embedded JPEG | Deployed GLB bytes / SHA-256 |
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
4,320,000-splat target, `lodRenderScale: 1`, `lodScale: 2` and `NoToneMapping`. Default
mobile uses DPR 1.5 and a 750,000-splat target with the same render/LOD scales. Lower explicit
quality tiers change the runtime budget, not the deployed asset.

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

## Tripo companion asset ledger

The eight deployed historical-character GLBs are browser-optimized copies of the corresponding
full-size MUSE source files. Each source GLB embeds `asset.generator: "Tripo"`.

| Companion | Source export / bytes | Deployed file / bytes | SHA-256 |
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

The deployed hashes in this manifest are authoritative; future package versions may not
produce byte-identical optimized output from the same command shape.

The deployed companion files contain static meshes rather than skins or animation clips.
Submission Period runtime work added approximate shader-region deformation and
root translation make the first selected companion guide and up to two other selected
companions follow in formation, with locally continuous collider-derived ground height and
paired-foot formation validation. Gait cadence follows root speed, and the director holds
distinct listening and reflection poses. Roundtable staging uses
the same selected roster. The figures are AI interpretations, not authentic likeness
reconstructions or endorsements by the named people. Yayoi Kusama is a living person; this
repository does not describe her representation as a public-domain historical likeness.

The nine-scene ambient cast is implemented entirely by `src/config/ambientLife.js` and
`src/render/AmbientLife.js`. No creature GLB, texture, sample, downloaded pack or generated
animal asset is part of the repository. This keeps the world files unchanged and avoids adding
another asset dependency.

## Portrait ledger

| Companion | Deployed file | Bytes | SHA-256 | Source / note |
| --- | --- | ---: | --- | --- |
| Claude Monet | `assets/portraits/monet.jpg` | 273,567 | `0b86b2d30be83cfe6a17e8bd0293628676409696665017ad67abce83dd3fbb65` | [Monet self-portrait reproduction](https://commons.wikimedia.org/wiki/File:Autoportret_Claude_Monet.jpg) |
| Vincent van Gogh | `assets/portraits/van-gogh.jpg` | 235,512 | `395005107ab6f908346f60e137b8d8c6c7d5a9cad029b0c2b50aff095fe68499` | [Van Gogh self-portrait reproduction](https://commons.wikimedia.org/wiki/File:Van_Gogh_self_portrait_1889.jpg) |
| Socrates | `assets/portraits/socrates.jpg` | 2,196,932 | `57e89af7a476787b96e54ab6548ec4c2abdbcad5107451fa1e64326fe7543ae1` | [Classical Socrates bust photograph](https://commons.wikimedia.org/wiki/File:Bust_Socrates_Musei_Capitolini_MC1163.jpg); not a true-life portrait |
| Frida Kahlo | `assets/portraits/frida.jpg` | 1,156,272 | `5e867b395b4871caa8e6b0371f5cddd17364598e83595d6b5967741ad9252d8a` | [Portrait attributed to Guillermo Kahlo](https://commons.wikimedia.org/wiki/File:Frida_Kahlo,_by_Guillermo_Kahlo.jpg) |
| Pablo Picasso | `assets/portraits/picasso.jpg` | 193,854 | `c045320141c4297e1e45509da5a7560c6020f2fffb218a4f5f85bfbf809132ed` | [1908 Picasso portrait photograph](https://commons.wikimedia.org/wiki/File:Portrait_de_Picasso,_1908.jpg) |
| Sigmund Freud | `assets/portraits/freud.jpg` | 268,788 | `074a72ff0d7b6e2863fad83744703e87e84653640693df0ca28f41d93b357c03` | Local MUSE character-reference image `Sigmund Freud.png` |
| Qi Baishi | `assets/portraits/qi-baishi.jpg` | 284,627 | `6791eddd834dbb0d6074b624e413fcf09bdb387c240834653204c5a74512eb34` | Local MUSE character-reference image `Qi Baishi.png` |
| Yayoi Kusama | `assets/portraits/yayoi-kusama.jpg` | 359,487 | `a4b6a84e8edf295ebb95982389cf1886eba95fbc146823d81055a61ded0eca20` | Local MUSE character-reference image `Yayoi Kusama.png` |

The linked source pages document the status of the five Wikimedia images. Downstream users
must verify each current source page, file version and jurisdiction. The three local
character-reference images are not described as public-domain documentary portraits.

The selection UI uses mechanically cropped single-view derivatives for the three local
turnaround images. The originals remain unchanged and are the source of these crops:

| Companion | Derived card | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| Sigmund Freud | `assets/portraits/freud-card.jpg` | 64,717 | `0128c0c643ccbfd1fcbd3eba739b04e45996d516e211b0152ab724b321d96f71` |
| Qi Baishi | `assets/portraits/qi-baishi-card.jpg` | 60,983 | `425e11567f5b0c24620f0ada791fa1e2c04d16bcb51ee188ac7cacf0f9219041` |
| Yayoi Kusama | `assets/portraits/yayoi-kusama-card.jpg` | 78,155 | `d9349ffe5eaedc539313ffc16c97faa1545c34a5a38b7e7f5f7ee9efd2be5c77` |

These derivatives are AI character interpretations, not verified documentary portraits or
endorsements by the named people.

## Submission Period learner asset ledger

The learner was produced during the Submission Period. Tripo's `generate_image` task invoked
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

## Scene-image asset ledger

These nine MUSE PNGs are interpretive concept/evidence images. They are not historical
artworks and are not represented as World Labs exports.

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

## Art Institute of Chicago Open Access artwork ledger

`src/config/sceneCollections.js` defines the deterministic 36-work cast, grouped as four
globally unique works per world. This repository stores one
JPEG for each record under `assets/art/collection/`; the files were downloaded from the
recorded Art Institute of Chicago IIIF `full/1686,/0/default.jpg` URLs so gallery rendering
does not depend on a live image request. The title, creator, date and object-page source below
match the AIC public API records.

| # | Scene | Local file | AIC object page / title | Creator and date | Bytes | SHA-256 |
| ---: | --- | --- | --- | --- | ---: | --- |
| 1 | `threshold-conservatory` | `assets/art/collection/aic-153799.jpg` | [Woman Bathing Her Feet in a Brook](https://www.artic.edu/artworks/153799) | Camille Pissarro, 1895 | 1,687,686 | `08037a7d5e5d1de5ae8925b017e096e94102b08bc1a32c49affb4275d5b36b71` |
| 2 | `threshold-conservatory` | `assets/art/collection/aic-81551.jpg` | [The Place du Havre, Paris](https://www.artic.edu/artworks/81551) | Camille Pissarro, 1893 | 1,317,684 | `d8496ed76fae533f6cddf6e9145b4e62aa58c4238a554443fb16b54d6ba1165b` |
| 3 | `threshold-conservatory` | `assets/art/collection/aic-110541.jpg` | [The Crystal Palace](https://www.artic.edu/artworks/110541) | Camille Pissarro, 1871 | 620,390 | `286dc771965fa322cf20a48bdee1282a22f651152723962a052521658db227e6` |
| 4 | `threshold-conservatory` | `assets/art/collection/aic-81552.jpg` | [Woman and Child at the Well](https://www.artic.edu/artworks/81552) | Camille Pissarro, 1882 | 2,289,971 | `707dd010eb15248aae1c46b4867eaadae3f8cdd50ad8a9ac95e3a909a86ebd5a` |
| 5 | `court-of-light` | `assets/art/collection/aic-14655.jpg` | [Two Sisters (On the Terrace)](https://www.artic.edu/artworks/14655) | Pierre-Auguste Renoir, 1881 | 1,536,797 | `a82cfe8c8a4fa4167463ecb16d2bdbb09dbe80c10a630db6197e4cce7a26a4f6` |
| 6 | `court-of-light` | `assets/art/collection/aic-81558.jpg` | [Acrobats at the Cirque Fernando (Francisca and Angelina Wartenberg)](https://www.artic.edu/artworks/81558) | Pierre-Auguste Renoir, 1879 | 1,202,639 | `0aff322b7f2a819b7d3d1fcfe14f01a77203dec572f09729407854b1fce225d6` |
| 7 | `court-of-light` | `assets/art/collection/aic-25825.jpg` | [Woman at the Piano](https://www.artic.edu/artworks/25825) | Pierre-Auguste Renoir, 1875–76 | 1,421,468 | `fecac6873de16e228e2945d3319402c7204f98c2e2b3578b6d1b0a03318f2fa6` |
| 8 | `court-of-light` | `assets/art/collection/aic-81555.jpg` | [Lunch at the Restaurant Fournaise (The Rowers' Lunch)](https://www.artic.edu/artworks/81555) | Pierre-Auguste Renoir, 1875 | 1,078,619 | `379f0a7c3b93818873bd3f511722492f58fe1306c89d37f0a37963439f52362e` |
| 9 | `water-and-light` | `assets/art/collection/aic-16568.jpg` | [Water Lilies](https://www.artic.edu/artworks/16568) | Claude Monet, 1906 | 1,165,558 | `bab7cc062608fdb0601f3bb43f927eb20516525755a0a519f5f40fb301fe0074` |
| 10 | `water-and-light` | `assets/art/collection/aic-16571.jpg` | [Arrival of the Normandy Train, Gare Saint-Lazare](https://www.artic.edu/artworks/16571) | Claude Monet, 1877 | 668,941 | `7e1adf4695cdb62c248973e65a608b4ec8114323cda944cf77599076fe0ee864` |
| 11 | `water-and-light` | `assets/art/collection/aic-64818.jpg` | [Stacks of Wheat (End of Summer)](https://www.artic.edu/artworks/64818) | Claude Monet, 1890–91 | 505,036 | `d554b0ec60a3545478ef876e32ae515e133157dd4828df0d30b923305947263c` |
| 12 | `water-and-light` | `assets/art/collection/aic-14620.jpg` | [Cliff Walk at Pourville](https://www.artic.edu/artworks/14620) | Claude Monet, 1882 | 902,821 | `012a25e3b3b7c695cd251ca2cf7bd95f1eb2bdc54e2f52590a6e4cd2cf73e8a2` |
| 13 | `sunset-frames` | `assets/art/collection/aic-111436.jpg` | [The Basket of Apples](https://www.artic.edu/artworks/111436) | Paul Cezanne, c. 1893 | 697,660 | `1b0679b1534163f79c5c8b5a96632e67555ee88f67ee5278d19a7b96bf0e952c` |
| 14 | `sunset-frames` | `assets/art/collection/aic-16487.jpg` | [The Bay of Marseille, Seen from L'Estaque](https://www.artic.edu/artworks/16487) | Paul Cezanne, c. 1885 | 691,601 | `5934f7268614edd9225b79a695acce3aa522329f59c147023ad01d3326dad3ef` |
| 15 | `sunset-frames` | `assets/art/collection/aic-14556.jpg` | [Auvers, Panoramic View](https://www.artic.edu/artworks/14556) | Paul Cezanne, 1873–75 | 849,158 | `158e8ad7bdd8729c6d302560fa991f59e4ff9afe92d39f385ae97ff28a128315` |
| 16 | `sunset-frames` | `assets/art/collection/aic-62371.jpg` | [Madame Cezanne in a Yellow Chair](https://www.artic.edu/artworks/62371) | Paul Cezanne, 1888–90 | 997,941 | `7d2ab20a28ca90348c68a1af927e3e8ef6743a3e4cd608109eff903db1188d85` |
| 17 | `burning-sky` | `assets/art/collection/aic-28560.jpg` | [The Bedroom](https://www.artic.edu/artworks/28560) | Vincent van Gogh, 1889 | 932,823 | `7b0cb3c2514181a95a15706c5863bf6a9602d52d7d844259475a98434d0ae556` |
| 18 | `burning-sky` | `assets/art/collection/aic-80607.jpg` | [Self-Portrait](https://www.artic.edu/artworks/80607) | Vincent van Gogh, 1887 | 1,689,053 | `51c9029de2192fe4551d5e6bc208268cf33d7145aa4285286f43cf2c311cd34a` |
| 19 | `burning-sky` | `assets/art/collection/aic-14586.jpg` | [The Poet's Garden](https://www.artic.edu/artworks/14586) | Vincent van Gogh, 1888 | 957,209 | `f8ad0be55c7d1653a1a4ce35cb796e65a7e907d354b4fdd6c34306c4fa3ef964` |
| 20 | `burning-sky` | `assets/art/collection/aic-28862.jpg` | [A Peasant Woman Digging in Front of Her Cottage](https://www.artic.edu/artworks/28862) | Vincent van Gogh, c. 1885 | 697,285 | `49f105b2d4314ea6af73a1ccd34e46de2ae3bcb439f553f324722fa3531dd00c` |
| 21 | `petal-transition` | `assets/art/collection/aic-27992.jpg` | [A Sunday on La Grande Jatte — 1884](https://www.artic.edu/artworks/27992) | Georges Seurat, 1884–86, border added 1888–89 | 849,983 | `14a893bee0c73c9bae05508c1901e2cdf7940d4686988d17360d098dff561d7f` |
| 22 | `petal-transition` | `assets/art/collection/aic-61616.jpg` | [Oil Sketch for "A Sunday on La Grande Jatte — 1884"](https://www.artic.edu/artworks/61616) | Georges Seurat, 1884 | 823,347 | `d960e83adfcd9b496498f752372295749ccd5f82358698682c814bff86f8dcd6` |
| 23 | `petal-transition` | `assets/art/collection/aic-20199.jpg` | [Final Study for "Bathers at Asnières"](https://www.artic.edu/artworks/20199) | Georges Seurat, 1883 | 684,203 | `4b863d2cf22955c9ee8cd971134c4dd2d54e64f7d76edfd27ccb0428daffc043` |
| 24 | `petal-transition` | `assets/art/collection/aic-150773.jpg` | [Seated Woman with a Parasol (study for La Grande Jatte)](https://www.artic.edu/artworks/150773) | Georges Seurat, 1884/85 | 1,501,415 | `35045070d69ee61064805c85557d8ddf48ee64373864021d61f01525553fc788` |
| 25 | `living-memory` | `assets/art/collection/aic-111442.jpg` | [The Child's Bath](https://www.artic.edu/artworks/111442) | Mary Cassatt, 1893 | 1,382,866 | `82b9ace5cdb81b74e0a6c83e2bdff56e6b683cb4248b4bd43ca83791203b58d6` |
| 26 | `living-memory` | `assets/art/collection/aic-13506.jpg` | [Woman Bathing](https://www.artic.edu/artworks/13506) | Mary Cassatt, 1890–91 | 1,146,985 | `406401239d083ad1634d732cdcdd24eddc9e4a0e1a26a6c21889aa30986e22b9` |
| 27 | `living-memory` | `assets/art/collection/aic-26650.jpg` | [On a Balcony](https://www.artic.edu/artworks/26650) | Mary Cassatt, 1878–79 | 1,333,912 | `d277b6800274e48c3906d729d3b1f1dcfd4af9634b5899d1ec9741585fd54985` |
| 28 | `living-memory` | `assets/art/collection/aic-28826.jpg` | [Sleepy Nicolle](https://www.artic.edu/artworks/28826) | Mary Cassatt, c. 1900 | 1,219,413 | `f2eeeff323e8577bb8e5093c06c93d1cf33f7d4efb6e1ec6bcf05a9f7c4ca8b3` |
| 29 | `infinite-repetition` | `assets/art/collection/aic-8991.jpg` | [Improvisation No. 30 (Cannons)](https://www.artic.edu/artworks/8991) | Vasily Kandinsky, 1913 | 891,783 | `9f1c00bfb966eb3ba012f1418202f6b1875c41981f919985d961d664b8a4b35a` |
| 30 | `infinite-repetition` | `assets/art/collection/aic-8980.jpg` | [Landscape with Two Poplars](https://www.artic.edu/artworks/8980) | Vasily Kandinsky, 1912 | 931,176 | `c6ea4b73a5f32dae95c9efdf2f61f317ebe537eba72d04221ce017db83a79f56` |
| 31 | `infinite-repetition` | `assets/art/collection/aic-8987.jpg` | [Painting with Green Center](https://www.artic.edu/artworks/8987) | Vasily Kandinsky, 1913 | 1,296,594 | `bfdd5543e41e9bcf53df4fb5899724745e4006376e4d905619b2dce0a917086d` |
| 32 | `infinite-repetition` | `assets/art/collection/aic-8983.jpg` | [Painting with Troika](https://www.artic.edu/artworks/8983) | Vasily Kandinsky, January 18, 1911 | 716,604 | `6f8c6b14eb461c55ad9eb8ff914d4f2f1f1fa19d3289c993b78b9b13e127a6ed` |
| 33 | `personal-dream-world` | `assets/art/collection/aic-76395.jpg` | [Flower Clouds](https://www.artic.edu/artworks/76395) | Odilon Redon, c. 1903 | 833,388 | `5196f3536350459bbe36d48682071c8319af781c3cc5de4c1efaa1f2985bf7c4` |
| 34 | `personal-dream-world` | `assets/art/collection/aic-90316.jpg` | [Guardian Spirit of the Waters](https://www.artic.edu/artworks/90316) | Odilon Redon, 1878 | 1,625,583 | `a859584d4eaea5ce817f3955b3b0962c81b2436aeb760d534be68bba22b72c42` |
| 35 | `personal-dream-world` | `assets/art/collection/aic-110982.jpg` | [Still Life with Flowers](https://www.artic.edu/artworks/110982) | Odilon Redon, 1905 | 2,011,674 | `30dded44fdf3746cdb44b739dad2ef6c3af4c6f13ed41a1d784176031ad1f701` |
| 36 | `personal-dream-world` | `assets/art/collection/aic-94240.jpg` | [Flowers: Poppies and Daisies](https://www.artic.edu/artworks/94240) | Odilon Redon, c. 1867 | 859,576 | `da5023a8f0dab27710b397730c8a55d8bcd92845cc8073ef9f994133d3ff0d17` |

On July 20, 2026, one batched request to the AIC artworks API returned all 36 object IDs,
matched every configured title and creator, and reported `is_public_domain: true` for every
record. AIC states that qualifying Open Access images are available under a Creative Commons
Zero designation and its website terms, and requests a caption containing artist, title,
date and The Art Institute of Chicago. The API documentation licenses artwork response data
under CC0 except for the `description` field; this manifest does not copy that field. See the
[AIC Open Access Images policy](https://www.artic.edu/open-access/open-access-images),
[AIC API documentation](https://api.artic.edu/docs/) and
[AIC website terms](https://www.artic.edu/terms). AIC also states that image users remain
responsible for identifying and obtaining any necessary third-party permissions.

Three lower-resolution compatibility files remain for traceability but are not separate works
in the runtime cast:

| Compatibility file | AIC source | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `assets/art/water-lilies.jpg` | [Water Lilies](https://www.artic.edu/artworks/16568) | 278,626 | `06367197ac8d6745537dcfe6722ff4b8ef2cb33e044168d8c471782b55f7dd39` |
| `assets/art/bedroom.jpg` | [The Bedroom](https://www.artic.edu/artworks/28560) | 235,077 | `cb5839d854aa1a092801939b8d732fa653f22a1c87fdbbd7248c9882250ce400` |
| `assets/art/grande-jatte.jpg` | [A Sunday on La Grande Jatte — 1884](https://www.artic.edu/artworks/27992) | 197,727 | `90197c037e6041fcae1c35606b921b5b626d868c2ff21cd653edb640b3f6e2dd` |

## Coordinate and navigation record

The canonical web-export SPZ worlds are y-up and keep their native frame; there is no blanket
`Rx(pi)` correction. World scales are 1.7 for scenes 1-7, 2.0 for scene 8 and 1.8 for scene
9. Each manifest profile retains its source spawn, ground height, bounds, yaw and camera far
range before this declared scale is applied.

`src/config/legacyAssets.js` is the executable record. `src/config/exhibitionSpine.js` is the
ordered narrative/asset record. The runtime loads the matching scene collider and uses it
for ground height; route order and movement bounds remain deterministic.

`src/config/artworkPlacements.js` records all 36 authored artwork anchors. Nine frames hide
their supports only where a near-vertical collider is within 0.10 m behind the center and all
four corners; the remaining twenty-seven use grounded stands in open geometry. Geometry QA
uses each source JPEG's real aspect ratio, requires unobstructed center/corner sightlines and
keeps every center 1.50 m above its local viewing ground. Absolute world Y is not a
cross-world height contract.

## Rights and use notes

- Source code and documentation authored for this repository are MIT licensed.
- Generated spatial and character assets remain subject to the applicable World Labs and Tripo
  account terms; the repository MIT license does not replace those terms.
- AIC artwork files and metadata follow the Open Access and CC0 source terms documented above.
- Portrait use remains subject to each source page, applicable jurisdiction and likeness law.
  Yayoi Kusama is a living person; her representation is not described as a public-domain
  historical likeness.
- Historical companion perspectives are labeled AI interpretations. They are not authentic
  quotations, cloned voices, endorsements or statements by the named people.
- Runtime package and asset-source notices are consolidated in
  [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).
