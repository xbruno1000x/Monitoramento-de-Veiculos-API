import { useEffect, useState, useCallback } from 'react'
import type { Veiculo } from '../types'

const API_URL = import.meta.env.VITE_API_URL || ''

export function useVeiculos(intervaloMs = 3000) {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const fetchVeiculos = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/veiculos`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setVeiculos(data.veiculos)
      setErro(null)
    } catch (err) {
      setErro((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVeiculos()
    const id = setInterval(fetchVeiculos, intervaloMs)
    return () => clearInterval(id)
  }, [fetchVeiculos, intervaloMs])

  return { veiculos, loading, erro }
}
