import type { DefaultSession } from "next-auth";

// ─────────────────────────────────────────────────────────────────────────────
// SESSION TYPE AUGMENTATION
// ─────────────────────────────────────────────────────────────────────────────

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "student" | "contributor" | "moderator" | "admin" | "super_admin";
      status: "active" | "suspended" | "pending_verification" | "deactivated";
      username: string;
      displayName: string;
      avatarUrl: string | null;
      onboardingComplete: boolean;
      verificationStatus: "unverified" | "pending" | "verified" | "rejected";
      reputationScore: number;
      reputationLevel: string;
      institutionId: string | null;
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// API RESPONSE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type ApiSuccess<T = unknown> = {
  data: T;
  message?: string;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
};

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED ENTITY TYPES  (used across features, not tied to DB layer)
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = "student" | "contributor" | "moderator" | "admin" | "super_admin";
export type UserStatus = "active" | "suspended" | "pending_verification" | "deactivated" | "deleted";
export type DocumentStatus = "draft" | "pending" | "approved" | "rejected" | "flagged" | "deleted";
export type ResourceType =
  | "past_exam" | "lecture_notes" | "research_paper"
  | "textbook_summary" | "assignment" | "tutorial_sheet"
  | "course_guide" | "lab_report" | "thesis" | "dissertation" | "other";
export type Visibility = "public" | "institution" | "private";
export type ReputationLevel =
  | "scholar" | "analyst" | "archivist"
  | "senior_contributor" | "distinguished_scholar";
export type NotificationType =
  | "like" | "dislike" | "comment" | "comment_reply" | "comment_helpful"
  | "follow" | "document_approved" | "document_rejected" | "document_flagged"
  | "new_upload_from_following" | "badge_earned" | "reputation_milestone"
  | "system_announcement" | "mention";

// ─────────────────────────────────────────────────────────────────────────────
// UI COMPONENT PROP TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type WithClassName = {
  className?: string;
};

export type WithChildren = {
  children: React.ReactNode;
};

export type LoadingState = "idle" | "loading" | "success" | "error";

// ─────────────────────────────────────────────────────────────────────────────
// FILTER TYPES  (used in search + archive)
// ─────────────────────────────────────────────────────────────────────────────

export type ActiveFilter = {
  key: string;
  label: string;
  value: string | string[];
};

export type SortOption = {
  label: string;
  value: "relevance" | "recent" | "downloads" | "likes" | "discussed";
};

export const SORT_OPTIONS: SortOption[] = [
  { label: "Most Relevant", value: "relevance" },
  { label: "Most Recent", value: "recent" },
  { label: "Most Downloaded", value: "downloads" },
  { label: "Highest Rated", value: "likes" },
  { label: "Most Discussed", value: "discussed" },
];

// ─────────────────────────────────────────────────────────────────────────────
// REPUTATION CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const REPUTATION_LEVELS_CONFIG = [
  { level: "scholar",               label: "Scholar",                min: 0,    max: 99,   color: "#6B7280" },
  { level: "analyst",               label: "Analyst",                min: 100,  max: 499,  color: "#2563EB" },
  { level: "archivist",             label: "Archivist",              min: 500,  max: 1999, color: "#7C3AED" },
  { level: "senior_contributor",    label: "Senior Contributor",     min: 2000, max: 4999, color: "#F59E0B" },
  { level: "distinguished_scholar", label: "Distinguished Scholar",  min: 5000, max: Infinity, color: "#DC2626" },
] as const;

export function getReputationConfig(level: ReputationLevel) {
  return REPUTATION_LEVELS_CONFIG.find((l) => l.level === level)!;
}

export function getReputationProgress(score: number): number {
  const level = REPUTATION_LEVELS_CONFIG.find(
    (l) => score >= l.min && score <= l.max
  );
  if (!level || level.max === Infinity) return 100;
  return Math.round(((score - level.min) / (level.max - level.min)) * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// RESOURCE TYPE LABELS
// ─────────────────────────────────────────────────────────────────────────────

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  past_exam: "Past Exam",
  lecture_notes: "Lecture Notes",
  research_paper: "Research Paper",
  textbook_summary: "Textbook Summary",
  assignment: "Assignment",
  tutorial_sheet: "Tutorial Sheet",
  course_guide: "Course Guide",
  lab_report: "Lab Report",
  thesis: "Thesis",
  dissertation: "Dissertation",
  other: "Other",
};

export const RESOURCE_TYPE_COLORS: Record<ResourceType, string> = {
  past_exam: "#F59E0B",
  lecture_notes: "#2563EB",
  research_paper: "#7C3AED",
  textbook_summary: "#10B981",
  assignment: "#EC4899",
  tutorial_sheet: "#0891B2",
  course_guide: "#059669",
  lab_report: "#EF4444",
  thesis: "#8B5CF6",
  dissertation: "#6366F1",
  other: "#6B7280",
};
