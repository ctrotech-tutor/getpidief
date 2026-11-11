CREATE TABLE "account_agreements" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"terms_version" text NOT NULL,
	"privacy_version" text NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_academic_researcher_or_student" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_agreements" ADD CONSTRAINT "account_agreements_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;