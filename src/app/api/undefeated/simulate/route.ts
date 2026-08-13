import { NextResponse } from "next/server";
import {
  canPlaySlot,
  simulateSeason,
  type CourtPos,
  type LineupPlayer,
} from "@/lib/season";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    starters: LineupPlayer[];
    sixthMan: LineupPlayer | null;
  };

  if (!body.starters || body.starters.length !== 5) {
    return NextResponse.json({ error: "Need exactly 5 starters" }, { status: 400 });
  }

  const slots: CourtPos[] = ["PG", "SG", "SF", "PF", "C"];
  for (let i = 0; i < 5; i++) {
    const player = body.starters[i];
    if (!player.positions?.length) {
      player.positions = [player.position];
    }
    if (!canPlaySlot(player, slots[i]!)) {
      return NextResponse.json(
        { error: `${slots[i]} slot: ${player.playerName} is not eligible (${player.positions.join("/")})` },
        { status: 400 },
      );
    }
  }

  const result = simulateSeason(body.starters, body.sixthMan ?? null);
  return NextResponse.json(result);
}
