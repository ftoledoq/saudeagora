// Tipos alinhados ao DER formal (docs/SaudeAgora/01_tecnico/SaudeAgora_DER_Formal.md),
// recortados para o escopo do beta enxuto (docs/SaudeAgora/00_produto/SaudeAgora_Beta_Escopo_Reduzido.md).
// Fora desta fase, portanto ausentes aqui: Payment, Payout, PayoutBooking, Message.

export type ProfessionalStatus =
  | "pendente"
  | "aprovado"
  | "recusado"
  | "bloqueado"
  | "suspenso";

export type DocumentTipo = "identidade" | "cref" | "outro";
export type DocumentStatus = "pendente" | "aprovado" | "recusado";

export type ServiceTipo = "personal_trainer" | "massagem" | "pilates";

export type BookingStatus =
  | "solicitado"
  | "confirmado"
  | "recusado"
  | "concluido"
  | "cancelado_cliente"
  | "cancelado_profissional"
  | "no_show_cliente"
  | "no_show_profissional";

export type AuditAutorTipo = "user" | "professional" | "admin" | "sistema";

export interface Client {
  id: string;
  user_id: string;
  nome: string;
  telefone: string;
  email: string;
  created_at: string;
}

// Coordenada nesta fase vem do bairro (tabela fixa de referência da região
// piloto), não de geocodificação por endereço — por isso não há coluna
// geography aqui, diferente do DER completo. bairro é FK para a tabela fixa
// de referência (Bairro), não texto livre — necessário pra busca (US-03)
// não depender de digitação exata do profissional.
export interface Bairro {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
  latitude: number;
  longitude: number;
}

export interface Address {
  id: string;
  user_id: string | null;
  rua: string;
  bairro_id: string;
  referencia: string | null;
}

export interface Professional {
  id: string;
  nome: string;
  cpf: string;
  endereco_base_id: string;
  status: ProfessionalStatus;
  raio_atendimento_km: number;
  preco_base: number;
  bio: string | null;
  foto_storage_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalDocument {
  id: string;
  professional_id: string;
  tipo: DocumentTipo;
  storage_key: string;
  status: DocumentStatus;
  validade: string | null;
}

export interface Service {
  id: string;
  professional_id: string;
  tipo: ServiceTipo;
  preco: number;
  duracao_min: number;
  descricao: string | null;
}

export interface Availability {
  id: string;
  professional_id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  status: "livre" | "bloqueado";
}

export interface Booking {
  id: string;
  cliente_id: string;
  professional_id: string;
  service_id: string;
  address_id: string;
  data_hora: string;
  status: BookingStatus;
  valor: number;
}

export interface Review {
  id: string;
  booking_id: string;
  nota: 1 | 2 | 3 | 4 | 5;
  comentario: string | null;
  resposta_profissional: string | null;
}

export interface AuditLog {
  id: string;
  entidade: string;
  entidade_id: string;
  acao: string;
  autor_tipo: AuditAutorTipo;
  autor_id: string | null;
  detalhe: Record<string, unknown> | null;
  created_at: string;
}
