<script setup lang="ts">
import { ArrowLeft, Wrench } from 'lucide-vue-next'
import type { CatalogTool } from '~/types/catalog'

const route = useRoute(); const tool = ref<CatalogTool | null>(null); const failed = ref(false)
const component = computed(() => tool.value ? getToolComponent(tool.value.toolId) : null)
onMounted(async () => { try { tool.value = (await $fetch<{ tool: CatalogTool }>(`/api/tools/${route.params.id}`)).tool } catch { failed.value = true } })
</script>
<template><div class="tool-page"><NuxtLink to="/tools" class="back-link"><ArrowLeft :size="17" />返回工具大全</NuxtLink><section v-if="!tool && !failed" class="empty-state panel">正在加载工具</section><section v-else-if="failed" class="empty-state panel"><Wrench :size="28" /><strong>工具不存在或暂不可用</strong></section><template v-else-if="tool"><header class="tool-heading"><p class="eyebrow">{{ tool.categoryName }}</p><h1 class="page-title">{{ tool.name }}</h1><p class="page-description">{{ tool.description }}</p></header><component :is="component" v-if="component" /><section v-else class="empty-state panel">此工具暂未在 Web 端开放</section></template></div></template>
<style scoped>.tool-page { display:grid; gap:22px; max-width:980px; margin:0 auto; }.back-link { display:inline-flex; width:max-content; align-items:center; gap:6px; color:var(--muted); font-size:13px; }.tool-heading { display:grid; gap:4px; }.tool-heading .eyebrow { margin:0; }</style>
