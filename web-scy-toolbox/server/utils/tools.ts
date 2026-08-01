import { createCloudbaseToolsRepository } from '../repositories/cloudbase-tools'
import { createToolsService } from '../services/tools'

export function getToolsService() {
  return createToolsService(createCloudbaseToolsRepository())
}

export function pagination(value: Record<string, unknown>) {
  const limit = value.limit === undefined ? 10 : Number(value.limit)
  const offset = value.offset === undefined ? 0 : Number(value.offset)
  if (!Number.isInteger(limit) || limit < 1 || limit > 50 || !Number.isInteger(offset) || offset < 0) {
    throw createError({ statusCode: 400, statusMessage: '分页参数无效' })
  }
  return { limit, offset }
}

export function validToolId(toolId: string) {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(toolId)) {
    throw createError({ statusCode: 400, statusMessage: '工具标识无效' })
  }
  return toolId
}
