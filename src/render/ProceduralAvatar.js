import * as THREE from "three";

const MAT = (color, roughness = 0.7, metalness = 0.04) => new THREE.MeshStandardMaterial({ color, roughness, metalness });

export class ProceduralAvatar {
  constructor({ coat = 0x232725, accent = 0xd8ff42, skin = 0x9a6751, scale = 1, name = "Mira" } = {}) {
    this.group = new THREE.Group();
    this.group.name = `avatar-${name.toLowerCase().replace(/\s+/g, "-")}`;
    this.group.userData.actor = name;
    this.group.userData.model = "refined-procedural-v2";
    this.bodyRoot = new THREE.Group();
    this.bodyRoot.name = "body-root";
    this.group.add(this.bodyRoot);
    this.phase = Math.random() * Math.PI * 2;
    this.speed = 0;
    this.targetGesture = "open";
    this.parts = {};
    this.pose = resolveProceduralMotionPose({ phase: this.phase });
    this.build({ coat, accent, skin });
    this.group.scale.setScalar(scale);
  }

  build({ coat, accent, skin }) {
    const coatColor = new THREE.Color(coat);
    const bodyMat = MAT(coatColor, 0.66);
    const bodyShadowMat = MAT(coatColor.clone().multiplyScalar(0.58), 0.74);
    const bodyLightMat = MAT(coatColor.clone().lerp(new THREE.Color(0xffffff), 0.16), 0.62);
    const skinMat = MAT(skin, 0.86, 0.015);
    const skinShadowMat = MAT(new THREE.Color(skin).multiplyScalar(0.72), 0.9, 0.01);
    const accentMat = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.08, roughness: 0.5, metalness: 0.03 });
    const hairMat = MAT(0x141817, 0.88, 0.01);
    const pantsMat = MAT(0x202522, 0.8, 0.02);
    const shoeMat = MAT(0x0d1110, 0.42, 0.12);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xf4f0e7, roughness: 0.35 });
    const irisMat = new THREE.MeshStandardMaterial({ color: 0x202927, roughness: 0.3 });
    const metalMat = MAT(0xc9d0c8, 0.25, 0.65);

    this.parts.leftHip = this.makeLeg(-1, pantsMat, shoeMat);
    this.parts.rightHip = this.makeLeg(1, pantsMat, shoeMat);
    this.parts.leftLeg = this.parts.leftHip;
    this.parts.rightLeg = this.parts.rightHip;
    this.bodyRoot.add(this.parts.leftHip, this.parts.rightHip);

    const pelvis = mesh(new THREE.SphereGeometry(0.24, 20, 14), pantsMat, [0, 1.11, 0]);
    pelvis.scale.set(1.08, 0.62, 0.74);
    this.bodyRoot.add(pelvis);

    const torso = mesh(latheGeometry([[0.23, -0.43], [0.27, -0.36], [0.3, -0.16], [0.34, 0.17], [0.29, 0.35], [0.18, 0.42]], 28), bodyMat, [0, 1.48, 0]);
    torso.scale.z = 0.72;
    this.parts.torso = torso;
    this.bodyRoot.add(torso);

    const shirt = mesh(new THREE.BoxGeometry(0.25, 0.42, 0.045, 2, 4, 1), bodyShadowMat, [0, 1.54, 0.245]);
    const leftLapel = mesh(new THREE.BoxGeometry(0.095, 0.42, 0.035), bodyLightMat, [-0.125, 1.56, 0.275], [0, 0, -0.16]);
    const rightLapel = mesh(new THREE.BoxGeometry(0.095, 0.42, 0.035), bodyLightMat, [0.125, 1.56, 0.275], [0, 0, 0.16]);
    const zipper = mesh(new THREE.BoxGeometry(0.018, 0.35, 0.018), metalMat, [0, 1.48, 0.284]);
    const waistband = mesh(new THREE.TorusGeometry(0.255, 0.026, 8, 24), bodyShadowMat, [0, 1.17, 0], [Math.PI / 2, 0, 0]);
    waistband.scale.z = 0.72;
    this.bodyRoot.add(shirt, leftLapel, rightLapel, zipper, waistband);

    this.buildBackpack(bodyShadowMat, bodyLightMat, accentMat, metalMat);

    this.parts.leftShoulder = this.makeArm(-1, bodyMat, bodyShadowMat, skinMat, accentMat);
    this.parts.rightShoulder = this.makeArm(1, bodyMat, bodyShadowMat, skinMat, accentMat);
    this.parts.leftArm = this.parts.leftShoulder;
    this.parts.rightArm = this.parts.rightShoulder;
    this.bodyRoot.add(this.parts.leftShoulder, this.parts.rightShoulder);

    const neck = mesh(new THREE.CylinderGeometry(0.09, 0.105, 0.14, 14), skinShadowMat, [0, 1.9, 0]);
    const collar = mesh(new THREE.TorusGeometry(0.178, 0.027, 8, 24), accentMat, [0, 1.86, 0], [Math.PI / 2, 0, 0]);
    collar.scale.z = 0.78;
    this.bodyRoot.add(neck, collar);

    const headRoot = new THREE.Group();
    headRoot.position.set(0, 2.08, 0);
    this.parts.head = headRoot;
    const head = mesh(new THREE.SphereGeometry(0.255, 24, 18), skinMat, [0, 0, 0]);
    head.scale.set(0.88, 1.06, 0.94);
    const jaw = mesh(new THREE.SphereGeometry(0.19, 18, 12), skinMat, [0, -0.11, 0.015]);
    jaw.scale.set(0.9, 0.72, 0.92);
    headRoot.add(head, jaw);

    for (const side of [-1, 1]) {
      const ear = mesh(new THREE.SphereGeometry(0.052, 12, 9), skinShadowMat, [side * 0.235, 0, 0]);
      ear.scale.set(0.7, 1, 0.5);
      const eye = mesh(new THREE.SphereGeometry(0.029, 12, 8), eyeMat, [side * 0.078, 0.03, 0.238]);
      eye.scale.set(1, 0.66, 0.4);
      const iris = mesh(new THREE.SphereGeometry(0.011, 10, 8), irisMat, [side * 0.078, 0.03, 0.258]);
      const brow = mesh(new THREE.BoxGeometry(0.072, 0.011, 0.01), hairMat, [side * 0.078, 0.078, 0.247], [0, 0, side * -0.07]);
      headRoot.add(ear, eye, iris, brow);
    }
    const nose = mesh(new THREE.ConeGeometry(0.027, 0.07, 10), skinShadowMat, [0, -0.005, 0.262], [Math.PI / 2, 0, 0]);
    const mouth = mesh(capsuleGeometry(0.07, 0.006, 4, 8), hairMat, [0, -0.087, 0.254], [0, 0, Math.PI / 2]);
    headRoot.add(nose, mouth);

    const hairCap = mesh(new THREE.SphereGeometry(0.263, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.46), hairMat, [0, 0.09, -0.005]);
    hairCap.scale.set(0.94, 1.02, 0.98);
    headRoot.add(hairCap);
    for (const [x, y, z, scale] of [[-0.18, 0.09, 0.09, 0.8], [0.18, 0.09, 0.09, 0.8], [-0.13, 0.19, 0.04, 0.9], [0.13, 0.19, 0.04, 0.9]]) {
      const curl = mesh(new THREE.SphereGeometry(0.068, 10, 8), hairMat, [x, y + 0.025, z - 0.015]);
      curl.scale.set(scale, 0.65, 0.72);
      headRoot.add(curl);
    }
    this.bodyRoot.add(headRoot);

    const badge = mesh(new THREE.BoxGeometry(0.13, 0.16, 0.025), accentMat, [0.205, 1.55, 0.3], [0, 0, -0.1]);
    const badgeClip = mesh(new THREE.BoxGeometry(0.035, 0.028, 0.018), metalMat, [0.205, 1.65, 0.315]);
    this.bodyRoot.add(badge, badgeClip);
  }

  buildBackpack(shellMat, flapMat, accentMat, metalMat) {
    const pack = mesh(capsuleGeometry(0.62, 0.22, 8, 16), shellMat, [0, 1.48, -0.27]);
    pack.scale.set(0.88, 1, 0.46);
    const flap = mesh(new THREE.BoxGeometry(0.34, 0.15, 0.065), flapMat, [0, 1.67, -0.405], [-0.08, 0, 0]);
    const signal = mesh(new THREE.BoxGeometry(0.32, 0.045, 0.025), accentMat, [0, 1.5, -0.445]);
    const clasp = mesh(new THREE.BoxGeometry(0.045, 0.075, 0.025), metalMat, [0, 1.59, -0.448]);
    this.bodyRoot.add(pack, flap, signal, clasp);
    for (const x of [-0.2, 0.2]) {
      const strap = mesh(capsuleGeometry(0.48, 0.024, 5, 8), flapMat, [x, 1.52, -0.22], [0, 0, x > 0 ? -0.12 : 0.12]);
      this.bodyRoot.add(strap);
    }
  }

  makeArm(side, sleeveMat, jointMat, skinMat, accentMat) {
    const shoulder = new THREE.Group();
    shoulder.name = side < 0 ? "left-shoulder" : "right-shoulder";
    shoulder.position.set(side * 0.39, 1.71, 0);
    shoulder.add(mesh(new THREE.SphereGeometry(0.105, 14, 10), sleeveMat, [0, -0.015, 0]));
    shoulder.add(mesh(capsuleGeometry(0.39, 0.092, 7, 12), sleeveMat, [0, -0.205, 0]));

    const elbow = new THREE.Group();
    elbow.name = side < 0 ? "left-elbow" : "right-elbow";
    elbow.position.set(0, -0.39, 0);
    elbow.add(mesh(new THREE.SphereGeometry(0.079, 12, 9), sleeveMat, [0, 0, 0]));
    elbow.add(mesh(capsuleGeometry(0.35, 0.078, 7, 12), sleeveMat, [0, -0.185, 0]));
    const elbowSeam = mesh(new THREE.TorusGeometry(0.079, 0.008, 5, 12), jointMat, [0, -0.015, 0], [Math.PI / 2, 0, 0]);
    const cuff = mesh(new THREE.CylinderGeometry(0.08, 0.074, 0.065, 12), accentMat, [0, -0.365, 0]);
    const hand = mesh(capsuleGeometry(0.18, 0.066, 7, 12), skinMat, [0, -0.47, 0.015]);
    hand.scale.set(0.88, 1, 0.72);
    elbow.add(elbowSeam, cuff, hand);
    shoulder.add(elbow);
    this.parts[side < 0 ? "leftElbow" : "rightElbow"] = elbow;
    return shoulder;
  }

  makeLeg(side, pantsMat, shoeMat) {
    const hip = new THREE.Group();
    hip.name = side < 0 ? "left-hip" : "right-hip";
    hip.position.set(side * 0.145, 1.07, 0);
    hip.add(mesh(new THREE.SphereGeometry(0.12, 14, 10), pantsMat, [0, -0.02, 0]));
    hip.add(mesh(capsuleGeometry(0.46, 0.112, 7, 14), pantsMat, [0, -0.24, 0]));

    const knee = new THREE.Group();
    knee.name = side < 0 ? "left-knee" : "right-knee";
    knee.position.set(0, -0.47, 0);
    knee.add(mesh(new THREE.SphereGeometry(0.09, 12, 9), pantsMat, [0, 0, 0]));
    knee.add(mesh(capsuleGeometry(0.42, 0.09, 7, 12), pantsMat, [0, -0.22, 0]));

    const foot = new THREE.Group();
    foot.name = side < 0 ? "left-foot" : "right-foot";
    foot.position.set(0, -0.45, 0.03);
    const shoe = mesh(capsuleGeometry(0.34, 0.105, 8, 14), shoeMat, [0, -0.045, 0.12], [Math.PI / 2, 0, 0]);
    shoe.scale.set(0.86, 1, 0.78);
    const sole = mesh(new THREE.BoxGeometry(0.175, 0.025, 0.32), shoeMat, [0, -0.125, 0.12]);
    foot.add(shoe, sole);
    knee.add(foot);
    hip.add(knee);
    this.parts[side < 0 ? "leftKnee" : "rightKnee"] = knee;
    this.parts[side < 0 ? "leftFoot" : "rightFoot"] = foot;
    return hip;
  }

  setMotion(speed, gesture = this.targetGesture) {
    this.speed = Number(speed) || 0;
    this.targetGesture = gesture;
  }

  update(dt, elapsed) {
    this.pose = resolveProceduralMotionPose({ speed: this.speed, gesture: this.targetGesture, elapsed, phase: this.phase });
    const damping = 1 - Math.exp(-Math.max(0, dt) * 9);
    dampRotation(this.parts.leftShoulder, "x", this.pose.leftShoulderX, damping);
    dampRotation(this.parts.rightShoulder, "x", this.pose.rightShoulderX, damping);
    dampRotation(this.parts.leftShoulder, "z", this.pose.leftShoulderZ, damping);
    dampRotation(this.parts.rightShoulder, "z", this.pose.rightShoulderZ, damping);
    dampRotation(this.parts.leftElbow, "x", this.pose.leftElbowX, damping);
    dampRotation(this.parts.rightElbow, "x", this.pose.rightElbowX, damping);
    dampRotation(this.parts.leftHip, "x", this.pose.leftHipX, damping);
    dampRotation(this.parts.rightHip, "x", this.pose.rightHipX, damping);
    dampRotation(this.parts.leftKnee, "x", this.pose.leftKneeX, damping);
    dampRotation(this.parts.rightKnee, "x", this.pose.rightKneeX, damping);
    dampRotation(this.parts.leftFoot, "x", this.pose.leftFootX, damping);
    dampRotation(this.parts.rightFoot, "x", this.pose.rightFootX, damping);
    dampRotation(this.parts.head, "y", this.pose.headYaw, damping);
    this.bodyRoot.position.y += (this.pose.bodyY - this.bodyRoot.position.y) * damping;
    this.bodyRoot.rotation.z += (this.pose.bodyRoll - this.bodyRoot.rotation.z) * damping;
  }

  dispose() {
    this.group.traverse((object) => {
      object.geometry?.dispose?.();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) material?.dispose?.();
    });
  }
}

export function resolveProceduralMotionPose({ speed = 0, gesture = "open", elapsed = 0, phase = 0 } = {}) {
  const moving = Math.min(1, Math.abs(Number(speed) || 0) / 2.9);
  const cycle = elapsed * 8 + phase;
  const stride = Math.sin(cycle) * 0.62 * moving;
  const idle = Math.sin(elapsed * 1.65 + phase) * (1 - moving);
  const pose = {
    leftShoulderX: -stride * 0.72 + idle * 0.035,
    rightShoulderX: stride * 0.72 - idle * 0.035,
    leftShoulderZ: -0.035 * (1 - moving),
    rightShoulderZ: 0.035 * (1 - moving),
    leftElbowX: Math.max(0, stride) * 0.48 + Math.abs(stride) * 0.08,
    rightElbowX: Math.max(0, -stride) * 0.48 + Math.abs(stride) * 0.08,
    leftHipX: stride,
    rightHipX: -stride,
    leftKneeX: Math.max(0, stride) * 0.78,
    rightKneeX: Math.max(0, -stride) * 0.78,
    leftFootX: -Math.max(0, stride) * 0.28,
    rightFootX: -Math.max(0, -stride) * 0.28,
    bodyY: Math.abs(Math.sin(cycle)) * 0.035 * moving + idle * 0.004,
    bodyRoll: Math.sin(cycle) * 0.018 * moving,
    headYaw: Math.sin(elapsed * 0.75 + phase) * 0.035 * (1 - moving)
  };

  if (moving > 0.01) return pose;
  if (gesture === "point") {
    pose.rightShoulderX = -1.08 + idle * 0.02;
    pose.rightShoulderZ = 0.08;
    pose.rightElbowX = 0.12;
  } else if (gesture === "reflect") {
    pose.rightShoulderX = -0.66 + idle * 0.02;
    pose.rightShoulderZ = -0.14;
    pose.rightElbowX = -0.58;
  } else {
    pose.leftShoulderZ = -0.16 - idle * 0.02;
    pose.rightShoulderZ = 0.16 + idle * 0.02;
    pose.leftElbowX = 0.08 + Math.max(0, idle) * 0.06;
    pose.rightElbowX = 0.08 + Math.max(0, -idle) * 0.06;
  }
  return pose;
}

function capsuleGeometry(length, radius, capSegments, radialSegments) {
  return new THREE.CapsuleGeometry(radius, Math.max(0.01, length - radius * 2), capSegments, radialSegments);
}

function latheGeometry(profile, segments) {
  return new THREE.LatheGeometry(profile.map(([radius, y]) => new THREE.Vector2(radius, y)), segments);
}

function dampRotation(part, axis, target, damping) {
  part.rotation[axis] += (target - part.rotation[axis]) * damping;
}

function mesh(geometry, material, position, rotation = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}
