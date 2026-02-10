ALTER TABLE `scheduled_jobs` ADD `template_id` text REFERENCES workflow_templates(id);--> statement-breakpoint
ALTER TABLE `scheduled_jobs` ADD `cron_expression` text;--> statement-breakpoint
ALTER TABLE `scheduled_jobs` ADD `enabled` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `scheduled_jobs` ADD `last_triggered_at` integer;