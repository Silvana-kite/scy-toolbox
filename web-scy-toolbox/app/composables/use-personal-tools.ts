import type { PersonalTool } from '../../server/services/personal-tools'

export interface PersonalOverviewResponse {
  favoriteCount: number
  usageCount: number
  topTool: PersonalTool | null
  favoritePreview: PersonalTool[]
  historyPreview: Array<{ id: string, tool: PersonalTool, usedAt: string }>
}

interface PendingUse { toolId: string, requestId: string, createdAt: number }
const pendingPrefix = 'scy-pending-tool-uses-v1'
const pendingLimit = 20
const pendingAgeMs = 20 * 60 * 60 * 1000

function pendingKey(userId: string) { return `${pendingPrefix}:${userId}` }
function newRequestId() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}` }
function readPending(userId: string): PendingUse[] {
  if (!import.meta.client) return []
  try {
    const value = JSON.parse(localStorage.getItem(pendingKey(userId)) || '[]') as PendingUse[]
    return value.filter(item => item && typeof item.toolId === 'string' && typeof item.requestId === 'string' && Date.now() - item.createdAt < pendingAgeMs).slice(-pendingLimit)
  } catch { return [] }
}
function writePending(userId: string, value: PendingUse[]) {
  if (!import.meta.client) return
  localStorage.setItem(pendingKey(userId), JSON.stringify(value.slice(-pendingLimit)))
}

export function personalErrorMessage(error: unknown) {
  let message = ''
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { message?: unknown, statusMessage?: unknown } }).data
    if (typeof data?.message === 'string' && data.message) message = data.message
    else if (typeof data?.statusMessage === 'string' && data.statusMessage) message = data.statusMessage
  }
  if (!message) message = error && typeof error === 'object' && 'statusMessage' in error && typeof error.statusMessage === 'string'
    ? error.statusMessage
    : error instanceof Error && error.message ? error.message : ''
  if (/DuplicateKey|E11000/i.test(message) && /index:\s*toolId\b/i.test(message)) {
    if (/tool_favorites/i.test(message)) return '收藏索引配置错误：请删除 tool_favorites 中仅包含 toolId 的唯一索引，并创建 ownerKey + toolId 组合唯一索引'
    if (/tool_request_dedup/i.test(message)) return '使用记录索引配置错误：请删除 tool_request_dedup 中仅包含 toolId 的唯一索引，并创建 ownerKey + toolId + requestId 组合唯一索引'
    if (/tool_usages/i.test(message)) return '累计使用索引配置错误：请删除 tool_usages 中仅包含 toolId 的唯一索引，并创建 ownerKey + toolId 组合唯一索引'
  }
  if (/(collection.*(not found|does not exist|不存在|未创建)|集合.*(不存在|未创建))/i.test(message)) return '个人数据集合尚未创建，请按文档创建集合与索引'
  if (/不支持动作|unsupported action/i.test(message)) return '个人数据服务版本过旧，请重新部署 tools 云函数'
  return message || '个人数据服务暂不可用，请检查云端部署'
}

export function usePersonalTools() {
  const auth = useAuthStore()
  const sendUse = (toolId: string, requestId: string) => $fetch(`/api/tools/${toolId}/use`, { method: 'POST', body: { requestId } })
  async function flushPendingUses() {
    if (!auth.user || !import.meta.client) return { synced: 0, error: '' }
    const pending = readPending(auth.user.userId)
    const remaining: PendingUse[] = []
    let synced = 0
    let error = ''
    for (const item of pending) {
      try { await sendUse(item.toolId, item.requestId); synced += 1 } catch (caught) { remaining.push(item); error = personalErrorMessage(caught) }
    }
    writePending(auth.user.userId, remaining)
    return { synced, error }
  }
  async function queueUse(toolId: string) {
    if (!auth.user || !import.meta.client) return { synced: false, error: '登录后才能同步使用历史' }
    const event = { toolId, requestId: newRequestId(), createdAt: Date.now() }
    const pending = [...readPending(auth.user.userId), event].slice(-pendingLimit)
    writePending(auth.user.userId, pending)
    const result = await flushPendingUses()
    const stillPending = readPending(auth.user.userId).some(item => item.requestId === event.requestId)
    return { synced: !stillPending, error: stillPending ? result.error || '使用记录未同步，将在网络恢复后重试' : '' }
  }

  return {
    overview: () => $fetch<PersonalOverviewResponse>('/api/personal/overview'),
    favorites: (offset = 0, limit = 50) => $fetch<{ tools: PersonalTool[] }>(`/api/personal/favorites?offset=${offset}&limit=${limit}`),
    history: (offset = 0, limit = 50) => $fetch<{ history: Array<{ id: string, tool: PersonalTool, usedAt: string }> }>(`/api/personal/history?offset=${offset}&limit=${limit}`),
    favoriteStatus: (toolId: string) => $fetch<{ favorite: boolean }>(`/api/personal/favorites/${toolId}`),
    addFavorite: (toolId: string) => $fetch('/api/personal/favorites', { method: 'POST', body: { toolId } }),
    removeFavorite: (toolId: string) => $fetch(`/api/personal/favorites/${toolId}`, { method: 'DELETE' }),
    clearHistory: () => $fetch('/api/personal/history', { method: 'DELETE' }),
    queueUse,
    flushPendingUses,
  }
}
