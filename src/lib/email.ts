import { Resend } from "resend";

const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Falha de e-mail nunca deve derrubar o fluxo que a disparou (criar
// agendamento, confirmar, recusar) — só regista no log do servidor.
export async function enviarEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY não configurada — e-mail não enviado:", subject);
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from: FROM, to, subject, text });
    if (error) console.error("Falha ao enviar e-mail:", error.message);
  } catch (err) {
    console.error("Falha ao enviar e-mail:", err);
  }
}

export function avisarNovoPedido({
  professionalEmail,
  clienteNome,
}: {
  professionalEmail: string;
  clienteNome: string;
}) {
  return enviarEmail({
    to: professionalEmail,
    subject: "Novo pedido de agendamento",
    text: `Você tem um novo pedido de agendamento de ${clienteNome}. Entre no SaúdeAgora para confirmar: ${APP_URL}/agenda`,
  });
}

export function avisarPedidoConfirmado({
  clienteEmail,
  professionalNome,
}: {
  clienteEmail: string;
  professionalNome: string;
}) {
  return enviarEmail({
    to: clienteEmail,
    subject: "Seu agendamento foi confirmado",
    text: `${professionalNome} confirmou seu pedido de agendamento. Veja os detalhes no SaúdeAgora: ${APP_URL}`,
  });
}

export function avisarPedidoRecusado({
  clienteEmail,
  professionalNome,
}: {
  clienteEmail: string;
  professionalNome: string;
}) {
  return enviarEmail({
    to: clienteEmail,
    subject: "Seu pedido de agendamento foi recusado",
    text: `${professionalNome} não pôde confirmar seu pedido dessa vez. Busque outro profissional no SaúdeAgora: ${APP_URL}/buscar`,
  });
}
