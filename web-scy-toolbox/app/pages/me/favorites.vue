<script setup lang="ts">
import { Heart, RefreshCw } from 'lucide-vue-next'
import { personalErrorMessage } from '~/composables/use-personal-tools'

const { favorites, removeFavorite } = usePersonalTools()
const tools = ref<Awaited<ReturnType<typeof favorites>>['tools']>([])
const auth = useAuthStore()
const loading = ref(false)
const error = ref('')

async function load() {
  if (!auth.user) { tools.value = []; return }
  loading.value = true
  error.value = ''
  try { tools.value = (await favorites()).tools } catch (caught) { error.value = personalErrorMessage(caught) } finally { loading.value = false }
}
async function remove(toolId: string) {
  try { await removeFavorite(toolId); await load() } catch (caught) { error.value = personalErrorMessage(caught) }
}
onMounted(async () => { await auth.loadSession(); await load() })
</script>

<template>
  <ClientOnly>
    <div class="page-frame list-page">
    <header><Heart :size="20" /><h1>我的收藏</h1></header>
    <p v-if="!auth.user">登录后可查看收藏。</p>
    <template v-else>
      <div v-if="error" class="failure"><p>{{ error }}</p><button class="button button-soft" type="button" :disabled="loading" @click="load"><RefreshCw :size="16" />重试</button></div>
      <div v-else-if="tools.length" class="list"><div v-for="tool in tools" :key="tool.toolId"><NuxtLink :to="tool.route || '/me/favorites'">{{ tool.name }}<small v-if="!tool.available">已下线</small></NuxtLink><button class="icon-button" title="取消收藏" aria-label="取消收藏" @click="remove(tool.toolId)">×</button></div></div>
      <p v-else-if="!loading">暂无收藏。</p>
      <p v-else>正在加载收藏...</p>
    </template>
    </div>
    <template #fallback><div class="page-frame list-page">正在加载收藏...</div></template>
  </ClientOnly>
</template>

<style scoped>
.list-page { display:grid; gap:16px; }.list-page header { display:flex; align-items:center; gap:8px; }.list-page h1 { margin:0; font-size:24px; }.list { display:grid; border-top:1px solid var(--line); }.list > div { display:flex; align-items:center; border-bottom:1px solid var(--line); }.list a { flex:1; padding:14px 0; color:var(--ink); }.list small { margin-left:8px; color:var(--muted); }.failure { display:grid; gap:12px; color:#a25d2f; }.failure p { margin:0; }
</style>
