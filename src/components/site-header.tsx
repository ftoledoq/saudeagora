import Link from "next/link";
import { BrandMark } from "@/lib/brand-mark";
import { createClient } from "@/lib/supabase/server";

const NAV_LINKS = [
  { href: "/buscar", label: "Buscar profissionais" },
  { href: "/cadastro", label: "Sou profissional" },
];

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let temContaCliente = false;
  if (user) {
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    temContaCliente = !!client;
  }

  const navLinks = temContaCliente
    ? [...NAV_LINKS, { href: "/minhas-reservas", label: "Minhas reservas" }]
    : NAV_LINKS;

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <BrandMark size={20} />
          </span>
          <span className="font-display text-lg tracking-tight">
            <span className="font-bold">Saúde</span>
            <span className="font-medium text-foreground/70">Agora</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/buscar"
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          Agendar agora
        </Link>
      </div>
    </header>
  );
}
