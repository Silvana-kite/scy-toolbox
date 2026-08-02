export type OwnerType = 'web' | 'wx'

export interface PersonalOwner {
  ownerKey: string
  ownerType: OwnerType
  ownerUserId: string
}

export interface PersonalTool {
  toolId: string
  name: string
  description: string
  icon: string
  symbol: string
  route: string
  available: boolean
}

export interface PersonalOverview {
  favoriteCount: number
  usageCount: number
  topTool: PersonalTool | null
  favoritePreview: PersonalTool[]
  historyPreview: Array<{ id: string, tool: PersonalTool, usedAt: Date }>
}

export interface PersonalToolsRepository {
  getOverview(owner: PersonalOwner): Promise<PersonalOverview>
  getFavoriteStatus(owner: PersonalOwner, toolId: string): Promise<{ favorite: boolean }>
  listFavorites(owner: PersonalOwner, limit: number, offset: number): Promise<PersonalTool[]>
  addFavorite(owner: PersonalOwner, toolId: string, at: Date): Promise<{ favorite: boolean }>
  removeFavorite(owner: PersonalOwner, toolId: string, at: Date): Promise<{ favorite: boolean }>
  listHistory(owner: PersonalOwner, limit: number, offset: number): Promise<Array<{ id: string, tool: PersonalTool, usedAt: Date }>>
  clearHistory(owner: PersonalOwner): Promise<void>
  recordUse(owner: PersonalOwner, toolId: string, requestId: string, at: Date): Promise<{ counted: boolean, historyId: string | null, totalUseCount: number }>
}

export class PersonalToolsError extends Error {
  constructor(public readonly statusCode: number, message: string) { super(message) }
}

const REQUEST_ID = /^[a-zA-Z0-9_-]{12,128}$/

export function validateRequestId(value: unknown) {
  if (typeof value !== 'string' || !REQUEST_ID.test(value)) {
    throw new PersonalToolsError(400, '请求标识无效')
  }
  return value
}

export function createWebOwner(userId: string): PersonalOwner {
  return { ownerKey: `web:${userId}`, ownerType: 'web', ownerUserId: userId }
}

export function createPersonalToolsService(repository: PersonalToolsRepository, now = () => new Date()) {
  return {
    overview(owner: PersonalOwner) { return repository.getOverview(owner) },
    favoriteStatus(owner: PersonalOwner, toolId: string) { return repository.getFavoriteStatus(owner, toolId) },
    favorites(owner: PersonalOwner, limit: number, offset: number) { return repository.listFavorites(owner, limit, offset) },
    addFavorite(owner: PersonalOwner, toolId: string) { return repository.addFavorite(owner, toolId, now()) },
    removeFavorite(owner: PersonalOwner, toolId: string) { return repository.removeFavorite(owner, toolId, now()) },
    history(owner: PersonalOwner, limit: number, offset: number) { return repository.listHistory(owner, limit, offset) },
    clearHistory(owner: PersonalOwner) { return repository.clearHistory(owner) },
    recordUse(owner: PersonalOwner, toolId: string, requestId: unknown) {
      return repository.recordUse(owner, toolId, validateRequestId(requestId), now())
    },
  }
}
