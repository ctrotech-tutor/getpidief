CREATE TYPE "public"."academic_level" AS ENUM('undergraduate', 'postgraduate', 'doctorate', 'professional', 'other');--> statement-breakpoint
CREATE TYPE "public"."analytics_metric" AS ENUM('user_registrations', 'documents_uploaded', 'documents_approved', 'document_views', 'document_downloads', 'document_likes', 'comments_posted', 'new_follows', 'search_queries', 'active_users');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('user_role_changed', 'user_suspended', 'user_unsuspended', 'user_deleted', 'document_approved', 'document_rejected', 'document_deleted', 'document_metadata_edited', 'institution_created', 'institution_updated', 'institution_deactivated', 'category_created', 'category_updated', 'category_deactivated', 'tag_merged', 'tag_deactivated', 'report_resolved', 'system_setting_changed', 'feature_flag_changed', 'course_code_created', 'course_code_updated');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('draft', 'pending', 'approved', 'rejected', 'flagged', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."institution_type" AS ENUM('university', 'college', 'institute', 'polytechnic', 'academy', 'school', 'research_center', 'other');--> statement-breakpoint
CREATE TYPE "public"."license" AS ENUM('academic_use_only', 'cc_by', 'cc_by_sa', 'cc_by_nc', 'cc_by_nc_sa', 'all_rights_reserved');--> statement-breakpoint
CREATE TYPE "public"."notification_entity_type" AS ENUM('document', 'comment', 'user', 'badge', 'system');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('like', 'dislike', 'comment', 'comment_reply', 'comment_helpful', 'follow', 'document_approved', 'document_rejected', 'document_flagged', 'new_upload_from_following', 'badge_earned', 'reputation_milestone', 'system_announcement', 'mention');--> statement-breakpoint
CREATE TYPE "public"."preview_status" AS ENUM('pending', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."reaction_type" AS ENUM('like', 'dislike');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('low_quality_scan', 'copyright_violation', 'incorrect_category', 'duplicate_submission', 'inappropriate_content', 'insufficient_metadata', 'spam', 'misinformation', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'under_review', 'resolved_actioned', 'resolved_dismissed');--> statement-breakpoint
CREATE TYPE "public"."reputation_event_type" AS ENUM('document_uploaded', 'document_approved', 'document_rejected_penalty', 'document_downloaded', 'document_liked_received', 'comment_posted', 'comment_helpful_received', 'follower_gained', 'badge_earned', 'streak_bonus', 'penalty_flagged_content');--> statement-breakpoint
CREATE TYPE "public"."reputation_level" AS ENUM('scholar', 'analyst', 'archivist', 'senior_contributor', 'distinguished_scholar');--> statement-breakpoint
CREATE TYPE "public"."resource_type" AS ENUM('past_exam', 'lecture_notes', 'research_paper', 'textbook_summary', 'assignment', 'tutorial_sheet', 'course_guide', 'lab_report', 'thesis', 'dissertation', 'other');--> statement-breakpoint
CREATE TYPE "public"."semester" AS ENUM('semester_1', 'semester_2', 'full_year', 'term_1', 'term_2', 'term_3', 'trimester_1', 'trimester_2', 'trimester_3');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('student', 'contributor', 'moderator', 'admin', 'super_admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'pending_verification', 'deactivated', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('unverified', 'pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('public', 'institution', 'private');--> statement-breakpoint
CREATE TABLE "auth_accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "auth_accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	"user_agent" text,
	"ip_address" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "auth_verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "auth_verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token"),
	CONSTRAINT "auth_verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"ip_address" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "user_activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"ip_hash" varchar(64),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_interests" (
	"user_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"bio" text,
	"avatar_url" text,
	"cover_url" text,
	"role" "user_role" DEFAULT 'student' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"suspended_until" timestamp with time zone,
	"suspension_reason" text,
	"deactivated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"institution_id" uuid,
	"faculty" varchar(150),
	"major" varchar(150),
	"department" varchar(150),
	"academic_level" "academic_level" DEFAULT 'undergraduate',
	"academic_year" integer,
	"semester" varchar(50),
	"graduation_year" integer,
	"verification_status" "verification_status" DEFAULT 'unverified' NOT NULL,
	"verification_requested_at" timestamp with time zone,
	"verification_document_url" text,
	"verification_notes" text,
	"verified_at" timestamp with time zone,
	"verified_by_admin_id" uuid,
	"onboarding_complete" boolean DEFAULT false NOT NULL,
	"onboarding_step" integer DEFAULT 1 NOT NULL,
	"reputation_score" integer DEFAULT 0 NOT NULL,
	"reputation_level" "reputation_level" DEFAULT 'scholar' NOT NULL,
	"follower_count" integer DEFAULT 0 NOT NULL,
	"following_count" integer DEFAULT 0 NOT NULL,
	"document_count" integer DEFAULT 0 NOT NULL,
	"total_downloads" integer DEFAULT 0 NOT NULL,
	"total_likes" integer DEFAULT 0 NOT NULL,
	"external_links" jsonb DEFAULT '{}'::jsonb,
	"notification_preferences" jsonb DEFAULT '{
        "like_inapp": true,      "like_email": false,  "like_push": false,
        "comment_inapp": true,   "comment_email": true,"comment_push": true,
        "follow_inapp": true,    "follow_email": false,"follow_push": false,
        "approved_inapp": true,  "approved_email": true,"approved_push": true,
        "rejected_inapp": true,  "rejected_email": true,"rejected_push": false,
        "new_upload_inapp": true,"new_upload_email": false,"new_upload_push": true,
        "badge_inapp": true,     "badge_email": true,  "badge_push": true,
        "weekly_digest": true,   "system_inapp": true, "system_email": true
      }'::jsonb NOT NULL,
	"privacy_settings" jsonb DEFAULT '{
        "profile_visibility": "public",
        "show_institution": true,
        "show_library": false,
        "show_activity_in_pulse": true,
        "allow_messages": true
      }'::jsonb NOT NULL,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"two_factor_secret" text,
	"two_factor_backup_codes" text[],
	"last_active_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"login_count" integer DEFAULT 0 NOT NULL,
	"current_streak_days" integer DEFAULT 0 NOT NULL,
	"longest_streak_days" integer DEFAULT 0 NOT NULL,
	"last_streak_date" timestamp with time zone,
	"push_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"slug" varchar(150) NOT NULL,
	"description" text,
	"icon" varchar(100),
	"color" varchar(7) DEFAULT '#2563EB' NOT NULL,
	"parent_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"document_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "course_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255),
	"institution_id" uuid,
	"category_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"document_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institution_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"country" varchar(100) NOT NULL,
	"website_url" text,
	"additional_info" text,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"resolved_by_admin_id" uuid,
	"resolved_at" timestamp with time zone,
	"created_institution_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"short_name" varchar(100),
	"country" varchar(100) NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"city" varchar(100),
	"type" "institution_type" DEFAULT 'university' NOT NULL,
	"logo_url" text,
	"cover_url" text,
	"website_url" text,
	"email_domains" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"document_count" integer DEFAULT 0 NOT NULL,
	"user_count" integer DEFAULT 0 NOT NULL,
	"contributor_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "institutions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_system_tag" boolean DEFAULT false NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"merged_into_tag_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name"),
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "document_course_codes" (
	"document_id" uuid NOT NULL,
	"course_code_id" uuid NOT NULL,
	"raw_code" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_downloads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" uuid,
	"ip_hash" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_tags" (
	"document_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" uuid,
	"session_id" varchar(64),
	"ip_hash" varchar(64),
	"user_agent" text,
	"referrer" text,
	"duration_seconds" integer,
	"pages_viewed" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(300) NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"language" varchar(10) DEFAULT 'en' NOT NULL,
	"category_id" uuid,
	"resource_type" "resource_type" DEFAULT 'other' NOT NULL,
	"semester" "semester",
	"academic_year" integer,
	"institution_id" uuid,
	"author_id" uuid NOT NULL,
	"file_url" text NOT NULL,
	"file_size" bigint,
	"file_hash" varchar(64),
	"mime_type" varchar(100) DEFAULT 'application/pdf' NOT NULL,
	"thumbnail_url" text,
	"preview_status" "preview_status" DEFAULT 'pending' NOT NULL,
	"preview_error" text,
	"page_count" integer,
	"visibility" "visibility" DEFAULT 'public' NOT NULL,
	"license" "license" DEFAULT 'academic_use_only' NOT NULL,
	"allow_download" boolean DEFAULT true NOT NULL,
	"allow_print" boolean DEFAULT true NOT NULL,
	"status" "document_status" DEFAULT 'pending' NOT NULL,
	"rejection_reasons" text[],
	"rejection_note" text,
	"moderated_by_admin_id" uuid,
	"moderated_at" timestamp with time zone,
	"flagged_at" timestamp with time zone,
	"flag_count" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"view_count" integer DEFAULT 0 NOT NULL,
	"unique_view_count" integer DEFAULT 0 NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"dislike_count" integer DEFAULT 0 NOT NULL,
	"bookmark_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"share_count" integer DEFAULT 0 NOT NULL,
	"trending_score" real DEFAULT 0 NOT NULL,
	"search_vector" "tsvector",
	"is_duplicate" boolean DEFAULT false NOT NULL,
	"duplicate_of_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "documents_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "bookmark_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"visibility" "visibility" DEFAULT 'private' NOT NULL,
	"cover_urls" text[] DEFAULT ARRAY[]::text[],
	"document_count" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comment_helpful_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"parent_id" uuid,
	"root_id" uuid,
	"content" text NOT NULL,
	"content_html" text,
	"is_edited" boolean DEFAULT false NOT NULL,
	"edited_at" timestamp with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"is_flagged" boolean DEFAULT false NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"mentioned_user_ids" uuid[] DEFAULT ARRAY[]::uuid[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"collection_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "reaction_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"reported_by_user_id" uuid NOT NULL,
	"reasons" text[] NOT NULL,
	"additional_info" text,
	"status" varchar(50) DEFAULT 'open' NOT NULL,
	"resolved_by_admin_id" uuid,
	"resolved_at" timestamp with time zone,
	"resolution_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" uuid,
	"platform" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follower_id" uuid NOT NULL,
	"following_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"sender_id" uuid,
	"type" "notification_type" NOT NULL,
	"entity_type" "notification_entity_type",
	"entity_id" uuid,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"email_sent" boolean DEFAULT false NOT NULL,
	"email_sent_at" timestamp with time zone,
	"push_sent" boolean DEFAULT false NOT NULL,
	"push_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"query" text NOT NULL,
	"result_count" integer,
	"clicked_document_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"metric" "analytics_metric" NOT NULL,
	"dimension_type" varchar(50),
	"dimension_id" uuid,
	"value" bigint DEFAULT 0 NOT NULL,
	"cumulative_value" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"action" "audit_action" NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" uuid,
	"before_state" jsonb,
	"after_state" jsonb,
	"reason" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"icon" varchar(100) NOT NULL,
	"color" varchar(7) NOT NULL,
	"reputation_bonus" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_secret" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"criteria_type" varchar(100) NOT NULL,
	"criteria_value" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "badges_name_unique" UNIQUE("name"),
	CONSTRAINT "badges_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "reputation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "reputation_event_type" NOT NULL,
	"points_delta" integer NOT NULL,
	"score_after" integer NOT NULL,
	"reference_type" varchar(50),
	"reference_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"updated_by_admin_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"badge_id" uuid NOT NULL,
	"awarded_by_admin_id" uuid,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notification_sent" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity_log" ADD CONSTRAINT "user_activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_id_auth_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_codes" ADD CONSTRAINT "course_codes_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_codes" ADD CONSTRAINT "course_codes_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_requests" ADD CONSTRAINT "institution_requests_created_institution_id_institutions_id_fk" FOREIGN KEY ("created_institution_id") REFERENCES "public"."institutions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_course_codes" ADD CONSTRAINT "document_course_codes_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_course_codes" ADD CONSTRAINT "document_course_codes_course_code_id_course_codes_id_fk" FOREIGN KEY ("course_code_id") REFERENCES "public"."course_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_downloads" ADD CONSTRAINT "document_downloads_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_downloads" ADD CONSTRAINT "document_downloads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_tags" ADD CONSTRAINT "document_tags_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_tags" ADD CONSTRAINT "document_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_views" ADD CONSTRAINT "document_views_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_views" ADD CONSTRAINT "document_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmark_collections" ADD CONSTRAINT "bookmark_collections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_helpful_votes" ADD CONSTRAINT "comment_helpful_votes_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_helpful_votes" ADD CONSTRAINT "comment_helpful_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_bookmarks" ADD CONSTRAINT "document_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_bookmarks" ADD CONSTRAINT "document_bookmarks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_bookmarks" ADD CONSTRAINT "document_bookmarks_collection_id_bookmark_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."bookmark_collections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_reactions" ADD CONSTRAINT "document_reactions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_reactions" ADD CONSTRAINT "document_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_reports" ADD CONSTRAINT "document_reports_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_reports" ADD CONSTRAINT "document_reports_reported_by_user_id_users_id_fk" FOREIGN KEY ("reported_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_shares" ADD CONSTRAINT "document_shares_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_shares" ADD CONSTRAINT "document_shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reputation_events" ADD CONSTRAINT "reputation_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_accounts_user_id_idx" ON "auth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_expires_idx" ON "auth_sessions" USING btree ("expires");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_users_email_idx" ON "auth_users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_verification_tokens_token_idx" ON "auth_verification_tokens" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "password_reset_tokens_hash_idx" ON "password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_expires_idx" ON "password_reset_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_idx" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "user_activity_log_user_id_idx" ON "user_activity_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_activity_log_action_idx" ON "user_activity_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "user_activity_log_created_at_idx" ON "user_activity_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_activity_log_entity_idx" ON "user_activity_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "user_interests_user_id_idx" ON "user_interests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_interests_tag_id_idx" ON "user_interests" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_idx" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "users_institution_idx" ON "users" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "users_reputation_score_idx" ON "users" USING btree ("reputation_score");--> statement-breakpoint
CREATE INDEX "users_onboarding_complete_idx" ON "users" USING btree ("onboarding_complete");--> statement-breakpoint
CREATE INDEX "users_verification_status_idx" ON "users" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "users_last_active_idx" ON "users" USING btree ("last_active_at");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_search_idx" ON "users" USING gin (to_tsvector('english', coalesce("display_name", '') || ' ' || coalesce("username", '')));--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "categories_is_active_idx" ON "categories" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "categories_is_featured_idx" ON "categories" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "categories_sort_order_idx" ON "categories" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "course_codes_code_inst_idx" ON "course_codes" USING btree ("code","institution_id");--> statement-breakpoint
CREATE INDEX "course_codes_institution_idx" ON "course_codes" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "course_codes_category_idx" ON "course_codes" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "course_codes_search_idx" ON "course_codes" USING gin (to_tsvector('english', "code" || ' ' || coalesce("name", '')));--> statement-breakpoint
CREATE INDEX "institution_requests_status_idx" ON "institution_requests" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "institutions_slug_idx" ON "institutions" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "institutions_country_idx" ON "institutions" USING btree ("country");--> statement-breakpoint
CREATE INDEX "institutions_country_code_idx" ON "institutions" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "institutions_type_idx" ON "institutions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "institutions_is_active_idx" ON "institutions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "institutions_document_count_idx" ON "institutions" USING btree ("document_count");--> statement-breakpoint
CREATE INDEX "institutions_name_search_idx" ON "institutions" USING gin (to_tsvector('english', "name" || ' ' || coalesce("short_name", '')));--> statement-breakpoint
CREATE UNIQUE INDEX "tags_slug_idx" ON "tags" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_name_idx" ON "tags" USING btree ("name");--> statement-breakpoint
CREATE INDEX "tags_is_active_idx" ON "tags" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "tags_usage_count_idx" ON "tags" USING btree ("usage_count");--> statement-breakpoint
CREATE INDEX "tags_name_trgm_idx" ON "tags" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "doc_course_codes_document_idx" ON "document_course_codes" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "doc_course_codes_course_code_idx" ON "document_course_codes" USING btree ("course_code_id");--> statement-breakpoint
CREATE INDEX "document_downloads_document_idx" ON "document_downloads" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_downloads_user_idx" ON "document_downloads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "document_downloads_created_at_idx" ON "document_downloads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "document_tags_document_idx" ON "document_tags" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_tags_tag_idx" ON "document_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "document_views_document_idx" ON "document_views" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_views_user_idx" ON "document_views" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "document_views_created_at_idx" ON "document_views" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "document_views_doc_session_idx" ON "document_views" USING btree ("document_id","session_id");--> statement-breakpoint
CREATE INDEX "document_views_doc_user_idx" ON "document_views" USING btree ("document_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_slug_idx" ON "documents" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "documents_file_hash_idx" ON "documents" USING btree ("file_hash");--> statement-breakpoint
CREATE INDEX "documents_author_id_idx" ON "documents" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "documents_institution_id_idx" ON "documents" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "documents_category_id_idx" ON "documents" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "documents_status_idx" ON "documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "documents_visibility_idx" ON "documents" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "documents_status_visibility_idx" ON "documents" USING btree ("status","visibility");--> statement-breakpoint
CREATE INDEX "documents_resource_type_idx" ON "documents" USING btree ("resource_type");--> statement-breakpoint
CREATE INDEX "documents_academic_year_idx" ON "documents" USING btree ("academic_year");--> statement-breakpoint
CREATE INDEX "documents_language_idx" ON "documents" USING btree ("language");--> statement-breakpoint
CREATE INDEX "documents_trending_score_idx" ON "documents" USING btree ("trending_score");--> statement-breakpoint
CREATE INDEX "documents_download_count_idx" ON "documents" USING btree ("download_count");--> statement-breakpoint
CREATE INDEX "documents_like_count_idx" ON "documents" USING btree ("like_count");--> statement-breakpoint
CREATE INDEX "documents_published_at_idx" ON "documents" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "documents_created_at_idx" ON "documents" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "documents_inst_status_pub_idx" ON "documents" USING btree ("institution_id","status","visibility","published_at");--> statement-breakpoint
CREATE INDEX "documents_cat_status_pub_idx" ON "documents" USING btree ("category_id","status","visibility");--> statement-breakpoint
CREATE INDEX "documents_author_status_idx" ON "documents" USING btree ("author_id","status");--> statement-breakpoint
CREATE INDEX "documents_search_vector_idx" ON "documents" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "documents_deleted_at_idx" ON "documents" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "bookmark_collections_user_idx" ON "bookmark_collections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bookmark_collections_visibility_idx" ON "bookmark_collections" USING btree ("visibility");--> statement-breakpoint
CREATE UNIQUE INDEX "comment_helpful_votes_user_comment_idx" ON "comment_helpful_votes" USING btree ("user_id","comment_id");--> statement-breakpoint
CREATE INDEX "comment_helpful_votes_comment_idx" ON "comment_helpful_votes" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "comments_document_idx" ON "comments" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "comments_user_idx" ON "comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "comments_parent_idx" ON "comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "comments_root_idx" ON "comments" USING btree ("root_id");--> statement-breakpoint
CREATE INDEX "comments_created_at_idx" ON "comments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "comments_doc_active_top_level_idx" ON "comments" USING btree ("document_id","parent_id","is_deleted","created_at");--> statement-breakpoint
CREATE INDEX "comments_is_flagged_idx" ON "comments" USING btree ("is_flagged");--> statement-breakpoint
CREATE UNIQUE INDEX "document_bookmarks_user_doc_idx" ON "document_bookmarks" USING btree ("user_id","document_id");--> statement-breakpoint
CREATE INDEX "document_bookmarks_user_idx" ON "document_bookmarks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "document_bookmarks_document_idx" ON "document_bookmarks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_bookmarks_collection_idx" ON "document_bookmarks" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "document_bookmarks_created_at_idx" ON "document_bookmarks" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "document_reactions_user_doc_idx" ON "document_reactions" USING btree ("user_id","document_id");--> statement-breakpoint
CREATE INDEX "document_reactions_document_idx" ON "document_reactions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_reactions_user_idx" ON "document_reactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "document_reactions_type_idx" ON "document_reactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "document_reports_document_idx" ON "document_reports" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_reports_reporter_idx" ON "document_reports" USING btree ("reported_by_user_id");--> statement-breakpoint
CREATE INDEX "document_reports_status_idx" ON "document_reports" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "document_reports_user_doc_idx" ON "document_reports" USING btree ("reported_by_user_id","document_id");--> statement-breakpoint
CREATE INDEX "document_shares_document_idx" ON "document_shares" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_shares_created_at_idx" ON "document_shares" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "follows_follower_following_idx" ON "follows" USING btree ("follower_id","following_id");--> statement-breakpoint
CREATE INDEX "follows_follower_idx" ON "follows" USING btree ("follower_id");--> statement-breakpoint
CREATE INDEX "follows_following_idx" ON "follows" USING btree ("following_id");--> statement-breakpoint
CREATE INDEX "follows_created_at_idx" ON "follows" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notifications_recipient_idx" ON "notifications" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "notifications_recipient_unread_idx" ON "notifications" USING btree ("recipient_id","is_read");--> statement-breakpoint
CREATE INDEX "notifications_sender_idx" ON "notifications" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "notifications_type_idx" ON "notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX "notifications_entity_idx" ON "notifications" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notifications_unread_count_idx" ON "notifications" USING btree ("recipient_id","is_read","created_at");--> statement-breakpoint
CREATE INDEX "search_history_user_idx" ON "search_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "search_history_created_at_idx" ON "search_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "search_history_user_created_at_idx" ON "search_history" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_snapshots_date_dim_idx" ON "analytics_snapshots" USING btree ("date","metric","dimension_type","dimension_id");--> statement-breakpoint
CREATE INDEX "analytics_snapshots_date_idx" ON "analytics_snapshots" USING btree ("date");--> statement-breakpoint
CREATE INDEX "analytics_snapshots_metric_idx" ON "analytics_snapshots" USING btree ("metric");--> statement-breakpoint
CREATE INDEX "analytics_snapshots_dimension_idx" ON "analytics_snapshots" USING btree ("dimension_type","dimension_id");--> statement-breakpoint
CREATE INDEX "audit_logs_admin_idx" ON "audit_logs" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "badges_slug_idx" ON "badges" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "badges_is_active_idx" ON "badges" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "badges_criteria_type_idx" ON "badges" USING btree ("criteria_type");--> statement-breakpoint
CREATE INDEX "reputation_events_user_idx" ON "reputation_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reputation_events_type_idx" ON "reputation_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "reputation_events_created_at_idx" ON "reputation_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "reputation_events_user_created_at_idx" ON "reputation_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_badges_user_badge_idx" ON "user_badges" USING btree ("user_id","badge_id");--> statement-breakpoint
CREATE INDEX "user_badges_user_idx" ON "user_badges" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_badges_badge_idx" ON "user_badges" USING btree ("badge_id");--> statement-breakpoint
CREATE INDEX "user_badges_awarded_at_idx" ON "user_badges" USING btree ("awarded_at");--> statement-breakpoint
CREATE VIEW "public"."public_user_profiles" AS (select "id", "username", "display_name", "bio", "avatar_url", "cover_url", "role", "verification_status", "institution_id", "faculty", "major", "reputation_score", "reputation_level", "follower_count", "following_count", "document_count", "total_downloads", "external_links", "created_at" from "users" where "users"."status" = 'active' AND "users"."deleted_at" IS NULL);