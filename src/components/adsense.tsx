import Script from "next/script";

const ADSENSE_CLIENT = "ca-pub-6602128015512763";

/** Auto ads only. Do not mount this on game screens. */
export function AdSense() {
  return (
    <Script
      id="adsense-init"
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
