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
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_content_items` (
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
INSERT INTO `__new_content_items`("id", "title", "body", "content_type", "platform_target", "media_paths", "status", "ai_generated", "generation_prompt", "scheduled_at", "origin", "direction", "platform_account_id", "thread_id", "parent_item_id", "contact_id", "platform_data", "created_at", "updated_at") SELECT "id", "title", "body", "content_type", "platform_target", "media_paths", "status", "ai_generated", "generation_prompt", "scheduled_at", "origin", "direction", "platform_account_id", "thread_id", "parent_item_id", "contact_id", "platform_data", "created_at", "updated_at" FROM `content_items`;--> statement-breakpoint
DROP TABLE `content_items`;--> statement-breakpoint
ALTER TABLE `__new_content_items` RENAME TO `content_items`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_content_items_type` ON `content_items` (`content_type`);--> statement-breakpoint
CREATE INDEX `idx_content_items_status` ON `content_items` (`status`);--> statement-breakpoint
CREATE INDEX `idx_content_items_origin` ON `content_items` (`origin`);--> statement-breakpoint
CREATE INDEX `idx_content_items_account` ON `content_items` (`platform_account_id`);--> statement-breakpoint
CREATE TABLE `__new_engagements` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text,
	`platform_account_id` text,
	`engagement_type` text NOT NULL,
	`direction` text NOT NULL,
	`content` text,
	`campaign_id` text,
	`agent_run_id` text,
	`content_post_id` text,
	`platform` text,
	`platform_engagement_id` text,
	`thread_id` text,
	`source` text,
	`platform_data` text DEFAULT '{}',
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`platform_account_id`) REFERENCES `platform_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`content_post_id`) REFERENCES `content_posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_engagements`("id", "contact_id", "platform_account_id", "engagement_type", "direction", "content", "campaign_id", "agent_run_id", "content_post_id", "platform", "platform_engagement_id", "thread_id", "source", "platform_data", "created_at") SELECT "id", "contact_id", "platform_account_id", "engagement_type", "direction", "content", "campaign_id", "agent_run_id", "content_post_id", "platform", "platform_engagement_id", "thread_id", "source", "platform_data", "created_at" FROM `engagements`;--> statement-breakpoint
DROP TABLE `engagements`;--> statement-breakpoint
ALTER TABLE `__new_engagements` RENAME TO `engagements`;--> statement-breakpoint
CREATE INDEX `idx_engagements_contact` ON `engagements` (`contact_id`);--> statement-breakpoint
CREATE INDEX `idx_engagements_content_post` ON `engagements` (`content_post_id`);--> statement-breakpoint
CREATE INDEX `idx_engagements_platform_id` ON `engagements` (`platform_engagement_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_content_posts_platform_id` ON `content_posts` (`platform_post_id`,`platform_account_id`);