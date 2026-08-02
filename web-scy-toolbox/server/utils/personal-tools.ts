import { createError } from 'h3'
import { createCloudbasePersonalToolsRepository } from '../repositories/cloudbase-personal-tools'
import { createPersonalToolsService, createWebOwner } from '../services/personal-tools'

export function getPersonalToolsService() {
  return createPersonalToolsService(createCloudbasePersonalToolsRepository())
}

export function requireWebOwner(userId: string | null) {
  if (!userId) throw createError({ statusCode: 401, statusMessage: '登录后可管理个人数据' })
  return createWebOwner(userId)
}
