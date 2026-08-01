import { describe, expect, it } from 'vitest'
import { createWebUsersService, validateCredentials, type WebUserRecord, type WebUsersRepository } from '../../server/services/web-users'

function createRepository() {
  const records: WebUserRecord[] = []
  const repository: WebUsersRepository = {
    async findByUsername(username) { return records.find(record => record.username === username) || null },
    async findByUserId(userId) { return records.find(record => record.userId === userId) || null },
    async add(user) { const record = { ...user, _id: `web-user-${records.length + 1}` }; records.push(record); return { _id: record._id } },
    async updateLogin(id, update) { Object.assign(records.find(record => record._id === id)!, update) },
  }
  return { records, repository }
}

describe('web users service', () => {
  it('normalizes valid credentials and rejects invalid input', () => {
    expect(validateCredentials({ username: ' SCY_User ', password: 'password123' })).toEqual({ username: 'scy_user', password: 'password123' })
    expect(() => validateCredentials({ username: 'ab', password: 'password123' })).toThrow('账号须为')
    expect(() => validateCredentials({ username: 'scy_user', password: 'short' })).toThrow('密码须为')
  })

  it('registers once, logs in, and keeps password fields private', async () => {
    const { records, repository } = createRepository()
    const times = [new Date('2026-07-31T13:35:05.000Z'), new Date('2026-07-31T13:36:05.000Z')]
    const service = createWebUsersService(repository, () => times.shift() || new Date('2026-07-31T13:36:05.000Z'), () => 'W20260731213505ABCDEF12')

    const registered = await service.register({ username: 'SCY_User', password: 'password123', nickname: 'Web User' })
    const loggedIn = await service.login({ username: 'scy_user', password: 'password123' })

    expect(records).toHaveLength(1)
    expect(loggedIn.username).toBe('scy_user')
    expect(loggedIn.lastLoginAtKey).toBe('2026-07-31 21:36:05')
    expect(registered).not.toHaveProperty('passwordHash')
    expect(registered).not.toHaveProperty('passwordSalt')
    await expect(service.register({ username: 'scy_user', password: 'password123' })).rejects.toThrow('该账号已注册')
    await expect(service.login({ username: 'scy_user', password: 'wrong-password' })).rejects.toThrow('账号或密码错误')
  })

  it('returns null for a missing account profile', async () => {
    const { repository } = createRepository()
    await expect(createWebUsersService(repository).getProfile('missing')).resolves.toBeNull()
  })
})
