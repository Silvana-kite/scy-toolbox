import { createError, defineEventHandler, getRouterParam } from 'h3'
import { getToolsService, validToolId } from '../../utils/tools'

export default defineEventHandler(async (event) => {
  const tool = await getToolsService().getTool(validToolId(getRouterParam(event, 'toolId') || ''))
  if (!tool) throw createError({ statusCode: 404, statusMessage: '工具不存在' })
  return { tool }
})
