import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brand-mark";

export const dynamic = "force-static";

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
          borderRadius: 108,
        }}
      >
        <BrandMark size={340} />
      </div>
    ),
    { width: 512, height: 512 }
  );
}
