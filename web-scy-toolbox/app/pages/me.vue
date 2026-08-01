<script setup lang="ts">
import { Clock3, Grid2X2, Heart, LogIn, LogOut, Sparkles, Star, Trash2, UserRound, X } from 'lucide-vue-next'
import { getTool } from '~/data/tools'
import type { ToolDefinition } from '~/types/tool'

useSeoMeta({ title: '我的 | SCY 百宝箱' })

const toolbox = useToolboxStore()
const auth = useAuthStore()
const loginDialogOpen = ref(false)
const formMode = ref<'login' | 'register'>('login')
const form = reactive({ username: '', password: '', nickname: '' })
const submitting = ref(false)
const favoriteTools = computed(() => toolbox.favorites.map(getTool).filter((tool): tool is ToolDefinition => Boolean(tool)))
const topTool = computed(() => toolbox.mostUsedTool ? getTool(toolbox.mostUsedTool)?.name || '0' : '0')
const formTitle = computed(() => formMode.value === 'login' ? '登录账号' : '注册账号')
const displayName = computed(() => auth.user?.nickname || '访客')

onMounted(() => auth.loadSession())

function openAccountDialog(mode: 'login' | 'register' = 'login') {
  auth.error = ''
  formMode.value = mode
  form.password = ''
  loginDialogOpen.value = true
}

async function submitAccount() {
  submitting.value = true
  const success = formMode.value === 'login'
    ? await auth.login({ username: form.username, password: form.password })
    : await auth.register({ username: form.username, password: form.password, nickname: form.nickname })
  submitting.value = false
  if (success) loginDialogOpen.value = false
}

async function logout() {
  await auth.logout()
  loginDialogOpen.value = false
}
</script>

<template>
  <div class="profile-page page-frame">
    <header class="welcome-banner">
      <div class="avatar-wrap">
        <span class="profile-avatar">
          <img v-if="auth.user?.avatarUrl" :src="auth.user.avatarUrl" alt="">
          <UserRound v-else :size="42" stroke-width="1.55" />
        </span>
        <span class="avatar-badge"><Heart :size="13" fill="currentColor" /></span>
      </div>
      <div class="welcome-copy">
        <p>{{ auth.user ? '欢迎回来' : '欢迎使用' }} <Sparkles :size="15" /></p>
        <h1>{{ displayName }}</h1>
        <span>高效工具，便捷生活</span>
      </div>
      <button v-if="auth.user" class="button button-soft account-action" type="button" @click="logout"><LogOut :size="16" />退出登录</button>
      <button v-else class="button account-action" type="button" @click="openAccountDialog()"><LogIn :size="16" />登录</button>
    </header>

    <p v-if="auth.error" class="form-error profile-error">{{ auth.error }}</p>

    <section class="summary-card panel">
      <div class="card-title-row">
        <h2><Heart :size="18" fill="currentColor" />我的数据</h2>
        <span class="sync-state"><Sparkles :size="14" />{{ auth.user ? '账号资料已同步' : '登录后同步资料' }}</span>
      </div>
      <div class="stats-grid">
        <div class="stat-item stat-pink">
          <span class="stat-icon"><Heart :size="24" fill="currentColor" /></span>
          <div><strong>{{ toolbox.favorites.length }}</strong><span>我的收藏</span></div>
        </div>
        <div class="stat-item stat-mint">
          <span class="stat-icon"><Grid2X2 :size="24" /></span>
          <div><strong>{{ toolbox.usageCount }}</strong><span>使用次数</span></div>
        </div>
        <div class="stat-item stat-blue">
          <span class="stat-icon"><Star :size="24" fill="currentColor" /></span>
          <div><strong class="top-tool">{{ topTool }}</strong><span>常用工具</span></div>
        </div>
      </div>
    </section>

    <section class="collection-card panel">
      <div class="card-title-row">
        <h2><Heart :size="18" />我的收藏</h2>
      </div>
      <div v-if="favoriteTools.length" class="tool-grid collection-grid">
        <ToolCard v-for="tool in favoriteTools" :key="tool.id" :tool="tool" />
      </div>
      <div v-else class="soft-empty soft-empty-pink">
        <span class="empty-icon"><Heart :size="30" fill="currentColor" /></span>
        <div><strong>暂无收藏</strong><span>把常用工具收在这里</span></div>
        <NuxtLink to="/" class="button button-soft button-small">前往工具</NuxtLink>
      </div>
    </section>

    <section class="history-card panel">
      <div class="card-title-row">
        <h2><Clock3 :size="18" />使用历史</h2>
        <button v-if="toolbox.history.length" class="icon-button delete-history" type="button" title="清除本地记录" aria-label="清除本地记录" @click="toolbox.clearAll()"><Trash2 :size="17" /></button>
      </div>
      <div v-if="toolbox.history.length" class="history-list">
        <NuxtLink v-for="item in toolbox.history" :key="item.id" :to="`/tool/${item.toolId}`" class="history-row">
          <div><strong>{{ getTool(item.toolId)?.name || '已移除工具' }}</strong><span>{{ item.result }}</span></div>
          <time>{{ item.createdAt }}</time>
        </NuxtLink>
      </div>
      <div v-else class="soft-empty soft-empty-mint">
        <span class="empty-icon"><Clock3 :size="31" /></span>
        <div><strong>暂无使用历史</strong><span>运行工具后的结果会保存在这里</span></div>
        <NuxtLink to="/" class="button button-soft button-small">前往工具</NuxtLink>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="loginDialogOpen" class="login-backdrop" role="presentation" @click.self="loginDialogOpen = false">
        <section class="login-dialog" role="dialog" aria-modal="true" :aria-label="formTitle">
          <div class="login-dialog-heading">
            <div><p class="eyebrow">SCY TOOLBOX</p><h2>{{ formTitle }}</h2></div>
            <button class="icon-button" type="button" aria-label="关闭登录窗口" @click="loginDialogOpen = false"><X :size="18" /></button>
          </div>
          <form class="account-form" @submit.prevent="submitAccount">
            <label>账号<input v-model="form.username" autocomplete="username" maxlength="32" pattern="[a-zA-Z0-9_]{3,32}" placeholder="3-32 位字母、数字或下划线" required></label>
            <label v-if="formMode === 'register'">昵称<input v-model="form.nickname" autocomplete="nickname" maxlength="30" placeholder="选填"></label>
            <label>密码<input v-model="form.password" type="password" autocomplete="current-password" minlength="8" maxlength="72" placeholder="8-72 位字符" required></label>
            <p v-if="auth.error" class="form-error">{{ auth.error }}</p>
            <button class="button form-submit" type="submit" :disabled="submitting">{{ submitting ? '正在提交' : formTitle }}</button>
          </form>
          <button class="mode-toggle" type="button" @click="formMode === 'login' ? openAccountDialog('register') : openAccountDialog('login')">{{ formMode === 'login' ? '没有账号？注册' : '已有账号？登录' }}</button>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.profile-page { display: grid; gap: 18px; }
.welcome-banner { display: flex; align-items: center; min-height: 128px; gap: 18px; padding: 10px 14px; }
.avatar-wrap { position: relative; flex: 0 0 auto; }
.profile-avatar { display: grid; width: 94px; height: 94px; place-items: center; overflow: hidden; border: 4px solid #fff; border-radius: 50%; color: #5cae9b; background: #dff4ee; box-shadow: 0 10px 26px rgba(67, 159, 139, .16); }
.profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-badge { position: absolute; right: 0; bottom: 2px; display: grid; width: 28px; height: 28px; place-items: center; border: 3px solid var(--canvas); border-radius: 50%; color: #fff; background: var(--pink); }
.welcome-copy { display: grid; gap: 3px; }.welcome-copy p { display: inline-flex; align-items: center; gap: 5px; margin: 0; color: var(--pink); font-size: 14px; font-weight: 800; }.welcome-copy h1 { margin: 0; font-size: 30px; line-height: 1.24; }.welcome-copy > span { color: var(--muted); font-size: 13px; }
.account-action { margin-left: auto; }.profile-error { margin: 0 10px; }
.summary-card, .collection-card, .history-card { padding: 20px; }.card-title-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; }.card-title-row h2 { display: inline-flex; align-items: center; gap: 8px; margin: 0; color: var(--ink); font-size: 17px; }.collection-card .card-title-row h2 { color: var(--pink); }.history-card .card-title-row h2 { color: var(--teal); }.sync-state { display: inline-flex; align-items: center; gap: 5px; color: var(--teal); font-size: 12px; font-weight: 700; }
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); margin-top: 20px; }.stat-item { display: flex; align-items: center; min-width: 0; gap: 15px; padding: 0 24px; border-right: 1px solid var(--line); }.stat-item:first-child { padding-left: 0; }.stat-item:last-child { padding-right: 0; border-right: 0; }.stat-icon { display: grid; flex: 0 0 auto; width: 55px; height: 55px; place-items: center; border-radius: 17px; }.stat-item div { display: grid; min-width: 0; gap: 3px; }.stat-item strong { overflow: hidden; font-size: 26px; line-height: 1; text-overflow: ellipsis; white-space: nowrap; }.stat-item div > span { color: var(--muted); font-size: 12px; }.stat-pink .stat-icon { color: var(--pink); background: var(--pink-pale); }.stat-pink strong { color: var(--pink); }.stat-mint .stat-icon { color: var(--teal); background: var(--mint-pale); }.stat-mint strong { color: var(--teal); }.stat-blue .stat-icon { color: var(--blue); background: var(--blue-pale); }.stat-blue strong { color: var(--blue); }.stat-item strong.top-tool { max-width: 140px; font-size: 20px; }
.collection-grid { margin-top: 17px; }.soft-empty { display: grid; grid-template-columns: 72px minmax(0, 1fr) auto; align-items: center; gap: 17px; min-height: 108px; margin-top: 15px; padding: 17px 24px; border-radius: 7px; }.soft-empty-pink { color: var(--pink); background: #fff6f9; }.soft-empty-mint { color: var(--teal); background: #effaf7; }.empty-icon { display: grid; width: 64px; height: 64px; place-items: center; border-radius: 50%; background: rgba(255, 255, 255, .68); }.soft-empty > div { display: grid; gap: 5px; }.soft-empty strong { color: var(--ink); font-size: 15px; }.soft-empty div > span { color: var(--muted); font-size: 13px; }.button-small { min-height: 34px; padding: 0 12px; font-size: 12px; }
.history-list { margin-top: 14px; }.history-row { display: flex; justify-content: space-between; gap: 16px; padding: 14px 4px; border-top: 1px solid var(--line); }.history-row:first-child { border-top: 0; }.history-row:hover { color: var(--teal); }.history-row div { display: grid; min-width: 0; gap: 5px; }.history-row span { overflow: hidden; color: var(--muted); font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }.history-row time { flex: 0 0 auto; color: var(--muted); font-size: 12px; }.delete-history { color: #bd6677; border-color: #f2ced8; background: #fff8fa; }
.login-backdrop { position: fixed; z-index: 50; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(49, 64, 68, .26); backdrop-filter: blur(3px); }.login-dialog { width: min(100%, 390px); padding: 24px; border: 1px solid #f1dde4; border-radius: 8px; background: var(--surface); box-shadow: 0 24px 56px rgba(57, 78, 82, .17); }.login-dialog-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }.login-dialog-heading h2 { margin: 0; font-size: 20px; }.account-form { display: grid; gap: 14px; margin-top: 20px; }.account-form label { display: grid; gap: 7px; color: var(--ink); font-size: 13px; font-weight: 700; }.account-form input { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid var(--line); border-radius: 6px; color: var(--ink); font: inherit; }.account-form input:focus { outline: 2px solid rgba(93, 191, 166, .22); border-color: var(--teal); }.form-submit { justify-content: center; }.form-submit:disabled { cursor: wait; opacity: .65; }.mode-toggle { justify-self: center; margin-top: 16px; border: 0; color: var(--teal); background: transparent; font: inherit; cursor: pointer; }
@media (max-width: 720px) { .welcome-banner { min-height: 112px; padding: 6px 0; }.profile-avatar { width: 72px; height: 72px; }.welcome-copy h1 { font-size: 24px; }.stats-grid { gap: 12px; }.stat-item { display: grid; gap: 8px; padding: 0 10px; }.stat-icon { width: 45px; height: 45px; border-radius: 14px; }.stat-item strong { font-size: 22px; }.stat-item strong.top-tool { max-width: 80px; font-size: 16px; }.soft-empty { grid-template-columns: 54px minmax(0, 1fr); gap: 12px; padding: 15px; }.empty-icon { width: 50px; height: 50px; }.soft-empty .button { grid-column: 2; justify-self: start; }.summary-card, .collection-card, .history-card { padding: 16px; } }
@media (max-width: 480px) { .welcome-banner { align-items: flex-start; }.welcome-copy { padding-top: 7px; }.account-action { position: absolute; right: 16px; top: 76px; min-height: 34px; padding: 0 10px; font-size: 12px; }.stats-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }.stat-item { border: 0; padding: 0; }.stat-item:first-child { padding-left: 0; }.stat-item div > span { font-size: 11px; }.sync-state { display: none; } }
</style>
