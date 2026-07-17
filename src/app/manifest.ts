import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SaúdeAgora",
    short_name: "SaúdeAgora",
    description:
      "Encontre e agende personal trainer, massagem e pilates com profissionais verificados perto de você.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f2",
    theme_color: "#0f6e5c",
    lang: "pt-BR",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/512-maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
