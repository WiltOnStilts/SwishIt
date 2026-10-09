"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UndefeatedResult } from "@/components/undefeated-result";
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

export default function UndefeatedResultsPage() {
  const router = useRouter();
  const [stored, setStored] = useState<Stored | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(UNDEFEATED_RESULT_KEY);
      if (!raw) {
        setMissing(true);
        return;
      }
      setStored(JSON.parse(raw) as Stored);
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

  return (
    <main className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6 safe-bottom">
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
      <UndefeatedResult
        result={stored.result}
        starters={stored.starters}
        sixthMan={stored.sixthMan}
        onPlayAgain={() => router.push("/undefeated")}
      />
    </main>
  );
}
