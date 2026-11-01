import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // Supabase: use the direct (non-pooled, port 5432) connection for migrations.
    url: env("DIRECT_URL"),
  },
});
