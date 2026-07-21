import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIRECTORY = path.join(ROOT, "assets/living-artworks");
const MANIFEST_DIRECTORY = path.join(ROOT, "assets/generated/living-artworks-v1");
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_PRIMITIVES = 12;
const MAX_TRIANGLES = 100_000;

installNodeFileReader();

const ASSETS = Object.freeze([
  {
    artworkId: "aic-153799",
    title: "Water and Footfall",
    concept: "Layered water ripples and a stepping shoe emerge from the painted river surface.",
    build: buildWaterFootfall
  },
  {
    artworkId: "aic-14655",
    title: "Runaway Yarn",
    concept: "A wound crimson yarn ball and loose strand roll forward from the portrait plane.",
    build: buildRunawayYarn
  },
  {
    artworkId: "aic-16568",
    title: "Water Lily Reflection",
    concept: "Water-lily pads, blossoms, and reflected ripples rise in shallow luminous layers.",
    build: buildWaterLilies
  },
  {
    artworkId: "aic-111436",
    title: "Apple and Fold",
    concept: "Cezanne-like fruit advances over a warped tablecloth that refuses one perspective.",
    build: buildAppleAndFold
  },
  {
    artworkId: "aic-28560",
    title: "Bedroom Chair",
    concept: "A compact painted chair and tilted floor unfold beyond the bedroom frame.",
    build: buildBedroomChair
  },
  {
    artworkId: "aic-27992",
    title: "Pointillist Monkey",
    concept: "A monkey silhouette assembles from colored points above a calm concentric ripple.",
    build: buildPointillistMonkey
  },
  {
    artworkId: "aic-26650",
    title: "Newsprint and Petals",
    concept: "Folded newsprint opens outward while flowers and loose petals cross its edge.",
    build: buildNewsprintAndPetals
  },
  {
    artworkId: "aic-8991",
    title: "Abstract Color Wave",
    concept: "Kandinsky-like arcs, discs, and color lines surge out as a spatial composition.",
    build: buildAbstractColorWave
  }
]);

await fs.mkdir(OUTPUT_DIRECTORY, { recursive: true });
await fs.mkdir(MANIFEST_DIRECTORY, { recursive: true });

const exporter = new GLTFExporter();
const files = [];

for (const asset of ASSETS) {
  const scene = createScene(asset);
  const arrayBuffer = await exporter.parseAsync(scene, {
    binary: true,
    onlyVisible: true,
    includeCustomExtensions: false
  });
  const buffer = Buffer.from(arrayBuffer);
  const stats = inspectGlb(buffer, asset.artworkId);
  validateBudget(buffer, stats, asset.artworkId);

  const fileName = `${asset.artworkId}-v1.glb`;
  await fs.writeFile(path.join(OUTPUT_DIRECTORY, fileName), buffer);
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  files.push({
    artworkId: asset.artworkId,
    file: `../../living-artworks/${fileName}`,
    bytes: buffer.length,
    sha256,
    ...stats,
    title: asset.title,
    concept: asset.concept
  });
  process.stdout.write(
    `${fileName}: ${formatBytes(buffer.length)}, ${stats.primitives} primitives, ${stats.triangles} triangles\n`
  );
}

const manifest = {
  schemaVersion: 1,
  collection: "living-artworks-v1",
  purpose: "Local shallow-relief story elements for eight MUSE hero artworks",
  provenance: {
    assetOrigin: "MUSE-authored procedural GLB v1",
    generationMethod: "Deterministic local Three.js geometry authored by this repository script",
    externalGenerationProvider: null,
    historicalStatus: "Visual reenactments are interpretive and not historical testimony"
  },
  runtimeContract: {
    anchorPlane: "local XY plane at Z=0",
    projectionDirection: "+Z toward the visitor",
    animation: "Runtime procedural timelines; GLB files contain static authored geometry"
  },
  budgets: {
    maximumBytesPerAsset: MAX_BYTES,
    maximumPrimitivesPerAsset: MAX_PRIMITIVES,
    maximumTrianglesPerAsset: MAX_TRIANGLES
  },
  files
};

await fs.writeFile(
  path.join(MANIFEST_DIRECTORY, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`
);

function createScene(asset) {
  const scene = new THREE.Scene();
  scene.name = `${asset.artworkId}-living-artwork-v1`;
  scene.userData = {
    assetOrigin: "MUSE-authored procedural GLB v1",
    artworkId: asset.artworkId,
    concept: asset.concept,
    historicalStatus: "Interpretive reenactment; not historical testimony",
    projectionDirection: "+Z"
  };

  const root = new THREE.Group();
  root.name = "LivingArtworkRoot";
  root.userData.storyTransformTarget = true;
  scene.add(root);
  asset.build(root);

  root.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    object.geometry.computeBoundingBox();
    object.geometry.computeBoundingSphere();
  });
  return scene;
}

function buildWaterFootfall(root) {
  addMesh(
    root,
    "RiverReflection",
    transform(new THREE.CircleGeometry(0.67, 64), { scale: [1, 0.52, 1], position: [0, -0.06, 0.025] }),
    material("River blue", 0x367b86, { roughness: 0.22, metalness: 0.16, transparent: true, opacity: 0.76 })
  );

  const ripples = [
    [0.2, 0.1, 0.055],
    [0.31, 0.13, 0.07],
    [0.44, 0.16, 0.08]
  ].map(([radius, y, z], index) =>
    transform(new THREE.TorusGeometry(radius, 0.012 - index * 0.0015, 8, 64), {
      scale: [1.25, 0.58, 1],
      position: [-0.11, y, z]
    })
  );
  addMesh(
    root,
    "ConcentricRipples",
    merge(ripples),
    material("Sunlit ripple", 0xc3ede1, { roughness: 0.16, metalness: 0.25, emissive: 0x163a35, emissiveIntensity: 0.24 })
  );

  addMesh(
    root,
    "SteppingShoe",
    transform(new THREE.SphereGeometry(0.22, 32, 18), {
      scale: [1.5, 0.56, 0.68],
      rotation: [0.17, -0.3, -0.18],
      position: [0.16, 0.22, 0.43]
    }),
    material("Weathered leather", 0x45332b, { roughness: 0.68, metalness: 0.03 })
  );
  addMesh(
    root,
    "ShoeHighlight",
    transform(new THREE.SphereGeometry(0.16, 24, 12), {
      scale: [1.45, 0.38, 0.24],
      rotation: [0.17, -0.3, -0.18],
      position: [0.18, 0.25, 0.56]
    }),
    material("Wet leather highlight", 0x9c8066, { roughness: 0.2, metalness: 0.08 })
  );
  addMesh(
    root,
    "Ankle",
    transform(new THREE.CapsuleGeometry(0.13, 0.34, 8, 16), {
      rotation: [0.1, 0, -0.2],
      position: [0.02, 0.52, 0.35]
    }),
    material("Trouser shadow", 0x2d4a4a, { roughness: 0.78 })
  );
}

function buildRunawayYarn(root) {
  addMesh(
    root,
    "YarnCore",
    transform(new THREE.IcosahedronGeometry(0.31, 3), { position: [0.08, -0.03, 0.44] }),
    material("Crimson wool", 0x9c253d, { roughness: 0.93, metalness: 0 })
  );

  const yarnBands = [
    { scale: [1, 0.75, 1.04], rotation: [0.2, 0.35, 0] },
    { scale: [0.95, 1.02, 0.73], rotation: [0.55, 0.05, 0.85] },
    { scale: [0.8, 1.03, 1.02], rotation: [-0.5, 0.65, -0.3] }
  ].map(({ scale, rotation }) =>
    transform(new THREE.TorusGeometry(0.265, 0.013, 8, 56), {
      scale,
      rotation,
      position: [0.08, -0.03, 0.45]
    })
  );
  addMesh(
    root,
    "WoundYarn",
    merge(yarnBands),
    material("Yarn strand", 0xe25868, { roughness: 0.74, emissive: 0x2c0710, emissiveIntensity: 0.18 })
  );

  const looseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.15, -0.14, 0.46),
    new THREE.Vector3(-0.38, -0.28, 0.34),
    new THREE.Vector3(-0.56, -0.1, 0.22),
    new THREE.Vector3(-0.38, 0.12, 0.13),
    new THREE.Vector3(-0.64, 0.25, 0.06)
  ]);
  addMesh(
    root,
    "LooseYarnTail",
    new THREE.TubeGeometry(looseCurve, 64, 0.014, 8, false),
    material("Loose crimson fiber", 0xc23a50, { roughness: 0.82 })
  );

  addMesh(
    root,
    "YarnShadow",
    transform(new THREE.CircleGeometry(0.3, 40), {
      scale: [1.3, 0.52, 1],
      position: [0.08, -0.18, 0.055]
    }),
    material("Soft portrait shadow", 0x302735, { roughness: 1, transparent: true, opacity: 0.54 })
  );
}

function buildWaterLilies(root) {
  addMesh(
    root,
    "ReflectingWater",
    transform(new THREE.CircleGeometry(0.72, 72), { scale: [1, 0.64, 1], position: [0, -0.03, 0.025] }),
    material("Violet water", 0x4a6685, { roughness: 0.18, metalness: 0.22, transparent: true, opacity: 0.78 })
  );

  const pads = [
    [-0.34, 0.12, 0.13, 0.23],
    [0.24, -0.18, 0.19, 0.28],
    [0.32, 0.28, 0.11, 0.18]
  ].map(([x, y, z, radius]) =>
    transform(new THREE.CircleGeometry(radius, 32, 0.16, Math.PI * 1.78), {
      scale: [1.3, 0.66, 1],
      rotation: [0.05, 0.08, x],
      position: [x, y, z]
    })
  );
  addMesh(root, "LilyPads", merge(pads), material("Lily green", 0x55775a, { roughness: 0.52 }));

  const petalGeometries = [];
  const centerGeometries = [];
  for (const [cx, cy, cz, scale] of [[-0.2, 0.14, 0.24, 1], [0.28, 0.28, 0.23, 0.72]]) {
    for (let index = 0; index < 10; index += 1) {
      const angle = (index / 10) * Math.PI * 2;
      petalGeometries.push(
        transform(new THREE.SphereGeometry(0.085 * scale, 16, 8), {
          scale: [1.55, 0.5, 0.34],
          rotation: [0, 0, angle],
          position: [cx + Math.cos(angle) * 0.075 * scale, cy + Math.sin(angle) * 0.075 * scale, cz]
        })
      );
    }
    centerGeometries.push(
      transform(new THREE.SphereGeometry(0.05 * scale, 18, 10), { scale: [1, 1, 0.55], position: [cx, cy, cz + 0.035] })
    );
  }
  addMesh(
    root,
    "LilyPetals",
    merge(petalGeometries),
    material("Pearl petals", 0xe9d8db, { roughness: 0.3, emissive: 0x281b28, emissiveIntensity: 0.18 })
  );
  addMesh(root, "LilyCenters", merge(centerGeometries), material("Pollen gold", 0xd8ac49, { roughness: 0.48 }));

  const rings = [0.28, 0.42, 0.57].map((radius, index) =>
    transform(new THREE.TorusGeometry(radius, 0.007, 6, 64), {
      scale: [1, 0.64, 1],
      position: [0, -0.02, 0.09 + index * 0.012]
    })
  );
  addMesh(root, "ReflectionRings", merge(rings), material("Lavender glint", 0xa9b8d5, { roughness: 0.16, metalness: 0.3 }));
}

function buildAppleAndFold(root) {
  addMesh(
    root,
    "ImpossibleTablecloth",
    createWavyCloth(1.3, 0.92, 28, 20),
    material("Chalk linen", 0xc8b58f, { roughness: 0.84, doubleSide: true })
  );

  const redApples = [
    [-0.32, 0.18, 0.34, 0.18],
    [0.02, 0.13, 0.49, 0.205]
  ].map(([x, y, z, radius]) =>
    transform(new THREE.SphereGeometry(radius, 28, 18), {
      scale: [1, 0.9, 0.92],
      position: [x, y, z]
    })
  );
  addMesh(root, "RedApples", merge(redApples), material("Vermilion apple", 0x9c3829, { roughness: 0.47 }));

  addMesh(
    root,
    "GoldenApple",
    transform(new THREE.SphereGeometry(0.17, 28, 18), {
      scale: [1.05, 0.88, 0.95],
      position: [0.34, -0.08, 0.39]
    }),
    material("Ochre apple", 0xc88b36, { roughness: 0.5 })
  );

  const stems = [
    [-0.32, 0.34, 0.35, -0.15],
    [0.02, 0.315, 0.51, 0.08],
    [0.34, 0.07, 0.41, 0.12]
  ].map(([x, y, z, rz]) =>
    transform(new THREE.CylinderGeometry(0.012, 0.017, 0.12, 10), {
      rotation: [0.1, 0, rz],
      position: [x, y, z]
    })
  );
  addMesh(root, "AppleStems", merge(stems), material("Stem umber", 0x3c3024, { roughness: 0.9 }));

  addMesh(
    root,
    "TableEdge",
    transform(new THREE.BoxGeometry(1.22, 0.075, 0.13, 1, 1, 2), { position: [0, -0.48, 0.18] }),
    material("Painted table edge", 0x4b4842, { roughness: 0.65 })
  );
}

function buildBedroomChair(root) {
  addMesh(
    root,
    "TiltedFloor",
    transform(new THREE.BoxGeometry(1.26, 0.84, 0.055, 1, 1, 1), {
      rotation: [0.08, -0.06, -0.025],
      position: [0, -0.08, 0.1]
    }),
    material("Bedroom floor", 0xbd6d35, { roughness: 0.72 })
  );

  const chairWood = [
    transform(new THREE.BoxGeometry(0.56, 0.12, 0.52), { rotation: [-0.12, 0, 0], position: [0.06, 0.02, 0.38] }),
    transform(new THREE.BoxGeometry(0.09, 0.76, 0.09), { position: [-0.2, 0.37, 0.29] }),
    transform(new THREE.BoxGeometry(0.09, 0.76, 0.09), { position: [0.32, 0.37, 0.29] }),
    transform(new THREE.BoxGeometry(0.56, 0.08, 0.09), { position: [0.06, 0.68, 0.29] }),
    transform(new THREE.BoxGeometry(0.5, 0.07, 0.07), { position: [0.06, 0.48, 0.3] }),
    transform(new THREE.BoxGeometry(0.075, 0.55, 0.075), { rotation: [0.09, 0, 0.03], position: [-0.18, -0.28, 0.32] }),
    transform(new THREE.BoxGeometry(0.075, 0.55, 0.075), { rotation: [0.09, 0, -0.03], position: [0.3, -0.28, 0.32] })
  ];
  addMesh(root, "PaintedChairFrame", merge(chairWood), material("Van Gogh blue wood", 0x2878a2, { roughness: 0.57 }));

  addMesh(
    root,
    "ChairSeat",
    transform(new THREE.BoxGeometry(0.48, 0.08, 0.42, 2, 1, 2), {
      rotation: [-0.12, 0, 0],
      position: [0.06, 0.04, 0.52]
    }),
    material("Rush seat", 0xc8a43e, { roughness: 0.88 })
  );

  const roomLines = [
    transform(new THREE.BoxGeometry(1.18, 0.035, 0.035), { rotation: [0, 0, 0.08], position: [0, 0.35, 0.085] }),
    transform(new THREE.BoxGeometry(0.035, 0.75, 0.035), { rotation: [0, 0, -0.07], position: [-0.54, 0.05, 0.09] }),
    transform(new THREE.BoxGeometry(0.035, 0.75, 0.035), { rotation: [0, 0, 0.06], position: [0.55, 0.05, 0.09] })
  ];
  addMesh(root, "RoomPerspectiveLines", merge(roomLines), material("Ultramarine outline", 0x173d79, { roughness: 0.4 }));

  addMesh(
    root,
    "RoomSun",
    transform(new THREE.CircleGeometry(0.17, 36), { position: [-0.37, 0.25, 0.11] }),
    material("Bedroom yellow", 0xe6be38, { roughness: 0.46, emissive: 0x432a00, emissiveIntensity: 0.25 })
  );
}

function buildPointillistMonkey(root) {
  addMesh(
    root,
    "RiverRipple",
    merge([0.23, 0.36, 0.5].map((radius, index) =>
      transform(new THREE.TorusGeometry(radius, 0.008, 6, 64), {
        scale: [1.25, 0.5, 1],
        position: [0, -0.34, 0.05 + index * 0.012]
      })
    )),
    material("Seurat water glint", 0x5f9d9b, { roughness: 0.3, metalness: 0.16 })
  );

  const monkey = [
    transform(new THREE.SphereGeometry(0.22, 20, 14), { scale: [0.72, 1.15, 0.62], position: [0.07, 0.07, 0.37] }),
    transform(new THREE.SphereGeometry(0.13, 18, 12), { scale: [0.82, 1, 0.75], position: [0.11, 0.31, 0.42] }),
    transform(new THREE.SphereGeometry(0.055, 14, 8), { scale: [1, 1.25, 0.65], position: [0.01, 0.38, 0.44] }),
    transform(new THREE.SphereGeometry(0.055, 14, 8), { scale: [1, 1.25, 0.65], position: [0.2, 0.38, 0.44] }),
    transform(new THREE.CapsuleGeometry(0.045, 0.26, 6, 12), { rotation: [0, 0, -0.72], position: [-0.1, 0.1, 0.37] }),
    transform(new THREE.CapsuleGeometry(0.045, 0.25, 6, 12), { rotation: [0, 0, 0.72], position: [0.24, 0.09, 0.37] })
  ];
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.15, 0.02, 0.37),
    new THREE.Vector3(0.4, 0.02, 0.31),
    new THREE.Vector3(0.44, 0.25, 0.25),
    new THREE.Vector3(0.3, 0.36, 0.22)
  ]);
  monkey.push(new THREE.TubeGeometry(tailCurve, 42, 0.035, 8, false));
  addMesh(root, "MonkeySilhouette", merge(monkey), material("Pointillist silhouette", 0x3a2b38, { roughness: 0.83 }));

  const dotPalette = [0xcb3e4d, 0xe1ba4b, 0x5c86a5, 0x6f8744, 0xe9d4a0];
  const dotGroups = dotPalette.map(() => []);
  for (let index = 0; index < 75; index += 1) {
    const angle = index * 2.399963;
    const radius = 0.12 + (index % 13) * 0.041;
    const x = Math.cos(angle) * radius - 0.06;
    const y = Math.sin(angle) * radius * 0.78 + 0.08;
    const z = 0.12 + (index % 7) * 0.018;
    dotGroups[index % dotGroups.length].push(
      transform(new THREE.SphereGeometry(0.018 + (index % 3) * 0.004, 8, 5), { position: [x, y, z] })
    );
  }
  dotGroups.forEach((geometries, index) => {
    addMesh(
      root,
      `PointCloud${index + 1}`,
      merge(geometries),
      material(`Point color ${index + 1}`, dotPalette[index], { roughness: 0.58, emissive: dotPalette[index], emissiveIntensity: 0.06 })
    );
  });
}

function buildNewsprintAndPetals(root) {
  const pages = [
    transform(new THREE.BoxGeometry(0.62, 0.78, 0.025, 6, 8, 1), {
      rotation: [0.04, -0.24, 0.11],
      position: [-0.24, 0.02, 0.25]
    }),
    transform(new THREE.BoxGeometry(0.62, 0.78, 0.025, 6, 8, 1), {
      rotation: [0.03, 0.28, -0.1],
      position: [0.25, 0.03, 0.28]
    })
  ];
  addMesh(root, "OpenNewspaper", merge(pages), material("Warm newsprint", 0xd8d0b8, { roughness: 0.94 }));

  const printLines = [];
  for (const side of [-1, 1]) {
    for (let row = 0; row < 8; row += 1) {
      const length = row % 3 === 0 ? 0.2 : 0.24;
      printLines.push(
        transform(new THREE.BoxGeometry(length, 0.012, 0.008), {
          rotation: [0, side * 0.25, side * -0.1],
          position: [side * 0.24, 0.27 - row * 0.072, 0.31]
        })
      );
    }
  }
  addMesh(root, "NewsprintLines", merge(printLines), material("Printed ink", 0x3f3b38, { roughness: 0.8 }));

  const stems = [
    [[-0.38, -0.3, 0.18], [-0.31, 0.17, 0.56]],
    [[0.32, -0.35, 0.17], [0.23, 0.23, 0.59]],
    [[0.05, -0.39, 0.16], [-0.05, 0.34, 0.52]]
  ].map(([start, end]) => new THREE.TubeGeometry(
    new THREE.LineCurve3(new THREE.Vector3(...start), new THREE.Vector3(...end)),
    12,
    0.012,
    7,
    false
  ));
  addMesh(root, "FlowerStems", merge(stems), material("Stem green", 0x476744, { roughness: 0.72 }));

  const petalColors = [0xc65f69, 0xd8ad49, 0x8c74a6];
  const flowers = [
    [-0.31, 0.22, 0.59, 0],
    [0.23, 0.29, 0.62, 1],
    [-0.05, 0.39, 0.56, 2]
  ];
  const petalsByColor = petalColors.map(() => []);
  const centers = [];
  flowers.forEach(([cx, cy, cz, colorIndex]) => {
    for (let index = 0; index < 7; index += 1) {
      const angle = (index / 7) * Math.PI * 2;
      petalsByColor[colorIndex].push(
        transform(new THREE.SphereGeometry(0.075, 14, 8), {
          scale: [1.25, 0.5, 0.28],
          rotation: [0, 0, angle],
          position: [cx + Math.cos(angle) * 0.068, cy + Math.sin(angle) * 0.068, cz]
        })
      );
    }
    centers.push(transform(new THREE.SphereGeometry(0.043, 14, 8), { position: [cx, cy, cz + 0.025] }));
  });
  petalsByColor.forEach((geometries, index) => {
    addMesh(root, `FlowerPetals${index + 1}`, merge(geometries), material(`Petal color ${index + 1}`, petalColors[index], { roughness: 0.46 }));
  });
  addMesh(root, "FlowerCenters", merge(centers), material("Flower centers", 0xd7a72c, { roughness: 0.5 }));
}

function buildAbstractColorWave(root) {
  const backdropDiscs = [
    transform(new THREE.CircleGeometry(0.31, 48), { scale: [1, 0.86, 1], position: [-0.28, 0.12, 0.035] }),
    transform(new THREE.CircleGeometry(0.2, 40), { scale: [1.2, 0.9, 1], position: [0.38, -0.18, 0.065] })
  ];
  addMesh(root, "SpatialDiscs", merge(backdropDiscs), material("Grounded ivory", 0xd8c896, { roughness: 0.61 }));

  const lineSets = [
    {
      name: "CobaltWave",
      color: 0x2959a5,
      points: [[-0.66, -0.28, 0.12], [-0.28, -0.12, 0.34], [0.04, 0.22, 0.58], [0.58, 0.34, 0.3]]
    },
    {
      name: "VermilionWave",
      color: 0xbd3d32,
      points: [[-0.57, 0.35, 0.1], [-0.2, 0.22, 0.28], [0.24, -0.08, 0.51], [0.63, -0.26, 0.24]]
    },
    {
      name: "GoldWave",
      color: 0xd5a62f,
      points: [[-0.42, -0.4, 0.08], [-0.12, -0.28, 0.4], [0.25, 0.16, 0.47], [0.48, 0.43, 0.18]]
    }
  ];
  lineSets.forEach(({ name, color, points }, index) => {
    const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
    addMesh(
      root,
      name,
      new THREE.TubeGeometry(curve, 72, 0.026 - index * 0.003, 10, false),
      material(name, color, { roughness: 0.3, metalness: 0.06, emissive: color, emissiveIntensity: 0.08 })
    );
  });

  const blackMarks = [
    transform(new THREE.TorusGeometry(0.29, 0.015, 7, 52, Math.PI * 1.35), { rotation: [0.1, 0.2, -0.2], position: [0.1, 0.02, 0.34] }),
    transform(new THREE.BoxGeometry(0.58, 0.025, 0.025), { rotation: [0.1, -0.1, 0.72], position: [-0.2, 0.04, 0.25] }),
    transform(new THREE.BoxGeometry(0.48, 0.022, 0.022), { rotation: [-0.05, 0.15, -0.5], position: [0.25, 0.12, 0.39] })
  ];
  addMesh(root, "BlackCounterpoint", merge(blackMarks), material("Graphite counterpoint", 0x242126, { roughness: 0.66 }));

  const colorOrbs = [
    [-0.38, 0.28, 0.31, 0.105],
    [0.33, 0.29, 0.49, 0.085],
    [0.08, -0.31, 0.46, 0.12]
  ].map(([x, y, z, radius]) => transform(new THREE.SphereGeometry(radius, 20, 12), { scale: [1, 1, 0.58], position: [x, y, z] }));
  addMesh(root, "FloatingColorNotes", merge(colorOrbs), material("Teal notes", 0x3c8a7c, { roughness: 0.35, metalness: 0.08 }));
}

function createWavyCloth(width, height, segmentsX, segmentsY) {
  const geometry = new THREE.PlaneGeometry(width, height, segmentsX, segmentsY);
  const positions = geometry.attributes.position;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const depth = 0.09
      + (0.31 * (1 - (y + height / 2) / height))
      + Math.sin((x / width) * Math.PI * 3.2 + y * 2.8) * 0.055;
    positions.setZ(index, Math.max(0.035, depth));
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.name = "Warped cloth relief";
  return geometry;
}

function material(name, color, options = {}) {
  const {
    roughness = 0.58,
    metalness = 0.04,
    emissive = 0x000000,
    emissiveIntensity = 0,
    transparent = false,
    opacity = 1,
    doubleSide = false
  } = options;
  const value = new THREE.MeshStandardMaterial({
    name,
    color,
    roughness,
    metalness,
    emissive,
    emissiveIntensity,
    transparent,
    opacity,
    side: doubleSide ? THREE.DoubleSide : THREE.FrontSide
  });
  value.userData = { authoredFor: "MUSE living artworks v1" };
  return value;
}

function addMesh(root, name, geometry, meshMaterial) {
  geometry.name ||= `${name} geometry`;
  const mesh = new THREE.Mesh(geometry, meshMaterial);
  mesh.name = name;
  root.add(mesh);
  return mesh;
}

function transform(geometry, { position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1] } = {}) {
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
    new THREE.Vector3(...scale)
  );
  const copy = geometry.clone();
  copy.applyMatrix4(matrix);
  geometry.dispose();
  return copy;
}

function merge(geometries) {
  const result = mergeGeometries(geometries, false);
  for (const geometry of geometries) geometry.dispose();
  if (!result) throw new Error("Unable to merge living-artwork geometry");
  result.computeBoundingBox();
  result.computeBoundingSphere();
  return result;
}

function inspectGlb(buffer, label) {
  if (buffer.toString("ascii", 0, 4) !== "glTF" || buffer.readUInt32LE(4) !== 2) {
    throw new Error(`${label}: exporter did not produce GLB 2.0`);
  }
  if (buffer.readUInt32LE(8) !== buffer.length) throw new Error(`${label}: invalid GLB length`);
  const jsonLength = buffer.readUInt32LE(12);
  if (buffer.readUInt32LE(16) !== 0x4e4f534a) throw new Error(`${label}: missing GLB JSON chunk`);
  const json = JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength).trim());
  const primitives = (json.meshes || []).flatMap((mesh) => mesh.primitives || []);
  let triangles = 0;
  for (const primitive of primitives) {
    if (primitive.mode !== undefined && primitive.mode !== 4) throw new Error(`${label}: non-triangle primitive`);
    const accessor = json.accessors?.[primitive.indices ?? primitive.attributes?.POSITION];
    if (!accessor?.count) throw new Error(`${label}: primitive without geometry`);
    triangles += Math.floor(accessor.count / 3);
  }
  return {
    scenes: json.scenes?.length || 0,
    nodes: json.nodes?.length || 0,
    meshes: json.meshes?.length || 0,
    materials: json.materials?.length || 0,
    primitives: primitives.length,
    triangles
  };
}

function validateBudget(buffer, stats, label) {
  if (stats.scenes < 1 || stats.nodes < 1 || stats.meshes < 1) throw new Error(`${label}: incomplete GLB scene`);
  if (buffer.length > MAX_BYTES) throw new Error(`${label}: ${buffer.length} bytes exceeds ${MAX_BYTES}`);
  if (stats.primitives < 1 || stats.primitives > MAX_PRIMITIVES) {
    throw new Error(`${label}: ${stats.primitives} primitives exceeds budget`);
  }
  if (stats.triangles < 1 || stats.triangles > MAX_TRIANGLES) {
    throw new Error(`${label}: ${stats.triangles} triangles exceeds budget`);
  }
}

function installNodeFileReader() {
  if (typeof globalThis.FileReader !== "undefined") return;
  globalThis.FileReader = class FileReader {
    result = null;
    onloadend = null;

    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((result) => {
        this.result = result;
        this.onloadend?.({ target: this });
      });
    }

    readAsDataURL(blob) {
      blob.arrayBuffer().then((result) => {
        const base64 = Buffer.from(result).toString("base64");
        this.result = `data:${blob.type || "application/octet-stream"};base64,${base64}`;
        this.onloadend?.({ target: this });
      });
    }
  };
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}
