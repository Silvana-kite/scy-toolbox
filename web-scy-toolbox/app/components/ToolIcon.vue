<script setup lang="ts">
import { AlignLeft, Calculator, CalendarClock, CalendarRange, Crop, House, ImageDown, Pipette, Percent, QrCode, Ruler, Shuffle, TextCursorInput } from 'lucide-vue-next'

const props = withDefaults(defineProps<{ name: string; size?: number }>(), { size: 22 })
const icons = { 'align-left': AlignLeft, calculator: Calculator, 'calendar-clock': CalendarClock, 'calendar-range': CalendarRange, crop: Crop, house: House, 'image-down': ImageDown, pipette: Pipette, percent: Percent, 'qr-code': QrCode, ruler: Ruler, shuffle: Shuffle, text: TextCursorInput }
</script>

<template><component :is="icons[props.name as keyof typeof icons] || Calculator" :size="props.size" stroke-width="1.9" /></template>
