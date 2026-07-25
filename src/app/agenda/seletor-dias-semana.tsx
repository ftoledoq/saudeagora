"use client";

import { useState } from "react";

// Bug real encontrado em teste: o indicador visual de dia selecionado
// dependia da variante has-[:checked] do Tailwind, que não estava gerando
// nenhuma regra CSS neste build (confirmado inspecionando o stylesheet
// compilado — zero regras :has, apesar do seletor em si funcionar via
// `label.matches(':has(:checked)')`). Substituído por estado React
// explícito, que não depende de nenhuma engine CSS — os checkboxes
// continuam nativos e com name="dias", então o form comum
// (action={salvarPadraoRecorrente}) continua funcionando igual.
export function SeletorDiasSemana({
  ordemExibicao,
  abreviacoes,
  diasIniciais,
}: {
  ordemExibicao: number[];
  abreviacoes: Record<number, string>;
  // Pra edição de um grupo existente — o componente pai deve remontar
  // este componente com uma `key` diferente ao trocar de grupo (ver
  // PadraoSemanalManager), já que o estado inicial só é lido uma vez.
  diasIniciais?: number[];
}) {
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set(diasIniciais ?? []));

  function alternar(dia: number) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(dia)) novo.delete(dia);
      else novo.add(dia);
      return novo;
    });
  }

  return (
    <div className="mt-2 flex gap-2">
      {ordemExibicao.map((dia) => {
        const marcado = selecionados.has(dia);
        return (
          <label
            key={dia}
            className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border text-sm font-semibold transition-colors ${
              marcado ? "border-primary bg-primary text-white" : "border-border text-foreground"
            }`}
          >
            <input
              type="checkbox"
              name="dias"
              value={dia}
              checked={marcado}
              onChange={() => alternar(dia)}
              className="sr-only"
            />
            {abreviacoes[dia]}
          </label>
        );
      })}
    </div>
  );
}
