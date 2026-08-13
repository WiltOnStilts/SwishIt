"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  SUPERSTAR_RESULT_KEY,
  type SuperstarCareer,
} from "@/lib/superstar";

type Stored = {
  career: SuperstarCareer;
};

function roundish(n: number) {
  return Math.round(n * 10) / 10;
}

function Stat({
  label,
  value,
  compact,
}: {
  label: string;
  value: string | number;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-[var(--line)] bg-black/25 text-center ${
        compact ? "px-1.5 py-2" : "px-3 py-2.5"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </p>
      <p
        className={`mt-1 font-[family-name:var(--font-display)] tracking-wide text-[var(--ink)] ${
          compact ? "text-xl" : "text-2xl"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default function SuperstarResultsPage() {
  const [career, setCareer] = useState<SuperstarCareer | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SUPERSTAR_RESULT_KEY);
      if (!raw) {
        setMissing(true);
        return;
      }
      const parsed = JSON.parse(raw) as Stored;
      setCareer(parsed.career);
    } catch {
      setMissing(true);
    }
  }, []);

  if (missing) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4">
        <p className="text-[var(--muted)]">No superstar on file.</p>
        <Link
          href="/superstar-studio"
          className="text-sm font-bold uppercase tracking-wider text-[var(--orange-hot)]"
        >
          Back to the lab →
        </Link>
      </main>
    );
  }

  if (!career) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 items-center justify-center px-4">
        <p className="text-[var(--muted)]">Developing film…</p>
      </main>
    );
  }

  const averages = career.careerAverages ?? {
    ppg: 0,
    rpg: 0,
    apg: 0,
    spg: 0,
    bpg: 0,
  };
  const peak = career.peakAverages ?? {
    ppg: roundish(averages.ppg + 2),
    rpg: roundish(averages.rpg + 0.8),
    apg: roundish(averages.apg + 0.8),
    spg: roundish(averages.spg + 0.2),
    bpg: roundish(averages.bpg + 0.15),
  };
  const a = career.awards;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-12 pt-6 safe-bottom">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/superstar-studio"
          className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]"
        >
          ← Lab
        </Link>
        <Link
          href="/"
          className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]"
        >
          Home
        </Link>
      </div>

      <header className="animate-rise mt-6 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--muted)]">
          Career projection
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl tracking-wide text-[var(--orange-hot)]">
          Custom Superstar
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {career.position} · {career.yearsPlayed} seasons · {career.peak}
        </p>
        <div className="mt-4 inline-flex items-end gap-3 rounded-2xl border border-[var(--orange)]/40 bg-black/30 px-5 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
              Grade
            </p>
            <p className="font-[family-name:var(--font-display)] text-5xl text-[var(--ink)]">
              {career.grade}
            </p>
          </div>
          <div className="pb-1 text-left">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
              Overall
            </p>
            <p className="font-[family-name:var(--font-display)] text-3xl text-[var(--orange-hot)]">
              {career.overall}
            </p>
          </div>
        </div>
      </header>

      <section className="mt-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
          Career averages
        </p>
        <div className="mt-3 grid grid-cols-5 gap-1.5">
          <Stat label="PPG" value={averages.ppg} compact />
          <Stat label="RPG" value={averages.rpg} compact />
          <Stat label="APG" value={averages.apg} compact />
          <Stat label="SPG" value={averages.spg} compact />
          <Stat label="BPG" value={averages.bpg} compact />
        </div>
      </section>

      <section className="mt-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
          Peak averages
        </p>
        <div className="mt-3 grid grid-cols-5 gap-1.5">
          <Stat label="PPG" value={peak.ppg} compact />
          <Stat label="RPG" value={peak.rpg} compact />
          <Stat label="APG" value={peak.apg} compact />
          <Stat label="SPG" value={peak.spg} compact />
          <Stat label="BPG" value={peak.bpg} compact />
        </div>
      </section>

      <section className="mt-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
          Hardware & recognition
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat label="MVPs" value={a.mvps} />
          <Stat label="DPOYs" value={a.dpoys} />
          <Stat label="Finals MVPs" value={a.finalsMvps} />
          <Stat label="Scoring titles" value={a.scoringTitles} />
          <Stat label="Rebound titles" value={a.reboundTitles} />
          <Stat label="Assist titles" value={a.assistTitles} />
          <Stat label="All-Stars" value={a.allStars} />
          <Stat label="All-NBA" value={a.allNba} />
          <Stat label="All-Defense" value={a.allDefense} />
          <Stat label="Championships" value={a.championships} />
          <Stat label="ROY" value={a.rookiesOfYear ? "Yes" : "No"} />
          <Stat label="Hall of Fame" value={career.hallOfFame ? "Yes" : "No"} />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--line)] bg-black/30 p-4 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
          All-time rank
        </p>
        <p className="font-[family-name:var(--font-display)] text-5xl text-[var(--orange-hot)]">
          #{career.allTimeRank}
        </p>
        <p className="mt-2 text-sm leading-snug text-[var(--ink)]/90">
          {career.rankContext ?? ""}
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">{career.legacyLine}</p>
      </section>

      <section className="mt-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
          Attribute grades
        </p>
        <ul className="mt-3 space-y-2">
          {career.attributes.map((attr) => (
            <li
              key={attr.key}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--tile)] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold">{attr.label}</p>
                <p className="truncate text-[11px] text-[var(--muted)]">
                  from {attr.from}
                </p>
              </div>
              <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--orange-hot)]">
                {attr.score}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <Link
        href="/superstar-studio"
        className="mt-8 block rounded-xl border border-[var(--line)] py-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink)]"
      >
        Build another
      </Link>
    </main>
  );
}
