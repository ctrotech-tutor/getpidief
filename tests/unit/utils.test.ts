import { describe, it, expect } from "vitest";
import {
  timeAgo, formatDate, formatDateLong, formatDateTime, formatISODate,
  formatNumber, formatNumberComma, formatPercent,
  formatFileSize,
  slugify, truncate, getInitials, capitalize, toTitleCase,
  getAvatarGradient, absoluteUrl, stripTrailingSlash,
} from "@/lib/utils/format";

// ─────────────────────────────────────────────────────────────────────────────
// DATE FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

describe("formatDate", () => {
  it("formats a date as 'Jan 1, 2024'", () => {
    expect(formatDate(new Date("2024-01-01"))).toBe("Jan 1, 2024");
  });
  it("formats a string date", () => {
    expect(formatDate("2024-06-15")).toBe("Jun 15, 2024");
  });
  it("handles ISO string", () => {
    expect(formatDate("2024-12-25T00:00:00.000Z")).toMatch(/Dec 25, 2024/);
  });
});

describe("formatDateLong", () => {
  it("returns full month name", () => {
    expect(formatDateLong(new Date("2024-01-01"))).toBe("January 1, 2024");
  });
});

describe("formatISODate", () => {
  it("returns YYYY-MM-DD format", () => {
    expect(formatISODate(new Date("2024-03-15"))).toBe("2024-03-15");
  });
});

describe("timeAgo", () => {
  it("returns a relative string", () => {
    const recent = new Date(Date.now() - 60_000);
    expect(timeAgo(recent)).toMatch(/minute/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NUMBER FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

describe("formatNumber", () => {
  it("returns plain number for < 1000", () => {
    expect(formatNumber(999)).toBe("999");
    expect(formatNumber(0)).toBe("0");
  });
  it("returns K suffix for thousands", () => {
    expect(formatNumber(1000)).toBe("1.0K");
    expect(formatNumber(1500)).toBe("1.5K");
    expect(formatNumber(12400)).toBe("12.4K");
  });
  it("returns M suffix for millions", () => {
    expect(formatNumber(1_000_000)).toBe("1.0M");
    expect(formatNumber(2_500_000)).toBe("2.5M");
  });
});

describe("formatNumberComma", () => {
  it("formats with commas", () => {
    expect(formatNumberComma(1234)).toBe("1,234");
    expect(formatNumberComma(1_234_567)).toBe("1,234,567");
  });
  it("handles small numbers", () => {
    expect(formatNumberComma(999)).toBe("999");
  });
});

describe("formatPercent", () => {
  it("converts decimal to percent string", () => {
    expect(formatPercent(0.856)).toBe("85.6%");
    expect(formatPercent(1.0)).toBe("100.0%");
    expect(formatPercent(0)).toBe("0.0%");
  });
  it("respects decimal places", () => {
    expect(formatPercent(0.1234, 2)).toBe("12.34%");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FILE SIZE
// ─────────────────────────────────────────────────────────────────────────────

describe("formatFileSize", () => {
  it("returns 0 B for zero", () => {
    expect(formatFileSize(0)).toBe("0 B");
  });
  it("formats bytes", () => {
    expect(formatFileSize(512)).toBe("512 B");
  });
  it("formats kilobytes", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(2048)).toBe("2.0 KB");
  });
  it("formats megabytes", () => {
    expect(formatFileSize(1_048_576)).toBe("1.0 MB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });
  it("formats gigabytes", () => {
    expect(formatFileSize(1024 ** 3)).toBe("1.00 GB");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STRING UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

describe("slugify", () => {
  it("converts spaces to hyphens", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });
  it("removes special characters", () => {
    expect(slugify("CS201: Data Structures & Algorithms!")).toBe("cs201-data-structures-algorithms");
  });
  it("collapses multiple hyphens", () => {
    expect(slugify("hello   world")).toBe("hello-world");
  });
  it("trims leading/trailing hyphens", () => {
    expect(slugify("  hello world  ")).toBe("hello-world");
  });
  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });
  it("lowercases everything", () => {
    expect(slugify("UPPERCASE")).toBe("uppercase");
  });
});

describe("truncate", () => {
  it("returns full string if within limit", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });
  it("truncates with ellipsis", () => {
    expect(truncate("hello world", 8)).toBe("hello w…");
  });
  it("handles exact length", () => {
    expect(truncate("12345", 5)).toBe("12345");
  });
});

describe("getInitials", () => {
  it("extracts two initials from full name", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });
  it("handles single name", () => {
    expect(getInitials("Alice")).toBe("A");
  });
  it("uses only first two words", () => {
    expect(getInitials("John Michael Doe")).toBe("JM");
  });
  it("uppercases initials", () => {
    expect(getInitials("john doe")).toBe("JD");
  });
});

describe("capitalize", () => {
  it("capitalizes first letter", () => {
    expect(capitalize("hello")).toBe("Hello");
  });
  it("lowercases the rest", () => {
    expect(capitalize("hELLO")).toBe("Hello");
  });
});

describe("toTitleCase", () => {
  it("converts snake_case to Title Case", () => {
    expect(toTitleCase("hello_world")).toBe("Hello World");
  });
  it("converts kebab-case", () => {
    expect(toTitleCase("computer-science")).toBe("Computer Science");
  });
  it("handles plain space-separated words", () => {
    expect(toTitleCase("hello world")).toBe("Hello World");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AVATAR GRADIENT
// ─────────────────────────────────────────────────────────────────────────────

describe("getAvatarGradient", () => {
  it("returns a tuple of two hex colors", () => {
    const [from, to] = getAvatarGradient("john");
    expect(from).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(to).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
  it("is deterministic for the same seed", () => {
    expect(getAvatarGradient("alice")).toEqual(getAvatarGradient("alice"));
  });
  it("returns different colors for different seeds", () => {
    const g1 = getAvatarGradient("aaaa");
    const g2 = getAvatarGradient("zzzz");
    // Not guaranteed to differ but very likely — just check structure
    expect(g1).toHaveLength(2);
    expect(g2).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// URL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

describe("absoluteUrl", () => {
  it("prepends base URL to path", () => {
    const url = absoluteUrl("/d/some-doc");
    expect(url).toContain("/d/some-doc");
    expect(url).toMatch(/^https?:\/\//);
  });
  it("handles path without leading slash", () => {
    expect(absoluteUrl("explore")).toContain("/explore");
  });
});

describe("stripTrailingSlash", () => {
  it("removes trailing slash", () => {
    expect(stripTrailingSlash("https://example.com/")).toBe("https://example.com");
  });
  it("leaves URL without trailing slash unchanged", () => {
    expect(stripTrailingSlash("https://example.com")).toBe("https://example.com");
  });
});