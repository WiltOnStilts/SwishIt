import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About SwishIt",
  description:
    "What SwishIt is, who it is for, and how the basketball minigames work.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8 safe-bottom sm:px-6">
      <Link
        href="/"
        className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)] transition hover:text-[var(--ink)]"
      >
        ← Home
      </Link>

      <h1 className="mt-6 font-[family-name:var(--font-display)] text-5xl tracking-wide text-[var(--orange-hot)]">
        About SwishIt
      </h1>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-[var(--muted)]">
        <p>
          SwishIt is an independent site of free basketball minigames. It is
          built for fans who want a quick daily puzzle, a fantasy-style lineup
          challenge, or a custom player-building lab—without downloads or
          accounts.
        </p>
        <p>
          The project focuses on original game design and clear rules. Each
          minigame has its own screen, scoring logic, and how-to guide so you
          can jump in and understand what you are doing.
        </p>

        <h2 className="pt-2 font-[family-name:var(--font-display)] text-3xl tracking-wide text-[var(--ink)]">
          The games
        </h2>
        <p>
          <span className="font-bold text-[var(--ink)]">Undefeated</span> asks
          you to spin a historical year and team, draft a starting five plus a
          sixth man from that roster, and simulate a season against all-time
          competition.
        </p>
        <p>
          <span className="font-bold text-[var(--ink)]">Detective</span> is a
          daily Connections-style board of sixteen NBA names. Find four groups
          of four. A new board appears every day at midnight Eastern Time, and
          your score is out of 99.
        </p>
        <p>
          <span className="font-bold text-[var(--ink)]">Superstar Studio</span>{" "}
          lets you assemble a custom star from seven attributes tied to real
          team-season players, then projects a career path from those choices.
        </p>
<<<<<<< HEAD
        <p>
          <span className="font-bold text-[var(--ink)]">Court Call</span> is
          arcade 5-on-5: pick any all-time team, tip off, and play with a
          joystick or keyboard—pass, shoot, steal, and rebound.
        </p>
=======
>>>>>>> 6d0891f8f1a9a48321d0b3aed0941cbdc057917e

        <h2 className="pt-2 font-[family-name:var(--font-display)] text-3xl tracking-wide text-[var(--ink)]">
          Ads and privacy
        </h2>
        <p>
          Advertising, when shown, is limited to the home page so game screens
          stay focused on play. Read how data and cookies work on the{" "}
          <Link
            href="/privacy"
            className="font-bold text-[var(--orange-hot)] underline-offset-2 hover:underline"
          >
            Privacy
          </Link>{" "}
          page.
        </p>
      </div>
    </main>
  );
}
