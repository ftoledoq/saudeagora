import { LegalPageShell } from "@/components/legal-page-shell";

// Lista real dos operadores técnicos que processam dado do usuário — não é
// decoração, é a prática de transparência recomendada pela LGPD (art. 9,
// VI): informar quem mais tem acesso ao dado, mesmo que só como processador
// técnico (não como terceiro que usa o dado pra fins próprios).
const OPERADORES = [
  {
    nome: "Supabase",
    finalidade: "Banco de dados, autenticação (login/senha) e armazenamento de arquivos (fotos, documentos)",
    dados: "Todo dado de cadastro, agendamento e arquivo enviado passa por aqui — é a infraestrutura principal do app",
  },
  {
    nome: "Resend",
    finalidade: "Envio de e-mails operacionais (novo pedido, confirmação, recusa de agendamento)",
    dados: "Seu e-mail e o conteúdo da notificação — só dispara pra ações que envolvem você diretamente",
  },
  {
    nome: "OpenStreetMap / Nominatim",
    finalidade: "Exibição do mapa de busca e, se você usar, conversão de \"minha localização\" em cidade/bairro",
    dados: "Coordenadas de latitude/longitude do seu dispositivo, só quando você aciona \"Usar minha localização\" — nunca automático",
  },
];

export default function ComoTratamosDadosPage() {
  return (
    <LegalPageShell eyebrow="Jurídico" titulo="Como tratamos seus dados">
      <p>
        Listamos aqui os operadores técnicos externos que processam algum
        dado seu pra fazer o app funcionar — nenhum deles usa seu dado pra
        fins próprios (publicidade, revenda), só executam a função técnica
        descrita abaixo, contratada pelo SaúdeAgora.
      </p>

      <div className="flex flex-col gap-4">
        {OPERADORES.map((op) => (
          <div key={op.nome} className="rounded-2xl border border-border bg-white p-4">
            <h2 className="font-display text-base font-semibold text-foreground">{op.nome}</h2>
            <p className="mt-1 text-foreground/70">
              <strong className="text-foreground">Para quê:</strong> {op.finalidade}
            </p>
            <p className="mt-1 text-foreground/70">
              <strong className="text-foreground">Dado envolvido:</strong> {op.dados}
            </p>
          </div>
        ))}
      </div>

      <p className="text-xs text-foreground/50">
        Esta lista é atualizada conforme o app muda de fornecedor técnico —
        se um operador novo passar a processar dado de usuário, ele entra
        aqui também.
      </p>
    </LegalPageShell>
  );
}
