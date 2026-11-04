import type { Metadata } from "next";
import SuperstarStudioPage from "./superstar-game";

export const metadata: Metadata = {
  title: "Superstar Studio — Build a Custom NBA Star · SwishIt",
  description:
    "Enter Superstar Studio on SwishIt: assign real players to seven attributes, then generate the career projection that follows from your custom star.",
  alternates: {
    canonical: "/superstar-studio",
  },
  openGraph: {
    title: "Superstar Studio — Build a Custom NBA Star · SwishIt",
    description:
      "Mix seven attributes from real NBA seasons and see the career that follows.",
    url: "/superstar-studio",
  },
};

export default function SuperstarStudioRoute() {
  return <SuperstarStudioPage />;
}
