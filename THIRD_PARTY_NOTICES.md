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

This repository does not bundle or play any third-party background-music recording. Its
four-profile score is Submission Period source code in `src/services/sound-experience.js`:
deterministic Web Audio oscillators generate the pitches in the browser without recording
samples or reference audio. The code is covered by this repository's MIT license; there is no
separate music file, performer or recording asset to license.

The official rules require authorization for third-party content and prohibit copyrighted music
in the demo video without permission.
Any future recorded or generated soundtrack asset must therefore record the exact asset hash,
source, performer or generator, rights holder, license or commercial-use grant, and the terms
snapshot relied on. For generated music, also retain the provider and model version, account
tier, task ID, full prompt, generation date and whether any reference audio was uploaded. AI
generation alone is not evidence that an output is unique or cleared for use; prompts must not
request imitation of an identifiable artist or existing recording.

## OpenAI model services

The judging configuration requests OpenAI GPT-5.6 Responses, OpenAI Realtime and
`gpt-4o-mini-tts` narration directly from `api.openai.com`. TTS renders already-visible lines
as speech; it is not used for language reasoning. Supported browsers may use
`SpeechRecognition` and `SpeechSynthesis` as speech-only fallbacks. Recognized text still uses
the official GPT-5.6 dialogue path or its labeled curated local fallback. Runtime reasoning
model selection is fixed to the checked-in GPT constants.

Use of the official OpenAI API is governed by the terms associated with the operator's OpenAI
account. API credentials remain server-side and are not bundled as software or committed to
the repository.

## World Labs scene assets

The nine canonical spaces, their colliders, thumbnails and interpretive scene images are
prepared MUSE assets. Scenes 1-7 deploy Spark quality RAD derivatives built from World Labs
SPZ sources; scene 8 deploys an 8K texture mesh with its SPZ as a fallback; scene 9 deploys an
8K texture mesh.
Exact filenames, derivations, bytes and hashes are recorded in `docs/PROVENANCE.md`.

The older `bright-gallery.spz`, `van-gogh-gallery.spz` and `infinity-room.spz` derivatives
remain only as noncanonical compatibility records. They are not used by the 8+1 route.

World Labs produced prepared assets and also backs an optional auxiliary Forge endpoint. Forge
requires both a server-side World Labs key and an exact admin token, accepts an administrator's
spatial prompt, and returns an isolated generation operation; it is outside the canonical 8+1
journey and receives no visitor question, evidence or conversation data. World Labs does not
provide language reasoning. Generated asset use remains subject to the terms of the authorized
account; the repository's MIT license does not replace those terms.

## Tripo character assets

These browser-optimized GLBs were derived from MUSE Tripo character outputs:

- `assets/characters/monet.glb`
- `assets/characters/van-gogh.glb`
- `assets/characters/socrates.glb`
- `assets/characters/frida.glb`
- `assets/characters/picasso.glb`
- `assets/characters/freud.glb`
- `assets/characters/qi-baishi.glb`
- `assets/characters/yayoi-kusama.glb`

The fictional learner is a separate Submission Period asset:

- `assets/characters/learner.glb`, designed with GPT Image 2 through Tripo's image task, then
  reconstructed, PBR-textured, rigged and animated by Tripo.

Tripo is an asset-production tool only; this repository has no Tripo runtime API. The learner's
generation manifest is checked in. The historical figures are interpretive representations and
do not claim endorsement, quotation or authentic reconstruction.

Tripo output rights depend on the generating account tier under Tripo's current terms. Confirm
the applicable account and output rights before commercial redistribution; the repository's
MIT license does not relicense this GLB or its GPT Image 2 source views.

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
runtime is bundled. Optional OpenAI TTS narration maps characters to generic system voices and
never claims to be a historical person. MP3 responses are used for immediate playback,
are not written into the repository or application storage, and their browser object URLs are
revoked after playback. If remote speech is unavailable, browser `SpeechSynthesis` reads the
same visible text.

Dynamic text dialogue requests `gpt-5.6` through the official OpenAI API. The independent Voice
control prefers OpenAI Realtime WebRTC with the built-in `marin` voice. Where supported, its
browser fallback uses `SpeechRecognition` for input, the same GPT-5.6 or curated local dialogue
path for the response, and `SpeechSynthesis` for output. Text interaction remains available
when microphone permission or speech services are unavailable; no fallback adds another
language/reasoning model.
