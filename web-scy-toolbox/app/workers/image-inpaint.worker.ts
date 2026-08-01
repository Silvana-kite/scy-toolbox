import { repairImage } from '~/utils/image-inpaint-core'

self.onmessage = (event: MessageEvent<{ pixels: ArrayBuffer, mask: ArrayBuffer, width: number, height: number }>) => {
  const { pixels, mask, width, height } = event.data
  try {
    const result = repairImage(new Uint8ClampedArray(pixels), new Uint8Array(mask), width, height, progress => self.postMessage({ type: 'progress', progress }))
    if (result.errorCode) {
      self.postMessage({ type: 'failed', code: result.errorCode })
      return
    }
    self.postMessage({ type: 'complete', pixels: result.pixels.buffer, markedPixels: result.markedPixels }, [result.pixels.buffer])
  } catch (error) {
    self.postMessage({ type: 'failed', code: error instanceof RangeError ? 'memory-allocation-failed' : 'unexpected-error' })
  }
}
