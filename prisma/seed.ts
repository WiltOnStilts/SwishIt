import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { players } from "./data/players";
import { coaches } from "./data/coaches";
import { puzzles } from "./data/puzzles";
import { teams } from "./data/teams";
import { EXTRA_POSITIONS } from "./data/positions";

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.detectivePuzzle.deleteMany();
  await prisma.playerSeason.deleteMany();
  await prisma.coach.deleteMany();
  await prisma.team.deleteMany();

  const teamMap = new Map<string, string>();

  for (const team of teams) {
    const created = await prisma.team.create({ data: team });
    teamMap.set(team.abbreviation, created.id);
  }

  const missingTeams = new Set<string>();
  const rows = [];
  for (const p of players) {
    const teamId = teamMap.get(p.teamAbbr);
    if (!teamId) {
      missingTeams.add(p.teamAbbr);
      continue;
    }
    const extras = EXTRA_POSITIONS[p.playerName] ?? [];
    const positions = [p.position, ...extras.filter((x) => x !== p.position)];
    rows.push({
      playerName: p.playerName,
      year: p.year,
      teamId,
      position: positions.join(","),
      games: p.games,
      mpg: p.mpg,
      ppg: p.ppg,
      rpg: p.rpg,
      apg: p.apg,
      spg: p.spg,
      bpg: p.bpg,
      fgPct: p.fgPct ?? null,
      accolades: JSON.stringify(p.accolades ?? []),
      allStar: p.allStar ?? false,
      mvp: p.mvp ?? false,
      dpoy: p.dpoy ?? false,
      champion: p.champion ?? false,
    });
  }

  if (missingTeams.size) {
    console.warn("Missing teams:", [...missingTeams].sort().join(", "));
  }

  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    await prisma.playerSeason.createMany({ data: rows.slice(i, i + BATCH) });
    process.stdout.write(`\rPlayers ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
  process.stdout.write("\n");

  for (const c of coaches) {
    await prisma.coach.create({
      data: {
        name: c.name,
        teams: JSON.stringify(c.teams),
        startYear: c.startYear ?? null,
        endYear: c.endYear ?? null,
        accolades: JSON.stringify(c.accolades ?? []),
      },
    });
  }

  for (const puzzle of puzzles) {
    await prisma.detectivePuzzle.create({
      data: {
        puzzleDate: puzzle.puzzleDate ?? null,
        title: puzzle.title ?? null,
        groups: JSON.stringify(puzzle.groups),
      },
    });
  }

  console.log("Seed complete:", {
    teams: await prisma.team.count(),
    players: await prisma.playerSeason.count(),
    coaches: await prisma.coach.count(),
    puzzles: await prisma.detectivePuzzle.count(),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
