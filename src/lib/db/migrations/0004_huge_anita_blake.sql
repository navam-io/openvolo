CREATE TABLE `goal_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`goal_id` text NOT NULL,
	`value` integer NOT NULL,
	`delta` integer NOT NULL,
	`source` text,
	`note` text,
	`snapshot_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_goal_progress_goal` ON `goal_progress` (`goal_id`);--> statement-breakpoint
CREATE INDEX `idx_goal_progress_snapshot` ON `goal_progress` (`snapshot_at`);--> statement-breakpoint
CREATE TABLE `goal_workflows` (
	`id` text PRIMARY KEY NOT NULL,
	`goal_id` text NOT NULL,
	`template_id` text NOT NULL,
	`contribution` text DEFAULT 'primary' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `workflow_templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`goal_type` text NOT NULL,
	`platform` text,
	`target_value` integer NOT NULL,
	`current_value` integer DEFAULT 0 NOT NULL,
	`unit` text NOT NULL,
	`deadline` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
