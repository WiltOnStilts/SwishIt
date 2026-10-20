import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--line)]/60 px-4 py-5 text-center safe-bottom">
      <nav
        aria-label="Site"
        className="mx-auto flex max-w-lg flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]"
      >
        <Link href="/" className="transition hover:text-[var(--ink)]">
          Home
        </Link>
        <Link href="/about" className="transition hover:text-[var(--ink)]">
          About
        </Link>
        <Link href="/privacy" className="transition hover:text-[var(--ink)]">
          Privacy
        </Link>
      </nav>
      <p className="mx-auto mt-3 max-w-lg text-[11px] leading-relaxed text-[var(--muted)]/70">
        Free basketball minigames. Ads may appear on the home page only.
      </p>
    </footer>
  );
}
