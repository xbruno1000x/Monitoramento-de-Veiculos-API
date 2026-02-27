import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import type { Veiculo } from '../types'
import { useEffect, useRef } from 'react'
import type { Marker as LeafletMarker } from 'leaflet'

// Ícone personalizado - verde = OK, vermelho = alerta
function criarIcone(alerta: boolean, selecionado: boolean) {
  const corBase = alerta ? '#ff3b3b' : '#00e676'
  const corNeon = selecionado ? '#00f0ff' : '#a45dff'
  const tamanho = selecionado ? 46 : 42
  const metade = Math.round(tamanho / 2)
  const sombraExterna = selecionado ? '0 0 10px #00f0ff, 0 0 20px #00f0ff' : '0 0 8px #7a3fff'
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${tamanho}" height="${tamanho}" viewBox="0 0 48 48">
      <defs>
        <radialGradient id="ring" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${corNeon}" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="${corNeon}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="url(#ring)"/>
      <circle cx="24" cy="24" r="19" fill="none" stroke="${corNeon}" stroke-opacity="0.65" stroke-width="1.6"/>
      <g style="filter: drop-shadow(${sombraExterna});">
        <rect x="15" y="11" rx="6" ry="6" width="18" height="26" fill="#101323" stroke="${corNeon}" stroke-width="1.5"/>
        <rect x="17.5" y="14" rx="3" ry="3" width="13" height="8" fill="#0b1a2b" stroke="#49d9ff" stroke-width="1"/>
        <rect x="18.5" y="24" rx="2" ry="2" width="11" height="9" fill="${corBase}" fill-opacity="0.35" stroke="${corBase}" stroke-width="1.2"/>
        <circle cx="18.5" cy="36" r="3" fill="#0f1024" stroke="${corNeon}" stroke-width="1"/>
        <circle cx="29.5" cy="36" r="3" fill="#0f1024" stroke="${corNeon}" stroke-width="1"/>
        <rect x="15.8" y="8.7" rx="2" ry="2" width="16.5" height="2.4" fill="#7cf2ff"/>
      </g>
    </svg>`

  return L.divIcon({
    html: svg,
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
  const { veiculo_id, lat, lon, velocidade, limite_via, via, alerta, mensagem, updatedAt } = veiculo
  const markerRef = useRef<LeafletMarker | null>(null)

  useEffect(() => {
    if (selecionado) {
      markerRef.current?.openPopup()
    }
  }, [selecionado])

  return (
    <Marker ref={markerRef} position={[lat, lon]} icon={criarIcone(alerta, selecionado)}>
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
