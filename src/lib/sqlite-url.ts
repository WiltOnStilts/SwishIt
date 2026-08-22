import path from "node:path";
import { ensureProductionSqlite } from "@/lib/ensure-database";

/**
 * Resolve SQLite DATABASE_URL to an absolute file: URL.
 * Production always uses /tmp (Render deploy FS is often read-only).
 */
export function resolveSqliteUrl(raw?: string): string {
  if (process.env.NODE_ENV === "production") {
    const forced = ensureProductionSqlite();
    if (forced) return forced;
    return "file:/tmp/swishit.db";
  }

  const value = (raw && raw.trim()) || "file:./prisma/dev.db";
  if (!value.startsWith("file:")) return value;

  const filePath = value.slice("file:".length);
  if (path.isAbsolute(filePath)) return `file:${filePath}`;

  return `file:${path.resolve(/* turbopackIgnore: true */ process.cwd(), filePath)}`;
}
