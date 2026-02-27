export interface Veiculo {
  veiculo_id: string
  lat: number
  lon: number
  velocidade: number
  timestamp: string
  limite_via: number
  via: string
  alerta: boolean
  mensagem: string
  fonte: string
  ultima_atualizacao: string
  updatedAt: string
}

export interface VeiculosResponse {
  total: number
  veiculos: Veiculo[]
  timestamp: string
}
