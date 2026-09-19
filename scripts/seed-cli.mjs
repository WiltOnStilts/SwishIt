import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

// Render free builds still often keep the old Blueprint command:
//   npm ci && prisma migrate deploy && npm run db:seed && npm run build
// Seed needs tsx (devDependency). Skip when the bundled DB ships with the repo.
if (process.env.RENDER === "true" && existsSync("prisma/data/swishit.sqlite")) {
  console.log("Render: skipping seed (using bundled prisma/data/swishit.sqlite)");
  process.exit(0);
}

const result = spawnSync("npx", ["tsx", "prisma/seed.ts"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
