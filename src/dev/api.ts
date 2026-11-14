// Thin client for /api/dev/*. Shared auth state so the in-game button and the /dev page agree.
import { useSyncExternalStore } from 'react'

export interface TicketSummary {
  id: string; title: string; type: string; priority: string; screen: string
  status: 'open' | 'in_progress' | 'done' | 'wontfix'; author: string; createdAt: string; imageCount: number
}
export interface ChatContext { screen?: string; lang?: string; difficulty?: string; url?: string; viewport?: string; mission?: string }
export interface ChatReply { conversationId: string; reply: string; imageIds: string[]; ticket?: TicketSummary; tickets?: TicketSummary[] }
export interface StoredMessage { role: 'user' | 'assistant'; text: string; images?: string[]; tickets?: { id: string; title: string }[] }

export class ApiError extends Error {
  status: number
  retryAfter?: number
  constructor(status: number, message: string, retryAfter?: number) {
    super(message)
    this.status = status
    this.retryAfter = retryAfter
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, { credentials: 'same-origin', ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  } catch { throw new ApiError(0, 'network') }
  let data: unknown = null
  try { data = await res.json() } catch { /* not json */ }
  if (!res.ok) {
    const d = (data ?? {}) as { error?: string; retryAfter?: number }
    throw new ApiError(res.status, d.error ?? `HTTP ${res.status}`, d.retryAfter)
  }
  return data as T
}

export interface AuthState { status: 'loading' | 'out' | 'in'; name: string | null }
let auth: AuthState = { status: 'loading', name: null }
let loaded = false
const subs = new Set<() => void>()
function setAuth(a: AuthState) { auth = a; subs.forEach(f => f()) }

/** One lightweight GET /api/dev/me per page load. Any failure leaves dev mode hidden. */
export function loadAuth() {
  if (loaded) return
  loaded = true
  call<{ authed: boolean; name: string | null }>('/api/dev/me')
    .then(r => setAuth(r.authed ? { status: 'in', name: r.name } : { status: 'out', name: null }))
    .catch(() => setAuth({ status: 'out', name: null }))
}
export function useDevAuth(): AuthState {
  return useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb) }, () => auth)
}

export const devApi = {
  async login(name: string, password: string) {
    const r = await call<{ authed: boolean; name: string }>('/api/dev/login', { method: 'POST', body: JSON.stringify({ name, password }) })
    setAuth({ status: 'in', name: r.name })
  },
  async logout() {
    await call('/api/dev/logout', { method: 'POST', body: '{}' }).catch(() => {})
    setAuth({ status: 'out', name: null })
  },
  chat: (body: { conversationId?: string; text: string; images: { dataUrl: string }[]; context?: ChatContext }) =>
    call<ChatReply>('/api/dev/chat', { method: 'POST', body: JSON.stringify(body) }),
  conversation: (id: string) => call<{ id: string; messages: StoredMessage[] }>(`/api/dev/conversation/${id}`),
  tickets: () => call<{ tickets: TicketSummary[] }>('/api/dev/tickets').then(r => r.tickets),
  imageUrl: (id: string) => `/api/dev/image/${id}`,
}
