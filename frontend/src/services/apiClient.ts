const API_URL = String(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

interface ApiError extends Error {
  status?: number
}

function buildUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_URL}${normalizedPath}`
}

function extractErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback

  const data = payload as Record<string, unknown>
  if (typeof data.mensagem === 'string' && data.mensagem.trim()) {
    return data.mensagem
  }

  if (typeof data.erro === 'string' && data.erro.trim()) {
    return data.erro
  }

  return fallback
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs = 12000,
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Tempo limite excedido.'))
    }, timeoutMs)
  })

  const fetchPromise = fetch(buildUrl(path), init)
  const response = (await Promise.race([fetchPromise, timeoutPromise])) as Response

  const contentType = response.headers.get('content-type') || ''
  const hasJson = contentType.includes('application/json')
  const payload = hasJson ? await response.json() : null

  if (!response.ok) {
    const error = new Error(
      extractErrorMessage(payload, `Falha na requisicao (${response.status})`),
    ) as ApiError
    error.status = response.status
    throw error
  }

  return payload as T
}

export function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  }
}
