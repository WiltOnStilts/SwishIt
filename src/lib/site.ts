/** Canonical production origin used for metadata, sitemap, and absolute URLs. */
export const SITE_URL = "https://swishit.onrender.com";

/** Breadcrumb JSON-LD so Google treats game pages as children of the homepage hub. */
export function breadcrumbJsonLd(
  name: string,
  path: `/${string}`,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name,
        item: `${SITE_URL}${path}`,
      },
    ],
  };
}
