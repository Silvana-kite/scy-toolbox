import { createCloudbaseWebUsersRepository } from '../repositories/cloudbase-web-users'
import { createWebUsersService } from '../services/web-users'

function service() {
  return createWebUsersService(createCloudbaseWebUsersRepository())
}

export function registerWebUser(credentials: { username: string, password: string, nickname?: string }) {
  return service().register(credentials)
}

export function loginWebUser(credentials: { username: string, password: string }) {
  return service().login(credentials)
}

export function getWebUserProfile(userId: string) {
  return service().getProfile(userId)
}
