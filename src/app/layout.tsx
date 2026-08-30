import type { Metadata } from "next";
import { Nunito, Fredoka } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gramatek | Matuto Habang Naglalaro!",
  description: "Isang masayang platform kung saan natututo ang mga mag-aaral ng Filipino sa pamamagitan ng mga laro.",
  icons: {
    icon: '/icon.svg',
  },
};

import { Providers } from "@/components/Providers";
import { NavigationProgressBar } from "@/components/NavigationProgressBar";
import { Suspense } from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunito.variable} ${fredoka.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <Providers>
          <Suspense fallback={null}>
            <NavigationProgressBar />
          </Suspense>
          {children}
        </Providers>
      </body>
    </html>
  );
}
