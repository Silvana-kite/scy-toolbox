import { WebAuthError, type WebUserRecord, type WebUsersRepository } from '../services/web-users'
import { getCloudbaseDatabase } from '../utils/cloudbase'

const COLLECTION = 'web_users'

interface CloudbasePayload<T> {
  code?: string
  message?: string
  list?: T[]
  id?: string
  _id?: string
}

interface CloudbaseResult<T> {
  code?: string
  message?: string
  data?: CloudbasePayload<T> | T[]
  _id?: string
}

interface CloudbaseCollection {
  where(query: Record<string, string>): { limit(limit: number): { get(): Promise<CloudbaseResult<WebUserRecord>> } }
  add(data: WebUserRecord): Promise<CloudbaseResult<WebUserRecord>>
  doc(id: string): { update(data: Partial<WebUserRecord>): Promise<CloudbaseResult<WebUserRecord>> }
}

function payload<T>(result: CloudbaseResult<T>) {
  const data = Array.isArray(result.data) ? { list: result.data } : result.data || {}
  const code = result.code || data.code
  if (code && code !== 'SUCCESS' && code !== 'OK') {
    if (code === 'DATABASE_COLLECTION_NOT_EXIST') {
      throw new WebAuthError(503, 'Web 数据库集合 web_users 尚未创建')
    }
    throw new WebAuthError(503, data.message || result.message || `Web 数据库请求失败：${code}`)
  }
  return data
}

export function createCloudbaseWebUsersRepository(database = getCloudbaseDatabase()): WebUsersRepository {
  const collection = database.collection(COLLECTION) as unknown as CloudbaseCollection
  return {
    async findByUsername(username) {
      return payload(await collection.where({ username }).limit(1).get()).list?.[0] || null
    },
    async findByUserId(userId) {
      return payload(await collection.where({ userId }).limit(1).get()).list?.[0] || null
    },
    async add(user) {
      const result = await collection.add(user)
      const data = payload(result)
      return { _id: data.id || data._id || result._id }
    },
    async updateLogin(id, update) {
      payload(await collection.doc(id).update(update))
    },
  }
}
