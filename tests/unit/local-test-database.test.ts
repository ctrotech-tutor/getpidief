import { describe, expect, it } from "vitest";
import { assertLocalTestDatabase } from "../../scripts/lib/local-test-database";

describe("local database safety guard", () => {
  it.each([
    "postgres://user:pass@localhost:5432/fixture_test",
    "postgresql://user:pass@127.0.0.1:5432/fixture_test",
    "postgres://user:pass@[::1]:5432/fixture_test",
  ])("accepts a guarded local URL: %s", url => { expect(assertLocalTestDatabase(url)).toBe(url); });
  it.each([
    undefined, "", "not-a-url", "http://localhost/fixture_test",
    "postgres://localhost/production", "postgres://example.com/fixture_test",
    "postgres://localhost/fixture_test?host=example.com",
    "postgres://localhost/fixture_test?host=%2Ftmp",
    "postgres://localhost/fixture_test?port=5432",
    "postgres://localhost/fixture_test#fragment",
    "postgres://localhost/fixture%5ftest",
  ])("rejects unsafe target without echoing the URL", url => {
    expect(() => assertLocalTestDatabase(url)).toThrow(/isolated local PostgreSQL/);
  });
});
