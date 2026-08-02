<script setup lang="ts">
import { ArrowLeft, Heart, Wrench } from 'lucide-vue-next'
import { personalErrorMessage } from '~/composables/use-personal-tools'
import type { CatalogTool } from '~/types/catalog'

const route = useRoute()
const auth = useAuthStore()
const { addFavorite, favoriteStatus, queueUse, removeFavorite } = usePersonalTools()
const tool = ref<CatalogTool | null>(null)
const failed = ref(false)
const favorite = ref(false)
const savingFavorite = ref(false)
const syncError = ref('')
const component = computed(() => tool.value ? getToolComponent(tool.value.toolId) : null)

async function loadFavorite() {
  if (!auth.user || !tool.value) { favorite.value = false; return }
  try { favorite.value = (await favoriteStatus(tool.value.toolId)).favorite } catch (error) { favorite.value = false; syncError.value = personalErrorMessage(error) }
}
async function toggleFavorite() {
  if (!tool.value) return
  if (!auth.user) { await navigateTo('/me'); return }
  if (savingFavorite.value) return
  savingFavorite.value = true
  try {
    const result = favorite.value ? await removeFavorite(tool.value.toolId) : await addFavorite(tool.value.toolId)
    favorite.value = result.favorite
    syncError.value = ''
  } catch (error) {
    syncError.value = personalErrorMessage(error)
  } finally { savingFavorite.value = false }
}
async function recordCompletedUse() {
  if (!tool.value) return
  try {
    const result = await queueUse(tool.value.toolId)
    syncError.value = result.error
  } catch (error) { syncError.value = personalErrorMessage(error) }
}

onMounted(async () => {
  await auth.loadSession()
  try { tool.value = (await $fetch<{ tool: CatalogTool }>(`/api/tools/${route.params.id}`)).tool; await loadFavorite() } catch { failed.value = true }
})
</script>
<template><div class="tool-page"><NuxtLink to="/tools" class="back-link"><ArrowLeft :size="17" />返回工具大全</NuxtLink><section v-if="!tool && !failed" class="empty-state panel">正在加载工具</section><section v-else-if="failed" class="empty-state panel"><Wrench :size="28" /><strong>工具不存在或暂不可用</strong></section><template v-else-if="tool"><header class="tool-heading"><div><p class="eyebrow">{{ tool.categoryName }}</p><h1 class="page-title">{{ tool.name }}</h1><p class="page-description">{{ tool.description }}</p></div><button class="icon-button favorite" type="button" :title="auth.user ? (favorite ? '取消收藏' : '收藏工具') : '登录后收藏'" :aria-label="auth.user ? (favorite ? '取消收藏' : '收藏工具') : '登录后收藏'" :disabled="savingFavorite" @click="toggleFavorite"><Heart :size="19" :fill="favorite ? 'currentColor' : 'none'" /></button></header><p v-if="syncError" class="sync-error" role="status">{{ syncError }}</p><component :is="component" v-if="component" @completed="recordCompletedUse" /><section v-else class="empty-state panel">此工具暂未在 Web 端开放</section></template></div></template>
<style scoped>.tool-page { display:grid; gap:22px; max-width:980px; margin:0 auto; }.back-link { display:inline-flex; width:max-content; align-items:center; gap:6px; color:var(--muted); font-size:13px; }.tool-heading { display:flex; align-items:start; justify-content:space-between; gap:16px; }.tool-heading .eyebrow { margin:0; }.favorite { color:var(--pink); }.sync-error { margin:0; color:#a25d2f; font-size:13px; }</style>
