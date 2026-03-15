CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_subject" text NOT NULL,
	"email" text,
	"display_name" text,
	"tier" text DEFAULT 'free' NOT NULL,
	"credit_balance_usd" numeric(10, 4) DEFAULT '0' NOT NULL,
	"billing_cycle_start" timestamp with time zone,
	"trial_ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_auth_subject_unique" UNIQUE("auth_subject")
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"actor_type" text NOT NULL,
	"action" text NOT NULL,
	"status_code" integer,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ai_model" text DEFAULT 'sonnet' NOT NULL,
	"default_severity_filter" text[] DEFAULT '{"blocker","major","minor","nit"}' NOT NULL,
	"anti_bias_mode" integer DEFAULT 1 NOT NULL,
	"font_size" text DEFAULT 'medium' NOT NULL,
	"code_block_theme" text DEFAULT 'dark' NOT NULL,
	"auto_export_pdf" integer DEFAULT 0 NOT NULL,
	"active_comment_style_profile_id" text,
	"monthly_budget_usd" numeric(10, 2) DEFAULT '40' NOT NULL,
	"alert_thresholds" integer[] DEFAULT '{70,85,95}' NOT NULL,
	"hard_stop_at_budget" integer DEFAULT 0 NOT NULL,
	"auto_downgrade_near_budget" integer DEFAULT 1 NOT NULL,
	"auto_downgrade_threshold_pct" integer DEFAULT 85 NOT NULL,
	"cooldown_seconds" integer DEFAULT 6 NOT NULL,
	"last_alert_threshold" integer,
	"bookmarks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"templates" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"repo_configs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"mode" text NOT NULL,
	"stack_id" text,
	"stack_ids" text[] DEFAULT '{}' NOT NULL,
	"selected_sections" text[] DEFAULT '{}' NOT NULL,
	"title" text NOT NULL,
	"item_responses" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"session_notes" text DEFAULT '' NOT NULL,
	"linked_pr_id" text,
	"completed_at" timestamp with time zone,
	"is_complete" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracked_prs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"status" text DEFAULT 'needs-review' NOT NULL,
	"role" text DEFAULT 'reviewer' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"is_emergency" boolean DEFAULT false NOT NULL,
	"size" text,
	"repo" text,
	"pr_number" integer,
	"pr_author" text,
	"dependencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ci_passing" text,
	"linked_session_id" uuid,
	"notes" text,
	"acceptance_outcome" text,
	"review_outcome" text,
	"self_reviewed" boolean,
	"review_round_count" integer DEFAULT 0 NOT NULL,
	"changes_ever_needed" boolean,
	"re_reviewed" boolean,
	"miss_category" text,
	"miss_note" text,
	"resolved_at" timestamp with time zone,
	"last_reviewed_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"calls" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"by_model" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"by_feature" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usage_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "comment_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"tone" text NOT NULL,
	"strictness" integer DEFAULT 3 NOT NULL,
	"verbosity" integer DEFAULT 3 NOT NULL,
	"include_praise" boolean DEFAULT false NOT NULL,
	"include_action_items" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "preferences" ADD CONSTRAINT "preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracked_prs" ADD CONSTRAINT "tracked_prs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_sessions" ADD CONSTRAINT "usage_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_sessions" ADD CONSTRAINT "usage_sessions_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_profiles" ADD CONSTRAINT "comment_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;