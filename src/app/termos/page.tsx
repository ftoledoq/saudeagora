import { redirect } from "next/navigation";

// Seção jurídica dividida em 3 páginas (Termos de Uso, Política de
// Privacidade, Como tratamos seus dados) — /termos sozinho vira um alias
// pro documento mais referenciado (checkbox de aceite no cadastro), pra
// não quebrar link antigo/salvo.
export default function TermosPage() {
  redirect("/termos/uso");
}
