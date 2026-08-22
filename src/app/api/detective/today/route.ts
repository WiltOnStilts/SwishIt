import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  etDateString,
  msUntilNextEtMidnight,
  parseGroups,
  shuffle,
} from "@/lib/detective";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const date = etDateString();
    let puzzle = await prisma.detectivePuzzle.findFirst({
      where: { puzzleDate: date },
    });

    if (!puzzle) {
      const bank = await prisma.detectivePuzzle.findMany({
        where: { puzzleDate: null },
        orderBy: { createdAt: "asc" },
      });
      if (!bank.length) {
        return NextResponse.json({ error: "No puzzles seeded" }, { status: 404 });
      }
      const dayIndex =
        Math.abs(date.split("-").reduce((acc, part) => acc + Number(part), 0)) %
        bank.length;
      puzzle = bank[dayIndex];
    }

    const groups = parseGroups(puzzle.groups);
    const members = groups.flatMap((g) => g.members);
    const tiles = shuffle(members, Number(date.replaceAll("-", "")));

    return NextResponse.json({
      id: puzzle.id,
      date,
      tiles,
      resetsInMs: msUntilNextEtMidnight(),
      maxMistakes: 5,
    });
  } catch (err) {
    console.error("[detective/today]", err);
    return NextResponse.json(
      {
        error: "Could not load today's puzzle.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
