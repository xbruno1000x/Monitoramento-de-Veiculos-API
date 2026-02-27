import type { Veiculo } from '../types'

interface Props {
  veiculos: Veiculo[]
  veiculoSelecionadoId: string | null
  onSelecionarVeiculo: (id: string) => void
  onLimparSelecao: () => void
}

export default function Painel({ veiculos, veiculoSelecionadoId, onSelecionarVeiculo, onLimparSelecao }: Props) {
  const emAlerta = veiculos.filter((v) => v.alerta).length

  return (
    <div className="painel">
      <h1>🚗 Monitoramento IoT</h1>

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
          <button
            key={v.veiculo_id}
            type="button"
            className={`veiculo-item ${v.alerta ? 'alerta' : 'ok'} ${veiculoSelecionadoId === v.veiculo_id ? 'selecionado' : ''}`}
            onClick={() => onSelecionarVeiculo(v.veiculo_id)}
          >
            <strong>{v.veiculo_id}</strong>
            <span>{v.velocidade} / {v.limite_via} km/h</span>
            <small>{v.via}</small>
          </button>
        ))}
      </div>

      <p className="protocolo">Protocolo: MQTT + HTTP</p>
    </div>
  )
}
