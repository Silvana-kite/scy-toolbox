import type { ToolResult } from '~/types/tool'

export function executeTool(_id: string, _values: Record<string, unknown>): ToolResult {
  throw new Error('该工具尚未实现')
}
