import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: "%s | Chinese EV Aftermarket",
    default: "Chinese EV Aftermarket — Fault Codes, Updates & Guides",
  },
  description:
    "Fault code lookup, software updates, and owner guides for BYD, MG, Haval and other Chinese EVs in Australia, UK, UAE and Norway.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}

