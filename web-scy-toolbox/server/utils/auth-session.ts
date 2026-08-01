import { SignJWT, jwtVerify } from 'jose'
import { createError, deleteCookie, getCookie, setCookie } from 'h3'
import type { H3Event } from 'h3'

const SESSION_COOKIE = 'scy_web_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7

function getSessionKey() {
  const secret = useRuntimeConfig().authSessionSecret
  if (secret.length < 32) {
    throw createError({ statusCode: 503, statusMessage: 'Web login is not configured' })
  }
  return new TextEncoder().encode(secret)
}

export async function setUserSession(event: H3Event, userId: string) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSessionKey())

  setCookie(event, SESSION_COOKIE, token, {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function getUserSession(event: H3Event) {
  const token = getCookie(event, SESSION_COOKIE)
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, getSessionKey())
    return typeof payload.userId === 'string' ? payload.userId : null
  } catch {
    deleteCookie(event, SESSION_COOKIE, { path: '/' })
    return null
  }
}

export function clearUserSession(event: H3Event) {
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}
