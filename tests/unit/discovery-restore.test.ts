import { beforeEach, describe, expect, it } from "vitest";
import { saveDiscoveryReturn, takeDiscoveryReturn } from "@/lib/feed/discovery-restore";
const id = "12345678-1234-1234-1234-123456789abc";
beforeEach(() => sessionStorage.clear());
describe("feed return snapshot", () => {
  it("is account scoped, single use and expires after fifteen minutes", () => {
    const snapshot = { candidates: [id], loaded: [id], offset: 1, scrollY: 330, savedAt: 1_000_000 };
    saveDiscoveryReturn("ada", snapshot);
    expect(takeDiscoveryReturn("other", 1_000_001)).toBeNull();
    expect(takeDiscoveryReturn("ada", 1_000_001)).toEqual(snapshot);
    expect(takeDiscoveryReturn("ada", 1_000_002)).toBeNull();
    saveDiscoveryReturn("ada", snapshot);
    expect(takeDiscoveryReturn("ada", 1_000_000 + 16 * 60_000)).toBeNull();
  });
  it("rejects malformed, mismatched and oversized snapshots", () => {
    sessionStorage.setItem("feed-return-v1:ada", JSON.stringify({ candidates: [id], loaded: ["bad"], offset: 1, scrollY: 0, savedAt: Date.now() }));
    expect(takeDiscoveryReturn("ada")).toBeNull();
  });
});
