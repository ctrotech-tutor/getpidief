import { describe, it, expect } from "vitest";
import { assertLocalSeedTarget } from "../../scripts/seed/guard";
import { account, fixtureId } from "../../scripts/seed/identity";
import { guides, topics } from "../../scripts/seed/content";

describe("local demo seed", () => {
  it("rejects production, remote targets, missing databases and URL overrides", () => {
    for (const url of [undefined, "postgres://db.example.com/app", "postgres://localhost/", "postgres://localhost/db?host=db.example.com", "postgres://localhost/db?sslmode=require", "not-a-url"]) expect(() => assertLocalSeedTarget(url, "development")).toThrow();
    expect(() => assertLocalSeedTarget("postgres://localhost/db", "production")).toThrow();
    expect(assertLocalSeedTarget("postgres://localhost:54329/getpidief", "development")).toBe("postgres://localhost:54329/getpidief");
  });
  it("has stable distinct demo identities and IDs", () => {
    const accounts = Array.from({ length: 50 }, (_, i) => account(i));
    expect(new Set(accounts.map(u => u.id)).size).toBe(50);
    expect(new Set(accounts.map(u => u.email)).size).toBe(50);
    expect(account(0).email).toBe("learner01@example.test");
    expect(fixtureId("post", 1)).toBe(fixtureId("post", 1));
    expect(fixtureId("post", 1)).not.toBe(fixtureId("user", 1));
  });
  it("provides original guide text and external references", () => {
    expect(topics).toHaveLength(24); expect(guides).toHaveLength(8);
    for (const guide of guides) { expect(guide.lines.length).toBeGreaterThan(2); expect(new URL(guide.source).protocol).toBe("https:"); }
  });
});
