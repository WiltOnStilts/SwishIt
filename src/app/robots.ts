import type { MetadataRoute } from "next";

const SITE = "https://swishit.onrender.com";

/** Explicit allow-all so Googlebot is not treated as blocked. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
      {
        userAgent: "Googlebot",
        allow: "/",
      },
      {
        userAgent: "Googlebot-Image",
        allow: "/",
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
