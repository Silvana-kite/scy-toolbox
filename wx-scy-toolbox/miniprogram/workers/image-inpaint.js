const { repairImage } = require("./image-inpaint-core");

worker.onMessage((event) => {
  const payload = event.message || event.data || event;
  if (!payload || payload.type !== "repair") return;

  try {
    const result = repairImage({
      pixels: new Uint8ClampedArray(payload.pixels),
      mask: new Uint8Array(payload.mask),
      width: payload.width,
      height: payload.height,
      onProgress: (progress) => worker.postMessage({ type: "progress", progress }),
    });
    if (result.errorCode) {
      worker.postMessage({ type: "error", code: result.errorCode, message: result.errorCode });
      return;
    }
    worker.postMessage({
      type: "done",
      pixels: result.pixels.buffer,
      markedPixels: result.markedPixels,
    });
  } catch (error) {
    const code = error instanceof RangeError ? "memory-allocation-failed" : "unexpected-error";
    worker.postMessage({ type: "error", code, message: error && error.message ? error.message : code });
  }
});
