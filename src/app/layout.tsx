import type { Metadata, Viewport } from "next";
import { Sora, Inter } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TabBarClient } from "@/components/tab-bar-client";
import { SplashScreen } from "@/components/splash-screen";
import { createClient } from "@/lib/supabase/server";
import { resolverPapel } from "@/lib/role";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Resolvido uma única vez aqui, no servidor, antes de qualquer HTML sair
  // — a tab bar recebe o papel já pronto via prop, nunca precisa descobrir
  // nada depois de montada no navegador. Isso torna o layout raiz dinâmico
  // (opta fora da otimização estática em toda página, inclusive as
  // públicas) — troca deliberada: corrige a classe inteira de bug de
  // corrida/redirecionamento indevido pra login, num app beta de baixo
  // tráfego onde isso pesa mais que a otimização perdida.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const papel = await resolverPapel(supabase, user);

  return (
    <html
      lang="pt-BR"
      className={`${sora.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <SplashScreen />
        <SiteHeader />
        <main className="flex-1 pb-16">{children}</main>
        <SiteFooter />
        <TabBarClient papel={papel} />
      </body>
    </html>
  );
}
