import path from "node:path";

/**
 * Resolve SQLite DATABASE_URL to an absolute file: URL.
 * Relative paths break on Render (cwd / read-only deploy FS).
 */
export function resolveSqliteUrl(raw?: string): string {
  const fallback =
    process.env.NODE_ENV === "production"
      ? "file:/tmp/swishit.db"
      : "file:./prisma/dev.db";
  const value = (raw && raw.trim()) || fallback;
  if (!value.startsWith("file:")) return value;

  const filePath = value.slice("file:".length);
  if (path.isAbsolute(filePath)) return `file:${filePath}`;

  return `file:${path.resolve(/* turbopackIgnore: true */ process.cwd(), filePath)}`;
}
