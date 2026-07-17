export function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

export function formatCpf(cpf: string): string {
  const digits = normalizeCpf(cpf);
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function calcCheckDigit(base: string): number {
  let sum = 0;
  let weight = base.length + 1;
  for (const char of base) {
    sum += Number(char) * weight;
    weight--;
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

// Valida o dígito verificador do CPF — bloqueia sequências repetidas
// (000.000.000-00, 111.111.111-11 etc.), que passam em uma checagem só de
// tamanho mas nunca são CPFs reais.
export function isValidCpf(cpf: string): boolean {
  const digits = normalizeCpf(cpf);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const first9 = digits.slice(0, 9);
  const digit1 = calcCheckDigit(first9);
  const digit2 = calcCheckDigit(first9 + digit1);

  return digits === first9 + String(digit1) + String(digit2);
}
