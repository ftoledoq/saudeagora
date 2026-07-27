import Link from "next/link";
import Image from "next/image";

const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// Estratégia é supply-first (sem profissional não há produto) — argumentos
// concretos, não genéricos, pro profissional decidir se vale a pena
// experimentar nesta fase. Movidos pra cá (antes viviam encaixados na
// landing) — mesmo conteúdo, agora com espaço de verdade pra explicar,
// em vez de competir por atenção com o funil de cliente.
const ARGUMENTOS = [
  {
    titulo: "0% de comissão nos primeiros 90 dias.",
    icone: (
      <svg {...iconProps}>
        <line x1="19" y1="5" x2="5" y2="19" />
        <circle cx="6.5" cy="6.5" r="2.5" />
        <circle cx="17.5" cy="17.5" r="2.5" />
      </svg>
    ),
  },
  {
    titulo: "Você define seu preço, seus horários e quem atende.",
    icone: (
      <svg {...iconProps}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="M8 15l2 2 4-4" />
      </svg>
    ),
  },
  {
    titulo: "Sem exclusividade. Sua agenda continua sendo sua.",
    icone: (
      <svg {...iconProps}>
        <line x1="4" y1="6" x2="20" y2="6" />
        <circle cx="9" cy="6" r="2" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <circle cx="15" cy="12" r="2" />
        <line x1="4" y1="18" x2="20" y2="18" />
        <circle cx="9" cy="18" r="2" />
      </svg>
    ),
  },
];

const PASSOS = [
  {
    numero: "1",
    titulo: "Cadastre-se",
    descricao: "Dados pessoais, o serviço que você oferece e os documentos que comprovam sua qualificação.",
  },
  {
    numero: "2",
    titulo: "Aprovação em até 24h úteis",
    descricao: "Análise manual, feita à mão — não é cadastro automático. Você acompanha o status por e-mail.",
  },
  {
    numero: "3",
    titulo: "Configure sua agenda",
    descricao: "Defina seus horários livres e comece a receber pedidos de clientes no seu bairro.",
  },
];

export default function SouProfissionalPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
        Pra profissionais
      </span>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Você cuida de gente. A gente cuida do resto.
      </h1>
      <p className="mt-3 max-w-xl text-lg leading-7 text-foreground/70">
        Personal trainer, massagem ou pilates — encha os horários vagos da sua agenda com clientes
        verificados no seu bairro, sem comissão nos primeiros 90 dias.
      </p>

      <div className="relative mt-8 h-56 w-full overflow-hidden rounded-2xl sm:h-72">
        <Image
          src="/images/profissional.jpg"
          alt="Profissional de bem-estar"
          fill
          sizes="(min-width: 768px) 768px, 100vw"
          className="object-cover"
        />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {ARGUMENTOS.map((item) => (
          <div key={item.titulo} className="rounded-2xl border border-border bg-white p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-primary">
              {item.icone}
            </span>
            <p className="mt-3 text-sm font-semibold leading-6 text-foreground">{item.titulo}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">Como funciona</h2>
      <div className="mt-6 flex flex-col gap-6">
        {PASSOS.map((passo) => (
          <div key={passo.numero} className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-display text-sm font-semibold text-white">
              {passo.numero}
            </span>
            <div>
              <p className="font-display text-base font-semibold">{passo.titulo}</p>
              <p className="mt-1 text-sm leading-6 text-foreground/70">{passo.descricao}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-border bg-primary-light p-6 text-center">
        <p className="font-display text-lg font-semibold">Pronto pra começar?</p>
        <p className="mt-1 text-sm text-foreground/70">Leva menos de 10 minutos pra se cadastrar.</p>
        <Link
          href="/cadastro"
          className="mt-4 inline-block rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          Quero me cadastrar como profissional
        </Link>
      </div>
    </div>
  );
}
