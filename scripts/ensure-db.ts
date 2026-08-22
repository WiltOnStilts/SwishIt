import "dotenv/config";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { resolveSqliteUrl } from "../src/lib/sqlite-url";

/**
 * Ensure migrations are applied and seed data exists.
 * Used on Render start because the deploy FS is often read-only;
 * we keep SQLite under /tmp and seed there when empty.
 */
async function main() {
  const url = resolveSqliteUrl(process.env.DATABASE_URL);
  process.env.DATABASE_URL = url;

  const filePath = url.replace(/^file:/, "");
  const exists = fs.existsSync(filePath);

  console.log(`[ensure-db] DATABASE_URL=${url} exists=${exists}`);

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: process.env,
  });

  const adapter = new PrismaBetterSqlite3({ url });
  const prisma = new PrismaClient({ adapter });

  try {
    const teams = await prisma.team.count();
    const players = await prisma.playerSeason.count();
    const puzzles = await prisma.detectivePuzzle.count();
    console.log(
      `[ensure-db] counts teams=${teams} players=${players} puzzles=${puzzles}`,
    );

    if (teams > 0 && players > 0 && puzzles > 0) {
      console.log("[ensure-db] data present — skip seed");
      return;
    }

    console.log("[ensure-db] missing data — running seed…");
    execSync("npm run db:seed", { stdio: "inherit", env: process.env });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[ensure-db] failed", err);
  process.exit(1);
});
