import { describe, expect, it, vi } from 'vitest'
import { executeTool } from '../../app/utils/tool-runner'

describe('tool runner', () => {
  it('calculates four arithmetic operations', () => {
    expect(executeTool('calculator', { first: 12, second: 8, operator: 'add' }).text).toBe('12 + 8 = 20')
    expect(executeTool('calculator', { first: 12, second: 8, operator: 'multiply' }).text).toBe('12 × 8 = 96')
  })

  it('rejects division by zero', () => {
    expect(() => executeTool('calculator', { first: 12, second: 0, operator: 'divide' })).toThrow('除数不能为 0')
  })

  it('supports zero-rate mortgage calculations', () => {
    expect(executeTool('mortgage', { amount: 12, years: 1, rate: 0 }).text).toBe('预计每月还款 ￥10000')
  })

  it('counts and formats text', () => {
    expect(executeTool('word-count', { content: '你好\n\n 世界' }).text).toBe('共 4 个非空白字符')
    expect(executeTool('text-format', { content: ' 第一段 \n\n 第二段  ' }).text).toBe('第一段\n第二段')
  })

  it('calculates an absolute date interval and validates dates', () => {
    expect(executeTool('date-difference', { startDate: '2026-06-10', endDate: '2026-06-01' }).text).toBe('两个日期相差 9 天')
    expect(() => executeTool('date-difference', { startDate: 'invalid', endDate: '2026-06-01' })).toThrow('请选择有效的开始日期')
  })

  it('requires two random candidates', () => {
    expect(() => executeTool('random', { options: '唯一选项' })).toThrow('请至少输入两个候选选项')
    vi.spyOn(Math, 'random').mockReturnValue(.9)
    expect(executeTool('random', { options: 'A\nB' }).text).toBe('这次选：B')
    vi.restoreAllMocks()
  })
})
