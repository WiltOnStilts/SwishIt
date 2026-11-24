import HomeClient from "./home-client";
import { SITE_URL } from "@/lib/site";

const homeJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "SwishIt",
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      description:
        "Free basketball puzzles and drafting games you can play in the browser.",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "SwishIt",
      url: SITE_URL,
      description:
        "Free mobile-first basketball minigames: Undefeated, Detective, Superstar Studio, and Court Call.",
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-US",
    },
    {
      "@type": "ItemList",
      name: "SwishIt minigames",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Undefeated",
          url: `${SITE_URL}/undefeated`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Detective",
          url: `${SITE_URL}/detective`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Superstar Studio",
          url: `${SITE_URL}/superstar-studio`,
        },
        {
          "@type": "ListItem",
          position: 4,
          name: "Court Call",
          url: `${SITE_URL}/court-call`,
        },
      ],
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />
      <HomeClient />
    </>
  );
}
