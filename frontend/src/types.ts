export interface Veiculo {
  veiculo_id: string
  lat: number
  lon: number
  trajeto: TrajetoPonto[]
  heading: number | null
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

export interface TrajetoPonto {
  lat: number
  lon: number
  timestamp: string
}

export interface VeiculosResponse {
  total: number
  veiculos: Veiculo[]
  timestamp: string
}

export interface UsuarioAutenticado {
  id: string
  username: string
  nome: string
  frota: string[]
}

export interface LoginResponse {
  token: string
  expires_in: number
  usuario: UsuarioAutenticado
}
