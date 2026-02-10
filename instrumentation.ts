export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Run idempotent migrations before anything else
    try {
      const { migrateTemplateUserColumns } = await import("@/lib/db/migrations/add-template-user-columns");
      migrateTemplateUserColumns();
    } catch {
      // Migration may fail on first run before tables exist
    }

    // Seed new templates (idempotent — only seeds missing system templates)
    try {
      const { seedTemplates } = await import("@/lib/db/seed-templates");
      seedTemplates();
    } catch {
      // Seed may fail if tables don't exist yet
    }

    const { initScheduler } = await import("@/lib/scheduler/runner");
    initScheduler();
  }
}
