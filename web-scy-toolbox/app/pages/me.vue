<script setup lang="ts">
import { Clock3, Heart, LogIn, LogOut, Star, Trash2, UserRound } from 'lucide-vue-next'
import { personalErrorMessage, type PersonalOverviewResponse } from '~/composables/use-personal-tools'

useSeoMeta({ title: '我的 | SCY 百宝箱' })

const auth = useAuthStore()
const { overview, clearHistory } = usePersonalTools()
const data = ref<PersonalOverviewResponse | null>(null)
const loading = ref(false)
const error = ref('')

async function load() {
  if (!auth.user) { data.value = null; return }
  loading.value = true; error.value = ''
  try { data.value = await overview() } catch (caught) { error.value = personalErrorMessage(caught) } finally { loading.value = false }
}

async function clear() {
  if (!confirm('仅清除使用历史，不会影响累计使用次数和常用工具。')) return
  try { await clearHistory(); await load() } catch (caught) { error.value = personalErrorMessage(caught) }
}

async function logout() { await auth.logout(); data.value = null }
onMounted(async () => { await auth.loadSession(); await load() })
</script>

<template>
  <ClientOnly>
    <div class="profile-page page-frame">
    <header class="welcome-banner">
      <span class="profile-avatar"><img v-if="auth.user?.avatarUrl" :src="auth.user.avatarUrl" alt=""><UserRound v-else :size="42" /></span>
      <div class="welcome-copy"><p>个人中心</p><h1>{{ auth.user?.nickname || '访客' }}</h1><span>收藏、使用记录和常用工具仅归属当前账户</span></div>
      <button v-if="auth.user" class="button button-soft account-action" type="button" @click="logout"><LogOut :size="16" />退出</button>
      <NuxtLink v-else to="/" class="button account-action"><LogIn :size="16" />登录</NuxtLink>
    </header>

    <section v-if="auth.user" class="summary-card panel">
      <div class="card-title-row"><h2><Heart :size="18" />我的数据</h2><button class="icon-button" title="刷新" aria-label="刷新" :disabled="loading" @click="load">↻</button></div>
      <p v-if="error" class="form-error">{{ error }}</p>
      <div class="stats-grid">
        <div><Heart :size="22" /><strong>{{ data?.favoriteCount || 0 }}</strong><span>我的收藏</span></div>
        <div><Clock3 :size="22" /><strong>{{ data?.usageCount || 0 }}</strong><span>使用次数</span></div>
        <div><Star :size="22" /><strong>{{ data?.topTool?.name || '暂无使用' }}</strong><span>常用工具</span></div>
      </div>
    </section>

    <section v-if="auth.user" class="panel">
      <div class="card-title-row"><h2><Heart :size="18" />我的收藏</h2><NuxtLink to="/me/favorites">查看全部</NuxtLink></div>
      <div v-if="data?.favoritePreview.length" class="personal-list"><NuxtLink v-for="tool in data.favoritePreview" :key="tool.toolId" :to="tool.route || '/me/favorites'">{{ tool.name }}<small v-if="!tool.available">已下线</small></NuxtLink></div>
      <p v-else class="empty-copy">暂无收藏</p>
    </section>

    <section v-if="auth.user" class="panel">
      <div class="card-title-row"><h2><Clock3 :size="18" />使用历史</h2><span><NuxtLink to="/me/history">查看全部</NuxtLink><button v-if="data?.historyPreview.length" class="icon-button delete-history" title="清除使用历史" aria-label="清除使用历史" @click="clear"><Trash2 :size="16" /></button></span></div>
      <div v-if="data?.historyPreview.length" class="personal-list"><NuxtLink v-for="item in data.historyPreview" :key="item.id" :to="item.tool.route || '/me/history'">{{ item.tool.name }}<time>{{ new Date(item.usedAt).toLocaleString('zh-CN', { hour12: false }) }}</time></NuxtLink></div>
      <p v-else class="empty-copy">暂无使用历史</p>
    </section>
    <section v-else class="panel empty-copy">登录后可保存收藏、查看使用历史和常用工具。</section>
    </div>
    <template #fallback><div class="profile-page page-frame panel empty-copy">正在加载个人中心...</div></template>
  </ClientOnly>
</template>

<style scoped>
.profile-page { display: grid; gap: 18px; }.welcome-banner { display: flex; align-items: center; gap: 16px; min-height: 116px; }.profile-avatar { display: grid; width: 78px; height: 78px; place-items: center; overflow: hidden; border-radius: 50%; color: var(--teal); background: var(--mint-pale); }.profile-avatar img { width: 100%; height: 100%; object-fit: cover; }.welcome-copy { display: grid; gap: 4px; }.welcome-copy p, .welcome-copy h1, .welcome-copy span { margin: 0; }.welcome-copy p { color: var(--teal); font-size: 13px; font-weight: 700; }.welcome-copy h1 { font-size: 26px; }.welcome-copy span, .empty-copy { color: var(--muted); font-size: 13px; }.account-action { margin-left: auto; }.summary-card, .panel { padding: 20px; }.card-title-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.card-title-row h2 { display: inline-flex; align-items: center; gap: 8px; margin: 0; font-size: 17px; }.card-title-row > span { display: inline-flex; align-items: center; gap: 8px; }.stats-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 18px; }.stats-grid > div { display: grid; gap: 5px; min-width: 0; color: var(--teal); }.stats-grid strong { overflow: hidden; color: var(--ink); font-size: 22px; text-overflow: ellipsis; white-space: nowrap; }.stats-grid span { color: var(--muted); font-size: 12px; }.personal-list { display: grid; margin-top: 12px; }.personal-list a { display: flex; justify-content: space-between; gap: 12px; padding: 12px 0; border-top: 1px solid var(--line); color: var(--ink); }.personal-list a:first-child { border-top: 0; }.personal-list small, .personal-list time { color: var(--muted); font-size: 12px; }.delete-history { margin-left: 8px; color: #bd6677; }.empty-copy { margin: 16px 0 0; }@media (max-width: 560px) { .welcome-copy span { max-width: 180px; }.stats-grid { gap: 8px; }.stats-grid strong { font-size: 17px; } }
</style>
