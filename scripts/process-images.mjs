import sharp from "sharp";
import { mkdirSync } from "fs";

const SRC = "images";
const DEST = "public/images";
mkdirSync(DEST, { recursive: true });

const JPEG_OPTS = { quality: 85, mozjpeg: true };

async function main() {
  // personal-trainer / pilates / massagem: quadradas, marca d'água (brilho)
  // no canto inferior direito — corta 8% da altura na base e 8% da largura
  // à direita, reencoda como JPEG de verdade (os arquivos originais são PNG
  // salvos com extensão .jpg, daí o tamanho de 7-8MB cada).
  // 15%, não 8% — conferido visualmente: a marca d'água (brilho) fica
  // centrada por volta de 87-90% da largura/altura, não perto o bastante
  // da borda pra sumir com um corte de 8%. 15% garante margem de sobra
  // além da borda externa do ícone nas três fotos.
  for (const nome of ["personal-trainer", "pilates", "massagem"]) {
    const img = sharp(`${SRC}/${nome}.jpg`);
    const meta = await img.metadata();
    const cortarAltura = Math.round(meta.height * 0.15);
    const cortarLargura = Math.round(meta.width * 0.15);
    const largura = meta.width - cortarLargura;
    const altura = meta.height - cortarAltura;
    await sharp(`${SRC}/${nome}.jpg`)
      .extract({ left: 0, top: 0, width: largura, height: altura })
      .jpeg(JPEG_OPTS)
      .toFile(`${DEST}/${nome}.jpg`);
    const outMeta = await sharp(`${DEST}/${nome}.jpg`).metadata();
    console.log(`${nome}: ${meta.width}x${meta.height} -> ${outMeta.width}x${outMeta.height}`);
  }

  // hero e profissional: sem corte de marca d'água pedido, só reencoda
  // como JPEG comprimido de verdade.
  for (const nome of ["hero", "profissional"]) {
    await sharp(`${SRC}/${nome}.jpg`).jpeg(JPEG_OPTS).toFile(`${DEST}/${nome}.jpg`);
  }

  // OG image (1200x630) — recorta do hero mantendo o topo (onde estão os
  // rostos, ver auditoria visual: ambos os rostos ficam nos primeiros ~35%
  // da altura), já que o alvo é mais panorâmico que a foto original (corta
  // sobra de baixo, nunca de cima).
  const heroMeta = await sharp(`${SRC}/hero.jpg`).metadata();
  const alturaAlvo = Math.round(heroMeta.width / (1200 / 630));
  await sharp(`${SRC}/hero.jpg`)
    .extract({ left: 0, top: 0, width: heroMeta.width, height: Math.min(alturaAlvo, heroMeta.height) })
    .resize(1200, 630)
    .jpeg(JPEG_OPTS)
    .toFile(`${DEST}/og-image.jpg`);

  console.log("done");
}

main();
