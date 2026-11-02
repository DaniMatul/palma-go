const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '')

export class ApiRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiRequestError('No se pudo conectar con el backend. Verifica que el servidor esté ejecutándose en http://localhost:3000.', 0)
    }
    throw error
  }
  const payload = await response.json().catch(() => null) as { error?: string; message?: string } | T | null
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload && payload.error
      ? payload.error
      : payload && typeof payload === 'object' && 'message' in payload && payload.message
        ? payload.message
        : 'No se pudo completar la petición'
    throw new ApiRequestError(message, response.status)
  }
  return payload as T
}

export { API_BASE_URL }
