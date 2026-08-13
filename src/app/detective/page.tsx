"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyStreakResult,
  difficultyStyle,
  formatStopwatch,
  HINT_COST,
  readStreak,
  type StreakState,
} from "@/lib/detective";

type Solved = {
  label: string;
  difficulty: number;
  members: string[];
};

export default function DetectiveGame() {
  const [puzzleId, setPuzzleId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [tiles, setTiles] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [solved, setSolved] = useState<Solved[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [maxMistakes, setMaxMistakes] = useState(5);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [score, setScore] = useState<{
    score: number;
    breakdown: {
      time: number;
      accuracy: number;
      difficulty: number;
      hintPenalty: number;
    };
  } | null>(null);
  const [lost, setLost] = useState(false);
  const [revealed, setRevealed] = useState<Solved[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetsInMs, setResetsInMs] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintText, setHintText] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [streak, setStreak] = useState<StreakState>({
    count: 0,
    lastResultDate: null,
    lastResult: null,
  });

  const storageKey = useMemo(
    () => (date ? `swishit-detective-${date}` : null),
    [date],
  );

  const gameOver = !!score || lost;

  useEffect(() => {
    setStreak(readStreak());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/detective/today");
        const data = await res.json();
        if (cancelled) return;
        setPuzzleId(data.id);
        setDate(data.date);
        setTiles(data.tiles);
        setMaxMistakes(data.maxMistakes ?? 5);
        setResetsInMs(data.resetsInMs ?? 0);

        const saved = localStorage.getItem(`swishit-detective-${data.date}`);
        if (saved) {
          const parsed = JSON.parse(saved) as {
            solved: Solved[];
            mistakes: number;
            score: typeof score;
            tiles: string[];
            lost?: boolean;
            revealed?: Solved[];
            startedAt?: number;
            elapsedMs?: number;
            hintUsed?: boolean;
            hintText?: string | null;
          };
          setSolved(parsed.solved ?? []);
          setMistakes(parsed.mistakes ?? 0);
          setScore(parsed.score ?? null);
          setLost(!!parsed.lost);
          setRevealed(parsed.revealed ?? []);
          setHintUsed(!!parsed.hintUsed);
          setHintText(parsed.hintText ?? null);
          if (parsed.tiles?.length) setTiles(parsed.tiles);
          if (parsed.startedAt) setStartedAt(parsed.startedAt);
          else setStartedAt(Date.now());
          if (parsed.elapsedMs) setElapsedMs(parsed.elapsedMs);
        } else {
          setStartedAt(Date.now());
        }
      } catch {
        setMessage("Could not load today's puzzle.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!storageKey || loading) return;
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        solved,
        mistakes,
        score,
        tiles,
        lost,
        revealed,
        startedAt,
        elapsedMs,
        hintUsed,
        hintText,
      }),
    );
  }, [
    storageKey,
    solved,
    mistakes,
    score,
    tiles,
    lost,
    revealed,
    startedAt,
    elapsedMs,
    hintUsed,
    hintText,
    loading,
  ]);

  useEffect(() => {
    if (!date) return;
    const id = setInterval(() => {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }).formatToParts(new Date());
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
      const next = Date.UTC(
        get("year"),
        get("month") - 1,
        get("day") + 1,
        0,
        0,
        0,
      );
      setResetsInMs(Math.max(0, next - etAsUtc));
    }, 1000);
    return () => clearInterval(id);
  }, [date]);

  useEffect(() => {
    if (!startedAt || gameOver) return;
    const id = setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 250);
    return () => clearInterval(id);
  }, [startedAt, gameOver]);

  const remainingTiles = useMemo(() => {
    const taken = new Set([
      ...solved.flatMap((s) => s.members),
      ...revealed.flatMap((s) => s.members),
    ]);
    return tiles.filter((t) => !taken.has(t));
  }, [tiles, solved, revealed]);

  const toggle = (name: string) => {
    if (gameOver) return;
    setSelected((prev) => {
      if (prev.includes(name)) return prev.filter((x) => x !== name);
      if (prev.length >= 4) return prev;
      return [...prev, name];
    });
  };

  const finishScore = useCallback(
    async (nextSolved: Solved[], nextMistakes: number, won: boolean) => {
      if (!puzzleId || !date) return;
      const ms = startedAt ? Date.now() - startedAt : elapsedMs;
      setElapsedMs(ms);
      const scoreRes = await fetch("/api/detective/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puzzleId,
          action: "score",
          elapsedMs: ms,
          mistakes: nextMistakes,
          solvedDifficulties: nextSolved.map((s) => s.difficulty),
          hintUsed,
        }),
      });
      const scored = await scoreRes.json();
      if (won) setScore(scored);
      setStreak(applyStreakResult(date, won));
    },
    [puzzleId, date, startedAt, elapsedMs, hintUsed],
  );

  const revealHint = useCallback(async () => {
    if (!puzzleId || gameOver || hintUsed || hintLoading) return;
    setHintLoading(true);
    try {
      const res = await fetch("/api/detective/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puzzleId,
          action: "hint",
          solvedLabels: solved.map((s) => s.label),
        }),
      });
      const data = await res.json();
      setHintUsed(true);
      setHintText(data.text ?? "No hint available.");
    } catch {
      setMessage("Could not load hint.");
    } finally {
      setHintLoading(false);
    }
  }, [puzzleId, gameOver, hintUsed, hintLoading, solved]);

  const revealRemaining = useCallback(
    async (already: Solved[]) => {
      if (!puzzleId) return;
      const res = await fetch("/api/detective/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puzzleId, action: "reveal" }),
      });
      const data = await res.json();
      const have = new Set(already.map((g) => g.label));
      const rest = (data.groups as Solved[]).filter((g) => !have.has(g.label));
      setRevealed(rest);
    },
    [puzzleId],
  );

  const submit = useCallback(async () => {
    if (!puzzleId || selected.length !== 4 || gameOver) return;
    const res = await fetch("/api/detective/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        puzzleId,
        action: "guess",
        selection: selected,
      }),
    });
    const data = await res.json();
    if (data.correct) {
      const nextSolved = [
        ...solved,
        {
          label: data.label as string,
          difficulty: data.difficulty as number,
          members: data.members as string[],
        },
      ];
      setSolved(nextSolved);
      setSelected([]);
      setMessage(null);

      if (nextSolved.length === 4) {
        await finishScore(nextSolved, mistakes, true);
      }
    } else {
      const nextMistakes = mistakes + 1;
      setMistakes(nextMistakes);
      setSelected([]);
      const overlap = Number(data.overlap ?? 0);
      const closeness =
        overlap >= 3 ? "3/4" : overlap >= 2 ? "2/4" : "not a group";
      if (nextMistakes >= maxMistakes) {
        setLost(true);
        setMessage("Out of misses — here are today's answers.");
        await revealRemaining(solved);
        await finishScore(solved, nextMistakes, false);
      } else {
        setMessage(closeness);
      }
    }
  }, [
    puzzleId,
    selected,
    gameOver,
    solved,
    mistakes,
    maxMistakes,
    finishScore,
    revealRemaining,
  ]);

  const resetLabel = useMemo(() => {
    const totalSec = Math.floor(resetsInMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    return `${h}h ${m}m`;
  }, [resetsInMs]);

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 text-[var(--muted)]">
        Loading today&apos;s board…
      </main>
    );
  }

  const displayGroups = [
    ...solved,
    ...revealed.map((g) => ({ ...g, _revealed: true as const })),
  ].sort((a, b) => a.difficulty - b.difficulty);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6 safe-bottom">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link
          href="/"
          className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]"
        >
          ← SwishIt
        </Link>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-wide">
          Detective
        </h1>
        <div className="flex flex-col items-center gap-0.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-white">
            Streak
          </p>
          <div className="flex items-center gap-1 text-[1.75rem] leading-none">
            <span aria-hidden>🔥</span>
            <span className="font-[family-name:var(--font-display)] text-[var(--orange-hot)]">
              {streak.count}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
            Daily · {date}
          </p>
          <p className="mt-1 font-mono text-2xl tabular-nums text-[var(--ink)]">
            {formatStopwatch(elapsedMs)}
          </p>
        </div>
        <p className="text-right text-[11px] text-[var(--muted)]">
          Resets in
          <br />
          <span className="font-semibold text-[var(--ink)]">{resetLabel}</span>
        </p>
      </div>

      <div className="mt-3 flex gap-1.5" aria-label="Mistakes remaining">
        {Array.from({ length: maxMistakes }).map((_, i) => (
          <span
            key={i}
            className={`h-2.5 flex-1 rounded-full ${
              i < maxMistakes - mistakes ? "bg-[var(--orange)]" : "bg-white/10"
            }`}
          />
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {displayGroups.map((g) => {
          const style = difficultyStyle(g.difficulty);
          const isReveal = "_revealed" in g && g._revealed;
          return (
            <div
              key={g.label}
              className={`rounded-xl px-3 py-3 ${style.className} ${isReveal ? "opacity-80 ring-1 ring-white/20" : ""}`}
              style={style.style}
            >
              <p className="text-center text-[10px] font-bold uppercase tracking-wider">
                Lv {g.difficulty}/10
                {isReveal ? " · revealed" : ""}
              </p>
              <p className="text-center text-xs font-bold uppercase tracking-wider">
                {g.label}
              </p>
              <p className="mt-1 text-center text-sm font-semibold">
                {g.members.join(", ")}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {remainingTiles.map((name) => {
          const on = selected.includes(name);
          return (
            <button
              key={name}
              type="button"
              onClick={() => toggle(name)}
              disabled={gameOver}
              className={`min-h-[4.25rem] rounded-xl border px-2 py-2 text-center text-[13px] font-semibold leading-snug transition active:scale-[0.97] disabled:opacity-50 ${
                on
                  ? "border-[var(--orange)] bg-[var(--tile-selected)] text-[var(--ink)]"
                  : "border-[var(--line)] bg-[var(--tile)] text-[var(--ink)]"
              }`}
            >
              {name}
            </button>
          );
        })}
      </div>

      {message && (
        <p className="mt-3 text-center text-sm text-[var(--muted)]">{message}</p>
      )}

      {hintText && (
        <p className="mt-3 rounded-xl border border-[var(--orange)]/40 bg-black/30 px-3 py-2.5 text-center text-sm text-[var(--orange-hot)]">
          Hint: {hintText}
        </p>
      )}

      {!gameOver && (
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelected([])}
              className="flex-1 rounded-xl border border-[var(--line)] py-3 text-xs font-bold uppercase tracking-wider"
            >
              Deselect
            </button>
            <button
              type="button"
              disabled={selected.length !== 4}
              onClick={submit}
              className="flex-[1.4] rounded-xl bg-[var(--orange)] py-3 text-xs font-bold uppercase tracking-wider text-black disabled:opacity-40"
            >
              Submit {selected.length}/4
            </button>
          </div>
          {!hintUsed ? (
            <button
              type="button"
              onClick={revealHint}
              disabled={hintLoading}
              className="w-full rounded-xl border border-dashed border-[var(--line)] py-2.5 text-xs font-semibold text-[var(--muted)]"
            >
              {hintLoading
                ? "Loading hint…"
                : `Reveal hint (−${HINT_COST}/99 points)`}
            </button>
          ) : (
            <p className="text-center text-[11px] text-[var(--muted)]">
              Hint used (−{HINT_COST} points at scoring)
            </p>
          )}
        </div>
      )}

      {score && (
        <section className="animate-rise mt-5 rounded-2xl border border-[var(--orange)]/40 bg-black/30 p-4 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
            Today&apos;s score
          </p>
          <p className="font-[family-name:var(--font-display)] text-6xl text-[var(--orange-hot)]">
            {score.score}
            <span className="text-3xl text-[var(--muted)]">/99</span>
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Time {score.breakdown.time}/33 · Accuracy{" "}
            {score.breakdown.accuracy}/33 · Difficulty{" "}
            {score.breakdown.difficulty}/33
            {score.breakdown.hintPenalty > 0
              ? ` · Hint −${score.breakdown.hintPenalty}`
              : ""}
          </p>
          <p className="mt-2 text-sm text-[var(--orange-hot)]">
            Streak: {streak.count}
          </p>
        </section>
      )}

      {lost && !score && (
        <p className="mt-5 text-center text-sm text-[var(--bad)]">
          Streak broken. Fresh board after midnight ET.
        </p>
      )}
    </main>
  );
}
