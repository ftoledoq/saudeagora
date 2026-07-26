export function normalizeTelefone(telefone: string): string {
  return telefone.replace(/\D/g, "").slice(0, 11);
}

// Formata progressivamente enquanto digita — nunca só no final, como
// formatCpf faz (CPF tem tamanho fixo, telefone não: fixo tem 10 dígitos,
// celular 11, então o traço só pode ser posicionado depois de saber quantos
// dígitos já foram digitados).
export function formatTelefone(telefone: string): string {
  const digits = normalizeTelefone(telefone);
  if (digits.length === 0) return "";

  const ddd = digits.slice(0, 2);
  if (digits.length <= 2) return `(${ddd}`;

  const resto = digits.slice(2);
  if (resto.length <= 4) return `(${ddd}) ${resto}`;

  // Celular (11 dígitos) tem 5 dígitos antes do traço (9XXXX-XXXX); fixo
  // (10 dígitos) tem 4 (XXXX-XXXX) — corta no tamanho certo conforme o
  // total já digitado, não um formato fixo só.
  const tamanhoPrimeiroBloco = digits.length > 10 ? 5 : 4;
  const primeiroBloco = resto.slice(0, tamanhoPrimeiroBloco);
  const segundoBloco = resto.slice(tamanhoPrimeiroBloco);
  return segundoBloco ? `(${ddd}) ${primeiroBloco}-${segundoBloco}` : `(${ddd}) ${primeiroBloco}`;
}
