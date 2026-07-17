"use client";

import dynamic from "next/dynamic";

export type { MapPin } from "./search-map";

// Leaflet manipula o DOM diretamente e quebra em SSR — só pode carregar no
// cliente, e ssr:false só é permitido dentro de um Client Component.
export const SearchMap = dynamic(
  () => import("./search-map").then((m) => m.SearchMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-primary-light text-sm text-primary">
        Carregando mapa...
      </div>
    ),
  }
);
