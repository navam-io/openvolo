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
ALTER TABLE `contacts` ADD `first_name` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `last_name` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `location` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `website` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `photo_url` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `verified_email` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `contacts` ADD `enrichment_score` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_contacts_email` ON `contacts` (`email`);--> statement-breakpoint
CREATE INDEX `idx_contacts_name` ON `contacts` (`name`);--> statement-breakpoint
CREATE INDEX `idx_contacts_company` ON `contacts` (`company`);