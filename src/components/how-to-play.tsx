"use client";

import { useEffect, useId, useState } from "react";

export function HowToButton({
  title,
  steps,
}: {
  title: string;
  steps: string[];
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={`How to play ${title}`}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="info-glow flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--orange)] bg-black/40 text-lg font-semibold italic leading-none text-[var(--orange-hot)]"
      >
        i
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-6 sm:items-center sm:pb-0"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[#1a100c] p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2
              id={titleId}
              className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-[var(--orange-hot)]"
            >
              How to play
            </h2>
            <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{title}</p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--muted)]">
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 w-full rounded-xl bg-[var(--orange)] py-3 text-xs font-bold uppercase tracking-[0.16em] text-black"
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
