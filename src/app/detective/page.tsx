import type { Metadata } from "next";
import DetectiveGame from "./detective-game";

export const metadata: Metadata = {
  title: "Detective — Daily NBA Connections · SwishIt",
  description:
    "Play Detective, SwishIt’s daily NBA Connections puzzle. Group sixteen basketball names into four hidden links, track your streak, and chase a score out of 99. New board every midnight ET.",
  alternates: {
    canonical: "/detective",
  },
  openGraph: {
    title: "Detective — Daily NBA Connections · SwishIt",
    description:
      "Daily NBA Connections on SwishIt. Find four groups of four, protect your streak, and score out of 99.",
    url: "/detective",
  },
};

export default function DetectivePage() {
  return <DetectiveGame />;
}
