/**
 * Input sanitization utilities
 * Uses isomorphic-dompurify so it works in both server (Node.js) and browser.
 */

import DOMPurify from "isomorphic-dompurify";

// ─────────────────────────────────────────────────────────────────────────────
// HTML SANITIZATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sanitize HTML — strips XSS vectors.
 * Use on any user-generated HTML before rendering with dangerouslySetInnerHTML.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "code", "pre",
      "blockquote", "ul", "ol", "li", "a", "h1", "h2", "h3",
    ],
    ALLOWED_ATTR: ["href", "target", "rel"],
    FORCE_BODY:   false,
    RETURN_DOM:   false,
  });
}

/**
 * Strip ALL HTML tags — plain text only.
 * Use when you need the text content of a field without any markup.
 */
export function stripHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

/**
 * Sanitize for comment/markdown rendering — allows inline formatting only.
 */
export function sanitizeComment(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["strong", "em", "code", "a", "br"],
    ALLOWED_ATTR: ["href", "rel"],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TEXT SANITIZATION (no HTML, just safe text)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sanitize a plain-text field — removes control characters and normalizes whitespace.
 * Safe for database storage and display.
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // strip control chars
    .replace(/\s+/g, " ")                                // normalize whitespace
    .trim();
}

/**
 * Sanitize a search query — removes SQL/NoSQL injection patterns, normalizes.
 */
export function sanitizeSearchQuery(query: string): string {
  return query
    .replace(/['"`;\\]/g, " ")   // remove quote/injection chars
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);              // hard length cap
}

/**
 * Sanitize a URL — ensures it's a safe http/https URL.
 * Returns null if the URL is unsafe (javascript:, data:, etc.).
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitize filename for storage.
 * Strips path traversal, unsafe characters, keeps extension.
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[/\\:*?"<>|]/g, "_")   // replace unsafe chars
    .replace(/\.\./g, "_")            // prevent path traversal
    .replace(/^\./, "_")              // no hidden files
    .slice(0, 255);                   // filesystem limit
}
