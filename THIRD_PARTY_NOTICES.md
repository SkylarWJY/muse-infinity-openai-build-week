# Third-party notices

The repository's MIT license applies to source code and documentation authored here. It does
not relicense the generated spatial/character assets or source images listed below. Exact
bytes, hashes and transformations are maintained in `docs/PROVENANCE.md`. The
[OpenAI Build Week Official Rules](https://openai.devpost.com/rules) allow authorized
third-party SDKs, APIs and data subject to their applicable terms; this file records those
project dependencies and sources.

## Runtime packages

- Three.js `0.180.0`, MIT License: <https://github.com/mrdoob/three.js>
- Spark `@sparkjsdev/spark` `2.1.0`, MIT License:
  <https://github.com/sparkjsdev/spark>
- Playwright Test `1.61.1`, Apache-2.0 License, development/test only:
  <https://github.com/microsoft/playwright>

## Background music

MUSE includes three public-domain instrumental recordings inherited from MUSE Infinity. They
play only after a visitor gesture and duck beneath narration. The runtime does not alter or
claim ownership of the recordings.

- `assets/audio/promenade.ogg` — Modest Mussorgsky, *Pictures at an Exhibition* — Promenade
  (allegro giusto). Public-domain recording. Source:
  <https://commons.wikimedia.org/wiki/File:Modest_Mussorgsky_-_pictures_at_an_exhibition_-_promenade_-_allegro_giusto,_nel_modo_russico_senza_allegrezza,_ma.ogg>
- `assets/audio/clair-de-lune.opus` — Claude Debussy, *Clair de lune* (piano solo).
  Public-domain recording. Source:
  <https://commons.wikimedia.org/wiki/File:Clair_de_Lune_by_Claude_Debussy_(1905,_piano_solo).opus>
- `assets/audio/gymnopedie.ogg` — Erik Satie, *Gymnopédie No. 1* (performed by Robin
  Alciatore). Public-domain recording. Source:
  <https://commons.wikimedia.org/wiki/File:Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg>

Exact byte hashes are asserted in `tests/music-provenance.test.mjs`. A very quiet original Web
Audio texture remains underneath the recordings; it uses no samples or reference audio.

## OpenAI model services

MUSE requests GPT-5.6 Responses through one of two exact disclosed remote origins: official OpenAI at
`https://api.openai.com`, or the authorized OpenAI-compatible gateway at
`https://api.baizhiyuan.cloud`. A local operator may explicitly reuse their current Codex auth
and its exact loopback `/v1` Responses transport. Compatible transports are used for GPT-5.6 reasoning only.
OpenAI Realtime and `gpt-4o-mini-tts` narration are enabled only with the official origin. TTS
renders already-visible lines as speech; it is not used for language reasoning. Supported
browsers may use
`SpeechRecognition` and `SpeechSynthesis` as speech-only fallbacks. Recognized text still uses
the configured GPT-5.6 dialogue path or its labeled curated local fallback. Runtime reasoning
model and remote-origin selection are fixed to checked-in exact allowlists; local Codex mode is
limited to a user-owned auth file and an exact loopback provider.

Use of each service is governed by the terms associated with the operator's authorized
account. API credentials remain server-side and are not bundled as software or committed to
the repository. The competition permits authorized third-party services; this notice separates
their roles rather than implying an OpenAI-only product boundary.

## MiniMax speech service

When `MINIMAX_API_KEY` is configured, MUSE uses the documented MiniMax T2A v2 endpoint with
`speech-2.8-turbo` for the primary nine-character narration cast. MiniMax receives only an
allowlisted speaker identifier and the bounded line already visible in the interface. It does
not receive the visitor's question, observations, scene evidence, lesson prompt or final concept,
and it performs no language reasoning for MUSE. The integration uses generic system voices, not
voice cloning or a claim to reproduce any historical person's real voice.

The response is decoded as a bounded MP3 for immediate playback, is not written to repository or
application storage, and its browser object URL is revoked after playback. The implementation
follows the [MiniMax T2A HTTP documentation](https://platform.minimax.io/docs/api-reference/speech-t2a-http)
and is operated subject to the [MiniMax Open Platform Terms](https://platform.minimax.io/protocol/terms-of-service).

## World Labs scene assets

The nine canonical spaces, their colliders, thumbnails and interpretive scene images are
prepared assets inherited from `muse-infinity`. Scenes 1-7 deploy Spark quality RAD derivatives
built from World Labs SPZ sources; scene 8 deploys an 8K texture mesh with its SPZ as a
fallback; scene 9 deploys an 8K texture mesh. Nine inherited 1672 x 941 scene PNGs are used as
readiness-transition posters while those real world assets initialize.
Exact filenames, derivations, bytes and hashes are recorded in `docs/PROVENANCE.md`.

The older `bright-gallery.spz`, `van-gogh-gallery.spz` and `infinity-room.spz` derivatives
remain only as noncanonical compatibility records. They are not used by the 8+1 route.

World Labs produced prepared assets and also backs an optional auxiliary Forge endpoint. Forge
requires both a server-side World Labs key and an exact admin token, accepts an administrator's
spatial prompt, and returns an isolated generation operation; it is outside the canonical 8+1
journey and receives no visitor question, evidence or conversation data. World Labs does not
provide language reasoning. Generated asset use remains subject to the terms of the authorized
account; the repository's MIT license does not replace those terms.

World Labs Marble's **Record** workflow exports MP4 capture, not an animated GLB. MUSE does not
claim a Marble-generated transition GLB and does not ship a Marble MP4. The current transition
uses the inherited high-resolution scene posters and the checked-in local RAD/GLB worlds.

## Tripo character assets

These seven browser-optimized GLBs are used by named AI interpretive lenses and were derived
from MUSE Tripo character outputs:

- `assets/characters/monet.glb`
- `assets/characters/van-gogh.glb`
- `assets/characters/socrates.glb`
- `assets/characters/frida.glb`
- `assets/characters/picasso.glb`
- `assets/characters/freud.glb`
- `assets/characters/qi-baishi.glb`

`assets/characters/yayoi-kusama.glb` remains a legacy compatibility artifact in the repository,
but current configuration does not load it, use its portrait, or present the living artist as a
speaker. The compatible `yayoi-kusama` ID resolves to the non-person **Infinity & Repetition
Lens** and an infinity-room scene marker.

The default learner is a separate user-supplied asset:

- `assets/characters/learner-girl.glb` is a mechanically browser-optimized copy of a
  user-provided Tripo export. `assets/generated/learner-girl/manifest.json` records the supplied
  filename, hashes, geometry and optimization command. It does **not** document a GPT Image 2
  source, a Tripo task/account, the original source URL, or license/redistribution permission.
  No such permission is inferred here. The submission owner and downstream redistributors must
  confirm authorization with the contributor before publication or redistribution.

The optional adult learner is a distinct Submission Period asset:

- `assets/characters/learner.glb`, designed with GPT Image 2 through Tripo's image task, then
  reconstructed, PBR-textured, rigged and animated by Tripo.

The white-dove ambient asset is another Submission Period production output:

- `assets/creatures/white-dove.glb`, sourced with Tripo's hosted GPT Image 2 task and rebuilt as
  a detailed PBR model with Tripo v3.1. Its full task, prompt, credit, post-process and hash
  record is `assets/generated/ambient-avian-v1/manifest.json`.

Tripo is an asset-production tool only; this repository has no Tripo runtime API. The adult
learner and dove generation manifests are checked in. The dove is a static mesh without a skin
or animation clip; runtime path motion is not described as provider-generated skeletal
animation. Named character assets represent AI interpretive lenses and do not claim
endorsement, quotation or authentic reconstruction.

Tripo output rights depend on the generating account tier under Tripo's current terms. Confirm
the applicable account and output rights before commercial redistribution; the repository's
MIT license does not relicense these GLBs or their GPT Image 2 source views.

## Companion portrait images

The following five portrait files have Wikimedia Commons source pages:

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

The Freud, Qi Baishi and Yayoi Kusama files are local MUSE character-reference images and are
not described as public-domain documentary portraits. Yayoi Kusama is living; neither her
portrait nor generated representation is described as a public-domain historical likeness.
Current runtime configuration does not load or display the Yayoi Kusama portrait.

`freud-card.jpg`, `qi-baishi-card.jpg` and `yayoi-kusama-card.jpg` are mechanically cropped
single-view derivatives of those same local turnaround images. The crops do not change their
character-interpretation or likeness status; exact hashes are recorded in
`docs/PROVENANCE.md`.

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

No cloned voice, recorded narration, stock interface illustration or alternate reasoning-model
runtime is bundled. MiniMax and optional OpenAI TTS narration map characters to generic system
voices and never claim to be a historical person. MP3 responses are used for immediate playback,
are not written into the repository or application storage, and their browser object URLs are
revoked after playback. If remote speech is unavailable, browser `SpeechSynthesis` reads the
same visible text.

Dynamic text dialogue requests GPT-5.6 through the configured exact-allowlist origin. With the
official origin, the independent Voice control can use OpenAI Realtime WebRTC with the built-in
`marin` voice; the authorized compatible gateway remains reasoning-only. Where supported, its
browser fallback uses `SpeechRecognition` for input, the same GPT-5.6 or curated local dialogue
path for the response, and `SpeechSynthesis` for output. Text interaction remains available
when microphone permission or speech services are unavailable; no fallback adds another
language/reasoning model.
