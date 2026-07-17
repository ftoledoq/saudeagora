"use client";

import { useActionState, useState } from "react";
import { cadastrarProfissional, type CadastroFormState } from "./actions";
import { formatCpf } from "@/lib/cpf";
import type { Bairro } from "@/types/database";

const SERVICOS = [
  { value: "personal_trainer", label: "Personal Trainer" },
  { value: "massagem", label: "Massagem" },
  { value: "pilates", label: "Pilates" },
] as const;

const initialState: CadastroFormState = { error: null };

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";
const labelClass = "text-sm font-medium text-foreground/80";

export function CadastroForm({ bairros }: { bairros: Bairro[] }) {
  const [state, formAction, pending] = useActionState(cadastrarProfissional, initialState);
  const [tipo, setTipo] = useState<string>("personal_trainer");
  const [cpfDisplay, setCpfDisplay] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {state.error && (
        <div className="rounded-lg border border-error bg-error-light px-4 py-3 text-sm text-error">
          {state.error}
        </div>
      )}

      <Section title="Sua conta" description="Para você acompanhar o status do cadastro depois.">
        <Field label="E-mail" htmlFor="email">
          <input id="email" name="email" type="email" required className={inputClass} />
        </Field>
        <Field label="Senha" htmlFor="password">
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            className={inputClass}
          />
        </Field>
      </Section>

      <Section title="Dados pessoais">
        <Field label="Nome completo" htmlFor="nome">
          <input id="nome" name="nome" required className={inputClass} />
        </Field>
        <Field label="CPF" htmlFor="cpf">
          <input
            id="cpf"
            name="cpf"
            required
            value={cpfDisplay}
            onChange={(e) => setCpfDisplay(formatCpf(e.target.value))}
            placeholder="000.000.000-00"
            maxLength={14}
            className={inputClass}
          />
        </Field>
        <Field label="Telefone" htmlFor="telefone">
          <input
            id="telefone"
            name="telefone"
            required
            placeholder="(00) 00000-0000"
            className={inputClass}
          />
        </Field>
      </Section>

      <Section
        title="Sobre você"
        description="Opcional, mas ajuda o cliente a decidir — aparece no seu perfil público."
      >
        <Field label="Foto de perfil (JPG ou PNG, até 5MB)" htmlFor="foto">
          <input id="foto" name="foto" type="file" accept="image/jpeg,image/png" className={inputClass} />
        </Field>
        <Field label="Bio" htmlFor="bio">
          <textarea
            id="bio"
            name="bio"
            rows={4}
            placeholder="Conte sua experiência, especialidades e o que o cliente pode esperar da sessão."
            className={inputClass}
          />
        </Field>
      </Section>

      <Section title="Endereço base" description="De onde você atende os clientes.">
        <Field label="Rua" htmlFor="rua">
          <input id="rua" name="rua" required className={inputClass} />
        </Field>
        <Field label="Bairro" htmlFor="bairro_id">
          <select id="bairro_id" name="bairro_id" required className={inputClass} defaultValue="">
            <option value="" disabled>
              Selecione o bairro onde você atende
            </option>
            {Object.entries(
              bairros.reduce<Record<string, Bairro[]>>((acc, b) => {
                const key = `${b.cidade}/${b.estado}`;
                (acc[key] ??= []).push(b);
                return acc;
              }, {})
            ).map(([cidadeUf, lista]) => (
              <optgroup key={cidadeUf} label={cidadeUf}>
                {lista.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nome}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label="Ponto de referência (opcional)" htmlFor="referencia">
          <input id="referencia" name="referencia" className={inputClass} />
        </Field>
      </Section>

      <Section title="Atendimento" description="Você pode adicionar outros serviços depois de aprovado.">
        <fieldset className="flex flex-col gap-2">
          <legend className={labelClass}>Tipo de serviço</legend>
          <div className="flex flex-wrap gap-3">
            {SERVICOS.map((s) => (
              <label
                key={s.value}
                className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-light"
              >
                <input
                  type="radio"
                  name="tipo"
                  value={s.value}
                  checked={tipo === s.value}
                  onChange={() => setTipo(s.value)}
                  className="accent-primary"
                />
                {s.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Preço do atendimento (R$)" htmlFor="preco">
            <input
              id="preco"
              name="preco"
              type="number"
              min="1"
              step="0.01"
              required
              className={inputClass}
            />
          </Field>
          <Field label="Duração da sessão (min)" htmlFor="duracao_min">
            <input
              id="duracao_min"
              name="duracao_min"
              type="number"
              min="1"
              defaultValue={60}
              required
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Raio de atendimento (km)" htmlFor="raio_atendimento_km">
          <input
            id="raio_atendimento_km"
            name="raio_atendimento_km"
            type="number"
            min="1"
            required
            className={inputClass}
          />
        </Field>
        <Field label="Descrição do serviço (opcional)" htmlFor="descricao">
          <textarea id="descricao" name="descricao" rows={3} className={inputClass} />
        </Field>
      </Section>

      <Section
        title="Documentos"
        description="Analisados manualmente antes da aprovação — até 24h úteis."
      >
        <Field label="Documento de identidade (RG, CNH ou CPF)" htmlFor="identidade">
          <input
            id="identidade"
            name="identidade"
            type="file"
            accept="image/*,application/pdf"
            required
            className={inputClass}
          />
        </Field>
        {tipo === "personal_trainer" && (
          <>
            <Field label="Comprovante de registro no CREF" htmlFor="cref">
              <input
                id="cref"
                name="cref"
                type="file"
                accept="image/*,application/pdf"
                required
                className={inputClass}
              />
            </Field>
            <Field label="Validade do CREF" htmlFor="cref_validade">
              <input id="cref_validade" name="cref_validade" type="date" required className={inputClass} />
            </Field>
          </>
        )}
      </Section>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar cadastro"}
      </button>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-6">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-foreground/60">{description}</p>}
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
      </label>
      {children}
    </div>
  );
}
