import { MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import VeiculoMarker from './VeiculoMarker'
import type { TrajetoPonto, Veiculo } from '../types'
import { Fragment, useEffect, useRef } from 'react'

interface Props {
  veiculos: Veiculo[]
  veiculoSelecionadoId: string | null
  veiculoSelecionado: Veiculo | null
}

// Centro padrão: São Paulo
const DEFAULT_CENTER: [number, number] = [-23.5505, -46.6333]
const DEFAULT_ZOOM = 12
const UM_DIA_EM_MS = 24 * 60 * 60 * 1000

function obterTimestampValido(timestamp: string) {
  const valor = Date.parse(timestamp)
  return Number.isNaN(valor) ? null : valor
}

function ordenarTrajeto(trajeto: TrajetoPonto[]) {
  return [...trajeto].sort((a, b) => {
    const tempoA = obterTimestampValido(a.timestamp) ?? 0
    const tempoB = obterTimestampValido(b.timestamp) ?? 0
    return tempoA - tempoB
  })
}

function filtrarTrajetoUltimas24h(trajeto: TrajetoPonto[]) {
  const corte = Date.now() - UM_DIA_EM_MS

  return ordenarTrajeto(trajeto).filter((ponto) => {
    const tempo = obterTimestampValido(ponto.timestamp)
    return tempo !== null && tempo >= corte
  })
}

function calcularDistanciaKm(pontoA: TrajetoPonto, pontoB: TrajetoPonto) {
  const raioTerraKm = 6371
  const paraRad = (graus: number) => (graus * Math.PI) / 180

  const deltaLat = paraRad(pontoB.lat - pontoA.lat)
  const deltaLon = paraRad(pontoB.lon - pontoA.lon)
  const lat1 = paraRad(pontoA.lat)
  const lat2 = paraRad(pontoB.lat)

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2

  return 2 * raioTerraKm * Math.asin(Math.min(1, Math.sqrt(a)))
}

function isTrechoAcimaDoLimite(pontoA: TrajetoPonto, pontoB: TrajetoPonto, limiteVia: number) {
  const tempoA = obterTimestampValido(pontoA.timestamp)
  const tempoB = obterTimestampValido(pontoB.timestamp)

  if (tempoA === null || tempoB === null || tempoB <= tempoA) {
    return false
  }

  const horas = (tempoB - tempoA) / (1000 * 60 * 60)
  if (horas <= 0) return false

  const velocidadeMedia = calcularDistanciaKm(pontoA, pontoB) / horas
  return velocidadeMedia > limiteVia
}

interface FocoMapaProps {
  veiculoSelecionado: Veiculo | null
}

function FocoMapa({ veiculoSelecionado }: FocoMapaProps) {
  const map = useMap()
  const ultimoVeiculoRef = useRef<string | null>(null)

  useEffect(() => {
    if (!veiculoSelecionado) {
      ultimoVeiculoRef.current = null
      return
    }

    const destino: [number, number] = [veiculoSelecionado.lat, veiculoSelecionado.lon]
    const mudouSelecao = ultimoVeiculoRef.current !== veiculoSelecionado.veiculo_id

    if (mudouSelecao) {
      const zoomAtual = map.getZoom()
      map.flyTo(destino, Math.max(zoomAtual, 16), { duration: 0.8 })
    } else {
      // Mantem o zoom escolhido pelo usuario quando estiver em lock.
      map.panTo(destino, { animate: true, duration: 0.7 })
    }

    ultimoVeiculoRef.current = veiculoSelecionado.veiculo_id
  }, [map, veiculoSelecionado])

  return null
}

interface CentroPadraoMapaProps {
  veiculos: Veiculo[]
  veiculoSelecionado: Veiculo | null
}

function CentroPadraoMapa({ veiculos, veiculoSelecionado }: CentroPadraoMapaProps) {
  const map = useMap()
  const ultimoCentroRef = useRef<string | null>(null)

  useEffect(() => {
    if (veiculoSelecionado) {
      ultimoCentroRef.current = veiculoSelecionado.veiculo_id
      return
    }

    const primeiroVeiculo = veiculos[0]
    if (!primeiroVeiculo) return

    if (ultimoCentroRef.current === primeiroVeiculo.veiculo_id) return

    map.flyTo([primeiroVeiculo.lat, primeiroVeiculo.lon], DEFAULT_ZOOM, {
      duration: 0.7,
    })
    ultimoCentroRef.current = primeiroVeiculo.veiculo_id
  }, [map, veiculos, veiculoSelecionado])

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
        url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
      />
      <TileLayer
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
        opacity={0.92}
      />
      <CentroPadraoMapa veiculos={veiculos} veiculoSelecionado={veiculoSelecionado} />
      <FocoMapa veiculoSelecionado={veiculoSelecionado} />
      {veiculos.map((v) => {
        const trajetoRecente = filtrarTrajetoUltimas24h(v.trajeto ?? [])
        if (trajetoRecente.length < 2) return null

        const selecionado = veiculoSelecionadoId === v.veiculo_id

        return (
          <Fragment key={`rota-${v.veiculo_id}`}>
            {trajetoRecente.slice(0, -1).map((pontoAtual, indice) => {
              const proximoPonto = trajetoRecente[indice + 1]
              const acimaDoLimite = isTrechoAcimaDoLimite(pontoAtual, proximoPonto, v.limite_via)

              return (
                <Polyline
                  key={`rota-${v.veiculo_id}-${pontoAtual.timestamp}-${proximoPonto.timestamp}`}
                  positions={[
                    [pontoAtual.lat, pontoAtual.lon] as [number, number],
                    [proximoPonto.lat, proximoPonto.lon] as [number, number],
                  ]}
                  pathOptions={{
                    color: acimaDoLimite ? '#e74c3c' : '#1a73e8',
                    weight: selecionado ? 5 : 3,
                    opacity: selecionado ? 0.95 : 0.7,
                  }}
                />
              )
            })}
          </Fragment>
        )
      })}
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
