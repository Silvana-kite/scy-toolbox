<script setup lang="ts">
import { Check, Copy, Trash2 } from 'lucide-vue-next'
import type { ToolDefinition, ToolResult } from '~/types/tool'

const props = defineProps<{ tool: ToolDefinition }>()
const store = useToolboxStore()
const { copy, copied } = useClipboard()
const values = ref<Record<string, string | number>>({})
const result = ref<ToolResult | null>(null)
const error = ref('')

function reset() {
  values.value = Object.fromEntries(props.tool.fields.map(field => [field.key, field.default]))
  result.value = null
  error.value = ''
}

watch(() => props.tool.id, reset, { immediate: true })
const history = computed(() => store.history.filter(item => item.toolId === props.tool.id))

function saveResult(value: ToolResult) {
  result.value = value
  error.value = ''
  store.addHistory(props.tool.id, value.text)
}

function run() {
  try { saveResult(executeTool(props.tool.id, values.value)) } catch (caught) { error.value = caught instanceof Error ? caught.message : '无法执行，请检查输入内容'; result.value = null }
}

function updateValue(key: string, value: string | number) {
  values.value = { ...values.value, [key]: value }
}
</script>

<template>
  <div class="tool-runner">
    <section class="runner-panel panel">
      <div v-if="tool.fields.length" class="tool-fields">
        <label v-for="field in tool.fields" :key="field.key" class="field">
          <span class="field-label">{{ field.label }}</span>
          <textarea v-if="field.type === 'textarea'" :value="values[field.key]" :placeholder="field.placeholder" class="textarea" @input="updateValue(field.key, ($event.target as HTMLTextAreaElement).value)" />
          <select v-else-if="field.type === 'select'" :value="values[field.key]" class="select" @change="updateValue(field.key, ($event.target as HTMLSelectElement).value)"><option v-for="option in field.options" :key="option.value" :value="option.value">{{ option.label }}</option></select>
          <div v-else-if="field.type === 'range'" class="range-field"><input :value="values[field.key]" :min="field.min" :max="field.max" :step="field.step" type="range" @input="updateValue(field.key, Number(($event.target as HTMLInputElement).value))"><output>{{ values[field.key] }}{{ field.suffix }}</output></div>
          <input v-else :value="values[field.key]" :min="field.min" :type="field.type" :placeholder="field.placeholder" class="input" @input="updateValue(field.key, ($event.target as HTMLInputElement).value)">
        </label>
      </div>
      <button class="button run-button" type="button" @click="run">{{ tool.actionLabel }}</button>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    </section>

    <section v-if="result" class="result-panel panel" aria-live="polite">
      <div class="result-heading"><div><p class="eyebrow">结果</p><h2>{{ result.title }}</h2></div><button class="icon-button" type="button" :aria-label="copied ? '已复制结果' : '复制结果'" :title="copied ? '已复制' : '复制结果'" @click="copy(result.text)"><Check v-if="copied" :size="17" /><Copy v-else :size="17" /></button></div>
      <pre>{{ result.text }}</pre>
      <p v-if="result.detail">{{ result.detail }}</p>
    </section>

    <section class="history-panel panel">
      <div class="history-heading"><div><p class="eyebrow">本地历史</p><h2>最近结果</h2></div><button v-if="history.length" class="icon-button" type="button" title="清除当前工具历史" aria-label="清除当前工具历史" @click="store.clearToolHistory(tool.id)"><Trash2 :size="17" /></button></div>
      <div v-if="history.length" class="history-list"><div v-for="item in history" :key="item.id" class="history-item"><span>{{ item.result }}</span><time>{{ item.createdAt }}</time></div></div>
      <div v-else class="history-empty">运行后的结果将保存在此浏览器。</div>
    </section>
  </div>
</template>

<style scoped>
.tool-runner { display: grid; gap: 18px; }
.runner-panel, .result-panel, .history-panel { padding: 22px; }
.tool-fields { display: grid; gap: 18px; }
.range-field { display: flex; gap: 12px; align-items: center; min-height: 42px; padding: 0 12px; border: 1px solid #ced5d7; border-radius: 7px; }
.range-field input { flex: 1; accent-color: var(--green); }
.range-field output { min-width: 52px; color: var(--green); font-size: 13px; font-weight: 700; text-align: right; }
.run-button { width: 100%; margin-top: 22px; }
.result-heading, .history-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
h2 { margin: 0; font-size: 18px; }
.result-panel pre { margin: 22px 0 0; overflow: auto; color: var(--ink); font: 700 18px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space: pre-wrap; word-break: break-word; }
.result-panel p:not(.eyebrow) { margin: 10px 0 0; color: var(--muted); font-size: 13px; line-height: 1.6; }
.history-list { margin-top: 16px; }
.history-item { display: flex; justify-content: space-between; gap: 20px; padding: 13px 0; border-top: 1px solid var(--line); }
.history-item span { overflow: hidden; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.history-item time, .history-empty { flex: 0 0 auto; color: var(--muted); font-size: 12px; }
.history-empty { margin-top: 16px; }
@media (max-width: 640px) { .runner-panel, .result-panel, .history-panel { padding: 16px; } .history-item { display: grid; gap: 5px; } }
</style>
