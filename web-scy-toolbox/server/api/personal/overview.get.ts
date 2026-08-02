import { defineEventHandler } from 'h3'
import { getUserSession } from '../../utils/auth-session'
import { getPersonalToolsService, requireWebOwner } from '../../utils/personal-tools'

export default defineEventHandler(async event => getPersonalToolsService().overview(requireWebOwner(await getUserSession(event))))
