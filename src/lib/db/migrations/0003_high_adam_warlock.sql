CREATE TABLE `media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`storage_path` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`width` integer,
	`height` integer,
	`content_item_id` text,
	`platform_target` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`content_item_id`) REFERENCES `content_items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_media_assets_content_item` ON `media_assets` (`content_item_id`);--> statement-breakpoint
ALTER TABLE `workflow_templates` ADD `is_system` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `workflow_templates` ADD `source_template_id` text;