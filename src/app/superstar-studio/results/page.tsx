"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SuperstarResult } from "@/components/superstar-result";
import {
  SUPERSTAR_RESULT_KEY,
  type SuperstarCareer,
} from "@/lib/superstar";

export default function SuperstarResultsPage() {
  const router = useRouter();
  const [career, setCareer] = useState<SuperstarCareer | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SUPERSTAR_RESULT_KEY);
      if (!raw) {
        setMissing(true);
        return;
      }
      const parsed = JSON.parse(raw) as { career: SuperstarCareer };
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

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-12 pt-6 safe-bottom">
      <div className="mb-5 flex items-center justify-between gap-3">
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
      <SuperstarResult
        career={career}
        onPlayAgain={() => router.push("/superstar-studio")}
      />
    </main>
  );
}
