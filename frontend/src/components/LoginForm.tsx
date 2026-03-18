import { useState } from 'react'
import type { FormEvent } from 'react'

interface Props {
  onLogin: (username: string, password: string) => Promise<void>
  erro?: string | null
}

function toErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) {
    return err.message
  }

  return fallback
}

export default function LoginForm({ onLogin, erro }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [erroLocal, setErroLocal] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (!username || !password) {
      setErroLocal('Preencha usuario e senha.')
      return
    }

    setErroLocal(null)
    setLoading(true)

    try {
      await onLogin(username.trim(), password)
    } catch (err) {
      setErroLocal(toErrorMessage(err, 'Nao foi possivel realizar login.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-panel">
        <h1>Monitoramento de Frota</h1>
        <p>Entre com suas credenciais para visualizar os veiculos da sua frota.</p>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Usuario
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ex.: alfa"
              autoComplete="username"
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              autoComplete="current-password"
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          {(erroLocal || erro) && <small className="login-error">{erroLocal || erro}</small>}
        </form>

        <div className="login-hint">
          <strong>Usuarios de teste:</strong>
          <span>alfa / alfa123</span>
          <span>beta / beta123</span>
        </div>
      </div>
    </div>
  )
}