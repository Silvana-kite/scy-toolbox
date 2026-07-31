<script setup lang="ts">
import type { ToolDefinition } from '~/types/tool'

defineProps<{ tool: ToolDefinition }>()
</script>

<template>
  <NuxtLink :to="`/tool/${tool.id}`" class="tool-card" :style="{ '--tool-accent': tool.accent }">
    <span class="tool-card-icon" :style="{ backgroundColor: tool.accent }"><ToolIcon :name="tool.icon" /></span>
    <span class="tool-card-copy"><strong>{{ tool.name }}</strong><small>{{ tool.description }}</small></span>
  </NuxtLink>
</template>

<style scoped>
.tool-card { position: relative; display: flex; min-height: 126px; gap: 16px; min-width: 0; padding: 21px 18px; overflow: hidden; border: 1px solid var(--line); border-radius: 6px; background: #fff; transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
.tool-card::after { position: absolute; top: 0; right: 0; bottom: 0; width: 3px; background: var(--tool-accent, var(--green)); content: ''; opacity: .78; }
.tool-card:hover { transform: translateY(-3px); border-color: #b7d4c9; box-shadow: 0 18px 34px rgba(26, 44, 38, .11); }
.tool-card-icon { display: grid; flex: 0 0 auto; width: 46px; height: 46px; place-items: center; border-radius: 6px; color: #fff; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .18); }
.tool-card-copy { display: grid; align-content: center; min-width: 0; gap: 7px; padding-right: 10px; }
strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 16px; }
small { color: var(--muted); font-size: 13px; line-height: 1.55; }
@media (max-width: 640px) { .tool-card { min-height: 100px; padding: 16px; }.tool-card-copy { gap: 4px; }.tool-card-icon { width: 42px; height: 42px; } small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } }
</style>
