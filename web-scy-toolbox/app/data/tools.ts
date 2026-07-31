import type { ToolCategoryId, ToolDefinition } from '~/types/tool'

export const toolCategories: Array<{ id: ToolCategoryId | 'all'; name: string }> = [
  { id: 'all', name: '全部' },
  { id: 'calculation', name: '计算' },
  { id: 'image', name: '图片' },
  { id: 'text', name: '文本' },
  { id: 'date', name: '日期' },
  { id: 'everyday', name: '日常' },
]

export const tools: ToolDefinition[] = [
  { id: 'calculator', name: '计算器', description: '基础四则运算。', category: 'calculation', icon: 'calculator', accent: '#e9818c', actionLabel: '开始计算', fields: [{ key: 'first', label: '第一个数字', type: 'number', default: 0 }, { key: 'operator', label: '运算方式', type: 'select', default: 'add', options: [{ label: '+', value: 'add' }, { label: '−', value: 'subtract' }, { label: '×', value: 'multiply' }, { label: '÷', value: 'divide' }] }, { key: 'second', label: '第二个数字', type: 'number', default: 0 }] },
  { id: 'unit', name: '单位换算', description: '长度、重量与温度换算。', category: 'calculation', icon: 'ruler', accent: '#7cb6e5', actionLabel: '开始换算', fields: [{ key: 'value', label: '输入数值', type: 'number', default: 1 }, { key: 'conversion', label: '换算类型', type: 'select', default: 'meter-foot', options: [{ label: '米 → 英尺', value: 'meter-foot' }, { label: '千克 → 磅', value: 'kilogram-pound' }, { label: '摄氏度 → 华氏度', value: 'celsius-fahrenheit' }] }] },
  { id: 'mortgage', name: '房贷计算', description: '按等额本息估算月供。', category: 'calculation', icon: 'house', accent: '#eea070', actionLabel: '计算月供', fields: [{ key: 'amount', label: '贷款金额（万元）', type: 'number', default: 100, min: 0 }, { key: 'years', label: '贷款年限（年）', type: 'number', default: 30, min: 1 }, { key: 'rate', label: '年利率', type: 'range', default: 3.5, min: 0, max: 10, step: 0.1, suffix: '%' }] },
  { id: 'percentage', name: '百分比计算', description: '快速计算比例、折扣或税费。', category: 'calculation', icon: 'percent', accent: '#d58cbc', actionLabel: '开始计算', fields: [{ key: 'amount', label: '原始数值', type: 'number', default: 100 }, { key: 'percent', label: '百分比', type: 'range', default: 20, min: 0, max: 100, step: 1, suffix: '%' }] },
  { id: 'compress', name: '图片压缩', description: '本地压缩并下载图片。', category: 'image', icon: 'image-down', accent: '#e8bd65', actionLabel: '压缩并下载', browserOnly: 'image', fields: [] },
  { id: 'qrcode', name: '二维码生成', description: '将文本或链接生成二维码。', category: 'image', icon: 'qr-code', accent: '#9e8bd0', actionLabel: '生成二维码', browserOnly: 'qrcode', fields: [{ key: 'content', label: '二维码内容', type: 'textarea', default: '', placeholder: '输入文本或链接' }] },
  { id: 'crop', name: '图片裁剪', description: '按比例在浏览器中裁剪图片。', category: 'image', icon: 'crop', accent: '#71b6a5', actionLabel: '裁剪并下载', browserOnly: 'image', fields: [{ key: 'ratio', label: '裁剪比例', type: 'select', default: '1:1', options: [{ label: '1 : 1', value: '1:1' }, { label: '4 : 3', value: '4:3' }, { label: '16 : 9', value: '16:9' }] }] },
  { id: 'color-picker', name: '颜色取值', description: '从图片中读取精确颜色。', category: 'image', icon: 'pipette', accent: '#d79c72', actionLabel: '读取颜色', browserOnly: 'color', fields: [] },
  { id: 'word-count', name: '字数统计', description: '统计字符、字数与段落。', category: 'text', icon: 'text', accent: '#6da9d7', actionLabel: '统计字数', fields: [{ key: 'content', label: '输入文本', type: 'textarea', default: '', placeholder: '在这里粘贴或输入文本' }] },
  { id: 'text-format', name: '文本格式化', description: '清理空行与行首尾空格。', category: 'text', icon: 'align-left', accent: '#94a6d7', actionLabel: '格式化文本', fields: [{ key: 'content', label: '输入文本', type: 'textarea', default: '', placeholder: '在这里粘贴或输入文本' }] },
  { id: 'countdown', name: '日期倒计时', description: '计算目标日期的剩余天数。', category: 'date', icon: 'calendar-clock', accent: '#65aa9b', actionLabel: '计算倒计时', fields: [{ key: 'targetDate', label: '目标日期', type: 'date', default: '' }] },
  { id: 'date-difference', name: '日期间隔', description: '计算两个日期相差的天数。', category: 'date', icon: 'calendar-range', accent: '#97b8e2', actionLabel: '计算间隔', fields: [{ key: 'startDate', label: '开始日期', type: 'date', default: '' }, { key: 'endDate', label: '结束日期', type: 'date', default: '' }] },
  { id: 'ruler', name: '屏幕尺子', description: '校准后测量屏幕上的长度。', category: 'everyday', icon: 'ruler', accent: '#8fc9ad', actionLabel: '打开尺子', browserOnly: 'ruler', fields: [] },
  { id: 'random', name: '随机决定', description: '从候选项中随机选出答案。', category: 'everyday', icon: 'shuffle', accent: '#dc8f9d', actionLabel: '帮我决定', fields: [{ key: 'options', label: '候选选项', type: 'textarea', default: '选项 A\n选项 B', placeholder: '每行一个选项' }] },
]

export const toolsById = new Map(tools.map(tool => [tool.id, tool]))
export function getTool(id: string) { return toolsById.get(id) }
