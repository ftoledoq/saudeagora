"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Os ícones padrão do Leaflet apontam para caminhos relativos que o
// bundler não resolve — servir via CDN evita depender de como o Turbopack
// trata assets estáticos nesta versão do Next.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export type MapPin = {
  id: string;
  nome: string;
  servico: string;
  preco: number;
  lat: number;
  lng: number;
};

// Sem isso, o mapa abre num centro/zoom fixos que só fazem sentido quando
// os resultados estão todos perto — com pins espalhados entre cidades
// (ex: sem filtro de bairro), fitBounds é o que garante que todo mundo
// apareça na tela ao mesmo tempo.
function FitToPins({ center, pins }: { center: [number, number]; pins: MapPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) {
      map.setView(center, 13);
      return;
    }
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 13);
      return;
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [center, pins, map]);
  return null;
}

export function SearchMap({
  center,
  pins,
}: {
  center: [number, number];
  pins: MapPin[];
}) {
  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToPins center={center} pins={pins} />
      {pins.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]}>
          <Popup>
            <strong>{p.nome}</strong>
            <br />
            {p.servico} · R$ {p.preco}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
