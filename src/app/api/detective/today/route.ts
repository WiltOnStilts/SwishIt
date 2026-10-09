import { NextResponse } from "next/server";
import {
  etDateString,
  msUntilNextEtMidnight,
  puzzleForDate,
  shuffle,
} from "@/lib/detective";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const date = etDateString();
    const puzzle = puzzleForDate(date);
    const members = puzzle.groups.flatMap((g) => g.members);
    const tiles = shuffle(members, Number(date.replaceAll("-", "")));

    return NextResponse.json({
      id: `code:${puzzle.title}`,
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
