<script setup lang="ts">
import { Boxes, Heart, House, UserRound } from 'lucide-vue-next'

const route = useRoute()

const links = [
  { to: '/', label: '工具', icon: House },
  { to: '/me', label: '我的', icon: UserRound },
]

function isActive(to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}
</script>

<template>
  <header class="site-header">
    <div class="site-header-inner">
      <NuxtLink to="/" class="brand" aria-label="SCY 百宝箱首页">
        <span class="brand-mark" aria-hidden="true"><Boxes :size="20" /></span>
        <span>SCY 百宝箱</span>
      </NuxtLink>
      <nav aria-label="主导航" class="site-nav">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="nav-link"
          :class="{ 'nav-link-active': isActive(link.to) }"
        >
          <component :is="link.icon" :size="17" aria-hidden="true" />
          <span>{{ link.label }}</span>
        </NuxtLink>
      </nav>
      <NuxtLink to="/me" class="header-favorites" aria-label="查看我的收藏与历史">
        <Heart :size="18" aria-hidden="true" />
      </NuxtLink>
    </div>
  </header>
</template>
