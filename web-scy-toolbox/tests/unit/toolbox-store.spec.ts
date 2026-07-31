import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useToolboxStore } from '../../app/stores/toolbox'

describe('toolbox store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('retains only the newest fifty history entries', () => {
    const store = useToolboxStore()
    store.hydrated = true
    for (let index = 0; index < 51; index += 1) store.addHistory('calculator', `结果 ${index}`)
    expect(store.history).toHaveLength(50)
    expect(store.history[0]?.result).toBe('结果 50')
    expect(store.history.at(-1)?.result).toBe('结果 1')
    expect(store.usageCount).toBe(51)
  })
})
