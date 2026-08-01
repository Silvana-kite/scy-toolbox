import type { ToolDefinition } from '~/types/tool'

// Tool definitions are intentionally empty. Add only the tools you want to maintain here.
export const tools: ToolDefinition[] = []

export const toolsById = new Map(tools.map(tool => [tool.id, tool]))
export function getTool(id: string) { return toolsById.get(id) }
