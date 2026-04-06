import { formatDistanceToNow, format, formatRelative } from "date-fns";

// ─────────────────────────────────────────────────────────────────────────────
// DATE FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

/** "2 hours ago", "3 days ago" etc. */
export function timeAgo(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

/** "Mar 15, 2024" */
export function formatDate(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy");
}

/** "March 15, 2024" */
export function formatDateLong(date: Date | string): string {
  return format(new Date(date), "MMMM d, yyyy");
}

/** "15 Mar 2024 · 14:32" */
export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "d MMM yyyy · HH:mm");
}

/** ISO date string "2024-03-15" */
export function formatISODate(date: Date | string): string {
  return format(new Date(date), "yyyy-MM-dd");
}

// ─────────────────────────────────────────────────────────────────────────────
// NUMBER FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

/** 1200 → "1.2K", 1500000 → "1.5M" */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** 1234 → "1,234" */
export function formatNumberComma(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

/** 0.856 → "85.6%" */
export function formatPercent(n: number, decimals = 1): string {
  return `${(n * 100).toFixed(decimals)}%`;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE SIZE
// ─────────────────────────────────────────────────────────────────────────────

/** 1048576 → "1.0 MB" */
export function formatFileSize(bytes: number): string {
  if (bytes === 0)           return "0 B";
  if (bytes < 1024)          return `${bytes} B`;
  if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3)     return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

// ─────────────────────────────────────────────────────────────────────────────
// STRING UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/** Convert a string to a URL-safe slug */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Truncate text with ellipsis */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "…";
}

/** Extract initials from a name: "John Doe" → "JD" */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Capitalize first letter */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/** Convert snake_case/kebab-case to Title Case */
export function toTitleCase(text: string): string {
  return text
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─────────────────────────────────────────────────────────────────────────────
// AVATAR FALLBACK COLOR
// Generates a deterministic gradient color pair from a user's name/id
// ─────────────────────────────────────────────────────────────────────────────

const AVATAR_GRADIENTS = [
  ["#2563EB", "#1E40AF"],  // Blue
  ["#7C3AED", "#5B21B6"],  // Violet
  ["#10B981", "#047857"],  // Emerald
  ["#F59E0B", "#D97706"],  // Gold
  ["#F43F5E", "#BE123C"],  // Rose
  ["#0891B2", "#0E7490"],  // Cyan
  ["#8B5CF6", "#6D28D9"],  // Purple
  ["#EC4899", "#BE185D"],  // Pink
] as const;

export function getAvatarGradient(seed: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index] as [string, string];
}

// ─────────────────────────────────────────────────────────────────────────────
// URL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Build an absolute URL from a path */
export function absoluteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

/** Strip trailing slash */
export function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}