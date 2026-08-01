<script setup lang="ts">
import type { CatalogTool } from '~/types/catalog'

defineProps<{ tool: CatalogTool }>()
const emit = defineEmits<{ open: [tool: CatalogTool] }>()
</script>

<template>
  <NuxtLink :to="tool.route" class="tool-card" @click="emit('open', tool)">
    <span class="tool-card-icon"><ToolIcon :name="tool.icon" /></span>
    <span class="tool-card-copy"><strong>{{ tool.name }}</strong><small>{{ tool.description }}</small></span>
  </NuxtLink>
</template>

<style scoped>
.tool-card { display: flex; min-height: 116px; gap: 16px; padding: 18px; border: 1px solid var(--line); border-radius: 7px; background: #fff; transition: transform .18s ease, box-shadow .18s ease; }
.tool-card:hover { transform: translateY(-2px); box-shadow: var(--shadow); }.tool-card-icon { display: grid; flex: 0 0 auto; width: 46px; height: 46px; place-items: center; border-radius: 7px; color: #fff; background: var(--blue); }.tool-card-copy { display: grid; align-content: center; min-width: 0; gap: 6px; }.tool-card-copy strong, .tool-card-copy small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.tool-card-copy small { color: var(--muted); font-size: 13px; }
</style>
