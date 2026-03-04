import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import type { Veiculo } from '../types'
import { useEffect, useRef } from 'react'
import type { Marker as LeafletMarker } from 'leaflet'

function grauParaCardeal(heading: number | null) {
  if (heading === null || Number.isNaN(heading)) return 'N/A'
  const direcoes = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
  const indice = Math.round(heading / 45) % 8
  return direcoes[indice]
}

// Icone inspirado em apps de mobilidade: seta/carro com direcao de deslocamento
function criarIcone(alerta: boolean, selecionado: boolean, heading: number | null) {
  const tamanho = selecionado ? 48 : 42
  const metade = Math.round(tamanho / 2)
  const corCorpo = alerta ? '#ef5350' : '#263238'
  const corBorda = selecionado ? '#00a8ff' : '#ffffff'
  const angulo = heading ?? 0
  const sombraExterna = selecionado
    ? '0 0 12px rgba(0, 168, 255, 0.35), 0 4px 12px rgba(4, 27, 52, 0.28)'
    : '0 3px 10px rgba(4, 27, 52, 0.24)'

  const html = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${tamanho}" height="${tamanho}" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="16" fill="#ffffff" fill-opacity="0.92" />
      <g class="marker-body" transform="rotate(${angulo} 24 24)" style="filter: drop-shadow(${sombraExterna});">
        <polygon points="24,8 33,22 28,21 28,36 20,36 20,21 15,22" fill="${corCorpo}" stroke="${corBorda}" stroke-width="1.8" stroke-linejoin="round"/>
        <polygon points="24,12 28,18 20,18" fill="#ffffff" fill-opacity="0.9"/>
      </g>
      ${selecionado ? '<circle cx="24" cy="24" r="21" fill="none" stroke="#00a8ff" stroke-opacity="0.3" stroke-width="1.4"/>' : ''}
    </svg>`

  return L.divIcon({
    html,
    className: selecionado ? 'veiculo-marker-selecionado' : 'veiculo-marker',
    iconSize: [tamanho, tamanho],
    iconAnchor: [metade, metade],
    popupAnchor: [0, -metade],
  })
}

interface Props {
  veiculo: Veiculo
  selecionado: boolean
}

export default function VeiculoMarker({ veiculo, selecionado }: Props) {
  const { veiculo_id, lat, lon, velocidade, limite_via, via, alerta, mensagem, updatedAt, heading } = veiculo
  const markerRef = useRef<LeafletMarker | null>(null)
  const cardeal = grauParaCardeal(heading)
  const headingFormatado = heading === null ? 'N/A' : `${Math.round(heading)}° (${cardeal})`

  useEffect(() => {
    if (selecionado) {
      markerRef.current?.openPopup()
    }
  }, [selecionado])

  return (
    <Marker ref={markerRef} position={[lat, lon]} icon={criarIcone(alerta, selecionado, heading)}>
      <Popup>
        <div style={{ minWidth: 200, fontFamily: 'system-ui' }}>
          <h3 style={{ margin: '0 0 8px', color: alerta ? '#e74c3c' : '#27ae60' }}>
            {alerta ? '⚠️' : '✅'} {veiculo_id}
          </h3>
          <table style={{ fontSize: 13, width: '100%' }}>
            <tbody>
              <tr><td><b>Via</b></td><td>{via}</td></tr>
              <tr><td><b>Velocidade</b></td><td>{velocidade} km/h</td></tr>
              <tr><td><b>Limite</b></td><td>{limite_via} km/h</td></tr>
              <tr>
                <td><b>Status</b></td>
                <td style={{ color: alerta ? '#e74c3c' : '#27ae60' }}>{mensagem}</td>
              </tr>
              <tr><td><b>Sentido</b></td><td>{headingFormatado}</td></tr>
              <tr>
                <td><b>Atualizado</b></td>
                <td>{new Date(updatedAt).toLocaleTimeString('pt-BR')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Popup>
    </Marker>
  )
}
