import { LegalPageShell } from "@/components/legal-page-shell";

// Conteúdo consolidado a partir de docs/SaudeAgora/03_juridico_dados/
// SaudeAgora_RIPD.md — sem doc dedicado de Política de Privacidade ainda,
// então esta página reaproveita o que já foi decidido/mapeado ali, sem
// inventar cláusula que não foi discutida no RIPD.
export default function PoliticaPrivacidadePage() {
  return (
    <LegalPageShell eyebrow="Jurídico" titulo="Política de Privacidade">
      <section>
        <h2 className="font-display text-base font-semibold text-foreground">
          Que dados coletamos
        </h2>
        <p className="mt-1">
          Dados de cadastro (nome, telefone, e-mail), endereço aproximado por
          bairro (não endereço exato geocodificado), foto de perfil
          (opcional), e — para profissionais — documento de identidade e
          registro profissional (CREF, quando aplicável) usados só para
          verificação de cadastro.
        </p>
      </section>

      <section>
        <h2 className="font-display text-base font-semibold text-foreground">
          Para que usamos
        </h2>
        <p className="mt-1">
          Operar a busca e o agendamento, verificar cadastro de profissional,
          viabilizar o chat entre cliente e profissional de um agendamento
          confirmado, e enviar e-mails operacionais sobre seus próprios
          agendamentos (você pode desativar isso em Perfil → Notificações).
          Não usamos seus dados para publicidade nem vendemos dados a
          terceiros.
        </p>
      </section>

      <section>
        <h2 className="font-display text-base font-semibold text-foreground">
          Por quanto tempo guardamos
        </h2>
        <p className="mt-1">
          O prazo exato de retenção ainda está em definição formal (avaliação
          jurídica/contábil pendente, registrada no RIPD da plataforma) —
          nesta fase, dados de agendamento não são apagados por padrão,
          mesmo após cancelamento de conta, para preservar histórico de
          auditoria. Ao cancelar sua conta, seus dados diretamente
          identificáveis (nome, e-mail, telefone, foto) são substituídos por
          um registro anônimo — o histórico de agendamento em si permanece,
          sem apontar mais para você.
        </p>
      </section>

      <section>
        <h2 className="font-display text-base font-semibold text-foreground">
          Com quem compartilhamos
        </h2>
        <p className="mt-1">
          Só com os operadores técnicos necessários para o app funcionar —
          ver a página &quot;Como tratamos seus dados&quot;, no menu Jurídico.
          Nunca vendemos ou compartilhamos dados para fins de publicidade de
          terceiros.
        </p>
      </section>

      <section>
        <h2 className="font-display text-base font-semibold text-foreground">
          Seus direitos
        </h2>
        <p className="mt-1">
          Acesso: Perfil → Baixar meus dados, gera um export com o que temos
          sobre você. Eliminação/anonimização: Perfil → Cancelar minha conta.
          Correção: Perfil → Meus dados. Qualquer outra dúvida sobre
          tratamento de dados: pela tela de Ajuda, dentro do seu perfil.
        </p>
      </section>
    </LegalPageShell>
  );
}
