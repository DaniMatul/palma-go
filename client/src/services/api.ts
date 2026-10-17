const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '')

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('No se pudo conectar con el backend. Verifica que el servidor esté ejecutándose en http://localhost:3000.')
    }
    throw error
  }
  const payload = await response.json().catch(() => null) as { error?: string; message?: string } | T | null
  if (!response.ok) throw new Error(payload && typeof payload === 'object' && 'error' in payload && payload.error ? payload.error : payload && typeof payload === 'object' && 'message' in payload && payload.message ? payload.message : 'No se pudo completar la petición')
  return payload as T
}

export { API_BASE_URL }
