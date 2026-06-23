import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// .env lives at the monorepo root, two levels above packages/db/
config({ path: "../../.env" });

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) throw new Error("DATABASE_URL is not set in .env");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
