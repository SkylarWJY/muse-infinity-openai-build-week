import * as THREE from "three";
import { SCENE_MANIFEST } from "../config/scenes.js";

export class WorldLayer {
  constructor(scene, { renderer, onArtworkReady = () => {}, onStatus = () => {} } = {}) {
    this.scene = scene;
    this.renderer = renderer;
    this.onArtworkReady = onArtworkReady;
    this.onStatus = onStatus;
    this.group = new THREE.Group();
    this.group.name = "world-layer";
    this.scenery = new THREE.Group();
    this.scenery.name = "procedural-scenery";
    this.artworkGroup = new THREE.Group();
    this.artworkGroup.name = "artwork-anchors";
    this.group.add(this.scenery, this.artworkGroup);
    this.scene.add(this.group);
    this.artworks = new Map();
    this.activeWorld = null;
    this.splat = null;
    this.buildToken = 0;
  }

  async build(world) {
    const token = ++this.buildToken;
    this.clear();
    this.activeWorld = world;
    this.scene.background = new THREE.Color(world.palette.sky);
    this.scene.fog = new THREE.Fog(world.palette.sky, 22, 52);
    this.buildFloor(world);
    this.buildArchitecture(world);
    await this.buildArtworks(world);
    if (world.splat) {
      this.loadSplat(world, token)
        .then((live) => { if (live && token === this.buildToken) this.onStatus({ type: "splat", live: true, message: "World Labs archive rendered" }); })
        .catch(() => { if (token === this.buildToken) this.onStatus({ type: "splat", live: false, message: "Marble archive unavailable; procedural world retained" }); });
    }
  }

  buildFloor(world) {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(42, 42), new THREE.MeshStandardMaterial({ color: world.palette.floor, roughness: 0.92 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scenery.add(floor);
    const grid = new THREE.GridHelper(42, 28, 0x77807a, 0x9da39e);
    grid.material.opacity = 0.12;
    grid.material.transparent = true;
    grid.position.y = 0.006;
    this.scenery.add(grid);
  }

  buildArchitecture(world) {
    const wallMat = new THREE.MeshStandardMaterial({ color: world.palette.wall, roughness: 0.84 });
    const trimMat = new THREE.MeshStandardMaterial({ color: world.palette.accent, roughness: 0.55 });
    const back = new THREE.Mesh(new THREE.BoxGeometry(22, 5.5, 0.25), wallMat);
    back.position.set(0, 2.75, -11.35);
    back.receiveShadow = true;
    this.scenery.add(back);
    for (const x of [-8.4, 8.4]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.25, 5.5, 12.5), wallMat);
      wing.position.set(x, 2.75, -5.2);
      wing.receiveShadow = true;
      this.scenery.add(wing);
    }
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(21.6, 0.08, 0.08), trimMat);
    ribbon.position.set(0, 4.95, -11.16);
    this.scenery.add(ribbon);
    for (const x of [-5.5, 0, 5.5]) {
      const light = new THREE.SpotLight(0xfff3dd, 55, 18, Math.PI / 5, 0.55, 1.4);
      light.position.set(x, 5.2, -2.5);
      light.target.position.set(x, 1.5, -9);
      this.scenery.add(light, light.target);
    }
    if (world.id === "garden") this.addGarden();
    if (world.id === "salon") this.addSalonStage(world.palette.accent);
  }

  addGarden() {
    const green = new THREE.MeshStandardMaterial({ color: 0x486a4b, roughness: 0.9 });
    for (let i = 0; i < 20; i += 1) {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.07, 0.5 + (i % 4) * 0.18, 6), green);
      stem.position.set(-7 + (i * 2.7) % 14, 0.35, -2 - (i * 3.1) % 8);
      stem.rotation.z = Math.sin(i) * 0.2;
      this.scenery.add(stem);
    }
  }

  addSalonStage(accent) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.8, 3.0, 64), new THREE.MeshBasicMaterial({ color: accent, side: THREE.DoubleSide, transparent: true, opacity: 0.6 }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.02, -5.5);
    this.scenery.add(ring);
  }

  async buildArtworks(world) {
    const loader = new THREE.TextureLoader();
    await Promise.all(SCENE_MANIFEST.stops.map(async (stop) => {
      const texture = await loader.loadAsync(stop.image).catch(() => null);
      if (texture) {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
      }
      const frame = new THREE.Group();
      frame.name = `artwork-${stop.id}`;
      const width = stop.id === "grande-jatte" ? 3.8 : 3.15;
      const height = stop.id === "grande-jatte" ? 2.15 : 2.45;
      const border = new THREE.Mesh(new THREE.BoxGeometry(width + 0.28, height + 0.28, 0.15), new THREE.MeshStandardMaterial({ color: 0x171a18, roughness: 0.35 }));
      const picture = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, color: texture ? 0xffffff : world.palette.accent, toneMapped: false }));
      picture.position.z = 0.085;
      frame.add(border, picture);
      if (stop.id === "bedroom") {
        frame.position.set(0, 2.55, -11.14);
      } else {
        const side = stop.id === "water-lilies" ? -1 : 1;
        frame.position.set(side * 8.26, 2.55, -5.2);
        frame.rotation.y = side * -Math.PI / 2;
      }
      frame.userData.stopId = stop.id;
      this.artworkGroup.add(frame);
      this.artworks.set(stop.id, { frame, picture, border });
      this.onArtworkReady(stop.id, frame);
    }));
  }

  highlight(stopId, effect = "focus") {
    for (const [id, artwork] of this.artworks) {
      const active = id === stopId;
      artwork.border.material.emissive = new THREE.Color(active ? this.activeWorld.palette.accent : 0x000000);
      artwork.border.material.emissiveIntensity = active ? (effect === "echo" ? 0.8 : 0.45) : 0;
      artwork.frame.scale.setScalar(active ? 1.025 : 1);
    }
  }

  async loadSplat(world, token) {
    const timeout = () => new Promise((_, reject) => setTimeout(() => reject(new Error("splat_timeout")), 8000));
    const modulePromise = import("@sparkjsdev/spark");
    const { SparkRenderer, SplatMesh } = await Promise.race([modulePromise, timeout()]);
    if (token !== this.buildToken) return false;
    const spark = new SparkRenderer({ renderer: this.renderer });
    const splat = new SplatMesh({ url: world.splat, lodScale: 1.5 });
    splat.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
    splat.scale.setScalar(0.80177665);
    splat.position.y = 0.5;
    this.scene.add(spark, splat);
    this.splat = { spark, splat };
    await Promise.race([splat.initialized, timeout()]);
    if (token !== this.buildToken) {
      this.scene.remove(spark, splat);
      splat.dispose?.();
      return false;
    }
    this.scenery.visible = false;
    return true;
  }

  clear() {
    this.scenery.visible = true;
    for (const container of [this.scenery, this.artworkGroup]) {
      for (const child of [...container.children]) {
        container.remove(child);
        disposeTree(child);
      }
    }
    this.artworks.clear();
    if (this.splat) {
      this.scene.remove(this.splat.spark, this.splat.splat);
      this.splat.splat?.dispose?.();
    }
    this.splat = null;
  }
}

function disposeTree(child) {
  child.traverse?.((object) => {
    object.geometry?.dispose?.();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      material?.map?.dispose?.();
      material?.dispose?.();
    }
  });
}
