import { LegalPageShell } from "@/components/legal-page-shell";

// Conteúdo espelha docs/SaudeAgora/03_juridico_dados/SaudeAgora_Termos_Uso_v2.md
// (v2, reestruturado) — não é texto jurídico validado, ver aviso no shell.
export default function TermosUsoPage() {
  return (
    <LegalPageShell eyebrow="Jurídico" titulo="Termos de Uso">
      <section className="rounded-2xl border border-border bg-white p-4">
        <h2 className="font-display text-base font-semibold text-foreground">
          Resumo simplificado
        </h2>
        <p className="mt-1 text-xs text-foreground/60">
          Para quem não vai ler o documento inteiro — mas o documento completo
          abaixo é o que vale.
        </p>
        <p className="mt-2">
          O SaúdeAgora conecta você a profissionais autônomos de bem-estar
          (personal trainer, massagem, pilates). Nós não prestamos o serviço
          de bem-estar — quem presta é o profissional, de forma independente.
          Nós verificamos cadastro e facilitamos o agendamento. Nesta fase de
          validação (beta), o pagamento é combinado diretamente entre você e
          o profissional, fora da plataforma. Você pode cancelar sua conta a
          qualquer momento. Seus dados são tratados conforme a LGPD, e você
          pode pedir acesso ou eliminação deles.
        </p>
      </section>

      <section>
        <h2 className="font-display text-base font-semibold text-foreground">1. Quem somos</h2>
        <p className="mt-1">
          SaúdeAgora — plataforma de intermediação tecnológica entre clientes
          e profissionais autônomos de bem-estar (personal trainer, massagem,
          pilates), operando nesta fase em região piloto no Brasil. (Razão
          social e CNPJ a incluir quando a empresa for formalizada.)
        </p>
      </section>

      <section>
        <h2 className="font-display text-base font-semibold text-foreground">
          2. O que oferecemos
        </h2>
        <p className="mt-1">
          Somos uma plataforma de intermediação tecnológica — não prestamos,
          nem somos responsáveis por prestar, os serviços de bem-estar em si.
          Conectamos você a profissionais autônomos independentes, que
          decidem livremente sua própria disponibilidade, preço e forma de
          atendimento. O SaúdeAgora verifica documentação e registro
          profissional (quando aplicável) antes da aprovação de cadastro, mas
          a relação de prestação do serviço é diretamente entre cliente e
          profissional.
        </p>
      </section>

      <section>
        <h2 className="font-display text-base font-semibold text-foreground">
          3. Sobre você (usuário)
        </h2>
        <p className="mt-1">
          Idade mínima de 18 anos para uso da plataforma. Você é responsável
          por manter seus dados de cadastro corretos e atualizados, e pela
          veracidade das informações fornecidas.
        </p>
      </section>

      <section>
        <h2 className="font-display text-base font-semibold text-foreground">
          4. Cadastro e verificação
        </h2>
        <p className="mt-1">
          Profissionais passam por aprovação manual antes de aparecerem em
          busca, incluindo verificação de documento de identidade e registro
          profissional (CREF, quando aplicável). Clientes se cadastram com
          dados básicos (nome, telefone, e-mail).
        </p>
      </section>

      <section>
        <h2 className="font-display text-base font-semibold text-foreground">
          5. Agendamento e pagamento (fase de validação)
        </h2>
        <p className="mt-1">
          Nesta fase, o SaúdeAgora não processa pagamento nem participa da
          relação comercial entre cliente e profissional — o acordo de
          pagamento é combinado diretamente entre as partes. O agendamento
          realizado pela plataforma é uma solicitação, sujeita a confirmação
          manual pelo profissional.
        </p>
      </section>

      <section>
        <h2 className="font-display text-base font-semibold text-foreground">
          6. Cancelamento e no-show
        </h2>
        <p className="mt-1">
          Regras de cancelamento e registro de não comparecimento conforme
          especificado na plataforma no momento do agendamento — sujeitas a
          alteração conforme a plataforma evolui além desta fase de
          validação.
        </p>
      </section>

      <section>
        <h2 className="font-display text-base font-semibold text-foreground">
          7. Conteúdo gerado pelo usuário
        </h2>
        <p className="mt-1">
          Ao publicar avaliação, comentário, ou mensagem de chat na
          plataforma, você concede ao SaúdeAgora licença para armazenar,
          exibir e processar esse conteúdo dentro da plataforma, para os fins
          de funcionamento do serviço (ex: exibir sua avaliação no perfil
          público do profissional). Você continua responsável pelo conteúdo
          que publica — conteúdo ofensivo, discriminatório ou falso pode ser
          removido e pode levar à suspensão de conta.
        </p>
      </section>

      <section>
        <h2 className="font-display text-base font-semibold text-foreground">
          8. Seus direitos sobre seus dados (LGPD)
        </h2>
        <p className="mt-1">
          Você pode, a qualquer momento: solicitar acesso aos dados que temos
          sobre você (Perfil → Baixar meus dados), solicitar correção de
          dados incorretos, e solicitar cancelamento/eliminação de sua conta
          (Perfil → Cancelar minha conta). Cancelamento de conta anonimiza
          seus dados pessoais identificáveis; registros de agendamento podem
          ser preservados por obrigação legal/auditoria, conforme detalhado
          na Política de Privacidade.
        </p>
      </section>

      <section>
        <h2 className="font-display text-base font-semibold text-foreground">
          9. Garantia e limites de responsabilidade
        </h2>
        <p className="mt-1">
          O serviço é oferecido &quot;como está&quot; e &quot;conforme
          disponível&quot;. O SaúdeAgora não garante a disponibilidade,
          qualidade técnica, ou resultado do serviço prestado pelo
          profissional — a relação de prestação é entre cliente e
          profissional. O SaúdeAgora se compromete com o processo de
          verificação de cadastro declarado, não com o resultado do
          atendimento em si.
        </p>
      </section>

      <section>
        <h2 className="font-display text-base font-semibold text-foreground">
          10. Como você será notificado
        </h2>
        <p className="mt-1">
          Podemos te avisar sobre mudanças importantes por notificação no
          app, e-mail, ou outro canal informado no seu cadastro.
        </p>
      </section>

      <section>
        <h2 className="font-display text-base font-semibold text-foreground">
          11. Disposições gerais
        </h2>
        <p className="mt-1">
          Se qualquer parte destes Termos for considerada inválida, o
          restante continua em vigor. Estes Termos representam o acordo
          completo entre você e o SaúdeAgora sobre o uso da plataforma. Foro:
          a definir conforme domicílio da empresa quando formalizada.
        </p>
      </section>
    </LegalPageShell>
  );
}
