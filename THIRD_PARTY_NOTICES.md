# Third-party notices

The repository's MIT license applies to source code and documentation authored here. It does
not relicense the generated spatial/character assets or source images listed below. Exact
bytes, hashes and unresolved provenance records are maintained in `docs/PROVENANCE.md`.

## Runtime packages

- Three.js `0.180.0`, MIT License: <https://github.com/mrdoob/three.js>
- Spark `@sparkjsdev/spark` `2.1.0`, MIT License:
  <https://github.com/sparkjs-dev/spark>
- Playwright Test `1.61.1`, Apache-2.0 License, development/test only:
  <https://github.com/microsoft/playwright>

## OpenAI model services

OpenAI GPT-5.6 Responses and the optional OpenAI Realtime model are the only language and
reasoning model services used by this runtime. Requests are sent only to `api.openai.com`.
No Claude, Gemini, MiniMax or configurable OpenAI-compatible LLM endpoint is included.

OpenAI service use is governed by the terms associated with the operator's OpenAI account;
no model service is bundled as software in this repository.

## World Labs scene assets

The following local files are pre-generated World Labs Marble outputs retained from the
earlier MUSE asset set:

- `assets/worlds/bright-gallery.spz`
- `assets/worlds/van-gogh-gallery.spz`
- `assets/worlds/infinity-room.spz`
- `assets/thumbs/bright-gallery.jpg`
- `assets/thumbs/van-gogh-gallery.jpg`
- `assets/thumbs/infinity-room.jpg`

They are primary visual assets in the experience, but World Labs is not a language/reasoning
runtime. A separately gated Forge adapter can optionally contact World Labs for explicit
spatial generation when both provider and admin credentials are supplied; no-key operation
uses the local files and sends no provider request.

Only the Bright Gallery world ID prefix `705b7748...` remains in the prior records. Complete
IDs and explicit output redistribution records for all three scenes were not recovered. Their
inclusion here must not be read as a new MIT license grant for those files.

## Tripo character assets

These browser-optimized GLBs were derived from Tripo character outputs in `muse-infinity`:

- `assets/characters/monet.glb`
- `assets/characters/van-gogh.glb`
- `assets/characters/socrates.glb`
- `assets/characters/frida.glb`
- `assets/characters/picasso.glb`

The new fictional learner is a separate generated asset:

- `assets/characters/learner.glb`, designed with GPT Image 2 through Tripo's image task, then
  reconstructed, PBR-textured, rigged and animated by Tripo.

Tripo is asset provenance only; this repository has no Tripo runtime API. Generation task IDs
and settings were not recovered for the five inherited historical figures, while the new
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

## Artwork images

The three images under `assets/art/` are identified by the prior records as public-domain
artwork images obtained through the Art Institute of Chicago Open Access / IIIF program:

- [Water Lilies](https://www.artic.edu/artworks/16568/water-lilies)
- [The Bedroom](https://www.artic.edu/artworks/28560/the-bedroom)
- [A Sunday on La Grande Jatte](https://www.artic.edu/artworks/27992/a-sunday-on-la-grande-jatte-1884)

No cloned voice, stock interface illustration or non-OpenAI language model runtime is bundled.
