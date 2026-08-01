<script setup lang="ts">
import { ArrowLeft, Heart } from 'lucide-vue-next'
import { getTool } from '~/data/tools'

const route = useRoute()
const selectedTool = getTool(String(route.params.id))
if (!selectedTool) throw createError({ statusCode: 404, statusMessage: '工具不存在' })
const tool = selectedTool
useSeoMeta({ title: `${tool.name} | SCY 百宝箱`, description: tool.description })
const store = useToolboxStore()
const favorite = computed(() => store.favorites.includes(tool.id))
</script>

<template>
  <div class="tool-page">
    <NuxtLink to="/" class="back-link"><ArrowLeft :size="17" />返回工具目录</NuxtLink>
    <header class="tool-heading"><div class="tool-heading-main"><span class="tool-heading-icon" :style="{ backgroundColor: tool.accent }"><ToolIcon :name="tool.icon" :size="27" /></span><div><p class="eyebrow">{{ tool.category }}</p><h1 class="page-title">{{ tool.name }}</h1><p class="page-description">{{ tool.description }}</p></div></div><button class="icon-button" :class="{ 'icon-button-active': favorite }" :title="favorite ? '取消收藏' : '收藏工具'" :aria-label="favorite ? '取消收藏' : '收藏工具'" type="button" @click="store.toggleFavorite(tool.id)"><Heart :size="18" :fill="favorite ? 'currentColor' : 'none'" /></button></header>
    <ToolRunner :tool="tool" />
  </div>
</template>

<style scoped>
.tool-page { display: grid; gap: 22px; max-width: 760px; margin: 0 auto; }
.back-link { display: inline-flex; width: max-content; align-items: center; gap: 6px; color: var(--muted); font-size: 13px; }
.back-link:hover { color: var(--green); }
.tool-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.tool-heading-main { display: flex; min-width: 0; gap: 15px; align-items: center; }
.tool-heading-icon { display: grid; flex: 0 0 auto; width: 54px; height: 54px; place-items: center; border-radius: 8px; color: #fff; }
</style>
