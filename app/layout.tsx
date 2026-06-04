import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import "./globals.css";
import { BASE_URL } from "@/lib/config";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: {
    template: "%s | EVAftermarket",
    default: "EVAftermarket — Fault Codes, Updates & Guides for Chinese EVs",
  },
  description:
    "Fault code lookup, software updates, and owner guides for BYD, MG, Haval and other Chinese EVs in Australia, UK, UAE and Norway.",
  metadataBase: new URL(BASE_URL),
  openGraph: {
    siteName: "EVAftermarket",
    locale: "en_AU",
    type: "website",
  },
  twitter: {
    card: "summary",
    site: "@evaftermarket",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700&family=JetBrains+Mono:wght@500;700&family=DM+Serif+Display:ital@0;1&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <JsonLd
          schema={{
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'EVAftermarket',
            url: BASE_URL,
            logo: `${BASE_URL}/logo.png`,
            sameAs: [],
            description: 'Fault codes, charging guides, and owner experiences for Chinese EVs in Australia and beyond.',
          }}
        />
        {children}
        <footer className="site-footer">
          <div className="site-footer-inner">
            <span>© {new Date().getFullYear()} EVAftermarket</span>
            <Link href="/privacy" className="footer-link">Privacy Policy</Link>
            <Link href="/contact" className="footer-link">Contact</Link>
          </div>
        </footer>
        <Script
          defer
          data-domain="evaftermarket.io"
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
