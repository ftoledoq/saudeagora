// Gera o card compartilhável inteiramente via Canvas API do navegador — sem
// html2canvas, sem serviço externo de renderização. O logo reaproveita o
// mesmo path SVG do BrandMark (src/lib/brand-mark.tsx) via Path2D, que
// entende sintaxe de path SVG nativamente — mesma geometria, sem duplicar
// desenho à mão.

const BRAND_MARK_PATH = "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z";
const PULSE_POINTS: [number, number][] = [
  [6.5, 9],
  [8.5, 9],
  [9.5, 6.3],
  [11, 11.7],
  [12.5, 7.5],
  [13.5, 9],
  [17.5, 9],
];

const WIDTH = 1080;
const HEIGHT = 1350;

const SERVICE_LABEL: Record<string, string> = {
  personal_trainer: "Personal Trainer",
  massagem: "Massagem",
  pilates: "Pilates",
};

function desenharLogo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const scale = size / 24;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const pin = new Path2D(BRAND_MARK_PATH);
  ctx.fillStyle = "#faf7f2";
  ctx.fill(pin);

  ctx.strokeStyle = "#0f6e5c";
  ctx.lineWidth = 1.1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  PULSE_POINTS.forEach(([px, py], i) => {
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  ctx.restore();
}

export async function gerarImagemCardAtendimento(params: {
  profissionalNome: string;
  servicoTipo: string;
  dataHoraIso: string;
}): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não suportado neste navegador.");

  // Fundo sólido na cor da marca — sem gradiente decorativo, consistente
  // com o resto da identidade visual do app.
  ctx.fillStyle = "#0f6e5c";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Selo de logo no topo
  const badgeSize = 96;
  const badgeX = WIDTH / 2 - badgeSize / 2;
  const badgeY = 120;
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize, 22);
  ctx.fill();
  desenharLogo(ctx, badgeX + badgeSize / 2 - 22, badgeY + badgeSize / 2 - 22, 44);

  // Wordmark
  ctx.textAlign = "center";
  ctx.fillStyle = "#faf7f2";
  ctx.font = "600 40px Sora, sans-serif";
  ctx.fillText("SaúdeAgora", WIDTH / 2, badgeY + badgeSize + 70);

  // Mensagem de destaque
  ctx.font = "700 56px Sora, sans-serif";
  ctx.fillStyle = "#ffffff";
  const linhas = ["Sessão concluída", "com sucesso! 💪"];
  let y = HEIGHT / 2 - 40;
  for (const linha of linhas) {
    ctx.fillText(linha, WIDTH / 2, y);
    y += 68;
  }

  // Nome do profissional + serviço
  ctx.font = "600 44px Sora, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fillText(params.profissionalNome, WIDTH / 2, y + 60);

  ctx.font = "400 32px Inter, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  const servicoLabel = SERVICE_LABEL[params.servicoTipo] ?? params.servicoTipo;
  ctx.fillText(servicoLabel, WIDTH / 2, y + 110);

  // Rodapé
  ctx.font = "400 28px Inter, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText("Personal trainer, massagem e pilates perto de você", WIDTH / 2, HEIGHT - 90);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Não foi possível gerar a imagem."));
    }, "image/png");
  });
}
