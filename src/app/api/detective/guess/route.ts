import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildHint,
  closestGroupOverlap,
  isCorrectGroup,
  parseGroups,
  scoreDetective,
} from "@/lib/detective";

export const dynamic = "force-dynamic";

type Body = {
  puzzleId: string;
  selection?: string[];
  action: "guess" | "score" | "reveal" | "hint";
  elapsedMs?: number;
  mistakes?: number;
  solvedDifficulties?: number[];
  solvedLabels?: string[];
  hintUsed?: boolean;
};

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const puzzle = await prisma.detectivePuzzle.findUnique({
    where: { id: body.puzzleId },
  });
  if (!puzzle) {
    return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
  }

  const groups = parseGroups(puzzle.groups);

  if (body.action === "guess") {
    const selection = body.selection ?? [];
    const match = isCorrectGroup(selection, groups);
    if (!match) {
      return NextResponse.json({
        correct: false,
        overlap: closestGroupOverlap(selection, groups),
      });
    }
    return NextResponse.json({
      correct: true,
      label: match.label,
      difficulty: match.difficulty,
      members: match.members,
    });
  }

  if (body.action === "hint") {
    const hint = buildHint(groups, body.solvedLabels ?? []);
    return NextResponse.json(hint);
  }

  if (body.action === "score") {
    const result = scoreDetective({
      elapsedMs: body.elapsedMs ?? 180000,
      mistakes: body.mistakes ?? 0,
      maxMistakes: 5,
      solvedDifficulties: body.solvedDifficulties ?? [],
      hintUsed: !!body.hintUsed,
    });
    return NextResponse.json(result);
  }

  if (body.action === "reveal") {
    return NextResponse.json({
      groups: groups.map((g) => ({
        label: g.label,
        difficulty: g.difficulty,
        members: g.members,
      })),
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
