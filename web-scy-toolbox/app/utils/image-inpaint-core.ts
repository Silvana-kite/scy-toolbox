export type RepairFailureCode = 'insufficient-context' | 'memory-allocation-failed' | 'computation-aborted' | 'unexpected-error'

export type RepairResult = {
  pixels: Uint8ClampedArray
  markedPixels: number
  errorCode?: RepairFailureCode
}

type Component = { pixels: number[], left: number, right: number, top: number, bottom: number }

class MinHeap {
  private readonly values: Array<{ point: number, distance: number }> = []

  push(point: number, distance: number) {
    const item = { point, distance }
    this.values.push(item)
    let index = this.values.length - 1
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2)
      if (this.values[parent]!.distance <= item.distance) break
      this.values[index] = this.values[parent]!
      index = parent
    }
    this.values[index] = item
  }

  pop() {
    const first = this.values[0]
    const last = this.values.pop()
    if (!first || !last) return undefined
    if (this.values.length) {
      let index = 0
      while (index * 2 + 1 < this.values.length) {
        let child = index * 2 + 1
        if (child + 1 < this.values.length && this.values[child + 1]!.distance < this.values[child]!.distance) child += 1
        if (this.values[child]!.distance >= last.distance) break
        this.values[index] = this.values[child]!
        index = child
      }
      this.values[index] = last
    }
    return first
  }

  get size() { return this.values.length }
}

function forEachNeighbor(point: number, width: number, total: number, callback: (neighbor: number) => void) {
  const x = point % width
  if (x > 0) callback(point - 1)
  if (x < width - 1) callback(point + 1)
  if (point >= width) callback(point - width)
  if (point < total - width) callback(point + width)
}

function collectComponents(mask: Uint8Array, width: number): Component[] {
  const seen = new Uint8Array(mask.length)
  const components: Component[] = []
  for (let seed = 0; seed < mask.length; seed += 1) {
    if (!mask[seed] || seen[seed]) continue
    const pixels: number[] = []
    const queue = [seed]
    seen[seed] = 1
    let head = 0
    let left = seed % width; let right = left; let top = Math.floor(seed / width); let bottom = top
    while (head < queue.length) {
      const point = queue[head++]!
      pixels.push(point)
      const x = point % width; const y = Math.floor(point / width)
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y)
      forEachNeighbor(point, width, mask.length, neighbor => {
        if (mask[neighbor] && !seen[neighbor]) { seen[neighbor] = 1; queue.push(neighbor) }
      })
    }
    components.push({ pixels, left, right, top, bottom })
  }
  return components.sort((first, second) => first.pixels.length - second.pixels.length)
}

export function repairImage(pixels: Uint8ClampedArray, mask: Uint8Array, width: number, height: number, progress?: (value: number) => void): RepairResult {
  const output = new Uint8ClampedArray(pixels)
  let markedPixels = 0
  for (const value of mask) markedPixels += value ? 1 : 0
  if (!markedPixels) return { pixels: output, markedPixels }
  if (markedPixels === mask.length) return { pixels: output, markedPixels, errorCode: 'insufficient-context' }

  const components = collectComponents(mask, width)
  let repairedPixels = 0
  const report = () => progress?.(Math.min(99, Math.round(repairedPixels / markedPixels * 100)))

  for (const component of components) {
    const padding = 2
    const left = Math.max(0, component.left - padding); const right = Math.min(width - 1, component.right + padding)
    const top = Math.max(0, component.top - padding); const bottom = Math.min(height - 1, component.bottom + padding)
    const localWidth = right - left + 1; const localHeight = bottom - top + 1
    const state = new Uint8Array(localWidth * localHeight) // 0 = outside, 1 = unknown, 2 = repaired
    const distance = new Float32Array(state.length); distance.fill(Number.POSITIVE_INFINITY)
    const localPoint = (point: number) => (Math.floor(point / width) - top) * localWidth + point % width - left
    const globalPoint = (local: number) => (top + Math.floor(local / localWidth)) * width + left + local % localWidth
    for (const point of component.pixels) state[localPoint(point)] = 1

    const isAvailable = (point: number) => {
      if (!mask[point]) return true
      const local = localPoint(point)
      return state[local] === 2
    }
    const fillPixel = (point: number) => {
      const targetOffset = point * 4
      const x = point % width; const y = Math.floor(point / width)
      const totals = [0, 0, 0]
      let totalWeight = 0
      for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) {
        if (!dx && !dy) continue
        const sampleX = x + dx; const sampleY = y + dy
        if (sampleX < 0 || sampleX >= width || sampleY < 0 || sampleY >= height) continue
        const sample = sampleY * width + sampleX
        if (!isAvailable(sample)) continue
        const sampleOffset = sample * 4
        const squareDistance = dx * dx + dy * dy
        const luminance = output[sampleOffset]! * .299 + output[sampleOffset + 1]! * .587 + output[sampleOffset + 2]! * .114
        const horizontal = sampleX + 1 < width ? sample + 1 : sample
        const vertical = sampleY + 1 < height ? sample + width : sample
        const gradient = Math.abs(luminance - (output[horizontal * 4]! * .299 + output[horizontal * 4 + 1]! * .587 + output[horizontal * 4 + 2]! * .114)) + Math.abs(luminance - (output[vertical * 4]! * .299 + output[vertical * 4 + 1]! * .587 + output[vertical * 4 + 2]! * .114))
        const weight = 1 / squareDistance / (1 + gradient / 96)
        for (let channel = 0; channel < 3; channel += 1) totals[channel]! += output[sampleOffset + channel]! * weight
        totalWeight += weight
      }
      if (!totalWeight) return false
      for (let channel = 0; channel < 3; channel += 1) output[targetOffset + channel] = Math.round(totals[channel]! / totalWeight)
      return true
    }

    const heap = new MinHeap()
    for (const point of component.pixels) {
      let boundary = false
      forEachNeighbor(point, width, mask.length, neighbor => { if (!mask[neighbor]) boundary = true })
      if (!boundary || !fillPixel(point)) continue
      const local = localPoint(point); state[local] = 2; distance[local] = 1; heap.push(point, 1); repairedPixels += 1
    }
    if (!heap.size) return { pixels: new Uint8ClampedArray(pixels), markedPixels, errorCode: 'insufficient-context' }

    while (heap.size) {
      const current = heap.pop()!
      const currentLocal = localPoint(current.point)
      if (current.distance !== distance[currentLocal]) continue
      forEachNeighbor(current.point, width, mask.length, neighbor => {
        const local = localPoint(neighbor)
        if (state[local] !== 1) return
        if (!fillPixel(neighbor)) return
        const nextDistance = current.distance + 1
        state[local] = 2; distance[local] = nextDistance; heap.push(neighbor, nextDistance); repairedPixels += 1
        if (repairedPixels % 512 === 0) report()
      })
    }

    // Blend only the repaired inner boundary. Pixels outside the mask are never written.
    const blended = new Uint8ClampedArray(state.length * 3)
    const blendable = new Uint8Array(state.length)
    for (let local = 0; local < state.length; local += 1) {
      if (state[local] !== 2 || distance[local]! > 2) continue
      const point = globalPoint(local); const x = point % width; const y = Math.floor(point / width)
      const totals = [0, 0, 0]; let totalWeight = 0
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
        const sampleX = x + dx; const sampleY = y + dy
        if (sampleX < 0 || sampleX >= width || sampleY < 0 || sampleY >= height) continue
        const sample = sampleY * width + sampleX
        if (mask[sample] && state[localPoint(sample)] !== 2) continue
        const weight = dx || dy ? 1 : 4; const offset = sample * 4
        for (let channel = 0; channel < 3; channel += 1) totals[channel]! += output[offset + channel]! * weight
        totalWeight += weight
      }
      if (!totalWeight) continue
      for (let channel = 0; channel < 3; channel += 1) blended[local * 3 + channel] = Math.round(totals[channel]! / totalWeight)
      blendable[local] = 1
    }
    for (let local = 0; local < state.length; local += 1) {
      if (!blendable[local]) continue
      const offset = globalPoint(local) * 4
      for (let channel = 0; channel < 3; channel += 1) output[offset + channel] = blended[local * 3 + channel]!
    }
  }
  progress?.(100)
  return { pixels: output, markedPixels }
}
