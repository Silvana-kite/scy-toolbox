export interface WebUser {
  userId: string
  username: string
  nickname: string
  avatarUrl: string
  status: string
  createdAtKey: string
  updatedAtKey: string
  lastLoginAtKey: string
}

export interface AuthSessionResponse {
  user: WebUser | null
}

export interface AuthCredentials {
  username: string
  password: string
  nickname?: string
}
