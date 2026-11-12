import { describe, expect, it } from "vitest";
import { arrangeDiscovery, rankDiscovery, type DiscoveryCandidate } from "@/lib/feed/discovery-ranking";
const candidate = (id: string, authorId: string, following = false, replyCount = 0): DiscoveryCandidate => ({ id, authorId, following, replyCount, createdAt: "2026-01-01T00:00:00.000Z" });
describe("discovery ranking", () => {
  it("uses follows and bounded discussion signals without duplicates", () => {
    const list = rankDiscovery([candidate("a", "a"), candidate("b", "b", true), candidate("c", "c", false, 100000)], Date.parse("2026-01-02T00:00:00Z"));
    expect(list[0].id).toBe("b"); expect(list[1].id).toBe("c"); expect(list[2].id).toBe("a");
  });
  it("puts unseen first and avoids adjacent authors when possible", () => {
    const a = candidate("a", "same"), b = candidate("b", "same"), c = candidate("c", "other"), d = candidate("d", "other");
    expect(arrangeDiscovery([a, b, c, d], new Set(["c", "d"])).map(x => x.id)).toEqual(["a", "b", "c", "d"]);
    expect(arrangeDiscovery([a, b, c], new Set()).map(x => x.id)).toEqual(["a", "c", "b"]);
  });
});
