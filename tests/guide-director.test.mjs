import test from "node:test";
import assert from "node:assert/strict";
import { ProceduralAvatar } from "../src/render/ProceduralAvatar.js";
import { GuideDirector } from "../src/render/GuideDirector.js";

test("guide arrives and faces declared artwork before asking", () => {
  const avatar = new ProceduralAvatar();
  avatar.group.position.set(0, 0, 4);
  const states = [];
  const director = new GuideDirector({ avatar, onState: ({ state }) => states.push(state) });
  director.goTo({ id: "test", guideAnchor: [2, 0, -2], lookAt: [3, 2, -2] });
  for (let i = 0; i < 500 && director.state !== "asking"; i += 1) director.update(1 / 60);
  const metrics = director.correspondence();
  assert.equal(director.state, "asking");
  assert.ok(metrics.distance <= 0.6, `distance ${metrics.distance}`);
  assert.ok(metrics.facingError <= 20, `facing ${metrics.facingError}`);
  assert.deepEqual(states.slice(-4), ["arriving", "facing", "pointing", "asking"]);
});
