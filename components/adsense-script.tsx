"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

const googleAdSenseClientId = "ca-pub-7220106906849353";

function isContentPage(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/about" ||
    pathname === "/services" ||
    pathname === "/jobs" ||
    pathname.startsWith("/jobs/") ||
    pathname === "/career-guides" ||
    pathname.startsWith("/career-guides/")
  );
}

export function AdSenseScript() {
  const pathname = usePathname();

  if (!isContentPage(pathname)) {
    return null;
  }

  return (
    <Script
      id="werkly-adsense"
      async
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${googleAdSenseClientId}`}
      crossOrigin="anonymous"
    />
  );
}
