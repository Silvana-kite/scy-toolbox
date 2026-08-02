import { defineEventHandler } from 'h3'
import { getUserSession } from '../../utils/auth-session'
import { getPersonalToolsService, requireWebOwner } from '../../utils/personal-tools'

export default defineEventHandler(async event => {
  await getPersonalToolsService().clearHistory(requireWebOwner(await getUserSession(event)))
  return { success: true }
})
