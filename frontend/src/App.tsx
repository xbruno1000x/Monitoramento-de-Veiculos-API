import Mapa from './components/Mapa'
import Painel from './components/Painel'
import { useVeiculos } from './hooks/useVeiculos'
import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

export default function App() {
  const { veiculos, loading, erro } = useVeiculos(3000)
  const [veiculoSelecionadoId, setVeiculoSelecionadoId] = useState<string | null>(null)

  const veiculoSelecionado = useMemo(
    () => veiculos.find((v) => v.veiculo_id === veiculoSelecionadoId) ?? null,
    [veiculos, veiculoSelecionadoId],
  )

  const handleSelecionarVeiculo = useCallback((id: string) => {
    setVeiculoSelecionadoId((anterior) => (anterior === id ? null : id))
  }, [])

  useEffect(() => {
    if (veiculoSelecionadoId && !veiculos.some((v) => v.veiculo_id === veiculoSelecionadoId)) {
      setVeiculoSelecionadoId(null)
    }
  }, [veiculos, veiculoSelecionadoId])

  return (
    <div className="app">
      <Painel
        veiculos={veiculos}
        veiculoSelecionadoId={veiculoSelecionadoId}
        onSelecionarVeiculo={handleSelecionarVeiculo}
        onLimparSelecao={() => setVeiculoSelecionadoId(null)}
      />

      <div className="mapa-container">
        {loading && <div className="overlay">Carregando...</div>}
        {erro && <div className="overlay erro">Erro: {erro}</div>}
        <Mapa
          veiculos={veiculos}
          veiculoSelecionadoId={veiculoSelecionadoId}
          veiculoSelecionado={veiculoSelecionado}
        />
      </div>
    </div>
  )
}
