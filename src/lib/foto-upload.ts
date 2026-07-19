// Padrão de upload de foto reaproveitado em cadastro de profissional
// (US-04), cadastro de cliente e edição de "Meus dados" — mesma validação,
// um lugar só.

export const FOTO_TIPOS_ACEITOS = ["image/jpeg", "image/png"];
export const FOTO_TAMANHO_MAX_BYTES = 5 * 1024 * 1024;

export function validarFoto(file: File): string | null {
  if (!FOTO_TIPOS_ACEITOS.includes(file.type)) return "Foto precisa ser JPG ou PNG.";
  if (file.size > FOTO_TAMANHO_MAX_BYTES) return "Foto precisa ter até 5MB.";
  return null;
}

export function extensaoArquivo(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  const fromType = file.type.split("/").pop();
  return fromType ?? "bin";
}
