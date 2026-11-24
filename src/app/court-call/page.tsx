import type { Metadata } from "next";
import CourtCallClient from "./court-call-client";
import { breadcrumbJsonLd } from "@/lib/site";

export const metadata: Metadata = {
  title: "Court Call — Blacktop 1v1 to 5v5 · SwishIt",
  description:
    "Tip off Court Call on SwishIt: outdoor blacktop basketball from 1v1 to 5v5. Pick any all-time NBA roster, lock your player, and play arcade pass, shoot, steal, and rebound.",
  alternates: {
    canonical: "/court-call",
  },
  openGraph: {
    title: "Court Call — Blacktop 1v1 to 5v5 · SwishIt",
    description:
      "Street-park basketball with all-time rosters. Choose 1v1 through 5v5 and tip off on SwishIt.",
    url: "/court-call",
  },
};

export default function CourtCallPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd("Court Call", "/court-call")),
        }}
      />
      <CourtCallClient />
    </>
  );
}
