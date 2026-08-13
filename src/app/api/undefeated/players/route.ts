import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePositions } from "@/lib/season";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year"));
  const teamId = searchParams.get("teamId");

  if (!year || !teamId) {
    return NextResponse.json({ error: "year and teamId required" }, { status: 400 });
  }

  const players = await prisma.playerSeason.findMany({
    where: { year, teamId },
    include: { team: true },
    orderBy: [{ ppg: "desc" }],
  });

  return NextResponse.json({
    players: players.map((p) => {
      const positions = parsePositions(p.position);
      return {
        id: p.id,
        playerName: p.playerName,
        year: p.year,
        position: positions[0],
        positions,
        games: p.games,
        mpg: p.mpg,
        ppg: p.ppg,
        rpg: p.rpg,
        apg: p.apg,
        spg: p.spg,
        bpg: p.bpg,
        fgPct: p.fgPct,
        accolades: JSON.parse(p.accolades) as string[],
        allStar: p.allStar,
        mvp: p.mvp,
        dpoy: p.dpoy,
        champion: p.champion,
        teamName: p.team.name,
        teamAbbr: p.team.abbreviation,
      };
    }),
  });
}
