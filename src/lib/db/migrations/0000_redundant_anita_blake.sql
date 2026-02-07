CREATE TABLE `agent_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_type` text NOT NULL,
	`trigger` text DEFAULT 'user' NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`input` text DEFAULT '{}',
	`output` text,
	`error` text,
	`model` text,
	`input_tokens` integer DEFAULT 0,
	`output_tokens` integer DEFAULT 0,
	`cost_usd` real DEFAULT 0,
	`parent_run_id` text,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `agent_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_run_id` text NOT NULL,
	`step_index` integer NOT NULL,
	`step_type` text NOT NULL,
	`description` text,
	`data` text,
	`duration_ms` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`agent_run_id`) REFERENCES `agent_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `campaign_contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`current_step_index` integer DEFAULT 0 NOT NULL,
	`enrolled_at` integer DEFAULT (unixepoch()) NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `campaign_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`step_index` integer NOT NULL,
	`step_type` text NOT NULL,
	`config` text DEFAULT '{}',
	`delay_hours` integer DEFAULT 0,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`platform` text,
	`campaign_type` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`config` text DEFAULT '{}',
	`goal_metrics` text DEFAULT '{}',
	`starts_at` integer,
	`ends_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`headline` text,
	`company` text,
	`title` text,
	`platform` text,
	`platform_user_id` text,
	`profile_url` text,
	`avatar_url` text,
	`email` text,
	`phone` text,
	`bio` text,
	`tags` text DEFAULT '[]',
	`funnel_stage` text DEFAULT 'prospect' NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`metadata` text DEFAULT '{}',
	`last_interaction_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `content_items` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`content_type` text NOT NULL,
	`platform_target` text,
	`media_paths` text DEFAULT '[]',
	`status` text DEFAULT 'draft' NOT NULL,
	`ai_generated` integer DEFAULT false NOT NULL,
	`generation_prompt` text,
	`scheduled_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `content_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`content_item_id` text NOT NULL,
	`platform_account_id` text NOT NULL,
	`platform_post_id` text,
	`platform_url` text,
	`published_at` integer,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`engagement_snapshot` text DEFAULT '{}',
	FOREIGN KEY (`content_item_id`) REFERENCES `content_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`platform_account_id`) REFERENCES `platform_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `engagements` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text NOT NULL,
	`platform_account_id` text,
	`engagement_type` text NOT NULL,
	`direction` text NOT NULL,
	`content` text,
	`campaign_id` text,
	`agent_run_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`platform_account_id`) REFERENCES `platform_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `platform_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`platform` text NOT NULL,
	`display_name` text NOT NULL,
	`auth_type` text NOT NULL,
	`credentials_encrypted` text,
	`rate_limit_state` text,
	`status` text DEFAULT 'active' NOT NULL,
	`last_synced_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scheduled_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`job_type` text NOT NULL,
	`payload` text DEFAULT '{}',
	`status` text DEFAULT 'pending' NOT NULL,
	`run_at` integer NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`max_retries` integer DEFAULT 3 NOT NULL,
	`error` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`task_type` text DEFAULT 'manual' NOT NULL,
	`status` text DEFAULT 'todo' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`assignee` text DEFAULT 'user' NOT NULL,
	`related_contact_id` text,
	`related_campaign_id` text,
	`due_at` integer,
	`completed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`related_contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`related_campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action
);
