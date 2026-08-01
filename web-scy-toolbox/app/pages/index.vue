<script setup lang="ts">
import { Search, Wrench } from 'lucide-vue-next'
import { tools } from '~/data/tools'

useSeoMeta({ title: '工具目录 | SCY Toolbox' })

const keyword = ref('')
const filteredTools = computed(() => {
  const search = keyword.value.trim().toLowerCase()
  if (!search) return tools
  return tools.filter(tool => `${tool.name}${tool.description}`.toLowerCase().includes(search))
})
</script>

<template>
  <div class="catalog-page">
    <header class="catalog-heading">
      <div>
        <p class="eyebrow">SCY TOOLBOX</p>
        <h1>工具目录</h1>
      </div>
      <span>{{ filteredTools.length }} 个工具</span>
    </header>

    <label class="search-input">
      <Search :size="18" aria-hidden="true" />
      <input v-model="keyword" type="search" placeholder="搜索工具" aria-label="搜索工具">
    </label>

    <div v-if="filteredTools.length" class="tool-grid">
      <ToolCard v-for="tool in filteredTools" :key="tool.id" :tool="tool" />
    </div>
    <section v-else class="empty-state panel">
      <Wrench :size="28" aria-hidden="true" />
      <strong>{{ keyword ? '未找到匹配工具' : '暂无工具' }}</strong>
    </section>
  </div>
</template>

<style scoped>
.catalog-page { display: grid; max-width: 980px; gap: 24px; margin: 0 auto; }
.catalog-heading { display: flex; align-items: end; justify-content: space-between; gap: 16px; }
.catalog-heading h1 { margin: 5px 0 0; font-size: 28px; line-height: 1.2; }
.catalog-heading > span { color: var(--muted); font-size: 13px; }
.search-input { display: flex; align-items: center; gap: 11px; height: 48px; padding: 0 14px; border: 1px solid #cbd3d1; border-radius: 6px; background: #fff; color: var(--muted); }
.search-input:focus-within { border-color: var(--green); box-shadow: 0 0 0 3px rgba(20, 114, 93, .13); }
.search-input input { width: 100%; border: 0; outline: 0; background: transparent; color: var(--ink); font: inherit; }
.tool-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.empty-state { min-height: 230px; }
@media (max-width: 640px) { .catalog-heading h1 { font-size: 24px; }.tool-grid { grid-template-columns: 1fr; } }
</style>
