import type { Metadata } from "next";
import Script from "next/script";
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
        <Script
          defer
          data-domain="evaftermarket.com"
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
