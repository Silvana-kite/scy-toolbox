import { createError, defineEventHandler, getRouterParam } from 'h3'
import { getUserSession } from '../../../utils/auth-session'
import { getToolsService, validToolId } from '../../../utils/tools'

export default defineEventHandler(async (event) => {
  const userId = await getUserSession(event)
  if (!userId) throw createError({ statusCode: 401, statusMessage: '登录后可记录常用工具' })
  return getToolsService().recordUse(userId, validToolId(getRouterParam(event, 'toolId') || ''))
})
