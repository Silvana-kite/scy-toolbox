<script setup lang="ts">
import QRCode from 'qrcode'
import { Download, Upload } from 'lucide-vue-next'
import type { ToolDefinition, ToolResult } from '~/types/tool'

const props = defineProps<{ tool: ToolDefinition; values: Record<string, string | number> }>()
const emit = defineEmits<{ result: [value: ToolResult]; error: [value: string] }>()
const file = ref<File | null>(null)
const preview = ref('')
const outputUrl = ref('')
const pickedColor = ref<{ hex: string; rgb: string } | null>(null)
const calibrate = ref(1)
const imageCanvas = ref<HTMLCanvasElement | null>(null)

const accept = computed(() => props.tool.id === 'compress' ? 'image/jpeg,image/png,image/webp' : 'image/*')
const ratio = computed(() => {
  const parts = String(props.values.ratio || '1:1').split(':')
  return Number(parts[0] || 1) / Number(parts[1] || 1)
})

function formatBytes(bytes: number) { return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB` }
function download(url: string, name: string) { const link = document.createElement('a'); link.href = url; link.download = name; link.click() }
function readImage(source: File) { return new Promise<HTMLImageElement>((resolve, reject) => { const url = URL.createObjectURL(source); const image = new Image(); image.onload = () => { URL.revokeObjectURL(url); resolve(image) }; image.onerror = reject; image.src = url }) }
function canvasBlob(canvas: HTMLCanvasElement, quality = .82) { return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('无法导出图片')), 'image/jpeg', quality)) }

function choose(event: Event) {
  const selected = (event.target as HTMLInputElement).files?.[0]
  if (!selected) return
  file.value = selected
  preview.value = URL.createObjectURL(selected)
  outputUrl.value = ''
  pickedColor.value = null
}

async function runCompress() {
  if (!file.value) return emit('error', '请先选择图片')
  try {
    const image = await readImage(file.value); const max = 1920; const scale = Math.min(1, max / Math.max(image.width, image.height)); const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale); canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height); const blob = await canvasBlob(canvas); outputUrl.value = URL.createObjectURL(blob); emit('result', { title: '图片已压缩', text: `${formatBytes(file.value.size)} → ${formatBytes(blob.size)}`, detail: '文件只在当前浏览器中处理', downloadable: true })
  } catch { emit('error', '图片压缩失败，请更换图片后重试') }
}

async function runCrop() {
  if (!file.value) return emit('error', '请先选择图片')
  try {
    const image = await readImage(file.value); let width = image.width; let height = width / ratio.value; if (height > image.height) { height = image.height; width = height * ratio.value }; const sourceX = (image.width - width) / 2; const sourceY = (image.height - height) / 2; const canvas = document.createElement('canvas'); canvas.width = Math.round(width); canvas.height = Math.round(height); canvas.getContext('2d')?.drawImage(image, sourceX, sourceY, width, height, 0, 0, canvas.width, canvas.height); const blob = await canvasBlob(canvas, .92); outputUrl.value = URL.createObjectURL(blob); emit('result', { title: '图片已裁剪', text: `已按 ${props.values.ratio} 导出`, detail: '裁剪区域以图片中心为基准', downloadable: true })
  } catch { emit('error', '图片裁剪失败，请更换图片后重试') }
}

async function runQr() {
  const content = String(props.values.content || '').trim()
  if (!content) return emit('error', '请先输入二维码内容')
  try { outputUrl.value = await QRCode.toDataURL(content, { width: 640, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#20242a', light: '#ffffff' } }); emit('result', { title: '二维码已生成', text: content, detail: '可下载 PNG 图片', downloadable: true }) } catch { emit('error', '二维码生成失败，请检查输入内容') }
}

async function prepareColorCanvas() {
  if (!file.value || !imageCanvas.value) return
  try { const image = await readImage(file.value); const max = 1000; const scale = Math.min(1, max / Math.max(image.width, image.height)); imageCanvas.value.width = image.width * scale; imageCanvas.value.height = image.height * scale; imageCanvas.value.getContext('2d', { willReadFrequently: true })?.drawImage(image, 0, 0, imageCanvas.value.width, imageCanvas.value.height); emit('result', { title: '图片已载入', text: '点击图片读取颜色', detail: '不会上传图片' }) } catch { emit('error', '图片读取失败') }
}

function pickColor(event: MouseEvent) {
  const canvas = imageCanvas.value; if (!canvas) return
  const rect = canvas.getBoundingClientRect(); const x = Math.floor((event.clientX - rect.left) * canvas.width / rect.width); const y = Math.floor((event.clientY - rect.top) * canvas.height / rect.height); const value = canvas.getContext('2d', { willReadFrequently: true })?.getImageData(x, y, 1, 1).data; if (!value) return
  const [red = 0, green = 0, blue = 0] = value
  const hex = `#${[red, green, blue].map(item => item.toString(16).padStart(2, '0')).join('').toUpperCase()}`
  pickedColor.value = { hex, rgb: `rgb(${red}, ${green}, ${blue})` }
  emit('result', { title: '颜色已读取', text: hex, detail: pickedColor.value.rgb })
}
</script>

<template>
  <div class="image-workbench">
    <template v-if="tool.id === 'ruler'">
      <label class="field"><span class="field-label">校准比例</span><div class="range-field"><input v-model.number="calibrate" type="range" min="0.7" max="1.3" step="0.01"><output>{{ calibrate.toFixed(2) }}×</output></div><span class="field-help">将尺子与实体尺对齐后调整比例；不同屏幕需要单独校准。</span></label>
      <div class="screen-ruler" :style="{ '--cm': `${37.795 * calibrate}px` }"><span v-for="item in 16" :key="item">{{ item - 1 }}</span></div>
    </template>
    <template v-else>
      <label v-if="tool.id !== 'qrcode'" class="upload-zone"><Upload :size="20" /><span>{{ file ? file.name : '选择本地图片' }}</span><input :accept="accept" type="file" @change="choose"></label>
      <div v-if="tool.id === 'color-picker' && preview" class="color-canvas-wrap"><canvas ref="imageCanvas" class="color-canvas" @click="pickColor" /><button class="button button-secondary" type="button" @click="prepareColorCanvas">载入图片</button></div>
      <div v-else-if="preview || outputUrl" class="image-preview"><img :src="outputUrl || preview" alt="本地图片预览"></div>
      <div v-if="pickedColor" class="picked-color"><span :style="{ background: pickedColor.hex }" /><strong>{{ pickedColor.hex }}</strong><small>{{ pickedColor.rgb }}</small></div>
      <button v-if="tool.id === 'compress' || tool.id === 'crop' || tool.id === 'qrcode'" class="button" type="button" @click="tool.id === 'compress' ? runCompress() : tool.id === 'crop' ? runCrop() : runQr()">{{ tool.actionLabel }}</button>
      <button v-if="tool.id === 'color-picker' && file" class="button" type="button" @click="prepareColorCanvas">{{ tool.actionLabel }}</button>
      <button v-if="outputUrl" class="button button-secondary" type="button" @click="download(outputUrl, `${tool.id}-${Date.now()}.png`)"><Download :size="16" />下载结果</button>
    </template>
  </div>
</template>

<style scoped>
.image-workbench { display: grid; gap: 18px; }
.upload-zone { display: flex; min-height: 100px; align-items: center; justify-content: center; gap: 10px; padding: 16px; overflow: hidden; border: 1px dashed #9bc8b7; border-radius: 8px; color: var(--green); background: #f7fcf9; text-overflow: ellipsis; white-space: nowrap; }
.upload-zone input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.image-preview { display: grid; max-height: 360px; place-items: center; overflow: hidden; border: 1px solid var(--line); border-radius: 8px; background: #f3f5f5; }
.image-preview img { display: block; max-width: 100%; max-height: 360px; object-fit: contain; }
.color-canvas-wrap { display: grid; gap: 10px; }
.color-canvas { width: 100%; max-height: 380px; cursor: crosshair; border: 1px solid var(--line); border-radius: 8px; object-fit: contain; }
.picked-color { display: flex; align-items: center; gap: 10px; }
.picked-color span { width: 34px; height: 34px; border: 1px solid var(--line); border-radius: 6px; }
.picked-color small { color: var(--muted); }
.range-field { display: flex; gap: 12px; align-items: center; min-height: 42px; padding: 0 12px; border: 1px solid #ced5d7; border-radius: 7px; }
.range-field input { flex: 1; accent-color: var(--green); }
.range-field output { color: var(--green); font-size: 13px; font-weight: 700; }
.screen-ruler { display: flex; width: min(100%, calc(var(--cm) * 15)); height: 82px; overflow: hidden; border-top: 2px solid var(--ink); background: repeating-linear-gradient(90deg, var(--ink) 0 1px, transparent 1px calc(var(--cm) / 10)); }
.screen-ruler span { position: relative; flex: 0 0 var(--cm); padding: 9px 0 0 3px; font-size: 12px; }
.screen-ruler span::before { position: absolute; top: 0; left: 0; width: 1px; height: 22px; background: var(--ink); content: ''; }
</style>
