import crypto from "node:crypto";
import { normalizeText } from "../shared/contracts.js";

const EVENT_TYPES = new Set(["stop", "answer", "effect", "presence"]);

export class RoomService {
  constructor({ now = () => Date.now(), ttlMs = 30 * 60 * 1000, maxRooms = 40, maxMembers = 4, maxEvents = 80 } = {}) {
    this.now = now;
    this.ttlMs = ttlMs;
    this.maxRooms = maxRooms;
    this.maxMembers = maxMembers;
    this.maxEvents = maxEvents;
    this.rooms = new Map();
  }

  create(displayName) {
    this.evict();
    if (this.rooms.size >= this.maxRooms) throw Object.assign(new Error("room_capacity"), { statusCode: 503 });
    let id;
    do id = crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase(); while (this.rooms.has(id));
    const member = this.makeMember(displayName);
    this.rooms.set(id, { id, members: [member], events: [], cursor: 0, updatedAt: this.now() });
    return { room_id: id, member_id: member.id };
  }

  join(roomId, displayName) {
    const room = this.get(roomId);
    if (room.members.length >= this.maxMembers) throw Object.assign(new Error("room_full"), { statusCode: 409 });
    const member = this.makeMember(displayName);
    room.members.push(member);
    room.updatedAt = this.now();
    return { room_id: room.id, member_id: member.id };
  }

  read(roomId, cursor = 0) {
    const room = this.get(roomId);
    room.updatedAt = this.now();
    const safeCursor = Number.isInteger(cursor) && cursor >= 0 ? cursor : 0;
    return {
      room_id: room.id,
      members: room.members.map(({ id, name }) => ({ id, name })),
      cursor: room.cursor,
      events: room.events.filter((event) => event.cursor > safeCursor)
    };
  }

  post(roomId, memberId, event) {
    const room = this.get(roomId);
    if (!room.members.some((member) => member.id === memberId)) throw Object.assign(new Error("unknown_member"), { statusCode: 403 });
    if (!event || !EVENT_TYPES.has(event.type)) throw Object.assign(new Error("invalid_event"), { statusCode: 400 });
    const value = normalizeText(event.value, 120);
    if (!value) throw Object.assign(new Error("invalid_event_value"), { statusCode: 400 });
    room.cursor += 1;
    room.events.push({ cursor: room.cursor, type: event.type, value, member_id: memberId, at: this.now() });
    room.events = room.events.slice(-this.maxEvents);
    room.updatedAt = this.now();
    return { cursor: room.cursor };
  }

  get(roomId) {
    this.evict();
    const id = String(roomId || "").toUpperCase();
    if (!/^[A-F0-9]{6}$/.test(id)) throw Object.assign(new Error("invalid_room"), { statusCode: 400 });
    const room = this.rooms.get(id);
    if (!room) throw Object.assign(new Error("room_not_found"), { statusCode: 404 });
    return room;
  }

  evict() {
    const threshold = this.now() - this.ttlMs;
    for (const [id, room] of this.rooms) if (room.updatedAt < threshold) this.rooms.delete(id);
  }

  makeMember(displayName) {
    return { id: crypto.randomBytes(6).toString("hex"), name: normalizeText(displayName, 40) || "Guest" };
  }
}
