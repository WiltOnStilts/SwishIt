import type { Metadata, Viewport } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Bebas_Neue, Fraunces, Manrope } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const display = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

const cozy = Fraunces({
  subsets: ["latin"],
  style: ["italic"],
  axes: ["SOFT", "WONK"],
  variable: "--font-cozy",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "SwishIt — Basketball Minigames",
  description:
    "Free mobile-first basketball minigames: Undefeated all-time drafts, Detective daily NBA Connections, Superstar Studio career builds, and Court Call 5-on-5 arcade play.",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [{ url: "/logo.png", type: "image/png", sizes: "512x512" }],
  },
  openGraph: {
    title: "SwishIt — Basketball Minigames",
    description:
      "Free basketball puzzles and drafting games you can play in the browser—no account required.",
    url: "/",
    siteName: "SwishIt",
    type: "website",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "SwishIt" }],
  },
  verification: {
    google: "VINL0ey_H5eW7kcCfmRzVscaNmCQ9fgCdd13aQzC57w",
  },
  other: {
    "google-adsense-account": "ca-pub-6602128015512763",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "SwishIt",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description:
    "Free basketball puzzles and drafting games you can play in the browser.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0c0a09",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${cozy.variable} h-full`}
    >
      <body className="flex min-h-full flex-col antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        {children}
        <SiteFooter />
        {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
      </body>
    </html>
  );
}
