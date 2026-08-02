import { defineEventHandler, getQuery } from 'h3'
import { getUserSession } from '../../utils/auth-session'
import { getPersonalToolsService, requireWebOwner } from '../../utils/personal-tools'
import { pagination } from '../../utils/tools'

export default defineEventHandler(async event => {
  const { limit, offset } = pagination(getQuery(event))
  return { tools: await getPersonalToolsService().favorites(requireWebOwner(await getUserSession(event)), limit, offset) }
})
