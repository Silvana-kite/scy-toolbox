export interface ToolRecord {
  _id?: string
  toolId: string
  name: string
  description: string
  icon: string
  symbol: string
  categoryId: string
  categoryName: string
  categorySymbol: string
  categoryOrder: number
  sortOrder: number
  isEnabled: boolean
  totalUseCount: number
  lastUsedAt?: Date | null
}

export interface ToolUsageRecord {
  _id?: string
  openid: string
  toolId: string
  platform: 'web'
  useCount: number
  firstUsedAt: Date
  lastUsedAt: Date
  lastCountedAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface ToolsRepository {
  listCatalog(): Promise<ToolRecord[]>
  findEnabled(toolId: string): Promise<ToolRecord | null>
  listGlobal(limit: number, offset: number): Promise<ToolRecord[]>
  listPersonal(identityKey: string, limit: number, offset: number): Promise<ToolRecord[]>
  hasUsage(identityKey: string): Promise<boolean>
  recordUse(identityKey: string, toolId: string, at: Date): Promise<{ counted: boolean, totalUseCount: number }>
}

export function toPublicTool(tool: ToolRecord) {
  return {
    toolId: tool.toolId,
    name: tool.name,
    description: tool.description,
    icon: tool.icon,
    symbol: tool.symbol,
    categoryId: tool.categoryId,
    categoryName: tool.categoryName,
    categorySymbol: tool.categorySymbol,
    categoryOrder: tool.categoryOrder,
    route: `/tool/${tool.toolId}`,
  }
}

export function createToolsService(repository: ToolsRepository, now = () => new Date()) {
  return {
    async listCatalog() {
      return { tools: (await repository.listCatalog()).map(toPublicTool) }
    },
    async getTool(toolId: string) {
      const tool = await repository.findEnabled(toolId)
      return tool ? toPublicTool(tool) : null
    },
    async listHome(userId: string | null, limit: number, offset: number) {
      const identityKey = userId ? `web:${userId}` : null
      const personal = identityKey ? await repository.listPersonal(identityKey, limit, offset) : []
      const hasPersonal = personal.length > 0 || Boolean(identityKey && await repository.hasUsage(identityKey))
      const tools = hasPersonal ? personal : await repository.listGlobal(limit, offset)
      return { tools: tools.map(toPublicTool), source: hasPersonal ? 'personal' : 'global' }
    },
    async recordUse(userId: string, toolId: string) {
      return repository.recordUse(`web:${userId}`, toolId, now())
    },
  }
}
