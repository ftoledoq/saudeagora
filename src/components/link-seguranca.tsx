import { AJUDA_EMAIL } from "@/lib/contato";

// Risco de segurança física em atendimento domiciliar, identificado no PRD
// e nunca endereçado nesta fase — sem GPS/tempo real (fora de escopo,
// decisão já tomada), isso é o mínimo: acesso rápido a emergência e a um
// contato de suporte, visível só enquanto o atendimento está de fato
// acontecendo (status 'em_andamento'), pros dois lados (cliente e
// profissional).
export function LinkSeguranca() {
  return (
    <div className="mt-4 rounded-xl border border-border bg-white px-4 py-3 text-sm">
      <p className="font-medium text-foreground/80">Segurança</p>
      <div className="mt-1.5 flex flex-col gap-1">
        <a href="tel:192" className="text-primary hover:underline">
          Emergência médica (SAMU): 192
        </a>
        <a href="tel:193" className="text-primary hover:underline">
          Bombeiros: 193
        </a>
        <a href={`mailto:${AJUDA_EMAIL}`} className="text-primary hover:underline">
          Suporte SaúdeAgora
        </a>
      </div>
    </div>
  );
}
