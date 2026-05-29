import type { Metadata } from "next";
import "./globals.css";
import { BASE_URL } from "@/lib/config";

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
      <body>{children}</body>
    </html>
  );
}
