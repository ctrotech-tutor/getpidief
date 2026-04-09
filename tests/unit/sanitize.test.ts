import { describe, it, expect } from "vitest";
import { sanitizeHtml, stripHtml, sanitizeComment, sanitizeText, sanitizeSearchQuery, sanitizeUrl, sanitizeFilename } from "@/lib/utils/sanitize";
import { cn } from "@/lib/utils/cn";

// ─────────────────────────────────────────────────────────────────────────────
// SANITIZE HTML
// ─────────────────────────────────────────────────────────────────────────────

describe("sanitizeHtml", () => {
  it("preserves allowed tags", () => {
    const result = sanitizeHtml("<p>Hello <strong>world</strong></p>");
    expect(result).toContain("<strong>world</strong>");
  });
  it("strips script tags", () => {
    const result = sanitizeHtml('<script>alert("xss")</script><p>safe</p>');
    expect(result).not.toContain("<script>");
    expect(result).toContain("safe");
  });
  it("strips event handlers", () => {
    const result = sanitizeHtml('<p onclick="steal()">click me</p>');
    expect(result).not.toContain("onclick");
  });
  it("strips iframe", () => {
    const result = sanitizeHtml('<iframe src="evil.com"></iframe>');
    expect(result).not.toContain("<iframe");
  });
});

describe("stripHtml", () => {
  it("removes all HTML tags", () => {
    const result = stripHtml("<p>Hello <strong>World</strong></p>");
    expect(result).toBe("Hello World");
  });
  it("returns empty string for empty input", () => {
    expect(stripHtml("")).toBe("");
  });
  it("preserves text content", () => {
    expect(stripHtml("<h1>Title</h1><p>Body</p>")).toContain("Title");
    expect(stripHtml("<h1>Title</h1><p>Body</p>")).toContain("Body");
  });
});

describe("sanitizeComment", () => {
  it("preserves inline formatting", () => {
    const result = sanitizeComment("<strong>important</strong> and <em>italic</em>");
    expect(result).toContain("<strong>");
    expect(result).toContain("<em>");
  });
  it("strips block-level tags", () => {
    const result = sanitizeComment("<h1>Header</h1><p>para</p>");
    expect(result).not.toContain("<h1>");
    expect(result).not.toContain("<p>");
    expect(result).toContain("Header");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SANITIZE TEXT
// ─────────────────────────────────────────────────────────────────────────────

describe("sanitizeText", () => {
  it("trims whitespace", () => {
    expect(sanitizeText("  hello  ")).toBe("hello");
  });
  it("normalizes multiple spaces", () => {
    expect(sanitizeText("hello   world")).toBe("hello world");
  });
  it("removes control characters", () => {
    expect(sanitizeText("hello\x00world")).toBe("helloworld");
  });
});

describe("sanitizeSearchQuery", () => {
  it("removes SQL injection chars", () => {
    const result = sanitizeSearchQuery("'; DROP TABLE users; --");
    expect(result).not.toContain("'");
    expect(result).not.toContain(";");
  });
  it("caps at 200 characters", () => {
    const long = "a".repeat(300);
    expect(sanitizeSearchQuery(long)).toHaveLength(200);
  });
  it("trims and normalizes whitespace", () => {
    expect(sanitizeSearchQuery("  hello   world  ")).toBe("hello world");
  });
});

describe("sanitizeUrl", () => {
  it("allows http URLs", () => {
    expect(sanitizeUrl("http://example.com")).toBe("http://example.com/");
  });
  it("allows https URLs", () => {
    expect(sanitizeUrl("https://example.com/path")).not.toBeNull();
  });
  it("rejects javascript: protocol", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBeNull();
  });
  it("rejects data: protocol", () => {
    expect(sanitizeUrl("data:text/html,<script>")).toBeNull();
  });
  it("returns null for invalid URLs", () => {
    expect(sanitizeUrl("not-a-url")).toBeNull();
  });
});

describe("sanitizeFilename", () => {
  it("replaces path separators", () => {
    expect(sanitizeFilename("../../etc/passwd")).not.toContain("..");
  });
  it("replaces unsafe characters", () => {
    expect(sanitizeFilename('file<>|name.pdf')).not.toMatch(/[<>|]/);
  });
  it("preserves extension", () => {
    const result = sanitizeFilename("my document.pdf");
    expect(result).toContain(".pdf");
  });
  it("caps at 255 characters", () => {
    const long = "a".repeat(300) + ".pdf";
    expect(sanitizeFilename(long)).toHaveLength(255);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CN UTILITY
// ─────────────────────────────────────────────────────────────────────────────

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });
  it("deduplicates Tailwind classes", () => {
    const result = cn("px-4 py-2", "px-8");
    expect(result).toContain("px-8");
    expect(result).not.toContain("px-4");
  });
  it("handles conditional classes", () => {
    expect(cn("base", false && "not-included", "included")).toBe("base included");
  });
  it("handles undefined/null", () => {
    expect(cn("base", undefined, null)).toBe("base");
  });
  it("handles arrays", () => {
    expect(cn(["a", "b"], "c")).toBe("a b c");
  });
});
