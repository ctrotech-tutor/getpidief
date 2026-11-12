import { describe, expect, it } from "vitest";
import { validFeedTime } from "@/lib/feed/cursor";
describe("feed cursor timestamp", () => {
  it("preserves microseconds and rejects invalid dates and formats", () => {
    expect(validFeedTime("2026-01-01T00:00:00.123456Z")).toBe(true);
    for (const value of ["2026-02-30T00:00:00.123456Z", "2026-01-01T00:00:00.123Z", "garbage", "9999-99-99T99:99:99.999999Z"]) expect(validFeedTime(value)).toBe(false);
  });
});
