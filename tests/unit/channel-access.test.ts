import { describe, expect, it } from "vitest";
import { canAccessChannel, parseChannel, type ChannelActor, type ChannelDocument } from "@/lib/pusher/channel-access";

const alice = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const bob = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const documentId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const actor: ChannelActor = { id: alice, role: "student", status: "active", institutionId: "school-a" };
const document: ChannelDocument = { authorId: bob, status: "approved", visibility: "public", institutionId: "school-a", deletedAt: null };

describe("realtime authorization", () => {
  it("denies unknown and malformed channels", () => {
    for (const name of ["presence-other", "private-admin", "private-document-invalid", `private-user-${alice}-suffix`]) {
      expect(canAccessChannel(parseChannel(name), actor)).toBe(false);
    }
  });
  it("allows only one's own user channel and active administrators in admin presence", () => {
    expect(canAccessChannel(parseChannel(`private-user-${alice}`), actor)).toBe(true);
    expect(canAccessChannel(parseChannel(`private-user-${bob}`), actor)).toBe(false);
    expect(canAccessChannel(parseChannel("presence-admin"), actor)).toBe(false);
    expect(canAccessChannel(parseChannel("presence-admin"), { ...actor, role: "admin" })).toBe(true);
    expect(canAccessChannel(parseChannel("presence-admin"), { ...actor, role: "admin", status: "suspended" })).toBe(false);
  });
  it("requires document visibility and handles institution, ownership and deletion", () => {
    for (const prefix of ["private-document-", "presence-document-"]) {
      const channel = parseChannel(prefix + documentId);
      expect(canAccessChannel(channel, actor, document)).toBe(true);
      expect(canAccessChannel(channel, actor, { ...document, visibility: "private" })).toBe(false);
      expect(canAccessChannel(channel, actor, { ...document, status: "pending" })).toBe(false);
      expect(canAccessChannel(channel, actor, { ...document, visibility: "institution" })).toBe(true);
      expect(canAccessChannel(channel, actor, { ...document, visibility: "institution", institutionId: "school-b" })).toBe(false);
      expect(canAccessChannel(channel, { ...actor, id: bob }, { ...document, visibility: "private" })).toBe(true);
      expect(canAccessChannel(channel, { ...actor, role: "admin" }, { ...document, deletedAt: new Date() })).toBe(false);
      expect(canAccessChannel(channel, actor, null)).toBe(false);
    }
  });
});
