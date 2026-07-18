import { createClient } from "@/lib/supabase/server";
import { TabBarClient } from "./tab-bar-client";

export async function TabBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let agendaHref = "/login?next=/agenda";
  let perfilHref = "/login?next=/perfil";

  if (user) {
    perfilHref = "/perfil";

    const { data: professional } = await supabase
      .from("professionals")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (professional) {
      agendaHref = "/agenda";
    } else {
      const { data: client } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      agendaHref = client ? "/minhas-reservas" : "/login?next=/minhas-reservas";
    }
  }

  const items = [
    { href: "/buscar", label: "Buscar", icon: "buscar" as const },
    { href: agendaHref, label: "Agenda", icon: "agenda" as const },
    { href: perfilHref, label: "Perfil", icon: "perfil" as const },
  ];

  return <TabBarClient items={items} />;
}
