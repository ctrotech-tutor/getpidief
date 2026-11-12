import { describe, expect, it } from "vitest";
import { formatPostTime } from "@/lib/feed/post-time";

describe("compact feed timestamps", () => {
  const now = new Date("2026-10-30T12:00:00Z");
  it.each([
    ["2026-10-30T11:59:30Z", "just now"],
    ["2026-10-30T11:56:00Z", "4m"],
    ["2026-10-30T08:00:00Z", "4h"],
    ["2026-10-28T12:00:00Z", "2d"],
    ["2026-10-25T12:00:00Z", "5d"],
    ["2026-10-23T12:00:00Z", "Oct 23"],
    ["2026-04-30T12:00:00Z", "Apr 30"],
    ["2025-10-30T12:00:00Z", "1y"],
    ["2021-10-30T12:00:00Z", "5y"],
    ["2026-10-30T12:01:00Z", "just now"],
  ])("formats %s as %s", (date, expected) => expect(formatPostTime(new Date(date), now)).toBe(expected));
  it("does not count a year before the anniversary", () => {
    expect(formatPostTime(new Date("2025-10-30T13:00:00Z"), now)).toBe("Oct 30");
  });
});
