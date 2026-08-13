import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type TeamMeta = {
  id: string;
  name: string;
  abbreviation: string;
  city: string;
  /** Higher = more likely to appear when spinning */
  spinWeight: number;
  strength: number;
  champion: boolean;
};

export type RosterOption = {
  year: number;
  team: TeamMeta;
};

function roughPower(p: {
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  mvp: boolean;
  allStar: boolean;
}): number {
  return (
    p.ppg * 1.15 +
    p.rpg * 0.85 +
    p.apg * 1.05 +
    p.spg * 2.2 +
    p.bpg * 2.0 +
    (p.mvp ? 18 : 0) +
    (p.allStar ? 6 : 0)
  );
}

/**
 * Favor ordinary mid-tier squads. Extremes (dynasties & bottom-feeders)
 * still appear, but much less often than before.
 */
function weightFromStrength(strength: number, isChampion: boolean): number {
  const mid = 55;
  const dist = Math.abs(strength - mid);
  // Gaussian peaking at mid-tier; healthy floor so every roster stays in play.
  let w = 0.55 + 2.4 * Math.exp(-(dist * dist) / (2 * 12 * 12));

  if (isChampion) w *= 0.45;
  if (strength >= 78) w *= 0.4;
  else if (strength >= 70) w *= 0.65;
  if (strength <= 36) w *= 0.45;
  else if (strength <= 42) w *= 0.7;

  return Math.max(0.3, w);
}

export async function GET() {
  const rows = await prisma.playerSeason.findMany({
    select: {
      year: true,
      teamId: true,
      team: true,
      ppg: true,
      rpg: true,
      apg: true,
      spg: true,
      bpg: true,
      mvp: true,
      allStar: true,
      champion: true,
    },
  });

  type Acc = { team: TeamMeta; powers: number[]; champion: boolean };
  const byYearTeam = new Map<string, Acc>();

  for (const r of rows) {
    const key = `${r.year}:${r.teamId}`;
    let acc = byYearTeam.get(key);
    if (!acc) {
      acc = {
        team: {
          id: r.team.id,
          name: r.team.name,
          abbreviation: r.team.abbreviation,
          city: r.team.city,
          spinWeight: 1,
          strength: 0,
          champion: false,
        },
        powers: [],
        champion: false,
      };
      byYearTeam.set(key, acc);
    }
    acc.powers.push(roughPower(r));
    if (r.champion) acc.champion = true;
  }

  const teamsByYear: Record<number, TeamMeta[]> = {};
  const rosterPool: RosterOption[] = [];

  for (const [key, acc] of byYearTeam) {
    const year = Number(key.split(":")[0]);
    if (year < 1980 || year > 2026) continue;
    const top = [...acc.powers].sort((a, b) => b - a).slice(0, 5);
    const strength =
      top.reduce((s, n) => s + n, 0) / Math.max(1, top.length);
    acc.team.strength = Math.round(strength * 10) / 10;
    acc.team.champion = acc.champion;
    acc.team.spinWeight = weightFromStrength(strength, acc.champion);

    if (!teamsByYear[year]) teamsByYear[year] = [];
    teamsByYear[year].push(acc.team);
    rosterPool.push({ year, team: acc.team });
  }

  for (const year of Object.keys(teamsByYear)) {
    teamsByYear[Number(year)].sort((a, b) => a.city.localeCompare(b.city));
  }

  const years = Object.keys(teamsByYear)
    .map(Number)
    .sort((a, b) => a - b);
  const yearWeights: Record<number, number> = {};
  for (const y of years) yearWeights[y] = 1;

  return NextResponse.json({ years, yearWeights, teamsByYear, rosterPool });
}
