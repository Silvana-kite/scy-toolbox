import cloudbase from '@cloudbase/js-sdk'
import { createError } from 'h3'

let database: ReturnType<ReturnType<typeof cloudbase.init>['database']> | null = null

export function getCloudbaseConfig(config = useRuntimeConfig()) {
  if (!config.cloudbaseEnvId || !config.cloudbaseApiKey) {
    throw createError({ statusCode: 503, statusMessage: 'Web 数据库尚未配置' })
  }
  return { envId: config.cloudbaseEnvId, apiKey: config.cloudbaseApiKey }
}

export function getCloudbaseDatabase() {
  if (database) return database
  const { envId, apiKey } = getCloudbaseConfig()
  // Server API Keys are read from the process environment. `accessKey` is only
  // for a browser-safe Publishable Key and would downgrade this server to anonymous access.
  process.env.CLOUDBASE_APIKEY = apiKey
  database = cloudbase.init({ env: envId }).database()
  return database
}
