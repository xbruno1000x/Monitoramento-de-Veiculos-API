import type { Veiculo } from '../types'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { formatarVelocidade } from '../utils/formatters'

interface Props {
  usuarioNome: string
  veiculos: Veiculo[]
  veiculoSelecionadoId: string | null
  onSelecionarVeiculo: (id: string) => void
  onLimparSelecao: () => void
  onLogout: () => void
  onCadastrarVeiculo: (placa: string) => Promise<string>
  onRemoverVeiculo: (veiculoId: string) => Promise<void>
}

function toErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) {
    return err.message
  }

  return fallback
}

export default function Painel({ usuarioNome, veiculos, veiculoSelecionadoId, onSelecionarVeiculo, onLimparSelecao, onLogout, onCadastrarVeiculo, onRemoverVeiculo }: Props) {
  const emAlerta = veiculos.filter((v) => v.alerta).length
  const [placa, setPlaca] = useState('')
  const [mensagemCadastro, setMensagemCadastro] = useState<string | null>(null)
  const [cadastroErro, setCadastroErro] = useState<string | null>(null)
  const [cadastroLoading, setCadastroLoading] = useState(false)
  const [remocaoEmAndamento, setRemocaoEmAndamento] = useState<string | null>(null)

  async function handleCadastro(event: FormEvent) {
    event.preventDefault()
    const placaNormalizada = placa.trim().toUpperCase()

    if (!placaNormalizada) {
      setCadastroErro('Informe a placa do veiculo.')
      setMensagemCadastro(null)
      return
    }

    setCadastroLoading(true)
    setCadastroErro(null)
    setMensagemCadastro(null)

    try {
      const msg = await onCadastrarVeiculo(placaNormalizada)
      setMensagemCadastro(msg || 'Veiculo cadastrado com sucesso.')
      setPlaca('')
    } catch (err) {
      setCadastroErro(toErrorMessage(err, 'Nao foi possivel cadastrar o veiculo.'))
    } finally {
      setCadastroLoading(false)
    }
  }

  async function handleRemocao(veiculoId: string) {
    const confirmado = window.confirm(`Remover o veiculo ${veiculoId} da sua frota?`)
    if (!confirmado) {
      return
    }

    setRemocaoEmAndamento(veiculoId)

    try {
      await onRemoverVeiculo(veiculoId)
    } catch (err) {
      setCadastroErro(toErrorMessage(err, 'Nao foi possivel remover o veiculo.'))
    } finally {
      setRemocaoEmAndamento((atual) => (atual === veiculoId ? null : atual))
    }
  }

  return (
    <div className="painel">
      <h1>🚗 Monitoramento IoT</h1>
      <div className="usuario-box">
        <div>
          <small>Usuario</small>
          <strong>{usuarioNome}</strong>
        </div>
        <button type="button" className="logout-btn" onClick={onLogout}>
          Sair
        </button>
      </div>

      <div className="stats">
        <div className="stat-card">
          <span className="stat-number">{veiculos.length}</span>
          <span className="stat-label">Veículos</span>
        </div>
        <div className="stat-card alerta">
          <span className="stat-number">{emAlerta}</span>
          <span className="stat-label">Em alerta</span>
        </div>
      </div>

      <form className="cadastro-veiculo" onSubmit={handleCadastro}>
        <label htmlFor="placa-veiculo">Cadastrar veiculo (placa)</label>
        <div className="cadastro-linha">
          <input
            id="placa-veiculo"
            type="text"
            value={placa}
            onChange={(e) => setPlaca(e.target.value.toUpperCase())}
            placeholder="Ex.: ABC1234"
            maxLength={10}
          />
          <button type="submit" disabled={cadastroLoading}>
            {cadastroLoading ? 'Salvando...' : 'Cadastrar'}
          </button>
        </div>
        {mensagemCadastro && <small className="cadastro-ok">{mensagemCadastro}</small>}
        {cadastroErro && <small className="cadastro-erro">{cadastroErro}</small>}
      </form>

      <div className="lista-veiculos">
        <div className="lista-header">
          <h2>Veículos rastreados</h2>
          <button
            type="button"
            className="limpar-selecao"
            onClick={onLimparSelecao}
            disabled={!veiculoSelecionadoId}
          >
            Limpar
          </button>
        </div>
        {veiculos.length === 0 && (
          <p className="vazio">Nenhum veículo conectado.</p>
        )}
        {veiculos.map((v) => (
          <div
            key={v.veiculo_id}
            className={`veiculo-item ${v.alerta ? 'alerta' : 'ok'} ${veiculoSelecionadoId === v.veiculo_id ? 'selecionado' : ''}`}
          >
            <button
              type="button"
              className="veiculo-item-selecionar"
              onClick={() => onSelecionarVeiculo(v.veiculo_id)}
            >
              <strong>{v.veiculo_id}</strong>
              <span>{formatarVelocidade(v.velocidade)} / {v.limite_via} km/h</span>
              <small>{v.via}</small>
            </button>
            <button
              type="button"
              className="veiculo-item-remover"
              onClick={() => handleRemocao(v.veiculo_id)}
              disabled={remocaoEmAndamento === v.veiculo_id}
              aria-label={`Remover ${v.veiculo_id}`}
            >
              {remocaoEmAndamento === v.veiculo_id ? '...' : 'Remover'}
            </button>
          </div>
        ))}
      </div>

      <p className="protocolo">Protocolo: MQTT + HTTP</p>
    </div>
  )
}
