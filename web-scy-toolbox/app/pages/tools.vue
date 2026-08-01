<script setup lang="ts">
import { Search, Wrench } from 'lucide-vue-next'
import type { CatalogTool } from '~/types/catalog'

useSeoMeta({ title: '工具大全 | SCY 百宝箱' })
const auth = useAuthStore(); const { catalog, recordUse } = useToolCatalog()
const tools = ref<CatalogTool[]>([]); const keyword = ref(''); const loading = ref(true); const error = ref(false)
const categories = computed(() => Array.from(new Map(tools.value.map(tool => [tool.categoryId, tool])).values()).sort((a, b) => a.categoryOrder - b.categoryOrder))
const filtered = computed(() => { const term = keyword.value.trim().toLowerCase(); return tools.value.filter(tool => !term || `${tool.name}${tool.description}${tool.categoryName}`.toLowerCase().includes(term)) })
async function load(force = false) { loading.value = true; error.value = false; try { const result = await catalog(force); tools.value = result.data.tools } catch { error.value = true } finally { loading.value = false } }
function openTool(tool: CatalogTool) { if (auth.user) recordUse(tool.toolId).catch(() => {}) }
onMounted(async () => { await auth.loadSession(); await load() })
</script>

<template><div class="catalog-page"><header class="catalog-heading"><div><p class="eyebrow">SCY TOOLBOX</p><h1>工具大全</h1></div><span>{{ filtered.length }} 个工具</span></header><label class="search-input"><Search :size="18" /><input v-model="keyword" type="search" placeholder="搜索工具"></label><section v-if="loading" class="empty-state panel">正在加载工具</section><section v-else-if="error" class="empty-state panel"><Wrench :size="28" /><strong>工具加载失败</strong><button class="button" @click="load(true)">重新加载</button></section><template v-else><section v-for="category in categories" :key="category.categoryId" class="category-section"><h2>{{ category.categoryName }}</h2><div class="tool-grid"><CatalogToolCard v-for="tool in filtered.filter(item => item.categoryId === category.categoryId)" :key="tool.toolId" :tool="tool" @open="openTool" /></div></section></template></div></template>
<style scoped>.catalog-page { display: grid; max-width: 980px; gap: 24px; margin: 0 auto; }.catalog-heading { display: flex; align-items: end; justify-content: space-between; }.catalog-heading h1 { margin: 5px 0 0; font-size: 28px; }.catalog-heading > span { color: var(--muted); font-size: 13px; }.search-input { display: flex; align-items: center; gap: 11px; height: 48px; padding: 0 14px; border: 1px solid #cbd3d1; border-radius: 6px; background: #fff; color: var(--muted); }.search-input input { width: 100%; border: 0; outline: 0; background: transparent; }.category-section { display: grid; gap: 12px; }.category-section h2 { margin: 0; font-size: 17px; }.tool-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }@media (max-width:640px) { .tool-grid { grid-template-columns: 1fr; } }</style>
