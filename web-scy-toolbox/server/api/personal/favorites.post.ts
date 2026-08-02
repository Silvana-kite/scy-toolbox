import { defineEventHandler, readBody } from 'h3'
import { getUserSession } from '../../utils/auth-session'
import { getPersonalToolsService, requireWebOwner } from '../../utils/personal-tools'
import { validToolId } from '../../utils/tools'

export default defineEventHandler(async event => {
  const body = await readBody<{ toolId?: string }>(event)
  return getPersonalToolsService().addFavorite(requireWebOwner(await getUserSession(event)), validToolId(body?.toolId || ''))
})
