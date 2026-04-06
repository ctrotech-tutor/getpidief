import { pgEnum } from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────────────────
// USER ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "student",
  "contributor",
  "moderator",
  "admin",
  "super_admin",
]);

export const userStatusEnum = pgEnum("user_status", [
  "active",
  "suspended",
  "pending_verification",
  "deactivated",
  "deleted",
]);

export const academicLevelEnum = pgEnum("academic_level", [
  "undergraduate",
  "postgraduate",
  "doctorate",
  "professional",
  "other",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "unverified",
  "pending",
  "verified",
  "rejected",
]);

export const reputationLevelEnum = pgEnum("reputation_level", [
  "scholar",         // 0–99
  "analyst",         // 100–499
  "archivist",       // 500–1999
  "senior_contributor", // 2000–4999
  "distinguished_scholar", // 5000+
]);

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export const documentStatusEnum = pgEnum("document_status", [
  "draft",
  "pending",
  "approved",
  "rejected",
  "flagged",
  "deleted",
]);

export const resourceTypeEnum = pgEnum("resource_type", [
  "past_exam",
  "lecture_notes",
  "research_paper",
  "textbook_summary",
  "assignment",
  "tutorial_sheet",
  "course_guide",
  "lab_report",
  "thesis",
  "dissertation",
  "other",
]);

export const visibilityEnum = pgEnum("visibility", [
  "public",
  "institution",
  "private",
]);

export const licenseEnum = pgEnum("license", [
  "academic_use_only",
  "cc_by",
  "cc_by_sa",
  "cc_by_nc",
  "cc_by_nc_sa",
  "all_rights_reserved",
]);

export const previewStatusEnum = pgEnum("preview_status", [
  "pending",
  "processing",
  "ready",
  "failed",
]);

export const semesterEnum = pgEnum("semester", [
  "semester_1",
  "semester_2",
  "full_year",
  "term_1",
  "term_2",
  "term_3",
  "trimester_1",
  "trimester_2",
  "trimester_3",
]);

// ─────────────────────────────────────────────────────────────────────────────
// INTERACTION ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export const reactionTypeEnum = pgEnum("reaction_type", ["like", "dislike"]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "like",
  "dislike",
  "comment",
  "comment_reply",
  "comment_helpful",
  "follow",
  "document_approved",
  "document_rejected",
  "document_flagged",
  "new_upload_from_following",
  "badge_earned",
  "reputation_milestone",
  "system_announcement",
  "mention",
]);

export const notificationEntityTypeEnum = pgEnum("notification_entity_type", [
  "document",
  "comment",
  "user",
  "badge",
  "system",
]);

export const reportReasonEnum = pgEnum("report_reason", [
  "low_quality_scan",
  "copyright_violation",
  "incorrect_category",
  "duplicate_submission",
  "inappropriate_content",
  "insufficient_metadata",
  "spam",
  "misinformation",
  "other",
]);

export const reportStatusEnum = pgEnum("report_status", [
  "open",
  "under_review",
  "resolved_actioned",
  "resolved_dismissed",
]);

// ─────────────────────────────────────────────────────────────────────────────
// REPUTATION ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export const reputationEventTypeEnum = pgEnum("reputation_event_type", [
  "document_uploaded",
  "document_approved",
  "document_rejected_penalty",
  "document_downloaded",
  "document_liked_received",
  "comment_posted",
  "comment_helpful_received",
  "follower_gained",
  "badge_earned",
  "streak_bonus",
  "penalty_flagged_content",
]);

// ─────────────────────────────────────────────────────────────────────────────
// INSTITUTION ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export const institutionTypeEnum = pgEnum("institution_type", [
  "university",
  "college",
  "institute",
  "polytechnic",
  "academy",
  "school",
  "research_center",
  "other",
]);

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export const auditActionEnum = pgEnum("audit_action", [
  "user_role_changed",
  "user_suspended",
  "user_unsuspended",
  "user_deleted",
  "document_approved",
  "document_rejected",
  "document_deleted",
  "document_metadata_edited",
  "institution_created",
  "institution_updated",
  "institution_deactivated",
  "category_created",
  "category_updated",
  "category_deactivated",
  "tag_merged",
  "tag_deactivated",
  "report_resolved",
  "system_setting_changed",
  "feature_flag_changed",
  "course_code_created",
  "course_code_updated",
]);

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export const analyticsMetricEnum = pgEnum("analytics_metric", [
  "user_registrations",
  "documents_uploaded",
  "documents_approved",
  "document_views",
  "document_downloads",
  "document_likes",
  "comments_posted",
  "new_follows",
  "search_queries",
  "active_users",
]);