import { defineEventHandler } from 'h3'
import { clearUserSession, getUserSession } from '../../utils/auth-session'
import { asAuthHttpError } from '../../utils/auth-error'
import { getWebUserProfile } from '../../utils/web-users'

export default defineEventHandler(async (event) => {
  const userId = await getUserSession(event)
  if (!userId) return { user: null }

  try {
    const user = await getWebUserProfile(userId)
    if (!user) clearUserSession(event)
    return { user }
  } catch (error) {
    throw asAuthHttpError(error)
  }
})
