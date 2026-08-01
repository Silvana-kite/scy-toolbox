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
    worker.postMessage({
      type: "done",
      pixels: result.pixels.buffer,
      markedPixels: result.markedPixels,
    });
  } catch (error) {
    worker.postMessage({ type: "error", message: error && error.message ? error.message : "图片修复失败" });
  }
});
