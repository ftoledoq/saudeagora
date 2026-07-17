function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

// Fallback padrão para profissional sem foto — não é substituído pela foto
// quando ela existe, os dois convivem (photoUrl ausente = mostra iniciais).
export function Avatar({
  nome,
  photoUrl,
  size = 96,
}: {
  nome: string;
  photoUrl?: string | null;
  size?: number;
}) {
  if (photoUrl) {
    return (
      // URL assinada expira e muda a cada render — não dá pra usar
      // next/image (precisa de domínio/remotePattern fixo).
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={nome}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full bg-primary font-display font-semibold text-background"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {iniciais(nome)}
    </div>
  );
}
