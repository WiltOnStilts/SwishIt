/**
 * Generate a unique 2D face SVG for every distinct playerName and store
 * PlayerFace rows + files under public/player-faces/.
 *
 * Usage:
 *   npx tsx scripts/generate-player-faces.ts
 *   DATABASE_URL="file:./prisma/data/swishit.sqlite" npx tsx scripts/generate-player-faces.ts
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { buildPlayerFace } from "../src/lib/player-face";
import { resolveSqliteUrl } from "../src/lib/sqlite-url";

async function main() {
  const url = resolveSqliteUrl(process.env.DATABASE_URL);
  process.env.DATABASE_URL = url;
  console.log(`[faces] DATABASE_URL=${url}`);

  const outDir = path.join(process.cwd(), "public", "player-faces");
  fs.mkdirSync(outDir, { recursive: true });

  const adapter = new PrismaBetterSqlite3({ url });
  const prisma = new PrismaClient({ adapter });

  try {
    const rows = await prisma.playerSeason.findMany({
      distinct: ["playerName"],
      select: { playerName: true },
      orderBy: { playerName: "asc" },
    });
    console.log(`[faces] unique players: ${rows.length}`);

    let written = 0;
    let updated = 0;
    const now = new Date();

    for (let i = 0; i < rows.length; i++) {
      const name = rows[i]!.playerName;
      const built = buildPlayerFace(name);
      const filePath = path.join(outDir, `${built.slug}.svg`);
      fs.writeFileSync(filePath, built.svg, "utf8");
      written++;

      await prisma.playerFace.upsert({
        where: { playerName: name },
        create: {
          playerName: name,
          faceJson: built.faceJson,
          imagePath: built.imagePath,
          createdAt: now,
          updatedAt: now,
        },
        update: {
          faceJson: built.faceJson,
          imagePath: built.imagePath,
          updatedAt: now,
        },
      });
      updated++;

      if ((i + 1) % 250 === 0 || i + 1 === rows.length) {
        console.log(`[faces] ${i + 1}/${rows.length}`);
      }
    }

    const count = await prisma.playerFace.count();
    console.log(
      `[faces] done. files_written=${written} upserts=${updated} table_count=${count}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[faces] failed", err);
  process.exit(1);
});
