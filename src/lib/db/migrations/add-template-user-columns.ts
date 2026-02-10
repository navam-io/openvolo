import { db } from "@/lib/db/client";

/**
 * Add isSystem + sourceTemplateId columns to workflow_templates.
 * Idempotent — checks if columns exist before running.
 */
export function migrateTemplateUserColumns(): { migrated: boolean } {
  const sqlite = db.$client;

  // Check if is_system column already exists
  const columns = sqlite
    .prepare("PRAGMA table_info(workflow_templates)")
    .all() as { name: string }[];

  const hasIsSystem = columns.some((c) => c.name === "is_system");
  if (hasIsSystem) {
    return { migrated: false };
  }

  sqlite
    .prepare("ALTER TABLE workflow_templates ADD COLUMN is_system INTEGER NOT NULL DEFAULT 0")
    .run();
  sqlite
    .prepare("ALTER TABLE workflow_templates ADD COLUMN source_template_id TEXT REFERENCES workflow_templates(id) ON DELETE SET NULL")
    .run();
  sqlite
    .prepare("UPDATE workflow_templates SET is_system = 1")
    .run();

  return { migrated: true };
}
