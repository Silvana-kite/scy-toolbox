import { z } from 'zod'
import type { ToolResult } from '~/types/tool'

type Values = Record<string, unknown>
const number = (label: string) => z.coerce.number({ invalid_type_error: `请输入有效的${label}` }).finite(`请输入有效的${label}`)
const text = (label: string) => z.string().trim().min(1, `请先输入${label}`)
const date = (label: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `请选择有效的${label}`)
const decimal = (value: number) => Number(value.toFixed(2)).toString()
const localDate = (value: string) => new Date(`${value}T00:00:00`)
const startOfDay = (value: Date) => { const next = new Date(value); next.setHours(0, 0, 0, 0); return next }

export function executeTool(id: string, values: Values): ToolResult {
  switch (id) {
    case 'calculator': { const d = z.object({ first: number('第一个数字'), second: number('第二个数字'), operator: z.enum(['add', 'subtract', 'multiply', 'divide']) }).parse(values); const map = { add: ['+', d.first + d.second], subtract: ['−', d.first - d.second], multiply: ['×', d.first * d.second], divide: ['÷', d.second === 0 ? null : d.first / d.second] } as const; const [symbol, result] = map[d.operator]; if (result === null) throw new Error('除数不能为 0'); return { title: '计算结果', text: `${d.first} ${symbol} ${d.second} = ${decimal(result)}` } }
    case 'unit': { const d = z.object({ value: number('数值'), conversion: z.enum(['meter-foot', 'kilogram-pound', 'celsius-fahrenheit']) }).parse(values); const map = { 'meter-foot': ['米', '英尺', d.value * 3.28084], 'kilogram-pound': ['千克', '磅', d.value * 2.20462], 'celsius-fahrenheit': ['摄氏度', '华氏度', d.value * 1.8 + 32] } as const; const [from, to, result] = map[d.conversion]; return { title: '换算结果', text: `${d.value} ${from} = ${decimal(result)} ${to}` } }
    case 'mortgage': { const d = z.object({ amount: number('贷款金额').positive('贷款金额必须大于 0'), years: number('贷款年限').positive('贷款年限必须大于 0'), rate: number('年利率').min(0, '年利率不能小于 0') }).parse(values); const months = Math.round(d.years * 12); const principal = d.amount * 10000; const rate = d.rate / 100 / 12; const payment = rate === 0 ? principal / months : (principal * rate * (1 + rate) ** months) / ((1 + rate) ** months - 1); return { title: '月供估算', text: `预计每月还款 ￥${decimal(payment)}`, detail: `贷款 ${decimal(d.amount)} 万元，${months} 期，年利率 ${d.rate}%` } }
    case 'percentage': { const d = z.object({ amount: number('原始数值'), percent: number('百分比') }).parse(values); return { title: '计算结果', text: `${d.amount} 的 ${d.percent}% = ${decimal(d.amount * d.percent / 100)}` } }
    case 'word-count': { const content = text('文本').parse(values.content); const characters = content.replace(/\s/g, '').length; const paragraphs = content.split(/\n+/).filter(line => line.trim()).length; return { title: '统计结果', text: `共 ${characters} 个非空白字符`, detail: `文本长度 ${content.length}，共 ${paragraphs} 个段落` } }
    case 'text-format': { const content = text('文本').parse(values.content); const lines = content.split(/\n+/).map(line => line.trim()).filter(Boolean); return { title: '格式化结果', text: lines.join('\n'), detail: `已整理为 ${lines.length} 个有效段落` } }
    case 'countdown': { const targetText = date('目标日期').parse(values.targetDate); const days = Math.ceil((startOfDay(localDate(targetText)).getTime() - startOfDay(new Date()).getTime()) / 86400000); return { title: '倒计时结果', text: days >= 0 ? `距离目标日还有 ${days} 天` : `目标日已过去 ${Math.abs(days)} 天`, detail: `目标日期：${targetText}` } }
    case 'date-difference': { const d = z.object({ startDate: date('开始日期'), endDate: date('结束日期') }).parse(values); const days = Math.abs(Math.round((localDate(d.endDate).getTime() - localDate(d.startDate).getTime()) / 86400000)); return { title: '日期间隔', text: `两个日期相差 ${days} 天`, detail: `${d.startDate} 至 ${d.endDate}` } }
    case 'random': { const options = text('候选选项').parse(values.options).split(/[\n,，]+/).map(item => item.trim()).filter(Boolean); if (options.length < 2) throw new Error('请至少输入两个候选选项'); return { title: '随机决定', text: `这次选：${options[Math.floor(Math.random() * options.length)]}`, detail: `已从 ${options.length} 个选项中随机选出` } }
    default: throw new Error('暂不支持该工具')
  }
}
