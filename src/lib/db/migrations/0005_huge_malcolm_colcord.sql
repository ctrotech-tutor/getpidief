CREATE TABLE "feed_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"reply_id" uuid,
	"reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewer_id" uuid,
	"note" text,
	CONSTRAINT "feed_reports_reason_check" CHECK ("feed_reports"."reason" in ('spam', 'harassment', 'misinformation', 'other')),
	CONSTRAINT "feed_reports_status_check" CHECK ("feed_reports"."status" in ('open', 'dismissed', 'removed'))
);
--> statement-breakpoint
ALTER TABLE "post_replies" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "feed_reports" ADD CONSTRAINT "feed_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_reports" ADD CONSTRAINT "feed_reports_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_reports" ADD CONSTRAINT "feed_reports_reply_id_post_replies_id_fk" FOREIGN KEY ("reply_id") REFERENCES "public"."post_replies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_reports" ADD CONSTRAINT "feed_reports_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "feed_reports_post_reporter_idx" ON "feed_reports" USING btree ("reporter_id","post_id") WHERE "feed_reports"."reply_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "feed_reports_reply_reporter_idx" ON "feed_reports" USING btree ("reporter_id","reply_id") WHERE "feed_reports"."reply_id" is not null;--> statement-breakpoint
CREATE INDEX "feed_reports_queue_idx" ON "feed_reports" USING btree ("status","created_at","id");