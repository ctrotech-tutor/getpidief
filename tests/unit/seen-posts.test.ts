import { beforeEach, describe, expect, it } from "vitest";
import { clearSeen, readSeen, recordSeen } from "@/lib/feed/seen-posts";
const id = "12345678-1234-1234-1234-123456789abc";
beforeEach(() => localStorage.clear());
describe("local viewed-post history", () => {
  it("is account-scoped, expires for ranking after seven days, and can be cleared", () => {
    recordSeen("ada", id, 10_000_000_000);
    expect(readSeen("ada", 10_000_000_001)).toHaveLength(1);
    expect(readSeen("someone-else", 10_000_000_001)).toHaveLength(0);
    expect(readSeen("ada", 10_000_000_000 + 8 * 86400000)).toHaveLength(0);
    clearSeen("ada"); expect(readSeen("ada", 10_000_000_001)).toHaveLength(0);
  });
  it("ignores malformed data and invalid IDs", () => {
    localStorage.setItem("feed-seen-v1:ada", "not json");
    expect(readSeen("ada")).toEqual([]);
    recordSeen("ada", "bad"); expect(readSeen("ada")).toEqual([]);
  });
});
