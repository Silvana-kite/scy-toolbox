import { createHash, randomUUID } from 'node:crypto'
import { createError } from 'h3'
import type { PersonalOverview, PersonalOwner, PersonalTool, PersonalToolsRepository } from '../services/personal-tools'
import { getCloudbaseDatabase } from '../utils/cloudbase'

const FAVORITES = 'tool_favorites'
const USAGES = 'tool_usages'
const HISTORY = 'tool_usage_history'
const STATS = 'user_tool_stats'
const DEDUP = 'tool_request_dedup'
const TOOLS = 'tools'
const MAX_FAVORITES = 200
const DEDUPE_WINDOW_MS = 5000
const DEDUP_TTL_MS = 24 * 60 * 60 * 1000

// CloudBase exposes slightly different query/transaction typings in Node and Nuxt.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Transaction = { collection(name: string): any, commit(): Promise<unknown>, rollback(): Promise<unknown> }
type Database = { command: { in(values: string[]): unknown }, collection(name: string): any, startTransaction(): Promise<Transaction> }

function rows<T>(result: unknown): T[] {
  const value = result as { data?: { list?: T[] } | T[] }
  if (Array.isArray(value?.data)) return value.data
  return Array.isArray(value?.data?.list) ? value.data.list : []
}

function count(result: unknown) {
  const value = result as { total?: unknown, data?: { total?: unknown } }
  return Number(value?.total ?? value?.data?.total) || 0
}

function ownerId(owner: PersonalOwner) { return `${owner.ownerType}_${owner.ownerUserId}` }
function statsId(owner: PersonalOwner) { return `stats_${ownerId(owner)}` }
function favoriteId(owner: PersonalOwner, toolId: string) { return `favorite_${ownerId(owner)}_${toolId}` }
function usageId(owner: PersonalOwner, toolId: string) { return `usage_${ownerId(owner)}_${toolId}` }
function dedupId(owner: PersonalOwner, toolId: string, requestId: string) { return `dedup_${createHash('sha256').update(`${owner.ownerKey}:${toolId}:${requestId}`).digest('hex')}` }

function historyId(at: Date) { return `history_${at.toISOString().replace(/[-:.TZ]/g, '')}_${randomUUID().replace(/-/g, '')}` }
function route(toolId: string) { return `/tool/${toolId}` }
function isDedupActive(record: Record<string, unknown>, at: Date) { return new Date(String(record.expiresAt)).getTime() > at.getTime() }

function personalDatabaseError(error: unknown): never {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : ''
  if (/DuplicateKey|E11000/i.test(message) && /index:\s*toolId\b/i.test(message)) {
    if (/tool_favorites/i.test(message)) throw createError({ statusCode: 409, statusMessage: '收藏索引配置错误：请删除 tool_favorites 中仅包含 toolId 的唯一索引，并创建 ownerKey + toolId 组合唯一索引' })
    if (/tool_request_dedup/i.test(message)) throw createError({ statusCode: 409, statusMessage: '使用记录索引配置错误：请删除 tool_request_dedup 中仅包含 toolId 的唯一索引，并创建 ownerKey + toolId + requestId 组合唯一索引' })
    if (/tool_usages/i.test(message)) throw createError({ statusCode: 409, statusMessage: '累计使用索引配置错误：请删除 tool_usages 中仅包含 toolId 的唯一索引，并创建 ownerKey + toolId 组合唯一索引' })
  }
  throw error
}

function toPersonalTool(tool: Record<string, unknown> | undefined, fallbackToolId: string): PersonalTool {
  if (!tool) return { toolId: fallbackToolId, name: '工具已下线', description: '', icon: 'tool', symbol: '工', route: '', available: false }
  return {
    toolId: String(tool.toolId), name: String(tool.name), description: String(tool.description || ''), icon: String(tool.icon || 'tool'), symbol: String(tool.symbol || '工'), route: route(String(tool.toolId)), available: tool.isEnabled === true,
  }
}

async function transaction<T>(database: Database, operation: (transaction: Transaction) => Promise<T>) {
  const activeTransaction = await database.startTransaction()
  try {
    const result = await operation(activeTransaction)
    await activeTransaction.commit()
    return result
  } catch (error) {
    await activeTransaction.rollback().catch(() => {})
    throw error
  }
}

export function createCloudbasePersonalToolsRepository(database = getCloudbaseDatabase() as unknown as Database): PersonalToolsRepository {
  const tools = database.collection(TOOLS)
  const favorites = database.collection(FAVORITES)
  const usages = database.collection(USAGES)
  const history = database.collection(HISTORY)
  const stats = database.collection(STATS)
  const dedup = database.collection(DEDUP)

  async function toolMap(ids: string[]) {
    if (!ids.length) return new Map<string, Record<string, unknown>>()
    const records = rows<Record<string, unknown>>(await tools.where({ toolId: database.command.in(ids) }).get())
    return new Map(records.map(item => [String(item.toolId), item]))
  }

  async function readStats(owner: PersonalOwner, collection = stats) {
    return rows<Record<string, unknown>>(await collection.where({ ownerKey: owner.ownerKey }).limit(1).get())[0]
  }

  async function findEnabledTool(toolId: string) {
    return rows<Record<string, unknown>>(await tools.where({ toolId, isEnabled: true }).limit(1).get())[0]
  }

  async function transactionDocument<T extends Record<string, unknown>>(activeTransaction: Transaction, collectionName: string, id: string) {
    try {
      const result = await activeTransaction.collection(collectionName).doc(id).get()
      const value = (result as { data?: unknown }).data
      return value && typeof value === 'object' ? value as T : null
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error)
      if (/not found|does not exist|DOCUMENT_NOT_EXIST/i.test(message)) return null
      throw error
    }
  }

  return {
    async getFavoriteStatus(owner, toolId) {
      const favorite = rows<Record<string, unknown>>(await favorites.where({ ownerKey: owner.ownerKey, toolId }).limit(1).get())[0]
      return { favorite: Boolean(favorite) }
    },

    async getOverview(owner) {
      const statistic = await readStats(owner)
      const [favoriteRows, favoriteCountResult, historyRows] = await Promise.all([
        rows<Record<string, unknown>>(await favorites.where({ ownerKey: owner.ownerKey }).orderBy('createdAt', 'desc').limit(6).get()),
        favorites.where({ ownerKey: owner.ownerKey }).count(),
        rows<Record<string, unknown>>(await history.where({ ownerKey: owner.ownerKey }).orderBy('usedAt', 'desc').orderBy('_id', 'desc').limit(6).get()),
      ])
      const ids = [...new Set([...favoriteRows, ...historyRows, statistic?.topToolId].filter((item): item is string => typeof item === 'string'))]
      const byId = await toolMap(ids)
      return {
        // The preview is capped at six records; count against the source table so an
        // old or partially migrated summary document cannot hide existing favorites.
        favoriteCount: count(favoriteCountResult),
        usageCount: Number(statistic?.usageCount) || 0,
        topTool: statistic?.topToolId ? toPersonalTool(byId.get(String(statistic.topToolId)), String(statistic.topToolId)) : null,
        favoritePreview: favoriteRows.map(row => toPersonalTool(byId.get(String(row.toolId)), String(row.toolId))),
        historyPreview: historyRows.map(row => ({ id: String(row._id), tool: toPersonalTool(byId.get(String(row.toolId)), String(row.toolId)), usedAt: new Date(String(row.usedAt)) })),
      } satisfies PersonalOverview
    },

    async listFavorites(owner, limit, offset) {
      const records = rows<Record<string, unknown>>(await favorites.where({ ownerKey: owner.ownerKey }).orderBy('createdAt', 'desc').skip(offset).limit(limit).get())
      const byId = await toolMap(records.map(item => String(item.toolId)))
      return records.map(row => toPersonalTool(byId.get(String(row.toolId)), String(row.toolId)))
    },

    async addFavorite(owner, toolId, at) {
      const catalogTool = await findEnabledTool(toolId)
      if (!catalogTool) throw createError({ statusCode: 404, statusMessage: '工具不可用' })
      try {
        return await transaction(database, async activeTransaction => {
          const transactionFavorites = activeTransaction.collection(FAVORITES)
          const transactionStats = activeTransaction.collection(STATS)
          const existing = await transactionDocument<Record<string, unknown>>(activeTransaction, FAVORITES, favoriteId(owner, toolId))
          if (existing) return { favorite: true }
          const current = await transactionDocument<Record<string, unknown>>(activeTransaction, STATS, statsId(owner))
          if ((Number(current?.favoriteCount) || 0) >= MAX_FAVORITES) throw createError({ statusCode: 409, statusMessage: '收藏数量已达上限' })
          await transactionFavorites.doc(favoriteId(owner, toolId)).set({ ownerKey: owner.ownerKey, ownerType: owner.ownerType, ownerUserId: owner.ownerUserId, toolId, createdAt: at })
          const next = { ownerKey: owner.ownerKey, ownerType: owner.ownerType, ownerUserId: owner.ownerUserId, favoriteCount: (Number(current?.favoriteCount) || 0) + 1, usageCount: Number(current?.usageCount) || 0, topToolId: current?.topToolId || null, topToolUseCount: Number(current?.topToolUseCount) || 0, topToolLastUsedAt: current?.topToolLastUsedAt || null, createdAt: current?.createdAt || at, updatedAt: at }
          if (current) await transactionStats.doc(statsId(owner)).update(next)
          else await transactionStats.doc(statsId(owner)).set(next)
          return { favorite: true }
        })
      } catch (error) {
        return personalDatabaseError(error)
      }
    },

    async removeFavorite(owner, toolId, at) {
      return transaction(database, async activeTransaction => {
        const transactionFavorites = activeTransaction.collection(FAVORITES)
        const transactionStats = activeTransaction.collection(STATS)
        const existing = await transactionDocument<Record<string, unknown>>(activeTransaction, FAVORITES, favoriteId(owner, toolId))
        if (!existing) return { favorite: false }
        await transactionFavorites.doc(favoriteId(owner, toolId)).delete()
        const current = await transactionDocument<Record<string, unknown>>(activeTransaction, STATS, statsId(owner))
        if (current) await transactionStats.doc(statsId(owner)).update({ favoriteCount: Math.max(0, (Number(current.favoriteCount) || 0) - 1), updatedAt: at })
        return { favorite: false }
      })
    },

    async listHistory(owner, limit, offset) {
      const records = rows<Record<string, unknown>>(await history.where({ ownerKey: owner.ownerKey }).orderBy('usedAt', 'desc').orderBy('_id', 'desc').skip(offset).limit(limit).get())
      const byId = await toolMap(records.map(item => String(item.toolId)))
      return records.map(row => ({ id: String(row._id), tool: toPersonalTool(byId.get(String(row.toolId)), String(row.toolId)), usedAt: new Date(String(row.usedAt)) }))
    },

    async clearHistory(owner) {
      await history.where({ ownerKey: owner.ownerKey }).remove()
    },

    async recordUse(owner, toolId, requestId, at) {
      const catalogTool = await findEnabledTool(toolId)
      if (!catalogTool) throw createError({ statusCode: 404, statusMessage: '工具不可用' })
      try {
        return await transaction(database, async activeTransaction => {
          const transactionTools = activeTransaction.collection(TOOLS)
          const transactionUsages = activeTransaction.collection(USAGES)
          const transactionHistory = activeTransaction.collection(HISTORY)
          const transactionStats = activeTransaction.collection(STATS)
          const transactionDedup = activeTransaction.collection(DEDUP)
          const requestDedupId = dedupId(owner, toolId, requestId)
          const previous = await transactionDocument<Record<string, unknown>>(activeTransaction, DEDUP, requestDedupId)
          if (previous && isDedupActive(previous, at)) return { counted: Boolean(previous.counted), historyId: typeof previous.historyId === 'string' ? previous.historyId : null, totalUseCount: Number(previous.totalUseCount) || 0 }
          const usage = await transactionDocument<Record<string, unknown>>(activeTransaction, USAGES, usageId(owner, toolId))
          const last = usage?.lastCountedAt ? new Date(String(usage.lastCountedAt)).getTime() : 0
          const counted = !last || at.getTime() - last >= DEDUPE_WINDOW_MS
          const totalUseCount = Number(catalogTool.totalUseCount) || 0
          const nextTotal = counted ? totalUseCount + 1 : totalUseCount
          const id = counted ? historyId(at) : null
          await transactionDedup.doc(requestDedupId).set({ ownerKey: owner.ownerKey, toolId, requestId, counted, historyId: id, totalUseCount: nextTotal, expiresAt: new Date(at.getTime() + DEDUP_TTL_MS), createdAt: at })
          if (!counted) return { counted: false, historyId: null, totalUseCount }
          const nextUseCount = (Number(usage?.useCount) || 0) + 1
          const usagePayload = { ownerKey: owner.ownerKey, ownerType: owner.ownerType, ownerUserId: owner.ownerUserId, toolId, useCount: nextUseCount, firstUsedAt: usage?.firstUsedAt || at, lastUsedAt: at, lastCountedAt: at, createdAt: usage?.createdAt || at, updatedAt: at }
          if (usage) await transactionUsages.doc(usageId(owner, toolId)).update(usagePayload)
          else await transactionUsages.doc(usageId(owner, toolId)).set(usagePayload)
          await transactionHistory.doc(id).set({ ownerKey: owner.ownerKey, ownerType: owner.ownerType, ownerUserId: owner.ownerUserId, toolId, usedAt: at, createdAt: at })
          await transactionTools.doc(String(catalogTool._id || catalogTool.toolId)).update({ totalUseCount: nextTotal, lastUsedAt: at, updatedAt: at })
          const current = await transactionDocument<Record<string, unknown>>(activeTransaction, STATS, statsId(owner))
          const shouldTop = !current || nextUseCount > (Number(current.topToolUseCount) || 0) || (nextUseCount === (Number(current.topToolUseCount) || 0) && at.getTime() >= new Date(String(current.topToolLastUsedAt || 0)).getTime())
          const statPayload = { ownerKey: owner.ownerKey, ownerType: owner.ownerType, ownerUserId: owner.ownerUserId, favoriteCount: Number(current?.favoriteCount) || 0, usageCount: (Number(current?.usageCount) || 0) + 1, topToolId: shouldTop ? toolId : current?.topToolId || null, topToolUseCount: shouldTop ? nextUseCount : Number(current?.topToolUseCount) || 0, topToolLastUsedAt: shouldTop ? at : current?.topToolLastUsedAt || null, createdAt: current?.createdAt || at, updatedAt: at }
          if (current) await transactionStats.doc(statsId(owner)).update(statPayload)
          else await transactionStats.doc(statsId(owner)).set(statPayload)
          return { counted: true, historyId: id, totalUseCount: nextTotal }
        })
      } catch (error) {
        return personalDatabaseError(error)
      }
    },
  }
}
