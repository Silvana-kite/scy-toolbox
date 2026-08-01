import { defineEventHandler } from 'h3'
import { getToolsService } from '../../utils/tools'

export default defineEventHandler(() => getToolsService().listCatalog())
