"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { enviarMensagem } from "./actions";

type Mensagem = {
  id: string;
  remetente_tipo: "cliente" | "profissional";
  conteudo: string;
  created_at: string;
};

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export function ChatThread({
  bookingId,
  viewerTipo,
  outraParteNome,
  mensagensIniciais,
}: {
  bookingId: string;
  viewerTipo: "cliente" | "profissional";
  outraParteNome: string;
  mensagensIniciais: Mensagem[];
}) {
  const [mensagens, setMensagens] = useState<Mensagem[]>(mensagensIniciais);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const canal = supabase
      .channel(`messages:${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          const nova = payload.new as Mensagem;
          setMensagens((atual) =>
            atual.some((m) => m.id === nova.id) ? atual : [...atual, nova]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [bookingId]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const conteudo = texto.trim();
    if (!conteudo || enviando) return;

    setEnviando(true);
    setTexto("");
    const formData = new FormData();
    formData.set("booking_id", bookingId);
    formData.set("conteudo", conteudo);
    const inserida = await enviarMensagem(formData);
    if (inserida) {
      setMensagens((atual) =>
        atual.some((m) => m.id === inserida.id) ? atual : [...atual, inserida]
      );
    }
    setEnviando(false);
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {mensagens.length === 0 ? (
          <div className="mx-auto mt-8 max-w-xs rounded-2xl bg-primary-light p-4 text-center text-sm text-foreground/70">
            Agendamento confirmado! Use esse espaço para combinar detalhes
            com {outraParteNome}.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {mensagens.map((m) => {
              const enviadaPorMim = m.remetente_tipo === viewerTipo;
              return (
                <div
                  key={m.id}
                  className={`flex ${enviadaPorMim ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                      enviadaPorMim
                        ? "bg-primary text-white"
                        : "bg-white text-foreground border border-border"
                    }`}
                  >
                    <p className="whitespace-pre-line">{m.conteudo}</p>
                    <p
                      className={`mt-1 text-[10px] ${
                        enviadaPorMim ? "text-white/70" : "text-foreground/50"
                      }`}
                    >
                      {formatHora(m.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={fimRef} />
      </div>

      <p className="border-t border-border bg-white px-4 py-2 text-center text-xs text-foreground/50">
        Por segurança, mantenha a comunicação sobre este agendamento dentro
        do SaúdeAgora.
      </p>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-border bg-white px-4 py-3"
      >
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva uma mensagem..."
          // text-base (16px), não text-sm (14px): Safari/iOS dá zoom
          // automático ao focar em qualquer campo com font-size abaixo de
          // 16px — causa real do zoom relatado ao abrir o teclado no chat.
          className="flex-1 rounded-full border border-border bg-white px-4 py-2 text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={!texto.trim() || enviando}
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-40"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
