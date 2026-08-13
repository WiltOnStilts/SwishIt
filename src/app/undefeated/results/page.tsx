"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  UNDEFEATED_RESULT_KEY,
  type LineupPlayer,
  type SeasonResult,
} from "@/lib/season";

type Stored = {
  result: SeasonResult;
  starters: LineupPlayer[];
  sixthMan: LineupPlayer | null;
};

function ConfettiBurst() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        id: i,
        left: `${(i * 17) % 100}%`,
        delay: `${(i % 12) * 0.05}s`,
        color: ["#f97316", "#fdba74", "#fff7ed", "#fb923c", "#fbbf24", "#34d399"][
          i % 6
        ]!,
        rotate: `${(i * 47) % 360}deg`,
        size: 6 + (i % 5) * 2,
      })),
    [],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece absolute bottom-[-10%] rounded-sm"
          style={{
            left: p.left,
            width: p.size,
            height: p.size * 1.4,
            background: p.color,
            animationDelay: p.delay,
            transform: `rotate(${p.rotate})`,
          }}
        />
      ))}
    </div>
  );
}

export default function UndefeatedResultsPage() {
  const [stored, setStored] = useState<Stored | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(UNDEFEATED_RESULT_KEY);
      if (!raw) {
        setMissing(true);
        return;
      }
      const parsed = JSON.parse(raw) as Stored;
      setStored(parsed);
      if (parsed.result.champion || parsed.result.perfectSeason) {
        setShowConfetti(true);
        const t = setTimeout(() => setShowConfetti(false), 3200);
        return () => clearTimeout(t);
      }
    } catch {
      setMissing(true);
    }
  }, []);

  if (missing) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4">
        <p className="text-[var(--muted)]">No season result found.</p>
        <Link
          href="/undefeated"
          className="rounded-xl bg-[var(--orange)] px-5 py-3 text-sm font-bold uppercase tracking-wider text-black"
        >
          Back to Undefeated
        </Link>
      </main>
    );
  }

  if (!stored) {
    return (
      <main className="flex flex-1 items-center justify-center text-[var(--muted)]">
        Loading season…
      </main>
    );
  }

  const { result, starters, sixthMan } = stored;

  return (
    <main className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6 safe-bottom">
      {showConfetti && <ConfettiBurst />}

      <div className="mb-5 flex items-center justify-between">
        <Link
          href="/undefeated"
          className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]"
        >
          ← Undefeated
        </Link>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-[var(--orange-hot)]">
          Season
        </h1>
        <Link
          href="/"
          className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]"
        >
          Home
        </Link>
      </div>

      <section className="animate-rise rounded-2xl border border-[var(--orange)]/40 bg-gradient-to-b from-[#2a160c] to-black/40 p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
          Final record
        </p>
        <p className="font-[family-name:var(--font-display)] text-6xl tracking-wide">
          {result.wins}-{result.losses}
        </p>
        <p className="mt-1 text-sm text-[var(--orange-hot)]">
          {result.seedHint} · {result.comparison}
        </p>
        {result.perfectSeason && (
          <p className="mt-2 text-sm font-bold text-emerald-400">
            Perfect 82-0 season.
          </p>
        )}
        {result.champion && (
          <p className="mt-1 text-sm font-bold text-[var(--orange-hot)]">
            NBA Champions.
          </p>
        )}
      </section>

      <section className="mt-4">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
          Your lineup
        </p>
        <ul className="mt-2 space-y-1.5 text-sm">
          {(["PG", "SG", "SF", "PF", "C"] as const).map((pos, i) => (
            <li key={pos} className="flex justify-between gap-2 text-[var(--ink)]">
              <span className="text-[var(--orange-hot)]">{pos}</span>
              <span className="text-right">
                {starters[i]?.playerName}{" "}
                <span className="text-[var(--muted)]">
                  ({starters[i]?.year} {starters[i]?.teamAbbr})
                </span>
              </span>
            </li>
          ))}
          {sixthMan && (
            <li className="flex justify-between gap-2">
              <span className="text-[var(--orange-hot)]">6TH</span>
              <span className="text-right">
                {sixthMan.playerName}{" "}
                <span className="text-[var(--muted)]">
                  ({sixthMan.year} {sixthMan.teamAbbr})
                </span>
              </span>
            </li>
          )}
        </ul>
      </section>

      <section className="mt-5">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
          Storylines
        </p>
        <ul className="mt-2 space-y-2">
          {result.storylines.map((s) => (
            <li key={s} className="text-sm leading-relaxed text-[var(--muted)]">
              {s}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-5 mb-4 rounded-2xl border border-[var(--line)] bg-black/25 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
          Postseason
        </p>
        {!result.madePlayoffs ? (
          <p className="mt-2 text-sm text-[var(--bad)]">
            Missed the playoffs. The all-time schedule closed the door before
            April.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {result.playoffRounds.map((r) => (
              <li
                key={r.round}
                className="rounded-xl border border-[var(--line)] bg-[var(--tile)] px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--orange-hot)]">
                    {r.round}
                  </p>
                  <p
                    className={`text-xs font-bold uppercase ${r.won ? "text-emerald-400" : "text-[var(--bad)]"}`}
                  >
                    {r.won ? "Won" : "Lost"} {r.series}
                  </p>
                </div>
                <p className="mt-1 text-sm">
                  vs {r.opponent}
                </p>
              </li>
            ))}
            {result.champion ? (
              <p className="text-sm font-semibold text-[var(--orange-hot)]">
                Hoisted the trophy against all-time competition.
              </p>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Season ended in the{" "}
                {result.playoffRounds[result.playoffRounds.length - 1]?.round ??
                  "playoffs"}
                .
              </p>
            )}
          </ul>
        )}
      </section>

      <Link
        href="/undefeated"
        className="mb-4 w-full rounded-2xl border border-[var(--line)] py-3.5 text-center text-sm font-bold uppercase tracking-[0.18em]"
      >
        Build another squad
      </Link>
    </main>
  );
}
