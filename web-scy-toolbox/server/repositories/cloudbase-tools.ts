import { createError } from 'h3'
import type { ToolRecord, ToolsRepository, ToolUsageRecord } from '../services/tools'
import { getCloudbaseDatabase } from '../utils/cloudbase'

const DEDUPE_MS = 5000
const toolsCollection = 'tools'
const usagesCollection = 'tool_usages'

function data<T>(result: unknown): T[] {
  const typed = result as { data?: unknown }
  const value = typed?.data as { list?: T[] } | T[] | undefined
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.list)) return value.list
  return []
}

// The SDK's document query types do not expose transaction options consistently.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CloudbaseDatabase = { command: { in(values: string[]): unknown }, collection(name: string): any, startTransaction(): Promise<{ transactionId?: string, id?: string }>, commitTransaction(value: { transactionId?: string }): Promise<unknown>, abortTransaction(value: { transactionId?: string }): Promise<unknown> }

export function createCloudbaseToolsRepository(database = getCloudbaseDatabase() as unknown as CloudbaseDatabase): ToolsRepository {
  const tools = database.collection(toolsCollection)
  const usages = database.collection(usagesCollection)
  const enabled = { isEnabled: true }

  return {
    async listCatalog() {
      return data<ToolRecord>(await tools.where(enabled).orderBy('categoryOrder', 'asc').orderBy('sortOrder', 'asc').limit(100).get())
    },
    async findEnabled(toolId) {
      return data<ToolRecord>(await tools.where({ toolId, ...enabled }).limit(1).get())[0] || null
    },
    async listGlobal(limit, offset) {
      return data<ToolRecord>(await tools.where(enabled).orderBy('totalUseCount', 'desc').orderBy('lastUsedAt', 'desc').skip(offset).limit(limit).get())
    },
    async listPersonal(openid, limit, offset) {
      const ranked = data<ToolUsageRecord>(await usages.where({ openid }).orderBy('useCount', 'desc').orderBy('lastUsedAt', 'desc').skip(offset).limit(limit).get())
      if (!ranked.length) return []
      const ids = ranked.map(item => item.toolId)
      const records = data<ToolRecord>(await tools.where({ toolId: database.command.in(ids), ...enabled }).get())
      const byId = new Map(records.map(tool => [tool.toolId, tool]))
      return ids.map(id => byId.get(id)).filter((tool): tool is ToolRecord => Boolean(tool))
    },
    async hasUsage(openid) {
      return data<ToolUsageRecord>(await usages.where({ openid }).limit(1).get()).length > 0
    },
    async recordUse(openid, toolId, at) {
      // The JS SDK exposes transaction primitives inconsistently across runtimes.
      // Use its command transaction so reads and both writes share one transaction ID.
      const transaction = await database.startTransaction()
      const transactionId = transaction.transactionId || transaction.id
      try {
        const activeTools = data<ToolRecord>(await tools.where({ toolId, ...enabled }).limit(1).get({ transactionId }))
        const tool = activeTools[0]
        if (!tool) throw createError({ statusCode: 404, statusMessage: '工具不可用' })
        const usage = data<ToolUsageRecord>(await usages.where({ openid, toolId }).limit(1).get({ transactionId }))[0]
        if (usage && at.getTime() - new Date(usage.lastCountedAt).getTime() < DEDUPE_MS) {
          await database.commitTransaction({ transactionId })
          return { counted: false, totalUseCount: Number(tool.totalUseCount) || 0 }
        }
        const totalUseCount = (Number(tool.totalUseCount) || 0) + 1
        await tools.doc(tool._id || tool.toolId).update({ totalUseCount, lastUsedAt: at, updatedAt: at }, { transactionId })
        const payload: ToolUsageRecord = {
          openid, toolId, platform: 'web', useCount: (usage?.useCount || 0) + 1,
          firstUsedAt: usage?.firstUsedAt || at, lastUsedAt: at, lastCountedAt: at,
          createdAt: usage?.createdAt || at, updatedAt: at,
        }
        if (usage?._id) await usages.doc(usage._id).update(payload, { transactionId })
        else await usages.add(payload, { transactionId })
        await database.commitTransaction({ transactionId })
        return { counted: true, totalUseCount }
      } catch (error) {
        await database.abortTransaction({ transactionId }).catch(() => {})
        throw error
      }
    },
  }
}
