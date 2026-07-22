"use client";

// Confirmação nativa antes de disparar uma ação destrutiva de verdade
// (cancelamento de conta) — sem isso, um toque acidental no item de menu
// já executaria a ação irreversível.
export function ConfirmarAcaoButton({
  mensagemConfirmacao,
  className,
  children,
}: {
  mensagemConfirmacao: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(mensagemConfirmacao)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
