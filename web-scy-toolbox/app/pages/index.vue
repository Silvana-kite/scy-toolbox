<script setup lang="ts">
import { ArrowUpRight, Calculator, Image, LockKeyhole, Search, Sparkles, Type } from 'lucide-vue-next'
import { getTool, toolCategories, tools } from '~/data/tools'
import type { ToolCategoryId, ToolDefinition } from '~/types/tool'

useSeoMeta({ title: 'SCY 百宝箱', description: '本地运行的实用工具集合。' })

const store = useToolboxStore()
const keyword = ref('')
const category = ref<ToolCategoryId | 'all'>('all')
const filteredTools = computed(() => tools.filter(tool => (category.value === 'all' || tool.category === category.value) && `${tool.name}${tool.description}`.toLowerCase().includes(keyword.value.trim().toLowerCase())))
const recentTools = computed(() => {
  const used = new Set<string>()
  return store.history.map(item => item.toolId).filter(id => !used.has(id) && Boolean(used.add(id))).map(getTool).filter((tool): tool is ToolDefinition => Boolean(tool)).slice(0, 3)
})
const starterTools = computed(() => tools.filter(tool => ['calculator', 'qrcode', 'word-count'].includes(tool.id)))

function chooseCategory(id: ToolCategoryId | 'all') {
  category.value = id
  keyword.value = ''
}
</script>

<template>
  <div class="catalog-page">
    <section class="catalog-hero">
      <div class="hero-copy">
        <p class="hero-kicker"><Sparkles :size="15" /> Browser-native workspace</p>
        <h1>让琐碎任务<br>有一个好用的工作台</h1>
        <p>计算、文本、日期和图片处理，全部在当前浏览器完成。无需登录，不上传文件。</p>
      </div>
      <div class="hero-dashboard" aria-label="工具站概览">
        <div class="hero-number"><strong>14</strong><span>个实用工具</span></div>
        <div class="hero-stat"><Calculator :size="19" /><span>计算与换算</span></div>
        <div class="hero-stat"><Image :size="19" /><span>图片本地处理</span></div>
        <div class="hero-stat"><Type :size="19" /><span>文本与日期</span></div>
      </div>
    </section>

    <div class="catalog-layout" :class="{ 'catalog-layout-searching': keyword.trim() }">
      <aside class="catalog-sidebar" aria-label="工具分类">
        <p class="sidebar-label">浏览工具</p>
        <div class="sidebar-categories" role="tablist" aria-label="工具分类">
          <button v-for="item in toolCategories" :key="item.id" class="sidebar-category" :class="{ active: category === item.id }" type="button" role="tab" :aria-selected="category === item.id" @click="chooseCategory(item.id)">
            <span>{{ item.name }}</span><small>{{ item.id === 'all' ? tools.length : tools.filter(tool => tool.category === item.id).length }}</small>
          </button>
        </div>
        <div class="sidebar-note"><LockKeyhole :size="16" /><span>你的输入和历史，只保存在这台设备。</span></div>
      </aside>

      <section class="catalog-main" aria-live="polite">
        <div class="catalog-toolbar">
          <label class="search-input"><Search :size="18" aria-hidden="true" /><input v-model="keyword" type="search" placeholder="搜索工具，例如：房贷、二维码、字数" aria-label="搜索工具"></label>
          <div class="mobile-categories" role="tablist" aria-label="工具分类">
            <button v-for="item in toolCategories" :key="item.id" class="category-button" :class="{ active: category === item.id }" type="button" role="tab" :aria-selected="category === item.id" @click="chooseCategory(item.id)">{{ item.name }}</button>
          </div>
        </div>
        <div class="catalog-result-heading"><div><p class="section-kicker">工具目录</p><h2>{{ category === 'all' ? '从这里开始' : toolCategories.find(item => item.id === category)?.name }}</h2></div><span>{{ filteredTools.length }} 个工具</span></div>
        <div v-if="filteredTools.length" class="tool-grid"><ToolCard v-for="tool in filteredTools" :key="tool.id" :tool="tool" /></div>
        <div v-else class="empty-state"><Search :size="28" aria-hidden="true" /><strong>未找到匹配工具</strong><span>尝试使用其他关键词或分类。</span></div>
      </section>

      <aside v-if="!keyword.trim()" class="catalog-utility" aria-label="快捷工具">
        <section class="utility-section">
          <p class="sidebar-label">{{ recentTools.length ? '最近使用' : '常用入口' }}</p>
          <NuxtLink v-for="tool in (recentTools.length ? recentTools : starterTools)" :key="tool.id" :to="`/tool/${tool.id}`" class="utility-link">
            <span class="utility-icon" :style="{ backgroundColor: tool.accent }"><ToolIcon :name="tool.icon" :size="15" /></span><span>{{ tool.name }}</span><ArrowUpRight :size="15" />
          </NuxtLink>
        </section>
        <section class="utility-section utility-status"><p class="sidebar-label">本地模式</p><strong>无账号 · 无同步</strong><span>关闭页面不会把数据发送到服务器。</span></section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.catalog-page { display: grid; gap: 38px; }
.catalog-hero { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(320px, .65fr); min-height: 300px; overflow: hidden; color: #f9fbfa; background: #183f35; }
.hero-copy { display: grid; align-content: center; gap: 17px; padding: 50px 54px; }
.hero-kicker, .section-kicker, .sidebar-label { margin: 0; font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.hero-kicker { display: inline-flex; align-items: center; gap: 7px; color: #a7d8c8; }
.hero-copy h1 { margin: 0; font-size: 40px; font-weight: 750; line-height: 1.16; }
.hero-copy > p:last-child { max-width: 530px; margin: 0; color: #c7dad3; font-size: 15px; line-height: 1.8; }
.hero-dashboard { display: grid; grid-template-columns: repeat(2, 1fr); align-content: center; gap: 10px; padding: 32px; background: #245244; }
.hero-number { grid-column: span 2; display: flex; align-items: baseline; gap: 10px; padding: 4px 0 13px; border-bottom: 1px solid rgba(255, 255, 255, .18); }.hero-number strong { font-size: 48px; line-height: 1; }.hero-number span { color: #c7dad3; font-size: 13px; }
.hero-stat { display: grid; gap: 8px; padding: 16px 0 4px; color: #dbeae5; font-size: 12px; }.hero-stat svg { color: #a7d8c8; }
.catalog-layout { display: grid; grid-template-columns: 182px minmax(0, 1fr) 210px; gap: 34px; align-items: start; }.catalog-layout-searching { grid-template-columns: 182px minmax(0, 1fr); }
.catalog-sidebar { position: sticky; top: 94px; display: grid; gap: 20px; }.sidebar-label { color: var(--muted); }
.sidebar-categories { display: grid; gap: 4px; }.sidebar-category { display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 39px; padding: 0 10px; border: 0; border-left: 2px solid transparent; color: var(--muted); background: transparent; text-align: left; }.sidebar-category:hover, .sidebar-category.active { border-left-color: var(--green); color: var(--green); background: var(--green-pale); }.sidebar-category small { color: inherit; opacity: .7; }
.sidebar-note { display: grid; gap: 9px; padding: 17px 10px 0; border-top: 1px solid var(--line); color: var(--muted); font-size: 12px; line-height: 1.65; }.sidebar-note svg { color: var(--green); }
.catalog-main { display: grid; min-width: 0; gap: 24px; }.catalog-toolbar { display: grid; gap: 13px; }.search-input { display: flex; align-items: center; gap: 11px; height: 48px; padding: 0 14px; border: 1px solid #cbd3d1; border-radius: 6px; background: #fff; color: var(--muted); }.search-input:focus-within { border-color: var(--green); box-shadow: 0 0 0 3px rgba(20, 114, 93, .13); }.search-input input { width: 100%; border: 0; outline: 0; background: transparent; }
.mobile-categories { display: none; }.category-button { flex: 0 0 auto; min-height: 34px; padding: 0 13px; border: 1px solid var(--line); border-radius: 999px; color: var(--muted); background: #fff; font-size: 13px; }.category-button:hover, .category-button.active { border-color: var(--green); color: var(--green); background: var(--green-pale); }
.catalog-result-heading { display: flex; align-items: end; justify-content: space-between; gap: 16px; }.section-kicker { margin-bottom: 8px; color: var(--green); }.catalog-result-heading h2 { margin: 0; font-size: 24px; line-height: 1.2; }.catalog-result-heading > span { color: var(--muted); font-size: 13px; }.tool-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.catalog-utility { display: grid; gap: 32px; padding-top: 2px; }.utility-section { display: grid; gap: 8px; }.utility-link { display: grid; grid-template-columns: 28px minmax(0, 1fr) 16px; align-items: center; gap: 8px; min-height: 42px; color: var(--ink); font-size: 13px; }.utility-link:hover { color: var(--green); }.utility-link > svg { color: var(--muted); }.utility-icon { display: grid; width: 26px; height: 26px; place-items: center; border-radius: 5px; color: #fff; }.utility-status { padding-top: 19px; border-top: 1px solid var(--line); }.utility-status strong { font-size: 13px; }.utility-status span { color: var(--muted); font-size: 12px; line-height: 1.65; }
@media (max-width: 1120px) { .catalog-layout { grid-template-columns: 168px minmax(0, 1fr); }.catalog-utility { display: none; } }
@media (max-width: 760px) { .catalog-page { gap: 26px; }.catalog-hero { grid-template-columns: 1fr; min-height: 0; }.hero-copy { padding: 34px 26px; }.hero-copy h1 { font-size: 32px; }.hero-dashboard { grid-template-columns: repeat(3, 1fr); padding: 17px 26px 20px; }.hero-number { grid-column: span 3; padding-bottom: 11px; }.hero-number strong { font-size: 36px; }.hero-stat { padding: 4px 0; }.catalog-layout { display: block; }.catalog-sidebar { display: none; }.catalog-main { gap: 21px; }.mobile-categories { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 2px; }.tool-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 520px) { .hero-copy { padding: 29px 21px; }.hero-copy h1 { font-size: 29px; }.hero-copy > p:last-child { font-size: 14px; }.hero-dashboard { padding: 16px 21px 18px; }.hero-stat { font-size: 11px; }.tool-grid { grid-template-columns: 1fr; }.catalog-result-heading h2 { font-size: 21px; } }
</style>
