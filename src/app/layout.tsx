import type { Metadata, Viewport } from "next";
import { Sora, Inter } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TabBarClient } from "@/components/tab-bar-client";
import { SplashScreen } from "@/components/splash-screen";
import { createClient } from "@/lib/supabase/server";
import { resolverPapel } from "@/lib/role";
import { souAdmin } from "@/lib/admin";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// metadataBase é o que deixa a imagem de Open Graph abaixo resolver como
// URL absoluta (obrigatório pra crawler de WhatsApp/Instagram/LinkedIn
// buscar a imagem — path relativo sozinho não funciona fora do navegador).
const SITE_URL = "https://saudeagora.vercel.app";

const DESCRICAO = "Personal trainer, massagem e pilates com profissionais verificados no Rio de Janeiro.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "SaúdeAgora — Bem-estar perto de você",
  description: DESCRICAO,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SaúdeAgora",
  },
  // Preview de link (WhatsApp, Instagram, LinkedIn) — sem isso configurado,
  // o compartilhamento cai num preview quebrado/genérico, o que prejudica
  // a credibilidade antes mesmo da pessoa clicar. og-image.jpg é a hero.jpg
  // recortada em 1200x630 (ver scripts/process-images.mjs).
  openGraph: {
    title: "SaúdeAgora — Bem-estar perto de você",
    description: DESCRICAO,
    url: SITE_URL,
    siteName: "SaúdeAgora",
    locale: "pt_BR",
    type: "website",
    images: [{ url: "/images/og-image.jpg", width: 1200, height: 630, alt: "SaúdeAgora" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SaúdeAgora — Bem-estar perto de você",
    description: DESCRICAO,
    images: ["/images/og-image.jpg"],
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
  //
  // getSession() aqui, NÃO getUser(): getUser() sempre faz um round-trip de
  // rede pro servidor de auth do Supabase pra revalidar o token — correto
  // pra decisão de segurança, mas o layout raiz roda em TODA navegação
  // client-side (não só uma vez no login), então isso estava somando um
  // round-trip de rede extra a cada toque na tab bar (medido: 700ms–1.9s a
  // mais por navegação, causa real do "parece que não respondeu, toco de
  // novo" mesmo depois da correção da corrida original). getSession() lê o
  // token do cookie localmente, sem round-trip — suficiente aqui porque a
  // tab bar só decide qual link mostrar, não é fronteira de segurança; cada
  // página protegida continua fazendo sua própria checagem autoritativa
  // com getUser() antes de liberar qualquer ação real, isso não muda.
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  const autenticado = !!user;
  // Resolvidos em paralelo, mesmo raciocínio de perf do comentário acima
  // (getSession local, sem round-trip) — admin não é um papel (papel é só
  // profissional/cliente), é permissão à parte ligada à tabela `admins`
  // (ver lib/admin.ts). Uma conta pode ser puramente admin, sem nenhuma
  // das duas outras linhas — era exatamente essa combinação que a tab bar
  // tratava como "não reconhecido = deslogado" (Agenda/Perfil mandando
  // pra /login mesmo com sessão ativa), bug real relatado ao vivo.
  const [papel, isAdmin] = await Promise.all([
    resolverPapel(supabase, user),
    souAdmin(supabase, user),
  ]);

  return (
    <html
      lang="pt-BR"
      className={`${sora.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <SplashScreen />
        <SiteHeader autenticado={autenticado} />
        <main className="flex-1 pb-16">{children}</main>
        <SiteFooter />
        <TabBarClient papel={papel} autenticado={autenticado} isAdmin={isAdmin} />
      </body>
    </html>
  );
}
