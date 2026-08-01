import { createError } from 'h3'
import { WebAuthError } from '../services/web-users'

export function asAuthHttpError(error: unknown) {
  if (error instanceof WebAuthError) {
    return createError({ statusCode: error.statusCode, statusMessage: error.message })
  }
  if (error && typeof error === 'object' && 'statusCode' in error) {
    return error
  }
  console.error('web authentication failed', error)
  return createError({ statusCode: 503, statusMessage: 'Web 账号服务暂不可用，请稍后重试' })
}
