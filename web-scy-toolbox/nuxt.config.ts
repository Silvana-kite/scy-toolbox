export default defineNuxtConfig({
  compatibilityDate: '2026-07-31',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt', '@vueuse/nuxt', '@nuxtjs/tailwindcss', '@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      title: 'SCY 百宝箱',
      meta: [
        { name: 'description', content: 'SCY 百宝箱，本地运行的实用工具集合。' },
        { name: 'theme-color', content: '#f7f8f6' },
      ],
    },
  },
  runtimeConfig: {
    authSessionSecret: process.env.AUTH_SESSION_SECRET || '',
    cloudbaseEnvId: process.env.CLOUDBASE_ENV_ID || '',
    cloudbaseApiKey: process.env.CLOUDBASE_APIKEY || '',
  },
  nitro: {
    prerender: {
      routes: ['/'],
    },
  },
  routeRules: {
    '/': { prerender: true },
  },
  typescript: { strict: true },
})
