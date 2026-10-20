"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AdSense } from "@/components/adsense";
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
    <main className="relative flex flex-1 flex-col px-4 pt-4 sm:px-6">
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
            Free daily basketball minigames
          </p>
        </header>

        <p className="animate-rise mt-6 text-center text-sm leading-relaxed text-[var(--muted)]">
          SwishIt is a free collection of original basketball puzzles and
          drafting games. Pick a mode below, learn the rules in a few seconds,
          and play right in your browser—no account required.
        </p>

        <div className="mt-8 flex flex-col gap-4">
          {/* Full-page links so Auto ads from home do not stay on game screens. */}
          <a
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
          </a>

          <a
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
          </a>

          <a
            href="/superstar-studio"
            className="animate-rise-delay-2 group relative overflow-hidden rounded-2xl border border-[var(--line)] bg-gradient-to-br from-[#241810] to-[#0f0c09] p-5 transition active:scale-[0.98]"
          >
            <div className="absolute -left-8 top-0 h-28 w-28 rounded-full bg-[var(--orange)]/15 blur-2xl transition group-hover:bg-[var(--orange)]/28" />
            <p className="font-[family-name:var(--font-display)] text-4xl tracking-wide text-[var(--orange-hot)]">
              Superstar Studio
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Build a custom star from seven attributes tied to real players,
              then see the career that follows.
            </p>
            <span className="mt-4 inline-flex text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink)]">
              Enter the lab →
            </span>
          </a>
        </div>

        <section className="mt-10 space-y-4 text-left text-sm leading-relaxed text-[var(--muted)]">
          <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-[var(--orange-hot)]">
            What you can play
          </h2>
          <p>
            <span className="font-bold text-[var(--ink)]">Undefeated</span> is a
            draft-and-simulate challenge. You get one year respin and one team
            respin, fill PG through C plus a sixth man, then watch a season
            story unfold from your choices.
          </p>
          <p>
            <span className="font-bold text-[var(--ink)]">Detective</span> gives
            you sixteen names each day. Select four that share a hidden link,
            submit the group, and keep going until you clear the board or run
            out of misses. Hints cost points. Your streak tracks consecutive
            daily clears.
          </p>
          <p>
            <span className="font-bold text-[var(--ink)]">Superstar Studio</span>{" "}
            locks six team-seasons after a spin. You assign players to scoring,
            playmaking, defense, and other attributes, then generate a career
            projection from that mix.
          </p>
        </section>

        <details className="group mt-8 rounded-2xl border border-[var(--line)] bg-black/25 text-left">
          <summary className="cursor-pointer list-none px-5 py-4 font-[family-name:var(--font-display)] text-3xl tracking-wide text-[var(--orange-hot)] [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-3">
              How SwishIt works
              <span
                aria-hidden
                className="text-2xl leading-none text-[var(--ink)] transition group-open:rotate-45"
              >
                +
              </span>
            </span>
          </summary>
          <ul className="space-y-3 px-5 pb-5 text-sm leading-relaxed text-[var(--muted)]">
            <li>
              <span className="font-bold text-[var(--ink)]">Undefeated.</span>{" "}
              Spin a year and team, draft a lineup, then run the season.
            </li>
            <li>
              <span className="font-bold text-[var(--ink)]">Detective.</span>{" "}
              Group four names that share a link. New board at midnight ET.
            </li>
            <li>
              <span className="font-bold text-[var(--ink)]">Superstar Studio.</span>{" "}
              Assign real players to 7 attributes and build a career.
            </li>
            <li>
              <span className="font-bold text-[var(--ink)]">Ads.</span> Google
              ads, when shown, appear on this home page only—not inside the
              games.
            </li>
          </ul>
        </details>

        <p className="mt-10 pb-2 text-center text-[11px] uppercase tracking-[0.25em] text-[var(--muted)]/70">
          Original rules · free to play · mobile-friendly
        </p>
      </div>
      <AdSense />
    </main>
  );
}
