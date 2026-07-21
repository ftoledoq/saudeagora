// Gera o card compartilhável inteiramente via Canvas API do navegador — sem
// html2canvas, sem serviço externo de renderização. O logo reaproveita o
// mesmo path SVG do BrandMark (src/lib/brand-mark.tsx) via Path2D, que
// entende sintaxe de path SVG nativamente — mesma geometria, sem duplicar
// desenho à mão.
//
// A folha de compartilhamento continua sendo a nativa do sistema
// (src/components/share-card-button.tsx, Web Share API) — este arquivo só
// gera a imagem, nunca constrói UI de compartilhamento própria.

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

  // Gradiente diagonal na própria paleta (teal → teal mais escuro), não um
  // gradiente decorativo genérico — profundidade sem sair da identidade.
  const fundo = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  fundo.addColorStop(0, "#12836d");
  fundo.addColorStop(1, "#0a4f42");
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Brilho radial suave em coral (accent) atrás do selo — único uso de
  // accent aqui, dá destaque ao ícone sem virar um card garrido.
  const glow = ctx.createRadialGradient(WIDTH / 2, 300, 20, WIDTH / 2, 300, 260);
  glow.addColorStop(0, "rgba(255,107,74,0.35)");
  glow.addColorStop(1, "rgba(255,107,74,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Selo de logo no topo — maior e com anel sutil, mais destaque que a
  // versão anterior (badge translúcido simples).
  const badgeSize = 128;
  const badgeX = WIDTH / 2 - badgeSize / 2;
  const badgeY = 140;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize, 30);
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize, 30);
  ctx.stroke();
  desenharLogo(ctx, badgeX + badgeSize / 2 - 28, badgeY + badgeSize / 2 - 28, 56);

  // Wordmark
  ctx.textAlign = "center";
  ctx.fillStyle = "#faf7f2";
  ctx.font = "600 42px Sora, sans-serif";
  ctx.fillText("SaúdeAgora", WIDTH / 2, badgeY + badgeSize + 76);

  // Mensagem de destaque
  ctx.font = "800 62px Sora, sans-serif";
  ctx.fillStyle = "#ffffff";
  const linhas = ["Sessão concluída", "com sucesso! 💪"];
  let y = HEIGHT / 2 - 30;
  for (const linha of linhas) {
    ctx.fillText(linha, WIDTH / 2, y);
    y += 74;
  }

  // Divisor decorativo — três pontos, reforça o "respiro" entre a
  // mensagem e os detalhes do atendimento sem precisar de mais texto.
  y += 30;
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.arc(WIDTH / 2 + i * 22, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  y += 60;

  // Nome do profissional
  ctx.font = "700 48px Sora, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(params.profissionalNome, WIDTH / 2, y);

  // Serviço como pill em coral — mesmo peso visual que a tag de serviço
  // usada no resto do app (bg-primary-light/accent), não texto solto.
  y += 56;
  const servicoLabel = SERVICE_LABEL[params.servicoTipo] ?? params.servicoTipo;
  ctx.font = "600 30px Inter, sans-serif";
  const larguraTexto = ctx.measureText(servicoLabel).width;
  const pillPaddingX = 32;
  const pillWidth = larguraTexto + pillPaddingX * 2;
  const pillHeight = 60;
  ctx.fillStyle = "#ff6b4a";
  ctx.beginPath();
  ctx.roundRect(WIDTH / 2 - pillWidth / 2, y, pillWidth, pillHeight, pillHeight / 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(servicoLabel, WIDTH / 2, y + pillHeight / 2 + 10);

  // Rodapé
  ctx.font = "400 28px Inter, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.fillText("Personal trainer, massagem e pilates perto de você", WIDTH / 2, HEIGHT - 90);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Não foi possível gerar a imagem."));
    }, "image/png");
  });
}
