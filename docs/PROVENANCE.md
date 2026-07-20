# Provenance and clean-rebuild boundary

## Authorship boundary

The runtime in this repository was created in Codex session `019f7e53-4039-7cc1-9162-01906bec47b7` for OpenAI Build Week. The prior `/Users/expansioai/project/muse-infinity` repository contains earlier mixed-agent work and is not the source tree for this project.

The prior repository was inspected for facts that do not constitute copied implementation:

- World Labs Marble request shape and `WLT-Api-Key` header;
- Spark 2.1 renderer compatibility;
- the distinction between raw Marble OpenCV coordinates and pre-baked exports;
- known-good artwork source records;
- the fact that large static character GLBs did not provide articulated walking.

No legacy application module, server module, UI stylesheet, character model or generated voice path is shipped here. The new renderer, procedural character hierarchy, guide state machine, shared contracts, OpenAI service, UI, room service and tests were written for this repository.

## Reused asset ledger

| Shipped file | Source | Rights / provenance | SHA-256 |
| --- | --- | --- | --- |
| `assets/art/water-lilies.jpg` | [Art Institute of Chicago, Water Lilies](https://www.artic.edu/artworks/16568/water-lilies) | Public-domain artwork image via Open Access / IIIF; copied from the previously downloaded project asset | `06367197ac8d6745537dcfe6722ff4b8ef2cb33e044168d8c471782b55f7dd39` |
| `assets/art/bedroom.jpg` | [Art Institute of Chicago, The Bedroom](https://www.artic.edu/artworks/28560/the-bedroom) | Public-domain artwork image via Open Access / IIIF; copied from the previously downloaded project asset | `cb5839d854aa1a092801939b8d732fa653f22a1c87fdbbd7248c9882250ce400` |
| `assets/art/grande-jatte.jpg` | [Art Institute of Chicago, A Sunday on La Grande Jatte](https://www.artic.edu/artworks/27992/a-sunday-on-la-grande-jatte-1884) | Public-domain artwork image via Open Access / IIIF; copied from the previously downloaded project asset | `90197c037e6041fcae1c35606b921b5b626d868c2ff21cd653edb640b3f6e2dd` |
| `assets/worlds/bright-gallery.spz` | World Labs Marble world generation, earlier MUSE research run; world id prefix documented as `705b7748...` | Project-generated world output; included as an optional archived layer, not required for the stable path | `94581444a2d4ff67efc4cc2f092972f51ac2bd2afbecfb6118dd053d6a84a499` |

## Coordinate note

The archived Bright Gallery asset is a raw Marble `.spz` in OpenCV convention. The loader applies the previously verified semantic transform:

```text
scale = 0.80177665
rotation = Rx(pi)
translation.y = 0.5
```

This transformation is data provenance, not copied application logic. Procedural worlds use native Three.js coordinates and are the stable rendering path.

## Generated and interpretive content

- Mira, the learner and Salon characters are built at runtime from Three.js primitive geometry.
- Their appearances are fictional and are not representations of historical artists.
- Salon text is explicitly interpretive. It is grounded in the current session digest, not presented as authentic artist quotation.
- The curated lesson text was authored for this project and uses public artwork metadata as factual anchors.
