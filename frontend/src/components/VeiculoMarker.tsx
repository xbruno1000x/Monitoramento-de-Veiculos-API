import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import type { Veiculo } from '../types'
import { useEffect, useRef } from 'react'
import type { Marker as LeafletMarker } from 'leaflet'

const BASE_ICON_HEADING_DEG = Number(import.meta.env.VITE_VEHICLE_ICON_OFFSET_DEG ?? 0)
const MOVIMENTO_DURACAO_MS = 1300

function grauParaCardeal(heading: number | null) {
  if (heading === null || Number.isNaN(heading)) return 'N/A'
  const direcoes = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
  const indice = Math.round(heading / 45) % 8
  return direcoes[indice]
}

function normalizarAngulo(angulo: number) {
  return ((angulo % 360) + 360) % 360
}

function obterMenorDeltaAngulo(origem: number, destino: number) {
  return ((destino - origem + 540) % 360) - 180
}

function headingParaAnguloVisual(heading: number | null) {
  if (heading === null || Number.isNaN(heading)) return null
  return normalizarAngulo(heading - BASE_ICON_HEADING_DEG)
}

function aplicarRotacao(marker: LeafletMarker | null, angulo: number) {
  const markerEl = marker?.getElement()
  if (!markerEl) return

  const corpo = markerEl.querySelector<HTMLElement>('.veiculo-icon-body')
  if (!corpo) return

  corpo.style.transform = `translate(-50%, -50%) rotate(${angulo}deg)`
}

function criarIcone(alerta: boolean, selecionado: boolean) {
  const tamanho = selecionado ? 48 : 42
  const metade = Math.round(tamanho / 2)
  const classes = [
    'veiculo-icon-shell',
    selecionado ? 'selecionado' : '',
    alerta ? 'alerta' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const html = `
    <div class="${classes}" style="width:${tamanho}px;height:${tamanho}px;">
      <div class="veiculo-icon-body" style="transform: translate(-50%, -50%) rotate(0deg);">
        <img src="/img/car-white.svg" alt="" />
      </div>
    </div>`

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
  const frameRef = useRef<number | null>(null)
  const posicaoAtualRef = useRef<{ lat: number; lon: number }>({ lat, lon })
  const anguloAtualRef = useRef<number>(headingParaAnguloVisual(heading) ?? 0)
  const cardeal = grauParaCardeal(heading)
  const headingFormatado = heading === null ? 'N/A' : `${Math.round(heading)}° (${cardeal})`

  useEffect(() => {
    if (selecionado) {
      markerRef.current?.openPopup()
    }
  }, [selecionado])

  useEffect(() => {
    const marker = markerRef.current
    if (!marker) return

    const destinoPos = { lat, lon }
    const destinoAngulo = headingParaAnguloVisual(heading)

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }

    const inicioPos = { ...posicaoAtualRef.current }
    const inicioAngulo = anguloAtualRef.current
    const fimAngulo = destinoAngulo ?? inicioAngulo
    const deltaAngulo = obterMenorDeltaAngulo(inicioAngulo, fimAngulo)

    const iniciouEm = performance.now()

    const animar = (agora: number) => {
      const progresso = Math.min((agora - iniciouEm) / MOVIMENTO_DURACAO_MS, 1)

      const latAnim = inicioPos.lat + (destinoPos.lat - inicioPos.lat) * progresso
      const lonAnim = inicioPos.lon + (destinoPos.lon - inicioPos.lon) * progresso
      const anguloAnim = normalizarAngulo(inicioAngulo + deltaAngulo * progresso)

      marker.setLatLng([latAnim, lonAnim])
      aplicarRotacao(marker, anguloAnim)

      posicaoAtualRef.current = { lat: latAnim, lon: lonAnim }
      anguloAtualRef.current = anguloAnim

      if (progresso < 1) {
        frameRef.current = requestAnimationFrame(animar)
      } else {
        frameRef.current = null
      }
    }

    frameRef.current = requestAnimationFrame(animar)

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }
  }, [lat, lon, heading])

  useEffect(() => {
    // Reaplica a rotacao ao trocar de estilo/tamanho do icone.
    aplicarRotacao(markerRef.current, anguloAtualRef.current)
  }, [selecionado, alerta])

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
