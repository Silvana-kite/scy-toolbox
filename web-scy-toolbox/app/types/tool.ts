export type ToolCategoryId = string

export type FieldType = 'number' | 'text' | 'textarea' | 'select' | 'range' | 'date'

export interface ToolField {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  default: string | number
  min?: number
  max?: number
  step?: number
  suffix?: string
  options?: Array<{ label: string; value: string }>
}

export interface ToolDefinition {
  id: string
  name: string
  description: string
  category: ToolCategoryId
  icon: string
  accent: string
  actionLabel: string
  fields: ToolField[]
}

export interface ToolResult {
  title: string
  text: string
  detail?: string
  downloadable?: boolean
}

export interface HistoryEntry {
  id: string
  toolId: string
  result: string
  createdAt: string
}
