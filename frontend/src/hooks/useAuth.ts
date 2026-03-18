import { useCallback, useEffect, useMemo, useState } from 'react'
import type { LoginResponse, UsuarioAutenticado } from '../types'
import { apiRequest, authHeaders } from '../services/apiClient'

const TOKEN_STORAGE_KEY = 'iot_token'
const USER_STORAGE_KEY = 'iot_user'

function toErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) {
    return err.message
  }

  return fallback
}

function salvarSessao(token: string, usuario: UsuarioAutenticado) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(usuario))
}

function limparSessao() {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(USER_STORAGE_KEY)
}

export function useAuth() {
  const [token, setToken] = useState<string | null>(null)
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const logout = useCallback(() => {
    limparSessao()
    setToken(null)
    setUsuario(null)
    setErro(null)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    setErro(null)

    const data = await apiRequest<LoginResponse>('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    })

    salvarSessao(data.token, data.usuario)
    setToken(data.token)
    setUsuario(data.usuario)
  }, [])

  useEffect(() => {
    let mounted = true

    async function restaurarSessao() {
      const tokenSalvo = localStorage.getItem(TOKEN_STORAGE_KEY)
      const userSalvo = localStorage.getItem(USER_STORAGE_KEY)

      if (!tokenSalvo || !userSalvo) {
        if (mounted) {
          setLoading(false)
        }
        return
      }

      try {
        const usuarioSalvo: UsuarioAutenticado = JSON.parse(userSalvo)
        const data = await apiRequest<{ usuario: UsuarioAutenticado }>('/api/auth/me', {
          headers: authHeaders(tokenSalvo),
        })

        if (!mounted) return

        setToken(tokenSalvo)
        setUsuario(data.usuario ?? usuarioSalvo)
      } catch (err) {
        limparSessao()
        if (mounted) {
          setToken(null)
          setUsuario(null)
          setErro(toErrorMessage(err, 'Sua sessao expirou. Faca login novamente.'))
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    restaurarSessao()

    return () => {
      mounted = false
    }
  }, [])

  const autenticado = useMemo(() => Boolean(token && usuario), [token, usuario])

  return {
    token,
    usuario,
    loading,
    erro,
    autenticado,
    login,
    logout,
  }
}