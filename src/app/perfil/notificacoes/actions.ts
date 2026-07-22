"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function atualizarNotificacoes(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const receberEmail = formData.get("notificacoes_email") === "on";

  const [{ data: professional }, { data: client }] = await Promise.all([
    supabase.from("professionals").select("id").eq("user_id", user.id).maybeSingle(),
    supabase.from("clients").select("id").eq("user_id", user.id).maybeSingle(),
  ]);

  if (professional) {
    await supabase.from("professionals").update({ notificacoes_email: receberEmail }).eq("id", professional.id);
  } else if (client) {
    await supabase.from("clients").update({ notificacoes_email: receberEmail }).eq("id", client.id);
  }

  revalidatePath("/perfil/notificacoes");
}
