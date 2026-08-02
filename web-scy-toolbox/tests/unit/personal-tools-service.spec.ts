import { describe, expect, it, vi } from 'vitest'
import { createPersonalToolsService, createWebOwner, PersonalToolsError, type PersonalToolsRepository } from '../../server/services/personal-tools'

const owner = createWebOwner('W123')

function repository(): PersonalToolsRepository {
  return {
    getOverview: vi.fn(async () => ({ favoriteCount: 0, usageCount: 0, topTool: null, favoritePreview: [], historyPreview: [] })),
    getFavoriteStatus: vi.fn(async () => ({ favorite: false })),
    listFavorites: vi.fn(async () => []), addFavorite: vi.fn(async () => ({ favorite: true })), removeFavorite: vi.fn(async () => ({ favorite: false })),
    listHistory: vi.fn(async () => []), clearHistory: vi.fn(async () => {}), recordUse: vi.fn(async () => ({ counted: true, historyId: 'history_1', totalUseCount: 1 })),
  }
}

describe('personal tools service', () => {
  it('keeps the Web owner in its own identity domain', () => {
    expect(owner).toEqual({ ownerKey: 'web:W123', ownerType: 'web', ownerUserId: 'W123' })
  })

  it('passes a validated request identifier to the transactional repository', async () => {
    const store = repository()
    await createPersonalToolsService(store).recordUse(owner, 'image-repair', 'request_123456')
    expect(store.recordUse).toHaveBeenCalledWith(owner, 'image-repair', 'request_123456', expect.any(Date))
  })

  it('uses the dedicated favorite-status query for a tool', async () => {
    const store = repository()
    await createPersonalToolsService(store).favoriteStatus(owner, 'image-repair')
    expect(store.getFavoriteStatus).toHaveBeenCalledWith(owner, 'image-repair')
  })

  it('rejects missing or short request identifiers before a write', async () => {
    const store = repository()
    expect(() => createPersonalToolsService(store).recordUse(owner, 'image-repair', 'short')).toThrow(PersonalToolsError)
    expect(store.recordUse).not.toHaveBeenCalled()
  })
})
