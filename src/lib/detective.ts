import { puzzles, type PuzzleSeed } from "../../prisma/data/puzzles";

export type DetectiveGroup = {
  label: string;
  /** 1 = easiest … 10 = Insane Ball Knowledge */
  difficulty: number;
  members: string[];
};

/** America/New_York calendar date YYYY-MM-DD */
export function etDateString(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function etYesterdayString(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const d = new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
  d.setUTCDate(d.getUTCDate() - 1);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function msUntilNextEtMidnight(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  const etAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  const nextEtMidnightAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day") + 1,
    0,
    0,
    0,
  );
  return nextEtMidnightAsUtc - etAsUtc;
}

export function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function parseGroups(json: string): DetectiveGroup[] {
  return JSON.parse(json) as DetectiveGroup[];
}

/**
 * Score out of 99. Time moves with each second, accuracy steps by miss,
 * and difficulty is the biggest slice so a hard board pays off.
 * Optional hint subtracts HINT_COST from the final total.
 */
export const HINT_COST = 9;
export const TIME_MAX = 28;
export const ACCURACY_MAX = 28;
export const DIFFICULTY_MAX = 43;

export function scoreDetective(input: {
  elapsedMs: number;
  mistakes: number;
  maxMistakes: number;
  solvedDifficulties: number[];
  hintUsed?: boolean;
}): {
  score: number;
  breakdown: {
    time: number;
    accuracy: number;
    difficulty: number;
    hintPenalty: number;
    timeMax: number;
    accuracyMax: number;
    difficultyMax: number;
  };
} {
  const time = timeScore(input.elapsedMs);
  const accuracy = accuracyScore(input.mistakes);
  const difficulty = difficultyScore(input.solvedDifficulties);

  const hintPenalty = input.hintUsed ? HINT_COST : 0;
  const score = clamp(time + accuracy + difficulty - hintPenalty, 0, 99);
  return {
    score,
    breakdown: {
      time,
      accuracy,
      difficulty,
      hintPenalty,
      timeMax: TIME_MAX,
      accuracyMax: ACCURACY_MAX,
      difficultyMax: DIFFICULTY_MAX,
    },
  };
}

/** Adaptive hint text based on how many groups are already solved. */
export function buildHint(
  groups: DetectiveGroup[],
  solvedLabels: string[],
): { text: string } {
  const remaining = groups
    .filter((g) => !solvedLabels.includes(g.label))
    .sort((a, b) => a.difficulty - b.difficulty);

  if (!remaining.length) {
    return { text: "All groups are already solved — no hint needed." };
  }

  const easiest = remaining[0]!;
  const hardest = remaining[remaining.length - 1]!;
  const solvedCount = solvedLabels.length;

  if (solvedCount === 0) {
    return {
      text: `Opening tip: one group on today's board is "${easiest.label}".`,
    };
  }

  if (solvedCount === 1) {
    const a = easiest.members[0]!;
    const b = easiest.members[1]!;
    return {
      text: `Nice start. Two names that belong together: ${a} & ${b}.`,
    };
  }

  if (solvedCount === 2) {
    return {
      text: `Halfway. One of the remaining categories is "${hardest.label}".`,
    };
  }

  return {
    text: `Last group standing: "${easiest.label}".`,
  };
}

/** Smooth 0–28. Full credit under 45s, then a curve down to 0 at 8 minutes. */
export function timeScore(elapsedMs: number): number {
  const seconds = Math.max(0, elapsedMs / 1000);
  if (seconds <= 45) return TIME_MAX;
  const limit = 8 * 60;
  if (seconds >= limit) return 0;
  const t = (seconds - 45) / (limit - 45);
  return Math.round(TIME_MAX * (1 - Math.pow(t, 0.85)));
}

/** 0–28. Misses cost more as they pile up, not a flat slice of 33. */
export function accuracyScore(mistakes: number): number {
  const curve = [28, 24, 19, 14, 8, 3];
  return curve[clamp(Math.round(mistakes), 0, curve.length - 1)] ?? 0;
}

/**
 * 0–43 from the board's average group difficulty.
 * An easy board still scores in the high teens; a hard one can clear 35.
 */
export function difficultyScore(solvedDifficulties: number[]): number {
  const levels = solvedDifficulties.map((d) => clamp(d, 1, 10));
  if (!levels.length) return 0;
  const avg = levels.reduce((sum, level) => sum + level, 0) / levels.length;
  return Math.round(18 + ((avg - 1) / 9) * (DIFFICULTY_MAX - 18));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function dayNumber(date: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return 0;
  return Math.floor(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86400000,
  );
}

/** One new board each day, then the bank repeats. */
export function puzzleForDate(date: string): PuzzleSeed {
  const dated = puzzles.find((puzzle) => puzzle.puzzleDate === date);
  if (dated) return dated;

  const bank = puzzles.filter((puzzle) => !puzzle.puzzleDate);
  if (!bank.length) {
    throw new Error("Detective puzzle bank is empty");
  }

  return bank[dayNumber(date) % bank.length]!;
}

export function puzzleByCodeId(id: string): PuzzleSeed | null {
  if (!id.startsWith("code:")) return null;
  const title = id.slice("code:".length);
  return puzzles.find((puzzle) => puzzle.title === title) ?? null;
}

export function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

export function isCorrectGroup(
  selection: string[],
  groups: DetectiveGroup[],
): DetectiveGroup | null {
  if (selection.length !== 4) return null;
  const set = new Set(selection.map(normalizeName));
  for (const g of groups) {
    if (g.members.every((m) => set.has(normalizeName(m)))) return g;
  }
  return null;
}

/** Best overlap with any real group (0–4). Used for “2/4” / “3/4” miss hints. */
export function closestGroupOverlap(
  selection: string[],
  groups: DetectiveGroup[],
): number {
  const set = new Set(selection.map(normalizeName));
  let best = 0;
  for (const g of groups) {
    const n = g.members.filter((m) => set.has(normalizeName(m))).length;
    if (n > best) best = n;
  }
  return best;
}

/** Tailwind / inline style classes for solved group difficulty 1–10 */
export function difficultyStyle(level: number): {
  className: string;
  style?: Record<string, string>;
} {
  const n = clamp(Math.round(level), 1, 10);
  if (n >= 10) {
    return {
      className: "text-white rainbow-glow border border-white/30",
      style: {
        background:
          "linear-gradient(120deg, #ef4444, #f59e0b, #22c55e, #3b82f6, #a855f7, #ef4444)",
        backgroundSize: "200% 200%",
      },
    };
  }
  const palette: Record<number, string> = {
    1: "bg-emerald-400 text-black",
    2: "bg-lime-400 text-black",
    3: "bg-yellow-300 text-black",
    4: "bg-amber-400 text-black",
    5: "bg-orange-500 text-black",
    6: "bg-orange-600 text-white",
    7: "bg-rose-500 text-white",
    8: "bg-fuchsia-600 text-white",
    9: "bg-violet-700 text-white",
  };
  return { className: palette[n] ?? palette[5]! };
}

export const STREAK_KEY = "swishit-detective-streak";

export type StreakState = {
  count: number;
  lastResultDate: string | null;
  lastResult: "win" | "loss" | null;
};

export function readStreak(): StreakState {
  if (typeof window === "undefined") {
    return { count: 0, lastResultDate: null, lastResult: null };
  }
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { count: 0, lastResultDate: null, lastResult: null };
    return JSON.parse(raw) as StreakState;
  } catch {
    return { count: 0, lastResultDate: null, lastResult: null };
  }
}

export function writeStreak(state: StreakState) {
  localStorage.setItem(STREAK_KEY, JSON.stringify(state));
}

/** Call once when today's game finishes. */
export function applyStreakResult(date: string, won: boolean): StreakState {
  const prev = readStreak();
  if (prev.lastResultDate === date) return prev;

  if (!won) {
    const next = { count: 0, lastResultDate: date, lastResult: "loss" as const };
    writeStreak(next);
    return next;
  }

  const yesterday = etYesterdayString();
  const continued = prev.lastResult === "win" && prev.lastResultDate === yesterday;
  const next = {
    count: continued ? prev.count + 1 : 1,
    lastResultDate: date,
    lastResult: "win" as const,
  };
  writeStreak(next);
  return next;
}

export function formatStopwatch(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
