import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

export interface WebUserRecord {
  _id?: string
  username: string
  userId: string
  nickname: string
  avatarUrl: string
  status: string
  passwordHash: string
  passwordSalt: string
  createdAt: Date
  createdAtKey: string
  updatedAt: Date
  updatedAtKey: string
  lastLoginAt: Date
  lastLoginAtKey: string
}

export interface WebUsersRepository {
  findByUsername(username: string): Promise<WebUserRecord | null>
  findByUserId(userId: string): Promise<WebUserRecord | null>
  add(user: WebUserRecord): Promise<{ _id?: string }>
  updateLogin(id: string, update: Pick<WebUserRecord, 'updatedAt' | 'updatedAtKey' | 'lastLoginAt' | 'lastLoginAtKey'>): Promise<void>
}

export class WebAuthError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message)
  }
}

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,32}$/
const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 72
const CHINA_TIME_ZONE = 'Asia/Shanghai'

function formatDateKey(date: Date) {
  const values = new Intl.DateTimeFormat('en-CA', {
    timeZone: CHINA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).reduce<Record<string, string>>((result, part) => ({ ...result, [part.type]: part.value }), {})
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`
}

function formatUserIdTime(date: Date) {
  return formatDateKey(date).replace(/[- :]/g, '')
}

function createUserId(date: Date) {
  return `W${formatUserIdTime(date)}${randomBytes(4).toString('hex').toUpperCase()}`
}

function normalizeUsername(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function normalizeNickname(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 30) : ''
}

export function validateCredentials(input: { username: unknown, password: unknown }) {
  const username = normalizeUsername(input.username)
  if (!USERNAME_PATTERN.test(username)) {
    throw new WebAuthError(400, '账号须为 3-32 位字母、数字或下划线')
  }
  if (typeof input.password !== 'string' || input.password.length < MIN_PASSWORD_LENGTH || input.password.length > MAX_PASSWORD_LENGTH) {
    throw new WebAuthError(400, '密码须为 8-72 位字符')
  }
  return { username, password: input.password }
}

export function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
  return { salt, hash: scryptSync(password, salt, 64).toString('hex') }
}

export function verifyPassword(password: string, salt: string, storedHash: string) {
  if (!salt || !storedHash) return false
  const candidate = Buffer.from(hashPassword(password, salt).hash, 'hex')
  const expected = Buffer.from(storedHash, 'hex')
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}

export function toPublicUser(user: WebUserRecord) {
  return {
    userId: user.userId,
    username: user.username,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
    status: user.status,
    createdAtKey: user.createdAtKey,
    updatedAtKey: user.updatedAtKey,
    lastLoginAtKey: user.lastLoginAtKey,
  }
}

export function createWebUsersService(repository: WebUsersRepository, now = () => new Date(), createId = createUserId) {
  return {
    async register(input: { username: unknown, password: unknown, nickname?: unknown }) {
      const { username, password } = validateCredentials(input)
      if (await repository.findByUsername(username)) {
        throw new WebAuthError(409, '该账号已注册')
      }

      const timestamp = now()
      const dateKey = formatDateKey(timestamp)
      const passwordData = hashPassword(password)
      const user: WebUserRecord = {
        username,
        userId: createId(timestamp),
        nickname: normalizeNickname(input.nickname) || `SCY网页用户${formatUserIdTime(timestamp)}`,
        avatarUrl: '',
        status: 'active',
        passwordHash: passwordData.hash,
        passwordSalt: passwordData.salt,
        createdAt: timestamp,
        createdAtKey: dateKey,
        updatedAt: timestamp,
        updatedAtKey: dateKey,
        lastLoginAt: timestamp,
        lastLoginAtKey: dateKey,
      }

      try {
        const result = await repository.add(user)
        return toPublicUser({ ...user, _id: result._id })
      } catch (error) {
        if (await repository.findByUsername(username)) {
          throw new WebAuthError(409, '该账号已注册')
        }
        throw error
      }
    },

    async login(input: { username: unknown, password: unknown }) {
      const { username, password } = validateCredentials(input)
      const user = await repository.findByUsername(username)
      if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
        throw new WebAuthError(401, '账号或密码错误')
      }
      if (user.status !== 'active') throw new WebAuthError(403, '该账号暂不可用')
      if (!user._id) throw new Error('Web user record is missing its document ID')

      const timestamp = now()
      const dateKey = formatDateKey(timestamp)
      const update = { updatedAt: timestamp, updatedAtKey: dateKey, lastLoginAt: timestamp, lastLoginAtKey: dateKey }
      await repository.updateLogin(user._id, update)
      return toPublicUser({ ...user, ...update })
    },

    async getProfile(userId: string) {
      if (!userId) throw new WebAuthError(400, '缺少用户标识')
      const user = await repository.findByUserId(userId)
      return user ? toPublicUser(user) : null
    },
  }
}
