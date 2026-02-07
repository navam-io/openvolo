#!/usr/bin/env node

import { program } from "commander";
import { join } from "path";
import { homedir } from "os";
import { mkdirSync, existsSync } from "fs";
import { execSync, spawn } from "child_process";
import { readFileSync } from "fs";

const pkg = JSON.parse(
  readFileSync(join(import.meta.dirname, "..", "package.json"), "utf-8")
);

const DEFAULT_PORT = 3000;
const DATA_DIR = join(homedir(), ".openvolo");

function ensureDataDir() {
  const dirs = [DATA_DIR, join(DATA_DIR, "sessions"), join(DATA_DIR, "media")];
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      console.log(`  Created ${dir}`);
    }
  }
}

function findAvailablePort(preferred: number): Promise<number> {
  return new Promise((resolve) => {
    const { createServer } = require("net") as typeof import("net");
    const server = createServer();
    server.listen(preferred, () => {
      server.close(() => resolve(preferred));
    });
    server.on("error", () => {
      resolve(findAvailablePort(preferred + 1));
    });
  });
}

async function startApp(port: number) {
  console.log("\n  🚀 OpenVolo — Agentic AI-Native Social CRM\n");
  console.log(`  Version:  ${pkg.version}`);
  console.log(`  Data dir: ${DATA_DIR}`);

  // Ensure data directories exist
  ensureDataDir();

  // Run database migrations
  console.log("\n  Initializing database...");
  try {
    // Use drizzle-kit push for development (creates tables from schema)
    const appDir = join(import.meta.dirname, "..");
    execSync("npx drizzle-kit push --force", {
      cwd: appDir,
      stdio: "pipe",
      env: { ...process.env, OPENVOLO_DATA_DIR: DATA_DIR },
    });
    console.log("  Database ready ✓");
  } catch (e) {
    console.log("  Database initialization skipped (will retry on first request)");
  }

  // Find available port
  const actualPort = await findAvailablePort(port);
  if (actualPort !== port) {
    console.log(`\n  Port ${port} in use, using ${actualPort}`);
  }

  console.log(`\n  Starting server on http://localhost:${actualPort}...\n`);

  // Start Next.js dev server
  const appDir = join(import.meta.dirname, "..");
  const child = spawn("npx", ["next", "dev", "--turbopack", "--port", String(actualPort)], {
    cwd: appDir,
    stdio: "inherit",
    env: { ...process.env, OPENVOLO_DATA_DIR: DATA_DIR, PORT: String(actualPort) },
  });

  // Open browser after a short delay
  setTimeout(async () => {
    try {
      const open = (await import("open")).default;
      await open(`http://localhost:${actualPort}`);
    } catch {
      console.log(`  Open http://localhost:${actualPort} in your browser`);
    }
  }, 3000);

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    child.kill("SIGINT");
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    child.kill("SIGTERM");
    process.exit(0);
  });
}

program
  .name("openvolo")
  .description("Agentic AI-Native Social CRM")
  .version(pkg.version);

program
  .option("-p, --port <number>", "Port to start the server on", String(DEFAULT_PORT))
  .option("--reset", "Reset database (deletes all data)")
  .action(async (opts) => {
    if (opts.reset) {
      const dbPath = join(DATA_DIR, "data.db");
      if (existsSync(dbPath)) {
        const { unlinkSync } = require("fs") as typeof import("fs");
        unlinkSync(dbPath);
        // Also remove WAL and SHM files
        try { unlinkSync(dbPath + "-wal"); } catch {}
        try { unlinkSync(dbPath + "-shm"); } catch {}
        console.log("  Database reset ✓");
      } else {
        console.log("  No database to reset");
      }
      return;
    }

    await startApp(parseInt(opts.port, 10));
  });

program.parse();
