"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { readStreak } from "@/lib/detective";

function StreakBadge({ count }: { count: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-white">
        Streak
      </p>
      <div className="flex items-center gap-1 text-[1.75rem] leading-none">
        <span aria-hidden>🔥</span>
        <span className="font-[family-name:var(--font-display)] text-[var(--orange-hot)]">
          {count}
        </span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    setStreak(readStreak().count);
  }, []);

  return (
    <main className="relative flex flex-1 flex-col px-4 pt-4 safe-bottom sm:px-6">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <header className="animate-rise text-center">
          <h1>
            <Image
              src="/swishit-logo.png"
              alt="SwishIt"
              width={864}
              height={767}
              priority
              className="mx-auto h-auto w-[min(100%,18.5rem)] bg-transparent sm:w-80"
            />
          </h1>
          <p className="mt-1 text-xs font-bold text-[var(--orange-hot)] sm:text-sm">
            daily basketball minigames-just for you
          </p>
        </header>

        <div className="mt-8 flex flex-col gap-4">
          <Link
            href="/undefeated"
            className="animate-rise-delay animate-pulse-glow group relative overflow-hidden rounded-2xl border border-[var(--line)] bg-gradient-to-br from-[#2a160c] to-[#120c08] p-5 transition active:scale-[0.98]"
          >
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[var(--orange)]/20 blur-2xl transition group-hover:bg-[var(--orange)]/35" />
            <p className="font-[family-name:var(--font-display)] text-4xl tracking-wide text-[var(--orange-hot)]">
              Undefeated
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Spin a year and a team, draft a starting five plus a sixth man,
              then run the season against all-time squads.
            </p>
            <span className="mt-4 inline-flex text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink)]">
              Enter →
            </span>
          </Link>

          <Link
            href="/detective"
            className="animate-rise-delay-2 group relative overflow-hidden rounded-2xl border border-[var(--line)] bg-gradient-to-br from-[#1c140e] to-[#0e0b09] p-5 transition active:scale-[0.98]"
          >
            <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-[var(--orange-dim)]/25 blur-2xl transition group-hover:bg-[var(--orange)]/30" />
            <div className="flex items-start justify-between gap-3">
              <p className="font-[family-name:var(--font-display)] text-4xl tracking-wide text-[var(--ink)]">
                Detective
              </p>
              <StreakBadge count={streak} />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Daily NBA Connections. Resets at midnight ET. Score out of 99.
            </p>
            <span className="mt-4 inline-flex text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange-hot)]">
              Play today →
            </span>
          </Link>

          <Link
            href="/superstar-studio"
            className="animate-rise-delay-2 group relative overflow-hidden rounded-2xl border border-[var(--line)] bg-gradient-to-br from-[#241810] to-[#0f0c09] p-5 transition active:scale-[0.98]"
          >
            <div className="absolute -left-8 top-0 h-28 w-28 rounded-full bg-[var(--orange)]/15 blur-2xl transition group-hover:bg-[var(--orange)]/28" />
            <p className="font-[family-name:var(--font-display)] text-4xl tracking-wide text-[var(--orange-hot)]">
              Superstar Studio
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Make your own custom superstar with 7 attributes!
            </p>
            <span className="mt-4 inline-flex text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink)]">
              Enter the lab →
            </span>
          </Link>
        </div>

        <p
          className="mt-auto pt-12 text-center font-[family-name:var(--font-cozy)] text-3xl italic leading-snug text-[var(--orange-hot)] sm:text-4xl"
          style={{ fontVariationSettings: '"SOFT" 80, "WONK" 1' }}
        >
          New minigames coming out soon!
        </p>
        <p className="mt-4 pb-2 text-center text-[11px] uppercase tracking-[0.25em] text-[var(--muted)]/70">
          Prototype · Ready for Render
        </p>
      </div>
    </main>
  );
}
