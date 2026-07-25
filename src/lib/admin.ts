import type { SupabaseClient, User } from "@supabase/supabase-js";

// Espelha resolverPapel (src/lib/role.ts): admin não é um "papel" (papel é
// só profissional/cliente, mutuamente exclusivos e ligados a uma linha em
// professionals/clients) — é uma permissão à parte, ligada à tabela
// `admins` (migration 0002). Uma conta pode ser puramente admin, sem
// nenhuma das duas outras linhas — foi exatamente essa combinação que
// quebrou a tab bar (tratada como "não reconhecido = deslogado").
export async function souAdmin(supabase: SupabaseClient, user: User | null): Promise<boolean> {
  if (!user) return false;
  const { data } = await supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  return !!data;
}
