import fs from "node:fs";
import path from "node:path";

const PROD_DB = "/tmp/swishit.db";

function seedSourcePath() {
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "prisma",
    "data",
    "swishit.sqlite",
  );
}

/**
 * Production on Render: always use a writable /tmp DB, copied from the
 * bundled seed file when missing/empty. Avoids read-only deploy FS and
 * skipped start-command seed.
 */
export function ensureProductionSqlite(): string {
  if (process.env.NODE_ENV !== "production") {
    return "";
  }

  const src = seedSourcePath();
  let needsCopy = !fs.existsSync(PROD_DB);
  if (!needsCopy) {
    try {
      needsCopy = fs.statSync(PROD_DB).size < 100_000;
    } catch {
      needsCopy = true;
    }
  }

  if (needsCopy) {
    if (!fs.existsSync(src)) {
      throw new Error(
        `[ensureProductionSqlite] Missing bundled DB at ${src}`,
      );
    }
    fs.copyFileSync(src, PROD_DB);
    console.log(
      `[ensureProductionSqlite] copied ${src} → ${PROD_DB} (${fs.statSync(PROD_DB).size} bytes)`,
    );
  }

  return `file:${PROD_DB}`;
}
