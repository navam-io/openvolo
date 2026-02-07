import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { join } from "path";
import { homedir } from "os";
import { mkdirSync, existsSync } from "fs";

export function runMigrations(dataDir?: string) {
  const dir = dataDir ?? join(homedir(), ".openvolo");

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const dbPath = join(dir, "data.db");
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  const db = drizzle(sqlite);

  // Run migrations from the migrations directory
  const migrationsDir = join(import.meta.dirname, "migrations");
  if (existsSync(migrationsDir)) {
    migrate(db, { migrationsFolder: migrationsDir });
  }

  sqlite.close();
  return dbPath;
}
