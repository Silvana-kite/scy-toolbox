<script setup lang="ts">
import { RefreshCw, Wrench } from 'lucide-vue-next'
import type { CatalogTool } from '~/types/catalog'

useSeoMeta({ title: '常用工具 | SCY 百宝箱' })
const auth = useAuthStore()
const { home } = useToolCatalog()
const tools = ref<CatalogTool[]>([])
const source = ref<'personal' | 'global'>('global')
const loading = ref(true)
const offline = ref(false)
const failed = ref(false)

async function load(force = false) {
  loading.value = true; failed.value = false
  try {
    const result = await home(auth.user?.userId || null, force)
    tools.value = result.data.tools; source.value = result.data.source; offline.value = result.offline
  } catch { tools.value = []; failed.value = true } finally { loading.value = false }
}
onMounted(async () => { await auth.loadSession(); await load() })
</script>

<template>
  <div class="catalog-page">
    <header class="catalog-heading"><div><p class="eyebrow">SCY TOOLBOX</p><h1>常用工具</h1><p>{{ source === 'personal' ? '根据你的使用次数排序' : '热门工具推荐' }}</p></div><button class="icon-button" title="刷新排行" aria-label="刷新排行" :disabled="loading" @click="load(true)"><RefreshCw :size="17" :class="{ spin: loading }" /></button></header>
    <p v-if="offline" class="offline">当前显示离线缓存数据</p>
    <section v-if="loading" class="empty-state panel"><span class="spinner" />正在加载工具</section>
    <section v-else-if="failed" class="empty-state panel"><Wrench :size="28" /><strong>工具加载失败</strong><button class="button" @click="load(true)">重新加载</button></section>
    <div v-else-if="tools.length" class="tool-grid"><CatalogToolCard v-for="tool in tools" :key="tool.toolId" :tool="tool" /></div>
    <section v-else class="empty-state panel"><Wrench :size="28" /><strong>暂无工具</strong></section>
  </div>
</template>

<style scoped>
.catalog-page { display: grid; max-width: 980px; gap: 24px; margin: 0 auto; }.catalog-heading { display: flex; align-items: start; justify-content: space-between; gap: 16px; }.catalog-heading h1 { margin: 5px 0; font-size: 28px; }.catalog-heading p:not(.eyebrow) { margin: 0; color: var(--muted); font-size: 13px; }.tool-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }.offline { margin: 0; color: #8c6924; font-size: 13px; }.spinner { width: 28px; height: 28px; border: 3px solid #dff4ee; border-top-color: var(--teal); border-radius: 50%; animation: rotate .8s linear infinite; }.spin { animation: rotate .8s linear infinite; }@keyframes rotate { to { transform: rotate(360deg); } }@media (max-width: 640px) { .tool-grid { grid-template-columns: 1fr; } }
</style>
