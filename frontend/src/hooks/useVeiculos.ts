import { useEffect, useState, useCallback, useRef } from 'react'
import type { Veiculo, VeiculosResponse } from '../types'
import { apiRequest, authHeaders } from '../services/apiClient'

interface UltimaPosicao {
  lat: number
  lon: number
  heading: number | null
}

interface ApiError extends Error {
  status?: number
}

function toErrorMessage(err: unknown) {
  if (err instanceof Error && err.message) {
    return err.message
  }

  return 'Falha ao carregar dados de veiculos.'
}

function calcularHeading(lat1: number, lon1: number, lat2: number, lon2: number) {
  const paraRad = (graus: number) => (graus * Math.PI) / 180
  const paraGraus = (rad: number) => (rad * 180) / Math.PI

  const phi1 = paraRad(lat1)
  const phi2 = paraRad(lat2)
  const deltaLambda = paraRad(lon2 - lon1)

  const y = Math.sin(deltaLambda) * Math.cos(phi2)
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda)
  const theta = Math.atan2(y, x)

  return (paraGraus(theta) + 360) % 360
}

export function useVeiculos(token: string | null, intervaloMs = 3000, onNaoAutorizado?: () => void) {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [loading, setLoading] = useState(Boolean(token))
  const [erro, setErro] = useState<string | null>(null)
  const ultimasPosicoesRef = useRef<Record<string, UltimaPosicao>>({})

  const fetchVeiculos = useCallback(async () => {
    if (!token) {
      setVeiculos([])
      setLoading(false)
      setErro(null)
      ultimasPosicoesRef.current = {}
      return
    }

    try {
      const data = await apiRequest<VeiculosResponse>('/api/veiculos', {
        headers: authHeaders(token),
      })

      const idsAtuais = new Set<string>()
      const veiculosComDirecao: Veiculo[] = data.veiculos.map((veiculo: Omit<Veiculo, 'heading'>) => {
        idsAtuais.add(veiculo.veiculo_id)

        const anterior = ultimasPosicoesRef.current[veiculo.veiculo_id]
        let heading: number | null = anterior?.heading ?? null

        if (anterior) {
          const moveu = Math.abs(veiculo.lat - anterior.lat) > 0.00001 || Math.abs(veiculo.lon - anterior.lon) > 0.00001
          if (moveu) {
            heading = calcularHeading(anterior.lat, anterior.lon, veiculo.lat, veiculo.lon)
          }
        }

        ultimasPosicoesRef.current[veiculo.veiculo_id] = {
          lat: veiculo.lat,
          lon: veiculo.lon,
          heading,
        }

        return {
          ...veiculo,
          heading,
        }
      })

      for (const id of Object.keys(ultimasPosicoesRef.current)) {
        if (!idsAtuais.has(id)) {
          delete ultimasPosicoesRef.current[id]
        }
      }

      setVeiculos(veiculosComDirecao)
      setErro(null)
    } catch (err) {
      if ((err as ApiError)?.status === 401) {
        onNaoAutorizado?.()
      }

      setErro(toErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [token, onNaoAutorizado])

  useEffect(() => {
    fetchVeiculos()

    if (!token) return

    const id = setInterval(fetchVeiculos, intervaloMs)
    return () => clearInterval(id)
  }, [fetchVeiculos, intervaloMs, token])

  return { veiculos, loading, erro }
}
