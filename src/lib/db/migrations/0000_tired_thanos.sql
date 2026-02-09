CREATE TABLE `contact_identities` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text NOT NULL,
	`platform` text NOT NULL,
	`platform_user_id` text NOT NULL,
	`platform_handle` text,
	`platform_url` text,
	`platform_data` text DEFAULT '{}',
	`is_primary` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`last_synced_at` integer,
	`sync_errors` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_identity_platform_user` ON `contact_identities` (`platform`,`platform_user_id`);--> statement-breakpoint
CREATE INDEX `idx_identity_contact` ON `contact_identities` (`contact_id`);--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`first_name` text,
	`last_name` text,
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
	`location` text,
	`website` text,
	`photo_url` text,
	`verified_email` integer DEFAULT 0 NOT NULL,
	`enrichment_score` integer DEFAULT 0 NOT NULL,
	`tags` text DEFAULT '[]',
	`funnel_stage` text DEFAULT 'prospect' NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`metadata` text DEFAULT '{}',
	`last_interaction_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_contacts_email` ON `contacts` (`email`);--> statement-breakpoint
CREATE INDEX `idx_contacts_name` ON `contacts` (`name`);--> statement-breakpoint
CREATE INDEX `idx_contacts_company` ON `contacts` (`company`);--> statement-breakpoint
CREATE TABLE `content_items` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`body` text,
	`content_type` text NOT NULL,
	`platform_target` text,
	`media_paths` text DEFAULT '[]',
	`status` text DEFAULT 'draft' NOT NULL,
	`ai_generated` integer DEFAULT false NOT NULL,
	`generation_prompt` text,
	`scheduled_at` integer,
	`origin` text,
	`direction` text,
	`platform_account_id` text,
	`thread_id` text,
	`parent_item_id` text,
	`contact_id` text,
	`platform_data` text DEFAULT '{}',
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`platform_account_id`) REFERENCES `platform_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_content_items_type` ON `content_items` (`content_type`);--> statement-breakpoint
CREATE INDEX `idx_content_items_status` ON `content_items` (`status`);--> statement-breakpoint
CREATE INDEX `idx_content_items_origin` ON `content_items` (`origin`);--> statement-breakpoint
CREATE INDEX `idx_content_items_account` ON `content_items` (`platform_account_id`);--> statement-breakpoint
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
CREATE UNIQUE INDEX `idx_content_posts_platform_id` ON `content_posts` (`platform_post_id`,`platform_account_id`);--> statement-breakpoint
CREATE TABLE `engagement_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`content_post_id` text NOT NULL,
	`snapshot_at` integer DEFAULT (unixepoch()) NOT NULL,
	`likes` integer DEFAULT 0 NOT NULL,
	`comments` integer DEFAULT 0 NOT NULL,
	`shares` integer DEFAULT 0 NOT NULL,
	`impressions` integer DEFAULT 0 NOT NULL,
	`clicks` integer DEFAULT 0 NOT NULL,
	`bookmarks` integer DEFAULT 0 NOT NULL,
	`quotes` integer DEFAULT 0 NOT NULL,
	`retweets` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`content_post_id`) REFERENCES `content_posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_engagement_metrics_post` ON `engagement_metrics` (`content_post_id`);--> statement-breakpoint
CREATE INDEX `idx_engagement_metrics_snapshot` ON `engagement_metrics` (`snapshot_at`);--> statement-breakpoint
CREATE TABLE `engagements` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text,
	`platform_account_id` text,
	`engagement_type` text NOT NULL,
	`direction` text NOT NULL,
	`content` text,
	`template_id` text,
	`workflow_run_id` text,
	`content_post_id` text,
	`platform` text,
	`platform_engagement_id` text,
	`thread_id` text,
	`source` text,
	`platform_data` text DEFAULT '{}',
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`platform_account_id`) REFERENCES `platform_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`template_id`) REFERENCES `workflow_templates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workflow_run_id`) REFERENCES `workflow_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`content_post_id`) REFERENCES `content_posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_engagements_contact` ON `engagements` (`contact_id`);--> statement-breakpoint
CREATE INDEX `idx_engagements_content_post` ON `engagements` (`content_post_id`);--> statement-breakpoint
CREATE INDEX `idx_engagements_platform_id` ON `engagements` (`platform_engagement_id`);--> statement-breakpoint
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
CREATE TABLE `sync_cursors` (
	`id` text PRIMARY KEY NOT NULL,
	`platform_account_id` text NOT NULL,
	`data_type` text NOT NULL,
	`cursor` text,
	`oldest_fetched_at` integer,
	`newest_fetched_at` integer,
	`total_items_synced` integer DEFAULT 0 NOT NULL,
	`sync_status` text DEFAULT 'idle' NOT NULL,
	`sync_progress` text,
	`sync_direction` text DEFAULT 'backward' NOT NULL,
	`last_sync_started_at` integer,
	`last_sync_completed_at` integer,
	`last_error` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`platform_account_id`) REFERENCES `platform_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_sync_cursor_account_type` ON `sync_cursors` (`platform_account_id`,`data_type`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`task_type` text DEFAULT 'manual' NOT NULL,
	`status` text DEFAULT 'todo' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`assignee` text DEFAULT 'user' NOT NULL,
	`related_contact_id` text,
	`related_template_id` text,
	`due_at` integer,
	`completed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`related_contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`related_template_id`) REFERENCES `workflow_templates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `workflow_enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`workflow_run_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`current_step_index` integer DEFAULT 0 NOT NULL,
	`enrolled_at` integer DEFAULT (unixepoch()) NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`template_id`) REFERENCES `workflow_templates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workflow_run_id`) REFERENCES `workflow_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `workflow_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text,
	`workflow_type` text NOT NULL,
	`platform_account_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`total_items` integer,
	`processed_items` integer DEFAULT 0 NOT NULL,
	`success_items` integer DEFAULT 0 NOT NULL,
	`skipped_items` integer DEFAULT 0 NOT NULL,
	`error_items` integer DEFAULT 0 NOT NULL,
	`config` text DEFAULT '{}',
	`result` text DEFAULT '{}',
	`errors` text DEFAULT '[]',
	`trigger` text DEFAULT 'user' NOT NULL,
	`model` text,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`parent_workflow_id` text,
	`source_total` integer,
	`source_processed` integer DEFAULT 0 NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `workflow_templates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`platform_account_id`) REFERENCES `platform_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_workflow_runs_template` ON `workflow_runs` (`template_id`);--> statement-breakpoint
CREATE INDEX `idx_workflow_runs_status` ON `workflow_runs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_workflow_runs_type` ON `workflow_runs` (`workflow_type`);--> statement-breakpoint
CREATE TABLE `workflow_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`workflow_run_id` text NOT NULL,
	`step_index` integer NOT NULL,
	`step_type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`contact_id` text,
	`url` text,
	`tool` text,
	`input` text DEFAULT '{}',
	`output` text DEFAULT '{}',
	`error` text,
	`duration_ms` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`workflow_run_id`) REFERENCES `workflow_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_workflow_steps_run` ON `workflow_steps` (`workflow_run_id`);--> statement-breakpoint
CREATE TABLE `workflow_template_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`step_index` integer NOT NULL,
	`step_type` text NOT NULL,
	`config` text DEFAULT '{}',
	`delay_hours` integer DEFAULT 0,
	FOREIGN KEY (`template_id`) REFERENCES `workflow_templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `workflow_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`platform` text,
	`template_type` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`config` text DEFAULT '{}',
	`goal_metrics` text DEFAULT '{}',
	`starts_at` integer,
	`ends_at` integer,
	`system_prompt` text,
	`target_persona` text,
	`estimated_cost` real DEFAULT 0 NOT NULL,
	`total_runs` integer DEFAULT 0 NOT NULL,
	`last_run_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
