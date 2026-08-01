import { defineEventHandler, getQuery } from 'h3'
import { getUserSession } from '../../utils/auth-session'
import { getToolsService, pagination } from '../../utils/tools'

export default defineEventHandler(async (event) => {
  const { limit, offset } = pagination(getQuery(event))
  return getToolsService().listHome(await getUserSession(event), limit, offset)
})
