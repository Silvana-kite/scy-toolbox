import { describe, expect, it } from 'vitest'
import { repairImage } from '../../app/utils/image-inpaint-core'

function createImage(width: number, height: number, red = 30) {
  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let point = 0; point < width * height; point += 1) {
    pixels[point * 4] = red
    pixels[point * 4 + 3] = 255
  }
  return pixels
}

describe('repairImage', () => {
  it('fills the full marked area, including pixels away from the boundary', () => {
    const width = 7
    const height = 7
    const pixels = createImage(width, height)
    const mask = new Uint8Array(width * height)
    for (let y = 2; y <= 4; y += 1) for (let x = 2; x <= 4; x += 1) mask[y * width + x] = 255
    pixels[(3 * width + 3) * 4] = 240

    const { pixels: output, markedPixels } = repairImage(pixels, mask, width, height)

    expect(markedPixels).toBe(9)
    expect(output[(3 * width + 3) * 4]).toBe(30)
    expect(output[(2 * width + 2) * 4]).toBe(30)
  })

  it('does not change unmarked pixels', () => {
    const pixels = createImage(3, 3)
    const mask = new Uint8Array(9)
    mask[4] = 255
    pixels[0] = 77

    expect(repairImage(pixels, mask, 3, 3).pixels[0]).toBe(77)
  })

  it('preserves alpha, processes separate regions, and reports marked-pixel progress', () => {
    const pixels = createImage(7, 3)
    const original = new Uint8ClampedArray(pixels)
    const mask = new Uint8Array(21)
    mask[1] = 255; mask[19] = 255
    pixels[4 + 3] = 131
    const progress: number[] = []
    const result = repairImage(pixels, mask, 7, 3, value => progress.push(value))

    expect(result.pixels[1 * 4 + 3]).toBe(131)
    expect(result.pixels[0]).toBe(original[0])
    expect(progress.at(-1)).toBe(100)
    expect(progress.every((value, index) => index === 0 || value >= progress[index - 1]!)).toBe(true)
  })

  it('returns insufficient context instead of inventing a result', () => {
    const pixels = createImage(2, 2)
    const original = new Uint8ClampedArray(pixels)
    const result = repairImage(pixels, new Uint8Array([255, 255, 255, 255]), 2, 2)

    expect(result.errorCode).toBe('insufficient-context')
    expect(result.pixels).toEqual(original)
  })

  it('removes a white watermark sample over a sky-like gradient', () => {
    const width = 9
    const pixels = new Uint8ClampedArray(width * 5 * 4)
    const mask = new Uint8Array(width * 5)
    for (let y = 0; y < 5; y += 1) for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4
      pixels[offset] = 70 + y * 8; pixels[offset + 1] = 145 + y * 6; pixels[offset + 2] = 220 + y * 3; pixels[offset + 3] = 255
    }
    for (let y = 2; y <= 3; y += 1) for (let x = 3; x <= 5; x += 1) { mask[y * width + x] = 255; pixels[(y * width + x) * 4] = 255; pixels[(y * width + x) * 4 + 1] = 255; pixels[(y * width + x) * 4 + 2] = 255 }

    const output = repairImage(pixels, mask, width, 5).pixels

    expect(output[(2 * width + 4) * 4]).toBeLessThan(200)
    expect(output[(2 * width + 4) * 4 + 2]).toBeGreaterThan(180)
  })
})
