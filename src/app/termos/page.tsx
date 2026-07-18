export default function TermosPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
        Termos e Políticas
      </span>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
        Termos de Uso e Política de Privacidade
      </h1>

      <div className="mt-4 rounded-2xl border border-error bg-error-light px-4 py-3 text-sm text-error">
        <strong>Texto placeholder, pendente de validação jurídica.</strong> O
        conteúdo abaixo descreve a estrutura pretendida do documento e não
        deve ser tratado como termo legal vigente até revisão por advogado
        antes do lançamento para usuários reais.
      </div>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-7 text-foreground/80">
        <section>
          <h2 className="font-display text-base font-semibold text-foreground">
            1. Sobre o SaúdeAgora
          </h2>
          <p className="mt-1">
            O SaúdeAgora é uma plataforma de intermediação entre clientes e
            profissionais autônomos de bem-estar (personal trainer, massagem,
            pilates). Nesta fase de validação, o SaúdeAgora não processa
            pagamentos nem participa da relação comercial entre cliente e
            profissional — o acordo de pagamento é combinado diretamente
            entre as partes.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-semibold text-foreground">
            2. Cadastro e verificação
          </h2>
          <p className="mt-1">
            Profissionais passam por aprovação manual antes de aparecer em
            buscas, incluindo verificação de documento de identidade e, para
            personal trainers, registro profissional (CREF). A aprovação não
            constitui garantia de qualidade do serviço prestado.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-semibold text-foreground">
            3. Responsabilidade
          </h2>
          <p className="mt-1">
            O SaúdeAgora atua como intermediário de conexão, não como
            empregador, contratante ou fiscalizador direto dos atendimentos.
            A relação de prestação de serviço é entre cliente e profissional.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-semibold text-foreground">
            4. Dados pessoais
          </h2>
          <p className="mt-1">
            Coletamos os dados necessários para operar a plataforma (nome,
            contato, endereço aproximado por bairro, documentos de
            verificação profissional). Não compartilhamos esses dados com
            terceiros para fins de publicidade.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-semibold text-foreground">
            5. Contato
          </h2>
          <p className="mt-1">
            Dúvidas sobre estes termos ou sobre seus dados: entre em contato
            pela tela de Ajuda, dentro do seu perfil.
          </p>
        </section>
      </div>
    </div>
  );
}
