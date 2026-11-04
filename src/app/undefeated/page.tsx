import type { Metadata } from "next";
import UndefeatedGame from "./undefeated-game";

export const metadata: Metadata = {
  title: "Undefeated — Draft an All-Time Lineup · SwishIt",
  description:
    "Play Undefeated on SwishIt: spin a year and team, draft a starting five plus a sixth man, then simulate a season against all-time NBA squads.",
  alternates: {
    canonical: "/undefeated",
  },
  openGraph: {
    title: "Undefeated — Draft an All-Time Lineup · SwishIt",
    description:
      "Spin a year and team, draft your five, and run the season against history.",
    url: "/undefeated",
  },
};

export default function UndefeatedPage() {
  return <UndefeatedGame />;
}
