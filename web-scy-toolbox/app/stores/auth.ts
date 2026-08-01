import { defineStore } from 'pinia'
import type { AuthCredentials, AuthSessionResponse, WebUser } from '~/types/auth'

function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { message?: unknown } }).data
    if (typeof data?.message === 'string' && data.message) return data.message
  }
  return error instanceof Error ? error.message : '登录服务暂时不可用'
}

export const useAuthStore = defineStore('auth', {
  state: () => ({ user: null as WebUser | null, loaded: false, loading: false, error: '' }),
  actions: {
    async loadSession() {
      if (this.loading) return
      this.loading = true
      this.error = ''
      try {
        const response = await $fetch<AuthSessionResponse>('/api/auth/session')
        this.user = response.user
      } catch (error) {
        this.user = null
        this.error = errorMessage(error)
      } finally {
        this.loaded = true
        this.loading = false
      }
    },
    async register(credentials: AuthCredentials) {
      this.error = ''
      try {
        const response = await $fetch<{ user: WebUser }>('/api/auth/register', { method: 'POST', body: credentials })
        this.user = response.user
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
        return true
      } catch (error) {
        this.error = errorMessage(error)
        return false
      }
    },
    async logout() {
      await $fetch('/api/auth/logout', { method: 'POST' })
      this.user = null
    },
  },
})
