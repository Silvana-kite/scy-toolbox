<script setup lang="ts">
import { Clock3, Heart, LogIn, LogOut, Trash2, UserRound, X } from 'lucide-vue-next'
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
const topTool = computed(() => toolbox.mostUsedTool ? getTool(toolbox.mostUsedTool)?.name || '暂无使用' : '暂无使用')
const formTitle = computed(() => formMode.value === 'login' ? '登录账号' : '注册账号')

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
  <div class="profile-page">
    <section class="profile-header">
      <span class="profile-avatar"><img v-if="auth.user?.avatarUrl" :src="auth.user.avatarUrl" alt=""><UserRound v-else :size="28" /></span>
      <div>
        <p class="eyebrow">{{ auth.user ? 'Web 账号' : '未登录' }}</p>
        <h1 class="page-title">{{ auth.user?.nickname || '我的工具箱' }}</h1>
      </div>
      <button v-if="auth.user" class="button button-secondary account-action" type="button" @click="logout"><LogOut :size="16" />退出登录</button>
      <button v-else class="button account-action" type="button" @click="openAccountDialog()"><LogIn :size="16" />登录</button>
    </section>

    <p v-if="auth.error" class="form-error">{{ auth.error }}</p>

    <section class="profile-panel panel">
      <div class="account-summary">
        <span>账号资料</span>
        <strong>{{ auth.user?.username || '登录后同步' }}</strong>
      </div>
      <div class="stats">
        <div><strong>{{ toolbox.favorites.length }}</strong><span>我的收藏</span></div>
        <div><strong>{{ toolbox.usageCount }}</strong><span>使用次数</span></div>
        <div><strong>{{ topTool }}</strong><span>常用工具</span></div>
      </div>
    </section>

    <section class="profile-section">
      <div class="section-heading"><h2><Heart :size="18" />我的收藏</h2></div>
      <div v-if="favoriteTools.length" class="tool-grid"><ToolCard v-for="tool in favoriteTools" :key="tool.id" :tool="tool" /></div>
      <div v-else class="empty-state panel"><Heart :size="28" /><strong>暂无收藏</strong><span>在工具页点击收藏按钮即可添加。</span></div>
    </section>

    <section class="profile-section">
      <div class="section-heading"><h2><Clock3 :size="18" />使用历史</h2><button v-if="toolbox.history.length" class="button button-danger" type="button" @click="toolbox.clearAll()"><Trash2 :size="16" />清除本地记录</button></div>
      <div v-if="toolbox.history.length" class="profile-panel panel history-list"><NuxtLink v-for="item in toolbox.history" :key="item.id" :to="`/tool/${item.toolId}`" class="history-row"><div><strong>{{ getTool(item.toolId)?.name || '未知工具' }}</strong><span>{{ item.result }}</span></div><time>{{ item.createdAt }}</time></NuxtLink></div>
      <div v-else class="empty-state panel"><Clock3 :size="28" /><strong>暂无使用历史</strong><span>运行工具后的结果会保存在此浏览器。</span></div>
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
.profile-page, .profile-section { display: grid; gap: 20px; }.profile-page { max-width: 900px; margin: 0 auto; }
.profile-header { display: flex; align-items: center; gap: 14px; }.profile-avatar { display: grid; width: 54px; height: 54px; place-items: center; overflow: hidden; border-radius: 50%; color: #fff; background: var(--coral); }.profile-avatar img { width: 100%; height: 100%; object-fit: cover; }.account-action { margin-left: auto; }
.profile-panel { padding: 22px; }.account-summary { display: flex; justify-content: space-between; gap: 20px; color: var(--muted); font-size: 13px; }.account-summary strong { overflow: hidden; color: var(--ink); font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 26px; }.stats div { display: grid; gap: 6px; min-width: 0; padding-right: 12px; border-right: 1px solid var(--line); }.stats div:last-child { border: 0; }.stats strong { overflow: hidden; color: var(--green); font-size: 20px; text-overflow: ellipsis; white-space: nowrap; }.stats span { color: var(--muted); font-size: 12px; }
.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }.section-heading h2 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 18px; }.tool-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.history-list { padding: 0; }.history-row { display: flex; justify-content: space-between; gap: 16px; padding: 15px 20px; border-bottom: 1px solid var(--line); }.history-row:last-child { border: 0; }.history-row:hover { background: #fbfcfb; }.history-row div { display: grid; min-width: 0; gap: 5px; }.history-row span { overflow: hidden; color: var(--muted); font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }.history-row time { flex: 0 0 auto; color: var(--muted); font-size: 12px; }
.login-backdrop { position: fixed; z-index: 50; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(27, 34, 39, .4); }.login-dialog { width: min(100%, 380px); padding: 22px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); box-shadow: var(--shadow); }.login-dialog-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }.login-dialog-heading h2 { margin: 0; font-size: 20px; }.account-form { display: grid; gap: 14px; margin-top: 20px; }.account-form label { display: grid; gap: 7px; color: var(--ink); font-size: 13px; font-weight: 700; }.account-form input { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid var(--line); border-radius: 6px; color: var(--ink); font: inherit; }.account-form input:focus { outline: 2px solid rgba(45, 134, 99, .25); border-color: var(--green); }.form-submit { justify-content: center; }.form-submit:disabled { cursor: wait; opacity: .65; }.form-error { margin: 0; color: #be3434; font-size: 13px; }.mode-toggle { justify-self: center; margin-top: 16px; border: 0; color: var(--green); background: transparent; font: inherit; cursor: pointer; }
@media (max-width: 640px) { .profile-panel { padding: 16px; }.account-summary { display: grid; gap: 6px; }.stats { gap: 8px; }.stats strong { font-size: 16px; }.stats span { font-size: 11px; }.tool-grid { grid-template-columns: 1fr; }.section-heading { align-items: flex-start; }.history-row { display: grid; padding: 14px 16px; gap: 6px; } }
</style>
