import type { Metadata, Viewport } from "next";
import { Sora, Inter } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TabBarClient } from "@/components/tab-bar-client";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SaúdeAgora — Bem-estar perto de você",
  description:
    "Encontre e agende personal trainer, massagem e pilates com profissionais verificados na sua região.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SaúdeAgora",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f6e5c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${sora.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <SiteHeader />
        <main className="flex-1 pb-16">{children}</main>
        <SiteFooter />
        <TabBarClient />
      </body>
    </html>
  );
}
