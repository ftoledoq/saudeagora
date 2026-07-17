import Link from "next/link";

const CATEGORIAS = [
  {
    nome: "Personal Trainer",
    descricao: "Treino individual, no seu horário e no seu endereço.",
  },
  {
    nome: "Massagem",
    descricao: "Relaxamento e terapia manual com quem entende do assunto.",
  },
  {
    nome: "Pilates",
    descricao: "Aulas individuais adaptadas ao seu ritmo e objetivo.",
  },
];

const CONFIANCA = [
  {
    titulo: "Cadastro verificado",
    descricao:
      "Todo profissional passa por aprovação manual antes de aparecer na busca.",
  },
  {
    titulo: "CREF conferido",
    descricao:
      "Personal trainers têm o registro profissional validado, com reverificação por validade.",
  },
  {
    titulo: "Avaliação real",
    descricao:
      "Todo atendimento concluído pode ser avaliado — histórico visível para quem procura.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      <section className="border-b border-border bg-primary-light">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 sm:py-24">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            Região piloto · vagas de teste
          </span>
          <h1 className="max-w-2xl font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
            Achamos o profissional de bem-estar certo, perto de você.
          </h1>
          <p className="max-w-xl text-lg leading-7 text-foreground/70">
            Personal trainer, massagem e pilates com profissionais
            verificados manualmente. Você escolhe pelo bairro, agenda em
            poucos passos e combina o pagamento direto com quem vai te
            atender.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/buscar"
              className="rounded-full bg-accent px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Buscar profissionais perto de você
            </Link>
            <Link
              href="/cadastro"
              className="rounded-full border border-primary px-6 py-3 text-center text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
            >
              Sou profissional, quero atender
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          O que você encontra por aqui
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {CATEGORIAS.map((categoria) => (
            <div
              key={categoria.nome}
              className="rounded-2xl border border-border bg-white p-6"
            >
              <h3 className="font-display text-lg font-semibold">
                {categoria.nome}
              </h3>
              <p className="mt-2 text-sm leading-6 text-foreground/70">
                {categoria.descricao}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Confiança em primeiro lugar
          </h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {CONFIANCA.map((item) => (
              <div key={item.titulo}>
                <h3 className="font-display text-base font-semibold text-primary">
                  {item.titulo}
                </h3>
                <p className="mt-2 text-sm leading-6 text-foreground/70">
                  {item.descricao}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
