import test from "node:test";
import assert from "node:assert/strict";
import { WorldLabsService } from "../services/worldLabs.js";

test("World Labs requires both configured values and an exact admin token", () => {
  const unconfigured = new WorldLabsService({ apiKey: "provider-only" });
  assert.equal(unconfigured.configured, false);
  assert.equal(unconfigured.authorize("anything"), false);

  const service = new WorldLabsService({ apiKey: "provider-key", adminToken: "sixteen-byte-key" });
  assert.equal(service.configured, true);
  assert.equal(service.authorize("sixteen-byte-key"), true);
  assert.equal(service.authorize("sixteen-byte-kex"), false);
  assert.equal(service.authorize("short"), false);
  assert.equal(service.authorize("sixteen-byte-keé"), false);
  assert.equal(service.authorize(["sixteen-byte-key"]), false);
});
