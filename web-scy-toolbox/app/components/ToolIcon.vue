<script setup lang="ts">
import { Wrench } from 'lucide-vue-next'

const props = withDefaults(defineProps<{ name: string; size?: number }>(), { size: 22 })
</script>

<template><Wrench :size="props.size" stroke-width="1.9" /></template>
