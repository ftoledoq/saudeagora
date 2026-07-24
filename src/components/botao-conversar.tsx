import Link from "next/link";

// Um só componente pros 4 lugares que tinham esse botão implementado
// separado (minhas-reservas lista/detalhe, agenda lista/detalhe) — tinham
// divergido: lista de reservas e as duas telas de detalhe já usavam botão
// com contorno e ícone, mas a lista da Agenda do profissional ainda era só
// um link de texto sublinhado. Agora é o mesmo componente nos quatro.
export function BotaoConversar({
  bookingId,
  nome,
  className = "mt-3",
}: {
  bookingId: string;
  nome?: string;
  className?: string;
}) {
  return (
    <Link
      href={`/chat/${bookingId}`}
      className={`inline-flex items-center gap-1.5 rounded-full border border-primary px-4 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-light ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16v12H7l-3 3V4Z" />
      </svg>
      Conversar com {nome}
    </Link>
  );
}
