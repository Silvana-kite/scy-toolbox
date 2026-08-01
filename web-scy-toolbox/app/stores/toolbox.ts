import { defineStore } from 'pinia'
import type { HistoryEntry } from '~/types/tool'

const storageKey = 'scy-toolbox-web-v2'
const defaults = { favorites: [] as string[], history: [] as HistoryEntry[], usageCount: 0 }

export const useToolboxStore = defineStore('toolbox', {
  state: () => ({ ...defaults, hydrated: false }),
  getters: { mostUsedTool: state => { const counts = state.history.reduce<Record<string, number>>((all, item) => ({ ...all, [item.toolId]: (all[item.toolId] || 0) + 1 }), {}); return Object.keys(counts).sort((a, b) => (counts[b] || 0) - (counts[a] || 0))[0] || null } },
  actions: {
    hydrate() { if (!import.meta.client || this.hydrated) return; try { const stored = window.localStorage.getItem(storageKey); if (stored) Object.assign(this, { ...defaults, ...JSON.parse(stored) }) } catch { Object.assign(this, defaults) } this.hydrated = true },
    persist() { if (import.meta.client && this.hydrated) window.localStorage.setItem(storageKey, JSON.stringify({ favorites: this.favorites, history: this.history, usageCount: this.usageCount })) },
    toggleFavorite(toolId: string) { this.favorites = this.favorites.includes(toolId) ? this.favorites.filter(id => id !== toolId) : [...this.favorites, toolId]; this.persist() },
    addHistory(toolId: string, result: string) { this.history = [{ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, toolId, result, createdAt: new Date().toLocaleString('zh-CN', { hour12: false }) }, ...this.history].slice(0, 50); this.usageCount += 1; this.persist() },
    clearToolHistory(toolId: string) { this.history = this.history.filter(item => item.toolId !== toolId); this.persist() },
    clearAll() { Object.assign(this, defaults); this.hydrated = true; this.persist() },
  },
})
