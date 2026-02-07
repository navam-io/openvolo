import { defineConfig } from "drizzle-kit";
import { join } from "path";
import { homedir } from "os";

const dataDir = join(homedir(), ".openvolo");

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: join(dataDir, "data.db"),
  },
});
