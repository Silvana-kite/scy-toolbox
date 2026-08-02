<script setup lang="ts">
import { Clock3, RefreshCw, Trash2 } from 'lucide-vue-next'
import { personalErrorMessage } from '~/composables/use-personal-tools'

const { history, clearHistory } = usePersonalTools()
const entries = ref<Awaited<ReturnType<typeof history>>['history']>([])
const auth = useAuthStore()
const loading = ref(false)
const error = ref('')
async function load() {
  if (!auth.user) { entries.value = []; return }
  loading.value = true
  error.value = ''
  try { entries.value = (await history()).history } catch (caught) { error.value = personalErrorMessage(caught) } finally { loading.value = false }
}
async function clear() {
  if (!confirm('仅清除使用历史，不影响累计使用次数。')) return
  try { await clearHistory(); await load() } catch (caught) { error.value = personalErrorMessage(caught) }
}
onMounted(async () => { await auth.loadSession(); await load() })
</script>

<template>
  <ClientOnly>
    <div class="page-frame list-page">
    <header><span><Clock3 :size="20" /><h1>使用历史</h1></span><button v-if="entries.length" class="icon-button" title="清除使用历史" aria-label="清除使用历史" @click="clear"><Trash2 :size="17" /></button></header>
    <p v-if="!auth.user">登录后可查看使用历史。</p>
    <template v-else>
      <div v-if="error" class="failure"><p>{{ error }}</p><button class="button button-soft" type="button" :disabled="loading" @click="load"><RefreshCw :size="16" />重试</button></div>
      <div v-else-if="entries.length" class="list"><NuxtLink v-for="entry in entries" :key="entry.id" :to="entry.tool.route || '/me/history'"><span>{{ entry.tool.name }}<small v-if="!entry.tool.available">已下线</small></span><time>{{ new Date(entry.usedAt).toLocaleString('zh-CN', { hour12: false }) }}</time></NuxtLink></div>
      <p v-else-if="!loading">暂无使用历史。</p>
      <p v-else>正在加载使用历史...</p>
    </template>
    </div>
    <template #fallback><div class="page-frame list-page">正在加载使用历史...</div></template>
  </ClientOnly>
</template>

<style scoped>
.list-page { display:grid; gap:16px; }.list-page header { display:flex; justify-content:space-between; align-items:center; }.list-page header span { display:flex; align-items:center; gap:8px; }.list-page h1 { margin:0; font-size:24px; }.list { display:grid; border-top:1px solid var(--line); }.list a { display:flex; justify-content:space-between; gap:12px; padding:14px 0; border-bottom:1px solid var(--line); color:var(--ink); }.list small, time { margin-left:8px; color:var(--muted); font-size:12px; } time { white-space:nowrap; }.failure { display:grid; gap:12px; color:#a25d2f; }.failure p { margin:0; }
</style>
