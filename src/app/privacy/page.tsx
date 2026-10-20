import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — SwishIt",
  description:
    "How SwishIt handles cookies, analytics, and Google advertising data.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8 safe-bottom sm:px-6">
      <Link
        href="/"
        className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)] transition hover:text-[var(--ink)]"
      >
        ← Home
      </Link>

      <h1 className="mt-6 font-[family-name:var(--font-display)] text-5xl tracking-wide text-[var(--orange-hot)]">
        Privacy Policy
      </h1>
      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
        Last updated: October 20, 2026
      </p>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-[var(--muted)]">
        <p>
          This Privacy Policy explains how SwishIt (&quot;we&quot;,
          &quot;us&quot;) collects and uses information when you visit{" "}
          <span className="text-[var(--ink)]">swishit.onrender.com</span>.
        </p>

        <h2 className="pt-2 font-[family-name:var(--font-display)] text-3xl tracking-wide text-[var(--ink)]">
          Information we store on your device
        </h2>
        <p>
          Some game progress stays in your browser only (for example Detective
          streak and today’s board state) using local storage. That data is not
          sent to SwishIt servers for advertising profiles.
        </p>

        <h2 className="pt-2 font-[family-name:var(--font-display)] text-3xl tracking-wide text-[var(--ink)]">
          Advertising and cookies
        </h2>
        <p>
          SwishIt uses Google AdSense to show ads on the home page. Third
          parties, including Google, may place and read cookies on your browser,
          or use web beacons and similar technologies, to collect information as
          a result of ad serving on this site. Those parties may use data such
          as cookie identifiers and IP addresses to personalize ads and measure
          ad performance.
        </p>
        <p>
          You can learn how Google uses data when you use partners’ sites or
          apps here:{" "}
          <a
            href="https://policies.google.com/technologies/partner-sites"
            className="font-bold text-[var(--orange-hot)] underline-offset-2 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            How Google uses data when you use our partners’ sites or apps
          </a>
          .
        </p>
        <p>
          You can manage ad personalization in{" "}
          <a
            href="https://adssettings.google.com/"
            className="font-bold text-[var(--orange-hot)] underline-offset-2 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Ad Settings
          </a>
          . You can also control cookies through your browser settings.
        </p>

        <h2 className="pt-2 font-[family-name:var(--font-display)] text-3xl tracking-wide text-[var(--ink)]">
          Analytics
        </h2>
        <p>
          If Google Analytics is enabled for this site, Google may collect usage
          data such as pages viewed and approximate location derived from IP
          address. That helps us understand how the minigames are used.
        </p>

        <h2 className="pt-2 font-[family-name:var(--font-display)] text-3xl tracking-wide text-[var(--ink)]">
          Children’s privacy
        </h2>
        <p>
          SwishIt is a general-audience basketball site. It is not directed at
          children under 13, and we do not knowingly collect personal
          information from children under 13.
        </p>

        <h2 className="pt-2 font-[family-name:var(--font-display)] text-3xl tracking-wide text-[var(--ink)]">
          Changes
        </h2>
        <p>
          We may update this policy when our practices or products change. The
          “Last updated” date at the top of this page will change when we do.
        </p>

        <h2 className="pt-2 font-[family-name:var(--font-display)] text-3xl tracking-wide text-[var(--ink)]">
          Contact
        </h2>
        <p>
          Questions about this policy or SwishIt can be sent through the site
          owner’s AdSense / Search Console verified contact channels for{" "}
          <span className="text-[var(--ink)]">swishit.onrender.com</span>, or by
          visiting the{" "}
          <Link
            href="/about"
            className="font-bold text-[var(--orange-hot)] underline-offset-2 hover:underline"
          >
            About
          </Link>{" "}
          page for more information about the project.
        </p>
      </div>
    </main>
  );
}
