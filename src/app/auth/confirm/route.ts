import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Ponto único de troca de "code" (PKCE) por sessão real — usado hoje só
// pelo link de redefinição de senha (esqueci-senha/actions.ts), mas
// deliberadamente genérico (lê "next" da própria URL) pra servir qualquer
// fluxo de auth por link no futuro (confirmação de e-mail, magic link) sem
// precisar de uma rota nova. Trocar o code só funciona aqui (Route Handler)
// e não direto na página de destino — Server Component não pode gravar
// cookie de sessão (ver comentário em lib/supabase/server.ts).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/esqueci-senha?erro=link_invalido`);
}
