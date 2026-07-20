import type { SupabaseClient, User } from "@supabase/supabase-js";

export type Papel = "profissional" | "cliente" | null;

// Fonte de verdade: user_metadata.role, gravado uma única vez no momento do
// cadastro/registrar (signUp, ver cadastro/actions.ts e registrar/actions.ts)
// — lido diretamente do que getUser() já retorna, sem consulta extra a
// professionals/clients no caminho comum. O fallback abaixo só cobre contas
// que existiam antes dessa mudança e ainda não passaram pelo backfill
// (migration 0018) ou qualquer conta criada por fora do fluxo normal de
// signUp — sempre roda no servidor, antes de qualquer HTML ser enviado;
// nunca é um estado assíncrono resolvido no navegador (era exatamente isso
// que causava a corrida na tab bar: papel descoberto depois da pessoa já
// estar logada, em vez de vir pronto junto da sessão).
export async function resolverPapel(
  supabase: SupabaseClient,
  user: User | null
): Promise<Papel> {
  if (!user) return null;

  const role = user.user_metadata?.role;
  if (role === "profissional" || role === "cliente") return role;

  const { data: professional } = await supabase
    .from("professionals")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (professional) return "profissional";

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  return client ? "cliente" : null;
}
