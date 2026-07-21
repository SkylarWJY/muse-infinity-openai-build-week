# Third-party notices

## Current prototype

No stock third-party 3D models, copied source code, cloned voices, or private museum data are bundled in this project. Generated world and companion assets were created for MUSE∞ through authorized service accounts and are distributed separately in the public `worlds-v1` GitHub Release. Bundled background-music recordings and artwork images use public-domain or open-access sources documented below.

## OpenAI Codex, GPT-5.6 and Responses API

- Codex using GPT-5.6 was used as the implementation and iteration partner for the source, tests and documentation in this repository under human product direction and review.
- The live dialogue and closing-roundtable path defaults to OpenAI `gpt-5.6` through the Responses API.
- OpenAI credentials are server-side only and are not included in the repository.
- Model output is presented as interpretive AI language, not authentic quotation or endorsement by any historical person.

## Background music (public-domain recordings via Wikimedia Commons)

- `assets/audio/promenade.ogg` — Modest Mussorgsky, *Pictures at an Exhibition* — Promenade (allegro giusto). Public-domain recording. Source: https://commons.wikimedia.org/wiki/File:Modest_Mussorgsky_-_pictures_at_an_exhibition_-_promenade_-_allegro_giusto,_nel_modo_russico_senza_allegrezza,_ma.ogg
- `assets/audio/clair-de-lune.opus` — Claude Debussy, *Clair de lune* (piano solo). Public-domain recording. Source: https://commons.wikimedia.org/wiki/File:Clair_de_Lune_by_Claude_Debussy_(1905,_piano_solo).opus
- `assets/audio/gymnopedie.ogg` — Erik Satie, *Gymnopédie No. 1* (perf. Robin Alciatore). Public-domain recording. Source: https://commons.wikimedia.org/wiki/File:Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg

Web typography requests:

- DM Sans — Google Fonts / SIL Open Font License
- Gilda Display — Google Fonts / SIL Open Font License

Original generated concept assets are documented in `docs/ASSET_PIPELINE.md` and stored under `assets/generated/`. They are concept/UI assets for this project, not historical records, licensed museum collection images, or authentic likenesses of named people.

Generated stage backgrounds currently bundled:

- `assets/generated/muse-hero-romantic-v2.png`
- `assets/generated/muse-hero-conservatory-v3.png`
- `assets/generated/between-worlds-romantic-v2.png`
- `assets/generated/world-selection-gallery-v2.png`
- `assets/generated/monet-light-world-v2.png`
- `assets/generated/museum-salon-romantic-v2.png`
- `assets/generated/transformation-romantic-v2.png`
- `assets/generated/manifesto-garden-v2.png`

## Bundled open-access museum assets

The following public-domain artwork images were downloaded from the Art Institute of Chicago Open Access API / IIIF service at the recommended 843px size:

- `assets/museum/monet-water-lilies-1906.jpg` — Claude Monet, *Water Lilies*, 1906. Source: https://www.artic.edu/artworks/16568/water-lilies
- `assets/museum/van-gogh-bedroom-1889.jpg` — Vincent van Gogh, *The Bedroom*, 1889. Source: https://www.artic.edu/artworks/28560/the-bedroom
- `assets/museum/seurat-grande-jatte-1884.jpg` — Georges Seurat, *A Sunday on La Grande Jatte — 1884*, 1884-86. Source: https://www.artic.edu/artworks/27992/a-sunday-on-la-grande-jatte-1884

The following historical portrait images were downloaded from Wikimedia Commons pages marked as public domain:

- `assets/museum/portrait-claude-monet.jpg` — Claude Monet self-portrait reproduction. Source: https://commons.wikimedia.org/wiki/File:Autoportret_Claude_Monet.jpg
- `assets/museum/portrait-vincent-van-gogh.jpg` — Vincent van Gogh self-portrait reproduction. Source: https://commons.wikimedia.org/wiki/File:Van_Gogh_self_portrait_1889.jpg
- `assets/museum/portrait-berthe-morisot.jpg` — Berthe Morisot archival portrait. Source: https://commons.wikimedia.org/wiki/File:Berthe_Morisot,_1875.jpg
- `assets/museum/portrait-pablo-picasso.jpg` — Pablo Picasso portrait photograph, 1908, anonymous photographer. Source: https://commons.wikimedia.org/wiki/File:Portrait_de_Picasso,_1908.jpg
- `assets/museum/portrait-frida-kahlo.jpg` — Frida Kahlo portrait photograph by Guillermo Kahlo. Source: https://commons.wikimedia.org/wiki/File:Frida_Kahlo,_by_Guillermo_Kahlo.jpg
- `assets/museum/portrait-hilma-af-klint.jpg` — Hilma af Klint portrait photograph published in 1901, unknown photographer. Source: https://commons.wikimedia.org/wiki/File:Hilma_af_Klint,_portrait_photograph_published_in_1901.jpg
- `assets/museum/portrait-socrates.jpg` — photograph of the classical Socrates bust at the Capitoline Museums. Source: https://commons.wikimedia.org/wiki/File:Bust_Socrates_Musei_Capitolini_MC1163.jpg — the sculpture is an ancient representational tradition, not a true-life portrait.

## AI-generated interpretive character inputs

The following original turnaround sheets were generated for this project from the public-domain portrait references listed above:

- `assets/generated/turnarounds/claude-monet-turnaround-v1.png`
- `assets/generated/turnarounds/vincent-van-gogh-turnaround-v1.png`
- `assets/generated/turnarounds/berthe-morisot-turnaround-v1.png`
- `assets/generated/turnarounds/pablo-picasso-turnaround-v1.png`
- `assets/generated/turnarounds/frida-kahlo-turnaround-v1.png`
- `assets/generated/turnarounds/hilma-af-klint-turnaround-v1.png`
- `assets/generated/turnarounds/socrates-bust-turnaround-v1.png`

They are multi-view production references for possible 3D generation. Side and back views, clothing continuation, lighting and geometry are AI interpretations rather than authentic historical records. Socrates is explicitly a reconstruction of a classical bust, not the historical person. No third-party 3D model or cloned voice is included.

The files under `assets/generated/turnarounds/views/` are mechanical crops of those same seven project-owned sheets, created solely to provide Tripo's required `[front, left, back, right]` input order. They introduce no additional source material.

## World Labs Marble generated worlds

- The walkable `.spz` worlds and their `.glb` collider meshes were generated for MUSE∞ through World Labs Marble using project-authored prompts and project-owned or documented reference material.
- The large generated outputs are distributed in the public GitHub Release `worlds-v1`, not stored in the Git tree.
- The application uses the generated assets locally during judging; no paid World Labs generation call is required for the offline test path.
- Use of the World Labs service and generated outputs remains subject to the applicable account and service terms accepted by the entrant.

## Tripo generated companion models

- Companion `.glb` files were generated for MUSE∞ through Tripo from the project-owned multiview turnaround inputs documented above.
- The generated companion files are distributed in the public GitHub Release `worlds-v1`, not stored in the Git tree.
- No marketplace model, third-party character mesh, or cloned biometric voice is included.
- Use of the Tripo service and generated outputs remains subject to the applicable account and service terms accepted by the entrant.

## MiniMax synthetic narration

- MiniMax `speech-2.8-turbo` is an optional live runtime integration for synthetic per-character narration.
- The project selects synthetic catalogue voices and does not clone or imitate a real person's recorded voice.
- No MiniMax credential is included, and the judging path remains functional without the service.

## Runtime open-source dependency

- Three.js `0.180.0` — MIT License — https://github.com/mrdoob/three.js
- Use: local WebGL rendering for the walkable museum gallery.

## Runtime open-access collection service

- Art Institute of Chicago Open Access API and IIIF Image API.
- Documentation: https://api.artic.edu/docs/
- The runtime filters records to those marked `is_public_domain` and retains a link to the museum record.

## Evaluated but not included

React Three Fiber / Drei, OpenVGAL, Open Museum MCP and the Cleveland Museum of Art Open Access API were evaluated but are not dependencies of the submitted project.
