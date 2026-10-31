import type { MetadataRoute } from "next";

const SITE = "https://swishit.onrender.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE}/undefeated`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE}/superstar-studio`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE}/detective`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
<<<<<<< HEAD
      url: `${SITE}/court-call`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
=======
>>>>>>> 6d0891f8f1a9a48321d0b3aed0941cbdc057917e
      url: `${SITE}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
