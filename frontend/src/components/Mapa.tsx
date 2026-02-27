import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import VeiculoMarker from './VeiculoMarker'
import type { Veiculo } from '../types'
import { useEffect } from 'react'

interface Props {
  veiculos: Veiculo[]
  veiculoSelecionadoId: string | null
  veiculoSelecionado: Veiculo | null
}

// Centro padrão: São Paulo
const DEFAULT_CENTER: [number, number] = [-23.5505, -46.6333]
const DEFAULT_ZOOM = 12

interface FocoMapaProps {
  veiculoSelecionado: Veiculo | null
}

function FocoMapa({ veiculoSelecionado }: FocoMapaProps) {
  const map = useMap()

  useEffect(() => {
    if (!veiculoSelecionado) return

    map.flyTo([veiculoSelecionado.lat, veiculoSelecionado.lon], 16, {
      duration: 0.8,
    })
  }, [map, veiculoSelecionado])

  return null
}

export default function Mapa({ veiculos, veiculoSelecionadoId, veiculoSelecionado }: Props) {
  const center: [number, number] =
    veiculoSelecionado
      ? [veiculoSelecionado.lat, veiculoSelecionado.lon]
      : veiculos.length > 0
      ? [veiculos[0].lat, veiculos[0].lon]
      : DEFAULT_CENTER

  return (
    <MapContainer
      center={center}
      zoom={DEFAULT_ZOOM}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
      />
      <TileLayer
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
        opacity={0.28}
      />
      <FocoMapa veiculoSelecionado={veiculoSelecionado} />
      {veiculos.map((v) => (
        <VeiculoMarker
          key={v.veiculo_id}
          veiculo={v}
          selecionado={veiculoSelecionadoId === v.veiculo_id}
        />
      ))}
    </MapContainer>
  )
}
