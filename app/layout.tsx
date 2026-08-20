import type { Metadata, Viewport } from "next";
import { Archivo_Black, Fredoka, Inter } from "next/font/google";
import "@/styles/globals.css";
import { CartProvider } from "@/lib/cart";
import PhoneFrame from "@/components/PhoneFrame";
import CartWidget from "@/components/CartWidget";

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

const wordmarkFont = Fredoka({
  subsets: ["latin"],
  weight: "600",
  variable: "--font-wordmark",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mariqe — La collection arrive",
  description:
    "Mariqe — vêtements modulables faits main, esprit pacific punk wave. Lever de soleil, compte à rebours, collection à venir.",
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
          <CartWidget />
        </CartProvider>
      </body>
    </html>
  );
}
