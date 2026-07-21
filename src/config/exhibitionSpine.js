// Canonical MUSE Infinity exhibition order. The answer world is deliberately
// exported separately so navigation and lesson generation cannot reveal it early.

const asset = (role, path, bytes, format) => Object.freeze({ role, path, bytes, format });

const scene = (value) => Object.freeze({
  ...value,
  isFinal: false,
  prompt: value.question,
  assets: Object.freeze(value.assets)
});

export const EXHIBITION_SPINE = Object.freeze([
  scene({
    order: 1,
    id: "threshold-conservatory",
    worldId: "grand-conservatory-with-lush-gardens",
    chapter: "01 / ARRIVAL",
    title: "The Threshold Conservatory",
    artist: "A cross-temporal salon",
    guide: "Mira",
    guideId: "mira",
    question: "What must become visible before an answer can begin?",
    image: "/assets/scenes/01-entrance-conservatory.png",
    thumbnail: "/assets/thumbs/grand-conservatory-with-lush-gardens.jpg",
    detail: Object.freeze({ id: "visible-threshold", label: "the threshold between concealment and attention" }),
    assets: [
      asset("world", "/assets/worlds/grand-conservatory.rad", 87_503_680, "rad"),
      asset("collider", "/assets/worlds/grand-conservatory-collider.glb", 4_971_680, "glb")
    ]
  }),
  scene({
    order: 2,
    id: "court-of-light",
    worldId: "elegant-floral-palace-interior",
    chapter: "02 / QUESTION",
    title: "The Court of Light",
    artist: "Sigmund Freud",
    guide: "Sigmund Freud",
    guideId: "freud",
    question: "Which part of your question belongs to you, and which part was inherited?",
    image: "/assets/scenes/02-court-of-light.png",
    thumbnail: "/assets/thumbs/elegant-floral-palace-interior.jpg",
    detail: Object.freeze({ id: "inherited-question", label: "the boundary between chosen and inherited desire" }),
    assets: [
      asset("world", "/assets/worlds/elegant-floral-palace.rad", 93_239_352, "rad"),
      asset("collider", "/assets/worlds/elegant-floral-palace-collider.glb", 9_467_860, "glb")
    ]
  }),
  scene({
    order: 3,
    id: "water-and-light",
    worldId: "enchanted-water-garden-sanctuary",
    chapter: "03 / PERCEPTION",
    title: "The Garden of Water and Light",
    artist: "Claude Monet",
    guide: "Claude Monet",
    guideId: "monet",
    question: "Can a life change simply because attention becomes more precise?",
    image: "/assets/scenes/03-monet-water-and-light.png",
    thumbnail: "/assets/thumbs/enchanted-water-garden-sanctuary.jpg",
    detail: Object.freeze({ id: "shifting-light", label: "light that changes the scene before form settles" }),
    assets: [
      asset("world", "/assets/worlds/enchanted-water-garden.rad", 94_219_328, "rad"),
      asset("collider", "/assets/worlds/enchanted-water-garden-collider.glb", 2_371_536, "glb")
    ]
  }),
  scene({
    order: 4,
    id: "sunset-frames",
    worldId: "dreamlike-coastal-villa-gardens",
    chapter: "04 / INVENTION",
    title: "The Sunset Frame Gallery",
    artist: "Pablo Picasso",
    guide: "Pablo Picasso",
    guideId: "picasso",
    question: "What changes when the same truth is seen from more than one angle?",
    image: "/assets/scenes/04-sunset-frame-gallery.png",
    thumbnail: "/assets/thumbs/dreamlike-coastal-villa-gardens.jpg",
    detail: Object.freeze({ id: "multiple-frames", label: "competing frames that refuse one final viewpoint" }),
    assets: [
      asset("world", "/assets/worlds/dreamlike-coastal-villa.rad", 49_590_912, "rad"),
      asset("collider", "/assets/worlds/dreamlike-coastal-villa-collider.glb", 1_675_028, "glb")
    ]
  }),
  scene({
    order: 5,
    id: "burning-sky",
    worldId: "van-gogh-inspired-gallery-interior",
    chapter: "05 / INTENSITY",
    title: "The Studio of the Burning Sky",
    artist: "Vincent van Gogh",
    guide: "Vincent van Gogh",
    guideId: "van-gogh",
    question: "Can struggle deepen attention without becoming the source of meaning itself?",
    image: "/assets/scenes/05-van-gogh-burning-sky.png",
    thumbnail: "/assets/thumbs/van-gogh-inspired-gallery-interior.jpg",
    detail: Object.freeze({ id: "emotional-sky", label: "the point where observation becomes emotional intensity" }),
    assets: [
      asset("world", "/assets/worlds/van-gogh-gallery-hd.rad", 86_051_136, "rad"),
      asset("collider", "/assets/worlds/van-gogh-gallery-hd-collider.glb", 2_240_600, "glb")
    ]
  }),
  scene({
    order: 6,
    id: "petal-transition",
    worldId: "sunlit-palace-gardens",
    chapter: "06 / TRANSFORMATION",
    title: "The Petal Transition Hall",
    artist: "Qi Baishi",
    guide: "Qi Baishi",
    guideId: "qi-baishi",
    question: "How little can an image contain and still hold an entire world?",
    image: "/assets/scenes/06-petal-transition-hall.png",
    thumbnail: "/assets/thumbs/sunlit-palace-gardens.jpg",
    detail: Object.freeze({ id: "living-mark", label: "the smallest mark that still feels alive" }),
    assets: [
      asset("world", "/assets/worlds/sunlit-palace-gardens.rad", 96_949_128, "rad"),
      asset("collider", "/assets/worlds/sunlit-palace-gardens-collider.glb", 3_364_728, "glb")
    ]
  }),
  scene({
    order: 7,
    id: "living-memory",
    worldId: "mexican-courtyard-bedroom-fantasy",
    chapter: "07 / IDENTITY",
    title: "The Courtyard of Living Memory",
    artist: "Frida Kahlo",
    guide: "Frida Kahlo",
    guideId: "frida",
    question: "What can pain become after it is given color, symbol and form?",
    image: "/assets/scenes/07-frida-living-memory.png",
    thumbnail: "/assets/thumbs/mexican-courtyard-bedroom-fantasy.jpg",
    detail: Object.freeze({ id: "private-symbol", label: "a private memory translated into shared form" }),
    assets: [
      asset("world", "/assets/worlds/mexican-courtyard.rad", 95_765_920, "rad"),
      asset("collider", "/assets/worlds/mexican-courtyard-collider.glb", 4_957_180, "glb")
    ]
  }),
  scene({
    order: 8,
    id: "infinite-repetition",
    worldId: "yellow-polka-dot-infinity-room",
    chapter: "08 / INFINITY",
    title: "The Infinite Repetition Chamber",
    artist: "Infinity & Repetition Lens",
    guide: "Infinity & Repetition Lens",
    guideId: "yayoi-kusama",
    question: "If the self repeats into infinity, what remains uniquely yours?",
    image: "/assets/scenes/08-kusama-infinite-dots.png",
    thumbnail: "/assets/thumbs/yellow-polka-dot-infinity-room.jpg",
    detail: Object.freeze({ id: "repeated-self", label: "the self repeating until its boundary becomes uncertain" }),
    assets: [
      asset("world", "/assets/worlds/yellow-infinity-room-texture-mesh.glb", 73_136_900, "glb"),
      asset("world-fallback", "/assets/worlds/yellow-infinity-room.spz", 26_658_000, "spz"),
      asset("collider", "/assets/worlds/yellow-infinity-room-collider.glb", 2_007_592, "glb")
    ]
  })
]);

export const FINAL_SCENE = Object.freeze({
  order: 9,
  id: "personal-dream-world",
  worldId: "fantasy-realm-of-shimmering-spheres",
  chapter: "09 / ANSWER",
  title: "Your Dream World",
  artist: "A world formed from your answer",
  guide: "Mira + your chosen companions",
  guideId: "mira",
  question: "What will you carry back into the life outside this world?",
  prompt: "What will you carry back into the life outside this world?",
  image: "/assets/scenes/09-final-dream-world.png",
  thumbnail: "/assets/thumbs/fantasy-realm-of-shimmering-spheres.jpg",
  detail: Object.freeze({ id: "authored-answer", label: "the answer made spatial and inhabitable" }),
  isFinal: true,
  assets: Object.freeze([
    asset("world", "/assets/worlds/fantasy-shimmering-spheres-texture-mesh.glb", 93_404_352, "glb"),
    asset("collider", "/assets/worlds/fantasy-shimmering-spheres-collider.glb", 1_456_868, "glb")
  ])
});

export const ALL_EXHIBITION_SCENES = Object.freeze([...EXHIBITION_SPINE, FINAL_SCENE]);

export function getExhibitionScene(id) {
  return ALL_EXHIBITION_SCENES.find((item) => item.id === id || item.worldId === id) || null;
}
