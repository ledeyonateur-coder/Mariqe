import type { Metadata, Viewport } from "next";
import { Archivo_Black, Bagel_Fat_One, Inter } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "@/styles/globals.css";
import { CartProvider } from "@/lib/cart";
import PhoneFrame from "@/components/PhoneFrame";
import CartWidget from "@/components/CartWidget";
import SiteWordmark from "@/components/SiteWordmark";

const displayFont = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const wordmarkFont = Bagel_Fat_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-wordmark",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Soleil — La collection arrive",
  description:
    "Soleil — vêtements modulables faits main, esprit pacific punk wave. Lever de soleil, compte à rebours, collection à venir.",
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#12141c",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${displayFont.variable} ${bodyFont.variable} ${wordmarkFont.variable}`}>
      <body>
        <CartProvider>
          <PhoneFrame>{children}</PhoneFrame>
          <SiteWordmark />
          <CartWidget />
        </CartProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
