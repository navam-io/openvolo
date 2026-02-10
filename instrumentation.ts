export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Run idempotent migrations before anything else
    try {
      const { migrateTemplateUserColumns } = await import("@/lib/db/migrations/add-template-user-columns");
      const result = migrateTemplateUserColumns();
      if (result.migrated) {
        console.log("[instrumentation] Template user columns migration applied");
      }
    } catch (e) {
      // Migration may fail on first run before tables exist
      console.warn("[instrumentation] Migration skipped:", (e as Error).message);
    }

    // Seed new templates (idempotent — only seeds missing system templates)
    try {
      const { seedTemplates } = await import("@/lib/db/seed-templates");
      const result = seedTemplates();
      if (result.seeded > 0) {
        console.log(`[instrumentation] Seeded ${result.seeded} workflow templates`);
      }
      if (result.updated > 0) {
        console.log(`[instrumentation] Updated ${result.updated} workflow template prompts`);
      }
    } catch (e) {
      // Seed may fail if tables don't exist yet
      console.warn("[instrumentation] Seeding skipped:", (e as Error).message);
    }

    const { initScheduler } = await import("@/lib/scheduler/runner");
    initScheduler();
  }
}
