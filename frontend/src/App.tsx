import Mapa from './components/Mapa'
import Painel from './components/Painel'
import { useVeiculos } from './hooks/useVeiculos'
import { useAuth } from './hooks/useAuth'
import LoginForm from './components/LoginForm'
import { useCallback, useMemo, useState } from 'react'
import { apiRequest, authHeaders } from './services/apiClient'
import './App.css'

export default function App() {
  const { token, usuario, loading: authLoading, erro: authErro, autenticado, login, logout } = useAuth()
  const { veiculos, loading, erro } = useVeiculos(token, 3000, logout)
  const [veiculoSelecionadoId, setVeiculoSelecionadoId] = useState<string | null>(null)

  const veiculoSelecionadoIdValido = useMemo(() => {
    if (!veiculoSelecionadoId) return null

    return veiculos.some((v) => v.veiculo_id === veiculoSelecionadoId)
      ? veiculoSelecionadoId
      : null
  }, [veiculos, veiculoSelecionadoId])

  const veiculoSelecionado = useMemo(
    () => veiculos.find((v) => v.veiculo_id === veiculoSelecionadoIdValido) ?? null,
    [veiculos, veiculoSelecionadoIdValido],
  )

  const handleSelecionarVeiculo = useCallback((id: string) => {
    setVeiculoSelecionadoId((anterior) => (anterior === id ? null : id))
  }, [])

  const handleCadastrarVeiculo = useCallback(async (placa: string) => {
    if (!token) {
      throw new Error('Sessao invalida. Faca login novamente.')
    }

    const data = await apiRequest<{ mensagem?: string }>('/api/veiculos/cadastro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(token),
      },
      body: JSON.stringify({ placa }),
    })

    return data?.mensagem as string
  }, [token])

  if (authLoading) {
    return (
      <div className="app-loading">
        <span>Validando sessao...</span>
      </div>
    )
  }

  if (!autenticado || !usuario) {
    return <LoginForm onLogin={login} erro={authErro} />
  }

  return (
    <div className="app">
      <Painel
        usuarioNome={usuario.nome}
        veiculos={veiculos}
        veiculoSelecionadoId={veiculoSelecionadoIdValido}
        onSelecionarVeiculo={handleSelecionarVeiculo}
        onLimparSelecao={() => setVeiculoSelecionadoId(null)}
        onLogout={logout}
        onCadastrarVeiculo={handleCadastrarVeiculo}
      />

      <div className="mapa-container">
        {loading && <div className="overlay">Carregando...</div>}
        {erro && <div className="overlay erro">Erro: {erro}</div>}
        <Mapa
          veiculos={veiculos}
          veiculoSelecionadoId={veiculoSelecionadoIdValido}
          veiculoSelecionado={veiculoSelecionado}
        />
      </div>
    </div>
  )
}
