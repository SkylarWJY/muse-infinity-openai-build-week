import test from "node:test";
import assert from "node:assert/strict";
import { RoomService } from "../services/rooms.js";

test("room members exchange bounded cursor events", () => {
  let now = 1000;
  const service = new RoomService({ now: () => now, maxEvents: 2 });
  const host = service.create("Ada");
  const guest = service.join(host.room_id, "Lin");
  service.post(host.room_id, host.member_id, { type: "stop", value: "water-lilies" });
  service.post(host.room_id, guest.member_id, { type: "answer", value: "quiet" });
  service.post(host.room_id, host.member_id, { type: "effect", value: "ripple" });
  const state = service.read(host.room_id, 1);
  assert.equal(state.members.length, 2);
  assert.deepEqual(state.events.map((event) => event.cursor), [2, 3]);
  now += 31 * 60 * 1000;
  assert.throws(() => service.read(host.room_id), /room_not_found/);
});

test("room rejects unknown event types and members", () => {
  const service = new RoomService();
  const host = service.create("Ada");
  assert.throws(() => service.post(host.room_id, "fake", { type: "stop", value: "x" }), /unknown_member/);
  assert.throws(() => service.post(host.room_id, host.member_id, { type: "script", value: "x" }), /invalid_event/);
});
