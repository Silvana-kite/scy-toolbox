import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { getUserSession } from '../../../utils/auth-session'
import { getPersonalToolsService, requireWebOwner } from '../../../utils/personal-tools'
import { validToolId } from '../../../utils/tools'

export default defineEventHandler(async event => {
  const userId = await getUserSession(event)
  if (!userId) throw createError({ statusCode: 401, statusMessage: '登录后可记录常用工具' })
  const body = await readBody<{ requestId?: string }>(event)
  return getPersonalToolsService().recordUse(requireWebOwner(userId), validToolId(getRouterParam(event, 'toolId') || ''), body?.requestId)
})
