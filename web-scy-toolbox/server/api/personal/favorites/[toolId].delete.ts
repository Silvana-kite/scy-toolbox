import { defineEventHandler, getRouterParam } from 'h3'
import { getUserSession } from '../../../utils/auth-session'
import { getPersonalToolsService, requireWebOwner } from '../../../utils/personal-tools'
import { validToolId } from '../../../utils/tools'

export default defineEventHandler(async event => getPersonalToolsService().removeFavorite(requireWebOwner(await getUserSession(event)), validToolId(getRouterParam(event, 'toolId') || '')))
