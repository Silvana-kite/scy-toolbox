import { createError, defineEventHandler, readBody } from 'h3'
import { setUserSession } from '../../utils/auth-session'
import { asAuthHttpError } from '../../utils/auth-error'
import { loginWebUser } from '../../utils/web-users'

function credentials(body: unknown) {
  if (!body || typeof body !== 'object') throw createError({ statusCode: 400, statusMessage: 'Invalid login data' })
  const input = body as Record<string, unknown>
  return {
    username: typeof input.username === 'string' ? input.username : '',
    password: typeof input.password === 'string' ? input.password : '',
  }
}

export default defineEventHandler(async (event) => {
  const input = credentials(await readBody(event))
  try {
    const user = await loginWebUser(input)
    await setUserSession(event, user.userId)
    return { user }
  } catch (error) {
    throw asAuthHttpError(error)
  }
})
