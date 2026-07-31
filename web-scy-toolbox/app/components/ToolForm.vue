<script setup lang="ts">
import type { ToolField } from '~/types/tool'

const props = defineProps<{ fields: ToolField[] }>()
const model = defineModel<Record<string, string | number>>({ required: true })

function update(key: string, value: string | number) {
  model.value = { ...model.value, [key]: value }
}
</script>

<template>
  <div class="tool-fields">
    <label v-for="field in props.fields" :key="field.key" class="field">
      <span class="field-label">{{ field.label }}</span>
      <template v-if="field.type === 'textarea'">
        <textarea :value="model[field.key]" :placeholder="field.placeholder" class="textarea" @input="update(field.key, ($event.target as HTMLTextAreaElement).value)" />
      </template>
      <template v-else-if="field.type === 'select'">
        <select :value="model[field.key]" class="select" @change="update(field.key, ($event.target as HTMLSelectElement).value)">
          <option v-for="option in field.options" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </template>
      <template v-else-if="field.type === 'range'">
        <div class="range-field"><input :value="model[field.key]" :min="field.min" :max="field.max" :step="field.step" type="range" @input="update(field.key, Number(($event.target as HTMLInputElement).value))"><output>{{ model[field.key] }}{{ field.suffix }}</output></div>
      </template>
      <template v-else>
        <input :value="model[field.key]" :min="field.min" :type="field.type" :placeholder="field.placeholder" class="input" @input="update(field.key, ($event.target as HTMLInputElement).value)">
      </template>
    </label>
  </div>
</template>

<style scoped>
.tool-fields { display: grid; gap: 18px; }
.range-field { display: flex; gap: 12px; align-items: center; min-height: 42px; padding: 0 12px; border: 1px solid #ced5d7; border-radius: 7px; }
.range-field input { flex: 1; accent-color: var(--green); }
.range-field output { min-width: 52px; color: var(--green); font-size: 13px; font-weight: 700; text-align: right; }
</style>
