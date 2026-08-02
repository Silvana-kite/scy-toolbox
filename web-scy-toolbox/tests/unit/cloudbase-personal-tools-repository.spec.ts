import { describe, expect, it, vi } from 'vitest'

vi.mock('h3', () => ({ createError: (value: { statusCode: number, statusMessage: string }) => Object.assign(new Error(value.statusMessage), value) }))
vi.mock('../../server/utils/cloudbase', () => ({ getCloudbaseDatabase: vi.fn() }))

import { createCloudbasePersonalToolsRepository } from '../../server/repositories/cloudbase-personal-tools'
import type { PersonalOwner } from '../../server/services/personal-tools'

const owner: PersonalOwner = { ownerKey: 'web:U123', ownerType: 'web', ownerUserId: 'U123' }

function memoryDatabase(options: { failFavoriteInsert?: boolean, failDedupInsert?: boolean } = {}) {
  const records = new Map<string, Map<string, Record<string, unknown>>>()
  const store = (name: string) => {
    if (!records.has(name)) records.set(name, new Map())
    return records.get(name)!
  }
  const normalCollection = (name: string) => ({
    where(filters: Record<string, unknown>) {
      const rows = [...store(name).values()].filter(row => Object.entries(filters).every(([key, value]) => Array.isArray((value as { values?: unknown[] })?.values) ? (value as { values: unknown[] }).values.includes(row[key]) : row[key] === value))
      return {
        limit(limit: number) { return { get: async () => ({ data: rows.slice(0, limit) }) } },
        orderBy() { return this }, skip() { return this }, get: async () => ({ data: rows }), count: async () => ({ total: rows.length }),
      }
    },
  })
  const commit = vi.fn(async () => {})
  const transactionCollection = (name: string) => ({
    doc(id: string) {
      return {
        get: async () => ({ data: store(name).get(id) || null }),
        set: async (data: Record<string, unknown>) => {
          if (options.failFavoriteInsert && name === 'tool_favorites') throw new Error('(DuplicateKey) E11000 duplicate key error collection: test.tool_favorites index: toolId dup key')
          if (options.failDedupInsert && name === 'tool_request_dedup') throw new Error('(DuplicateKey) E11000 duplicate key error collection: test.tool_request_dedup index: toolId dup key')
          store(name).set(id, { ...data, _id: id })
        },
        update: async (data: Record<string, unknown>) => { store(name).set(id, { ...store(name).get(id), ...data, _id: id }) },
        delete: async () => { store(name).delete(id) },
      }
    },
  })
  const database = {
    command: { in: (values: string[]) => ({ values }) },
    collection: normalCollection,
    startTransaction: async () => ({ collection: transactionCollection, commit, rollback: vi.fn(async () => {}) }),
  }
  return { database, records, store, commit }
}

describe('CloudBase personal tools repository', () => {
  it('uses document-only transaction operations for favorites and successful usage', async () => {
    const memory = memoryDatabase()
    memory.store('tools').set('image-repair', { _id: 'image-repair', toolId: 'image-repair', isEnabled: true, totalUseCount: 0 })
    const repository = createCloudbasePersonalToolsRepository(memory.database as never)
    const at = new Date('2026-08-02T00:00:00.000Z')

    await expect(repository.addFavorite(owner, 'image-repair', at)).resolves.toEqual({ favorite: true })
    await expect(repository.recordUse(owner, 'image-repair', 'request_123456', at)).resolves.toMatchObject({ counted: true, totalUseCount: 1 })

    expect(memory.store('tool_favorites').get('favorite_web_U123_image-repair')).toMatchObject({ ownerKey: owner.ownerKey })
    expect(memory.store('tool_usage_history').size).toBe(1)
    expect(memory.store('user_tool_stats').get('stats_web_U123')).toMatchObject({ favoriteCount: 1, usageCount: 1 })
    await expect(repository.getOverview(owner)).resolves.toMatchObject({ favoriteCount: 1 })
    expect(memory.commit).toHaveBeenCalledTimes(2)
  })

  it('reports an actionable conflict for a legacy toolId-only favorite index', async () => {
    const memory = memoryDatabase({ failFavoriteInsert: true })
    memory.store('tools').set('image-repair', { _id: 'image-repair', toolId: 'image-repair', isEnabled: true, totalUseCount: 0 })
    const repository = createCloudbasePersonalToolsRepository(memory.database as never)

    await expect(repository.addFavorite(owner, 'image-repair', new Date())).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: expect.stringContaining('ownerKey + toolId'),
    })
  })

  it('reports an actionable conflict for a legacy toolId-only request dedup index', async () => {
    const memory = memoryDatabase({ failDedupInsert: true })
    memory.store('tools').set('image-repair', { _id: 'image-repair', toolId: 'image-repair', isEnabled: true, totalUseCount: 0 })
    const repository = createCloudbasePersonalToolsRepository(memory.database as never)

    await expect(repository.recordUse(owner, 'image-repair', 'request_123456', new Date())).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: expect.stringContaining('ownerKey + toolId + requestId'),
    })
  })
})
