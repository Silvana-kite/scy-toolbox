import { defineEventHandler } from 'h3'
import { clearUserSession } from '../../utils/auth-session'

export default defineEventHandler((event) => {
  clearUserSession(event)
  return { success: true }
})
