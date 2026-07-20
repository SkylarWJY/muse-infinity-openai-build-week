import * as THREE from "three";

const MAT = (color, roughness = 0.7) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.05 });

export class ProceduralAvatar {
  constructor({ coat = 0x232725, accent = 0xd8ff42, skin = 0x9a6751, scale = 1, name = "Mira" } = {}) {
    this.group = new THREE.Group();
    this.group.name = `avatar-${name.toLowerCase().replace(/\s+/g, "-")}`;
    this.group.userData.actor = name;
    this.phase = Math.random() * Math.PI * 2;
    this.speed = 0;
    this.gesture = "open";
    this.targetGesture = "open";
    this.parts = {};
    this.build({ coat, accent, skin });
    this.group.scale.setScalar(scale);
  }

  build({ coat, accent, skin }) {
    const bodyMat = MAT(coat);
    const skinMat = MAT(skin, 0.85);
    const accentMat = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.12, roughness: 0.55 });
    const darkMat = MAT(0x121514);

    const torso = mesh(new THREE.CapsuleGeometry(0.34, 0.78, 5, 10), bodyMat, [0, 1.4, 0]);
    torso.scale.set(1, 1, 0.72);
    this.group.add(torso);

    const collar = mesh(new THREE.TorusGeometry(0.29, 0.045, 8, 18), accentMat, [0, 1.82, 0], [Math.PI / 2, 0, 0]);
    this.group.add(collar);
    const head = mesh(new THREE.SphereGeometry(0.27, 18, 14), skinMat, [0, 2.08, 0]);
    head.scale.set(0.9, 1.08, 0.92);
    this.group.add(head);
    const hair = mesh(new THREE.SphereGeometry(0.275, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.56), darkMat, [0, 2.16, -0.01]);
    this.group.add(hair);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xf4f1e8 });
    for (const x of [-0.085, 0.085]) this.group.add(mesh(new THREE.SphereGeometry(0.025, 8, 6), eyeMat, [x, 2.11, 0.25]));

    this.parts.leftArm = this.makeLimb(bodyMat, skinMat, -0.43, 1.67, true);
    this.parts.rightArm = this.makeLimb(bodyMat, skinMat, 0.43, 1.67, true);
    this.parts.leftLeg = this.makeLimb(darkMat, darkMat, -0.18, 1.02, false);
    this.parts.rightLeg = this.makeLimb(darkMat, darkMat, 0.18, 1.02, false);
    this.group.add(this.parts.leftArm, this.parts.rightArm, this.parts.leftLeg, this.parts.rightLeg);

    const badge = mesh(new THREE.BoxGeometry(0.14, 0.18, 0.035), accentMat, [0.2, 1.56, 0.31]);
    badge.rotation.z = -0.12;
    this.group.add(badge);
  }

  makeLimb(primaryMat, endMat, x, y, arm) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const length = arm ? 0.74 : 0.9;
    const width = arm ? 0.11 : 0.14;
    const limb = mesh(new THREE.CapsuleGeometry(width, length - width * 2, 4, 8), primaryMat, [0, -length / 2, 0]);
    pivot.add(limb);
    if (arm) pivot.add(mesh(new THREE.SphereGeometry(0.105, 10, 8), endMat, [0, -length, 0]));
    else pivot.add(mesh(new THREE.BoxGeometry(0.24, 0.13, 0.4), endMat, [0, -length + 0.02, 0.08]));
    return pivot;
  }

  setMotion(speed, gesture = this.targetGesture) {
    this.speed = speed;
    this.targetGesture = gesture;
  }

  update(dt, elapsed) {
    const moving = Math.min(1, Math.abs(this.speed) / 1.8);
    const gait = Math.sin(elapsed * 8 + this.phase) * 0.68 * moving;
    this.parts.leftLeg.rotation.x = gait;
    this.parts.rightLeg.rotation.x = -gait;
    this.parts.leftArm.rotation.x = -gait * 0.7;
    this.parts.rightArm.rotation.x = gait * 0.7;
    this.group.position.y = Math.abs(Math.sin(elapsed * 8 + this.phase)) * 0.035 * moving;

    let rightTargetX = gait * 0.7;
    let rightTargetZ = 0;
    let leftTargetZ = 0;
    if (!moving && this.targetGesture === "point") {
      rightTargetX = -1.25;
      rightTargetZ = -0.2;
    } else if (!moving && this.targetGesture === "open") {
      rightTargetX = -0.35;
      rightTargetZ = -0.55;
      leftTargetZ = 0.55;
    } else if (!moving && this.targetGesture === "reflect") {
      rightTargetX = -0.82;
      rightTargetZ = -0.2;
    }
    const damping = 1 - Math.exp(-dt * 7);
    this.parts.rightArm.rotation.x += (rightTargetX - this.parts.rightArm.rotation.x) * damping;
    this.parts.rightArm.rotation.z += (rightTargetZ - this.parts.rightArm.rotation.z) * damping;
    this.parts.leftArm.rotation.z += (leftTargetZ - this.parts.leftArm.rotation.z) * damping;
  }
}

function mesh(geometry, material, position, rotation = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}
