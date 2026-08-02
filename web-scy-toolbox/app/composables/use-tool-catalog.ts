import type { CatalogResponse, HomeResponse } from '~/types/catalog'

const MAX_AGE = 24 * 60 * 60 * 1000

function readCache<T>(key: string): T | null {
  if (!import.meta.client) return null
  try {
    const cached = JSON.parse(localStorage.getItem(key) || 'null') as { savedAt: number, data: T } | null
    return cached && Date.now() - cached.savedAt < MAX_AGE ? cached.data : null
  } catch { return null }
}

function writeCache<T>(key: string, data: T) {
  try { localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data })) } catch { /* Storage is optional. */ }
}

export function useToolCatalog() {
  async function fetchCached<T>(key: string, url: string, force = false) {
    if (!force) {
      const cached = readCache<T>(key)
      if (cached) return { data: cached, offline: true }
    }
    try {
      const data = await $fetch<T>(url)
      writeCache(key, data)
      return { data, offline: false }
    } catch (error) {
      const cached = readCache<T>(key)
      if (cached) return { data: cached, offline: true }
      throw error
    }
  }

  return {
    catalog: (force = false) => fetchCached<CatalogResponse>('scy-web-catalog', '/api/tools/catalog', force),
    home: (userId: string | null, force = false) => fetchCached<HomeResponse>(`scy-web-home-${userId || 'anonymous'}`, '/api/tools/home?limit=10&offset=0', force),
  }
}
