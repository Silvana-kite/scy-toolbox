import { defineStore } from 'pinia'
import type { AuthCredentials, AuthSessionResponse, WebUser } from '~/types/auth'

let sessionPromise: Promise<WebUser | null> | null = null

function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { message?: unknown, statusMessage?: unknown } }).data
    if (typeof data?.message === 'string' && data.message) return data.message
    if (typeof data?.statusMessage === 'string' && data.statusMessage) return data.statusMessage
  }
  if (error && typeof error === 'object' && 'statusMessage' in error && typeof error.statusMessage === 'string') return error.statusMessage
  return error instanceof Error ? error.message : '登录服务暂时不可用'
}

export const useAuthStore = defineStore('auth', {
  state: () => ({ user: null as WebUser | null, loaded: false, loading: false, error: '' }),
  actions: {
    async loadSession(force = false) {
      if (!force && this.loaded) return this.user
      if (sessionPromise) return sessionPromise
      this.loading = true
      this.error = ''
      sessionPromise = (async () => {
        try {
        const response = await $fetch<AuthSessionResponse>('/api/auth/session')
        this.user = response.user
        return this.user
      } catch (error) {
        this.user = null
        this.error = errorMessage(error)
        return null
      } finally {
        this.loaded = true
        this.loading = false
        sessionPromise = null
      }
      })()
      return sessionPromise
    },
    async register(credentials: AuthCredentials) {
      this.error = ''
      try {
        const response = await $fetch<{ user: WebUser }>('/api/auth/register', { method: 'POST', body: credentials })
        this.user = response.user
        this.loaded = true
        return true
      } catch (error) {
        this.error = errorMessage(error)
        return false
      }
    },
    async login(credentials: Pick<AuthCredentials, 'username' | 'password'>) {
      this.error = ''
      try {
        const response = await $fetch<{ user: WebUser }>('/api/auth/login', { method: 'POST', body: credentials })
        this.user = response.user
        this.loaded = true
        return true
      } catch (error) {
        this.error = errorMessage(error)
        return false
      }
    },
    async logout() {
      await $fetch('/api/auth/logout', { method: 'POST' })
      this.user = null
      this.loaded = true
    },
  },
})
