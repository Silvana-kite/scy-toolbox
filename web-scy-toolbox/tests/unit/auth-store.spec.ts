import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '../../app/stores/auth'

describe('auth store session cache', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.unstubAllGlobals()
  })

  it('shares one request across concurrent loads and reuses the settled result', async () => {
    const user = { userId: 'web_1', username: 'tester', nickname: '测试用户', avatarUrl: '', status: 'active', createdAtKey: '', updatedAtKey: '', lastLoginAtKey: '' }
    let resolveSession: ((value: { user: typeof user }) => void) | undefined
    const fetchSession = vi.fn(() => new Promise<{ user: typeof user }>(resolve => { resolveSession = resolve }))
    vi.stubGlobal('$fetch', fetchSession)
    const auth = useAuthStore()

    const first = auth.loadSession()
    const second = auth.loadSession()
    expect(fetchSession).toHaveBeenCalledTimes(1)
    resolveSession?.({ user })
    await expect(Promise.all([first, second])).resolves.toEqual([
      user,
      user,
    ])

    await auth.loadSession()
    expect(fetchSession).toHaveBeenCalledTimes(1)
  })

  it('reloads only when callers explicitly force a refresh', async () => {
    const fetchSession = vi.fn(async () => ({ user: null }))
    vi.stubGlobal('$fetch', fetchSession)
    const auth = useAuthStore()

    await auth.loadSession()
    await auth.loadSession(true)
    expect(fetchSession).toHaveBeenCalledTimes(2)
  })
})
