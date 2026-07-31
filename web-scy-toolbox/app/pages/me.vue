<script setup lang="ts">
import { Clock3, Heart, Trash2, UserRound } from 'lucide-vue-next'
import { getTool } from '~/data/tools'
import type { ToolDefinition } from '~/types/tool'

useSeoMeta({ title: '我的 | SCY 百宝箱' })
const store = useToolboxStore()
const nickname = ref(store.nickname)
watch(() => store.nickname, value => { nickname.value = value })
const favoriteTools = computed(() => store.favorites.map(getTool).filter((tool): tool is ToolDefinition => Boolean(tool)))
const topTool = computed(() => store.mostUsedTool ? getTool(store.mostUsedTool)?.name || '暂无使用' : '暂无使用')
</script>

<template>
  <div class="profile-page">
    <section class="profile-header"><span class="profile-avatar"><UserRound :size="28" /></span><div><p class="eyebrow">本地资料</p><h1 class="page-title">我的工具箱</h1></div></section>
    <section class="profile-panel panel"><label class="field"><span class="field-label">昵称</span><input v-model="nickname" class="input" maxlength="20" @blur="store.setNickname(nickname)"></label><div class="stats"><div><strong>{{ store.favorites.length }}</strong><span>我的收藏</span></div><div><strong>{{ store.usageCount }}</strong><span>使用次数</span></div><div><strong>{{ topTool }}</strong><span>常用工具</span></div></div></section>
    <section class="profile-section"><div class="section-heading"><h2><Heart :size="18" />我的收藏</h2></div><div v-if="favoriteTools.length" class="tool-grid"><ToolCard v-for="tool in favoriteTools" :key="tool.id" :tool="tool" /></div><div v-else class="empty-state panel"><Heart :size="28" /><strong>暂无收藏</strong><span>在工具页点击收藏按钮即可添加。</span></div></section>
    <section class="profile-section"><div class="section-heading"><h2><Clock3 :size="18" />使用历史</h2><button v-if="store.history.length" class="button button-danger" type="button" @click="store.clearAll()"><Trash2 :size="16" />清除全部本地数据</button></div><div v-if="store.history.length" class="profile-panel panel history-list"><NuxtLink v-for="item in store.history" :key="item.id" :to="`/tool/${item.toolId}`" class="history-row"><div><strong>{{ getTool(item.toolId)?.name || '未知工具' }}</strong><span>{{ item.result }}</span></div><time>{{ item.createdAt }}</time></NuxtLink></div><div v-else class="empty-state panel"><Clock3 :size="28" /><strong>暂无使用历史</strong><span>运行工具后的结果会保存在此浏览器。</span></div></section>
  </div>
</template>

<style scoped>
.profile-page, .profile-section { display: grid; gap: 20px; }.profile-page { max-width: 900px; margin: 0 auto; }
.profile-header { display: flex; align-items: center; gap: 14px; }.profile-avatar { display: grid; width: 54px; height: 54px; place-items: center; border-radius: 50%; color: #fff; background: var(--coral); }
.profile-panel { padding: 22px; }.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 26px; }.stats div { display: grid; gap: 6px; min-width: 0; padding-right: 12px; border-right: 1px solid var(--line); }.stats div:last-child { border: 0; }.stats strong { overflow: hidden; color: var(--green); font-size: 20px; text-overflow: ellipsis; white-space: nowrap; }.stats span { color: var(--muted); font-size: 12px; }
.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }.section-heading h2 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 18px; }.tool-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.history-list { padding: 0; }.history-row { display: flex; justify-content: space-between; gap: 16px; padding: 15px 20px; border-bottom: 1px solid var(--line); }.history-row:last-child { border: 0; }.history-row:hover { background: #fbfcfb; }.history-row div { display: grid; min-width: 0; gap: 5px; }.history-row span { overflow: hidden; color: var(--muted); font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }.history-row time { flex: 0 0 auto; color: var(--muted); font-size: 12px; }
@media (max-width: 640px) { .profile-panel { padding: 16px; }.stats { gap: 8px; }.stats strong { font-size: 16px; }.stats span { font-size: 11px; }.tool-grid { grid-template-columns: 1fr; }.section-heading { align-items: flex-start; }.history-row { display: grid; padding: 14px 16px; gap: 6px; } }
</style>
