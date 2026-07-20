# Third-party notices

The repository's MIT license applies to source code and documentation authored here. It does
not relicense the generated spatial/character assets or source images listed below. Exact
bytes, hashes and unresolved provenance records are maintained in `docs/PROVENANCE.md`.

## Runtime packages

- Three.js `0.180.0`, MIT License: <https://github.com/mrdoob/three.js>
- Spark `@sparkjsdev/spark` `2.1.0`, MIT License:
  <https://github.com/sparkjsdev/spark>
- Playwright Test `1.61.1`, Apache-2.0 License, development/test only:
  <https://github.com/microsoft/playwright>

## OpenAI model services

The official judging configuration requests OpenAI GPT-5.6 Responses and optional OpenAI
Realtime. Requests default to `api.openai.com`; local operators may select the single
allowlisted inherited MUSE GPT gateway, to which the runtime sends only `gpt-5.6` requests.
That request configuration is not official-provider evidence. The runtime rejects all other origins and rewrites every
text-model selection to `gpt-5.6`. No Claude, Gemini or MiniMax runtime is included.

Official and inherited credentials are stored under different environment variables and are
bound to their respective origins. Gateway status is labeled `request-configured`; an actual
response is labeled `gateway-response-reported` only when its payload identifies an allowed
GPT-5.6 model. Neither label is official OpenAI Platform evidence, and Realtime is disabled on
that gateway. Questions and scene
evidence sent through the gateway are visible to its operator, and `store: false` does not
assert proxy-side retention behavior.

Direct `api.openai.com` use is governed by the terms associated with the operator's OpenAI
account. Use of the allowlisted inherited gateway is governed by that gateway operator and
its upstream service terms; its credential is not represented as an official OpenAI Platform
API key. No model service or credential is bundled as software in this repository.

## World Labs scene assets

The nine canonical spaces, their colliders, thumbnails and interpretive scene images are
pre-generated outputs retained from the earlier MUSE asset set. Scenes 1-7 deploy official
Spark quality RAD derivatives built from archived World Labs SPZ sources; scene 8 deploys an
8K texture mesh with its archived SPZ as a fallback; scene 9 deploys an 8K texture mesh.
Exact filenames, derivations, bytes and hashes are recorded in `docs/PROVENANCE.md`.

The older `bright-gallery.spz`, `van-gogh-gallery.spz` and `infinity-room.spz` derivatives
remain only as noncanonical compatibility records. They are not used by the 8+1 route.

World Labs is not a language/reasoning runtime. A separately gated Forge adapter can
optionally contact World Labs for explicit spatial generation when both provider and admin
credentials are supplied; no-key operation uses local files and sends no provider request.
Three noncanonical account records (Bright Gallery and two World of Light generations) were
recovered, but complete source World IDs for the formal nine-world route and explicit output
redistribution records were not. Inclusion must not be read as a new MIT license grant for any
generated asset.

## Tripo character assets

These browser-optimized GLBs were derived from Tripo character outputs in `muse-infinity`:

- `assets/characters/monet.glb`
- `assets/characters/van-gogh.glb`
- `assets/characters/socrates.glb`
- `assets/characters/frida.glb`
- `assets/characters/picasso.glb`
- `assets/characters/freud.glb`
- `assets/characters/qi-baishi.glb`
- `assets/characters/yayoi-kusama.glb`

The new fictional learner is a separate generated asset:

- `assets/characters/learner.glb`, designed with GPT Image 2 through Tripo's image task, then
  reconstructed, PBR-textured, rigged and animated by Tripo.

Tripo is asset provenance only; this repository has no Tripo runtime API. Generation task IDs
and settings were not recovered for the eight inherited historical figures, while the new
learner's complete generation manifest is checked in. The historical figures are interpretive
representations and do not claim endorsement, quotation or authentic reconstruction.

Tripo output rights depend on the generating account tier under Tripo's current terms. Confirm
the applicable account and output rights before commercial redistribution; the repository's
MIT license does not relicense this GLB or its GPT Image 2 source views.

## Companion portrait images

The prior MUSE manifest recorded the following Wikimedia Commons sources and marked the
copies public domain:

- Claude Monet self-portrait reproduction:
  <https://commons.wikimedia.org/wiki/File:Autoportret_Claude_Monet.jpg>
- Vincent van Gogh self-portrait reproduction:
  <https://commons.wikimedia.org/wiki/File:Van_Gogh_self_portrait_1889.jpg>
- Classical Socrates bust photograph, not a true-life portrait:
  <https://commons.wikimedia.org/wiki/File:Bust_Socrates_Musei_Capitolini_MC1163.jpg>
- Frida Kahlo portrait attributed to Guillermo Kahlo:
  <https://commons.wikimedia.org/wiki/File:Frida_Kahlo,_by_Guillermo_Kahlo.jpg>
- 1908 Pablo Picasso portrait photograph:
  <https://commons.wikimedia.org/wiki/File:Portrait_de_Picasso,_1908.jpg>

The shipped files are under `assets/portraits/`. Downstream users should verify each current
Commons file page and jurisdiction-specific status before redistribution.

The archived Freud, Qi Baishi and Yayoi Kusama portrait copies lack recovered upstream URLs
or rights records. They should not be redistributed outside this hackathon repository until
those records are recovered. Yayoi Kusama is living; neither her portrait nor generated
representation is described here as a public-domain historical likeness.

## Artwork images

The runtime gallery uses 36 locally stored JPEGs under `assets/art/collection/`, four globally
unique works for each of the nine scenes. Their object metadata and IIIF source URLs came from
the Art Institute of Chicago public API and Open Access program. The complete title, artist,
date, object-page link, local filename, byte count and SHA-256 ledger is in
`docs/PROVENANCE.md`.

The Art Institute designates qualifying Open Access images CC0 and asks users to include the
artist, title, date and institution caption. Its API documents artwork response data as CC0
except for the `description` field, which this gallery does not copy. Use remains subject to
the museum's website terms, and downstream users remain responsible for any third-party
permissions. See the official [Open Access Images policy](https://www.artic.edu/open-access/open-access-images),
[public API documentation](https://api.artic.edu/docs/) and
[website terms](https://www.artic.edu/terms).

The older `assets/art/water-lilies.jpg`, `assets/art/bedroom.jpg` and
`assets/art/grande-jatte.jpg` are retained lower-resolution compatibility copies of three
works also represented in the 36-work collection. They are not additional unique works.

No cloned voice, stock interface illustration or alternate model-family runtime is bundled.
Dynamic text dialogue requests `gpt-5.6` through the official API or visibly disclosed local
legacy gateway. The official judging path can use OpenAI Realtime WebRTC with the built-in
`marin` voice. Gateway and no-key operation may instead use the browser's Web Speech
recognition and synthesis around the same text-dialogue contract; browser implementations may
delegate speech transport to platform services. Recognition availability, synthesis voices and
speech behavior therefore vary by browser and operating system, but this repository does not
route reasoning to another model provider.
