import type { Metadata } from "next";
import CourtCallClient from "./court-call-client";

export const metadata: Metadata = {
  title: "Court Call — 5-on-5 Arcade Basketball · SwishIt",
  description:
    "Tip off Court Call on SwishIt: pick any all-time NBA roster, lock your player, and play live 5-on-5 arcade basketball—pass, shoot, steal, and rebound with joystick or keyboard.",
  alternates: {
    canonical: "/court-call",
  },
  openGraph: {
    title: "Court Call — 5-on-5 Arcade Basketball · SwishIt",
    description:
      "All-time roster 5-on-5 arcade basketball. Pick your squad and tip off on SwishIt.",
    url: "/court-call",
  },
};

export default function CourtCallPage() {
  return <CourtCallClient />;
}
