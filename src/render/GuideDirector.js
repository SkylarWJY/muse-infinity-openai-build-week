import * as THREE from "three";

export const GUIDE_STATES = Object.freeze(["idle", "walking", "arriving", "facing", "pointing", "asking", "listening", "reflecting"]);

export class GuideDirector {
  constructor({ avatar, speed = 2.25, onState = () => {} } = {}) {
    this.avatar = avatar;
    this.object = avatar.group;
    this.speed = speed;
    this.onState = onState;
    this.state = "idle";
    this.target = new THREE.Vector3();
    this.lookAt = new THREE.Vector3();
    this.stopId = null;
    this.stateTime = 0;
    this.paused = false;
  }

  setAvatar(avatar) {
    this.avatar = avatar;
    this.object = avatar.group;
  }

  goTo(stop) {
    this.stopId = stop.id;
    this.target.fromArray(stop.guideAnchor);
    this.lookAt.fromArray(stop.lookAt);
    this.transition("walking");
  }

  update(dt) {
    if (this.paused) return;
    this.stateTime += dt;
    if (this.state === "walking") this.updateWalking(dt);
    else if (this.state === "arriving" && this.stateTime > 0.22) this.transition("facing");
    else if (this.state === "facing") this.updateFacing(dt);
    else if (this.state === "pointing" && this.stateTime > 1.0) this.transition("asking");
    this.avatar.setMotion(this.state === "walking" ? this.speed : 0, this.state === "pointing" || this.state === "asking" ? "point" : "open");
  }

  updateWalking(dt) {
    const delta = this.target.clone().sub(this.object.position);
    delta.y = 0;
    const distance = delta.length();
    if (distance <= 0.18) {
      this.object.position.x = this.target.x;
      this.object.position.z = this.target.z;
      this.transition("arriving");
      return;
    }
    const direction = delta.normalize();
    const step = Math.min(distance, this.speed * dt);
    this.object.position.addScaledVector(direction, step);
    const targetYaw = Math.atan2(direction.x, direction.z);
    this.object.rotation.y = dampAngle(this.object.rotation.y, targetYaw, dt * 8);
  }

  updateFacing(dt) {
    const delta = this.lookAt.clone().sub(this.object.position);
    const targetYaw = Math.atan2(delta.x, delta.z);
    this.object.rotation.y = dampAngle(this.object.rotation.y, targetYaw, dt * 7);
    if (Math.abs(shortAngle(targetYaw - this.object.rotation.y)) <= THREE.MathUtils.degToRad(4)) this.transition("pointing");
  }

  listen() {
    this.transition("listening");
  }

  reflect() {
    this.transition("reflecting");
    this.avatar.setMotion(0, "reflect");
  }

  correspondence() {
    const distance = this.object.position.distanceTo(this.target);
    const delta = this.lookAt.clone().sub(this.object.position);
    const targetYaw = Math.atan2(delta.x, delta.z);
    const facingError = Math.abs(THREE.MathUtils.radToDeg(shortAngle(targetYaw - this.object.rotation.y)));
    return { distance, facingError, synced: distance <= 0.6 && facingError <= 20 };
  }

  transition(next) {
    if (!GUIDE_STATES.includes(next) || next === this.state) return;
    this.state = next;
    this.stateTime = 0;
    this.onState({ state: next, stopId: this.stopId, correspondence: this.correspondence() });
  }
}

function dampAngle(current, target, amount) {
  return current + shortAngle(target - current) * Math.min(1, amount);
}

function shortAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
