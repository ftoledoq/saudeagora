import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brand-mark";

export const dynamic = "force-static";

// Maskable icon: background preenche a tela toda (o SO aplica a própria
// máscara/arredondamento), e o glyph fica dentro da "zona segura" de ~80%
// pra não ser cortado por essa máscara.
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f6e5c",
        }}
      >
        <BrandMark size={260} />
      </div>
    ),
    { width: 512, height: 512 }
  );
}
