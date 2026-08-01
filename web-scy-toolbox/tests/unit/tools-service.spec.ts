import { describe, expect, it, vi } from 'vitest'
import { createToolsService, type ToolRecord, type ToolsRepository } from '../../server/services/tools'

const imageRepair: ToolRecord = {
  toolId: 'image-repair', name: '图片去水印', description: '本地修复图片局部区域', icon: 'image-repair', symbol: '修', categoryId: 'image', categoryName: '图片处理', categorySymbol: '图', categoryOrder: 10, sortOrder: 10, isEnabled: true, totalUseCount: 0,
}

function repository(overrides: Partial<ToolsRepository> = {}): ToolsRepository {
  return {
    listCatalog: vi.fn(async () => [imageRepair]), findEnabled: vi.fn(async () => imageRepair), listGlobal: vi.fn(async () => [imageRepair]), listPersonal: vi.fn(async () => []), hasUsage: vi.fn(async () => false), recordUse: vi.fn(async () => ({ counted: true, totalUseCount: 1 })), ...overrides,
  }
}

describe('shared tools service', () => {
  it('uses the web identity key for a recorded tool visit', async () => {
    const store = repository(); const service = createToolsService(store)
    await service.recordUse('W123', 'image-repair')
    expect(store.recordUse).toHaveBeenCalledWith('web:W123', 'image-repair', expect.any(Date))
  })
  it('uses personal ranking before global ranking', async () => {
    const store = repository({ listPersonal: vi.fn(async () => [imageRepair]), hasUsage: vi.fn(async () => true) }); const result = await createToolsService(store).listHome('W123', 10, 0)
    expect(result.source).toBe('personal'); expect(store.listGlobal).not.toHaveBeenCalled()
  })
  it('falls back to global ranking without a web usage record', async () => {
    const store = repository(); const result = await createToolsService(store).listHome(null, 10, 0)
    expect(result.source).toBe('global'); expect(result.tools[0]?.route).toBe('/tool/image-repair')
  })
})
