import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Cadastro de profissional envia identidade + CREF (fotos de
      // celular) no mesmo request multipart.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
