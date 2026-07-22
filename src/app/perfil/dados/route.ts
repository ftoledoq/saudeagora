import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Portabilidade/acesso (LGPD) — par natural do cancelamento de conta.
// Só dado que o próprio usuário já pode ler via RLS normal (own row/
// own bookings) — nenhuma consulta privilegiada, nenhum dado de outra
// pessoa.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const [{ data: professional }, { data: client }, { data: enderecos }] = await Promise.all([
    supabase.from("professionals").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("clients").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("addresses").select("*").eq("user_id", user.id),
  ]);

  let bookings: unknown[] = [];
  if (client) {
    const { data } = await supabase
      .from("bookings")
      .select("id, data_hora, status, valor, professional_id, service_id, address_id, created_at")
      .eq("cliente_id", client.id);
    bookings = data ?? [];
  } else if (professional) {
    const { data } = await supabase
      .from("bookings")
      .select("id, data_hora, status, valor, cliente_id, service_id, address_id, created_at")
      .eq("professional_id", professional.id);
    bookings = data ?? [];
  }

  const export_ = {
    gerado_em: new Date().toISOString(),
    conta: { email: user.email, criado_em: user.created_at },
    cadastro_profissional: professional ?? null,
    cadastro_cliente: client ?? null,
    enderecos_salvos: enderecos ?? [],
    agendamentos: bookings,
  };

  return new NextResponse(JSON.stringify(export_, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="saudeagora-meus-dados.json"',
    },
  });
}
