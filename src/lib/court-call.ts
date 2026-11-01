import type { CourtPos, LineupPlayer } from "@/lib/season";
import { canPlaySlot } from "@/lib/season";

export type CourtDifficulty = "easy" | "normal" | "hard";

export const COURT_DIFFICULTY_LABELS: Record<CourtDifficulty, string> = {
  easy: "Easy",
  normal: "Normal",
  hard: "Hard",
};

export type DifficultyTuning = {
  meterSpeed: number;
  greenWidth: number;
  aiSpeed: number;
  stealBonus: number;
  contestPenalty: number;
  makeBonus: number;
};

export function difficultyTuning(level: CourtDifficulty): DifficultyTuning {
  if (level === "easy") {
    return {
      meterSpeed: 2.2,
      greenWidth: 0.22,
      aiSpeed: 0.75,
      stealBonus: 0.12,
      contestPenalty: 0.08,
      makeBonus: 0.1,
    };
  }
  if (level === "hard") {
    return {
      meterSpeed: 4.4,
      greenWidth: 0.08,
      aiSpeed: 1.25,
      stealBonus: -0.06,
      contestPenalty: 0.22,
      makeBonus: -0.06,
    };
  }
  return {
    meterSpeed: 3.2,
    greenWidth: 0.14,
    aiSpeed: 1,
    stealBonus: 0,
    contestPenalty: 0.15,
    makeBonus: 0,
  };
}

export const COURT_CALL_STEPS = [
  "Pick your team and the opponent with search or the year/team arrows — or tip off a random matchup.",
  "Lock one starter before tip-off — you control that player the whole game (no mid-game switches).",
  "Move with the left joystick on phone, or WASD / arrow keys on desktop.",
  "Desktop: Space shoot, K pass, F block, G steal, H rebound. Mobile pad: Shoot, Pass, Block, Steal, Board. You dribble automatically — rebounds only grab on H / Board when you're next to a loose ball.",
  "Shooting uses a timing meter — green is money, yellow is okay, red is off. It speeds up when you're guarded or far from the rim, and freezes briefly after you release.",
  "Difficulty (Easy / Normal / Hard) sits under the court with the mobile controls.",
  "Four 1-minute quarters. A 24-second shot clock runs each possession — highest score at the end wins.",
];

/** Green center + yellow pads on both sides; everything else is red. */
export function meterZones(greenWidth: number) {
  const greenStart = 0.5 - greenWidth / 2;
  const greenEnd = 0.5 + greenWidth / 2;
  const yellowPad = Math.max(0.07, greenWidth * 0.95);
  return {
    greenStart,
    greenEnd,
    yellowStart: Math.max(0, greenStart - yellowPad),
    yellowEnd: Math.min(1, greenEnd + yellowPad),
  };
}

export function meterGrade(
  t: number,
  greenWidth: number,
): "green" | "yellow" | "red" {
  const z = meterZones(greenWidth);
  if (t >= z.greenStart && t <= z.greenEnd) return "green";
  if (t >= z.yellowStart && t <= z.yellowEnd) return "yellow";
  return "red";
}

export type TeamMeta = {
  id: string;
  name: string;
  abbreviation: string;
  city: string;
  strength: number;
  champion: boolean;
};

export type RosterOption = {
  year: number;
  team: TeamMeta;
};

export type CourtCallMeta = {
  years: number[];
  teamsByYear: Record<number, TeamMeta[]>;
  rosterPool: RosterOption[];
};

export type CourtSquad = {
  year: number;
  team: TeamMeta;
  lineup: Record<CourtPos, LineupPlayer>;
};

const SLOTS: CourtPos[] = ["PG", "SG", "SF", "PF", "C"];

function playerPower(p: LineupPlayer): number {
  return (
    p.ppg * 1.2 +
    p.rpg * 0.7 +
    p.apg * 1.0 +
    p.spg * 2 +
    p.bpg * 2 +
    (p.mvp ? 20 : 0) +
    (p.allStar ? 6 : 0) +
    (p.dpoy ? 8 : 0)
  );
}

/** Best available starter at each spot from a roster. */
export function buildLineup(players: LineupPlayer[]): Record<CourtPos, LineupPlayer> | null {
  if (players.length < 5) return null;
  const used = new Set<string>();
  const lineup = {} as Record<CourtPos, LineupPlayer>;

  for (const slot of SLOTS) {
    const candidates = players
      .filter((p) => !used.has(p.id) && canPlaySlot(p, slot))
      .sort((a, b) => playerPower(b) - playerPower(a));
    const pick =
      candidates[0] ??
      players
        .filter((p) => !used.has(p.id))
        .sort((a, b) => playerPower(b) - playerPower(a))[0];
    if (!pick) return null;
    used.add(pick.id);
    lineup[slot] = pick;
  }
  return lineup;
}

export function rosterLabel(option: RosterOption): string {
  const t = option.team;
  return `${option.year} ${t.city} ${t.name} (${t.abbreviation})`;
}

export function filterRosters(pool: RosterOption[], query: string): RosterOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return pool;
  return pool.filter((r) => {
    const hay = [
      String(r.year),
      r.team.city,
      r.team.name,
      r.team.abbreviation,
      `${r.team.city} ${r.team.name}`,
      `${r.year} ${r.team.abbreviation}`,
    ]
      .join(" ")
      .toLowerCase();
    return q.split(/\s+/).every((part) => hay.includes(part));
  });
}

export function offenseRating(p: LineupPlayer): number {
  return Math.min(
    99,
    Math.round(42 + p.ppg * 2.1 + p.apg * 1.2 + (p.fgPct ?? 0.45) * 18 + (p.mvp ? 8 : 0)),
  );
}

export function defenseRating(p: LineupPlayer): number {
  return Math.min(
    99,
    Math.round(44 + p.spg * 12 + p.bpg * 14 + p.rpg * 1.4 + (p.dpoy ? 10 : 0)),
  );
}

export function passRating(p: LineupPlayer): number {
  return Math.min(99, Math.round(48 + p.apg * 6.5 + p.spg * 2));
}
