import type { Component } from 'vue'
import ImageRepairEditor from '~/components/image-repair/ImageRepairEditor.vue'

const components: Record<string, Component> = { 'image-repair': ImageRepairEditor }

export function getToolComponent(toolId: string) { return components[toolId] || null }
