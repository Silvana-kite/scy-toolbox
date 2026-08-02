const { createRepairJob } = require("../../utils/image-inpaint-core");
const { addFavorite, errorMessage, getFavoriteStatus, recordSuccessfulUse, removeFavorite } = require("../../services/personal-tools");

const GUIDE_STORAGE_KEY = "scy-image-repair-guide-seen";
const MAX_IMAGE_EDGE = 4096;
const MAX_HISTORY = 100;
const LARGE_MASK_RATIO = 0.2;

function getCanvasInfo(page, selector) {
  return new Promise((resolve) => {
    wx.createSelectorQuery().in(page).select(selector)
      .fields({ node: true, size: true, rect: true }, resolve)
      .exec();
  });
}

function nextTick() {
  return new Promise((resolve) => wx.nextTick(resolve));
}

function getPixelRatio() {
  const windowInfo = typeof wx.getWindowInfo === "function" ? wx.getWindowInfo() : null;
  return (windowInfo && windowInfo.pixelRatio) || 1;
}

function isDeveloperTool() {
  const deviceInfo = typeof wx.getDeviceInfo === "function" ? wx.getDeviceInfo() : null;
  return Boolean(deviceInfo && deviceInfo.platform === "devtools");
}

function repairFailureMessage(code) {
  if (code === "insufficient-context") return "\u8bf7\u4fdd\u7559\u9009\u533a\u5468\u56f4\u7684\u80cc\u666f\uff0c\u518d\u8fdb\u884c\u4fee\u590d";
  if (code === "memory-allocation-failed") return "\u56fe\u7247\u8fc7\u5927\uff0c\u8bf7\u7f29\u5c0f\u56fe\u7247\u6216\u51cf\u5c11\u6807\u8bb0\u533a\u57df";
  if (code === "computation-aborted") return "\u5df2\u53d6\u6d88\u5904\u7406";
  return code;
}

async function findCanvasInfo(page, selector, attempts = 3) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const info = await getCanvasInfo(page, selector);
    if (info && info.node) return info;
    await nextTick();
  }
  return null;
}

function getImageInfo(src) {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({ src, success: resolve, fail: reject });
  });
}

function chooseImage() {
  return new Promise((resolve, reject) => {
    wx.chooseImage({
      count: 1,
      sizeType: ["original"],
      sourceType: ["album", "camera"],
      success: resolve,
      fail: reject,
    });
  });
}

function canvasToTempFilePath(canvas, width, height) {
  return new Promise((resolve, reject) => {
    if (!canvas || !width || !height) {
      reject(new Error("当前微信版本不支持图片导出"));
      return;
    }
    const options = {
      x: 0,
      y: 0,
      width,
      height,
      destWidth: width,
      destHeight: height,
      fileType: "png",
    };
    const exportWithWxApi = () => {
      if (typeof wx.canvasToTempFilePath !== "function") {
        reject(new Error("当前微信版本不支持图片导出"));
        return;
      }
      wx.canvasToTempFilePath({ ...options, canvas, success: resolve, fail: reject });
    };
    if (typeof canvas.toTempFilePath === "function") {
      try {
        canvas.toTempFilePath({ ...options, success: resolve, fail: exportWithWxApi });
      } catch (error) {
        exportWithWxApi();
      }
      return;
    }
    exportWithWxApi();
  });
}

function loadCanvasImage(canvas, src) {
  return new Promise((resolve, reject) => {
    const image = canvas.createImage();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function touchPoint(touch, rect) {
  return {
    x: (touch.pageX !== undefined ? touch.pageX : touch.clientX) - rect.left,
    y: (touch.pageY !== undefined ? touch.pageY : touch.clientY) - rect.top,
  };
}

function touchDistance(first, second) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function touchMidpoint(first, second) {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

function paintCircle(mask, width, height, centerX, centerY, radius, value) {
  const minX = Math.max(0, Math.floor(centerX - radius));
  const maxX = Math.min(width - 1, Math.ceil(centerX + radius));
  const minY = Math.max(0, Math.floor(centerY - radius));
  const maxY = Math.min(height - 1, Math.ceil(centerY + radius));
  const radiusSquared = radius * radius;
  for (let y = minY; y <= maxY; y += 1) {
    const yDistance = y - centerY;
    for (let x = minX; x <= maxX; x += 1) {
      const xDistance = x - centerX;
      if (xDistance * xDistance + yDistance * yDistance <= radiusSquared) mask[y * width + x] = value;
    }
  }
}

function rasterizeStroke(mask, width, height, stroke) {
  const points = stroke.points || [];
  if (!points.length) return;
  const radius = stroke.size / 2;
  const value = stroke.erase ? 0 : 255;
  paintCircle(mask, width, height, points[0].x, points[0].y, radius, value);
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const distance = Math.hypot(current.x - previous.x, current.y - previous.y);
    const steps = Math.max(1, Math.ceil(distance / Math.max(1, radius * 0.45)));
    for (let step = 1; step <= steps; step += 1) {
      const ratio = step / steps;
      paintCircle(mask, width, height, previous.x + (current.x - previous.x) * ratio, previous.y + (current.y - previous.y) * ratio, radius, value);
    }
  }
}

Page({
  data: {
    showGuide: !wx.getStorageSync(GUIDE_STORAGE_KEY),
    imagePath: "",
    resultPath: "",
    isResult: false,
    brushMode: "brush",
    brushSize: 32,
    maskColor: "red",
    highContrast: false,
    canUndo: false,
    canRedo: false,
    canRepair: false,
    processing: false,
    progress: 0,
    comparePosition: 50,
    compareTransform: "translate(0px, 0px) scale(1)",
    compareImageStyle: "",
    isFavorite: false,
    syncMessage: "",
  },

  async onReady() {
    const sourceInfo = await findCanvasInfo(this, "#source-canvas");
    if (!sourceInfo) {
      wx.showToast({ title: "画布初始化失败，请重新进入", icon: "none" });
      return;
    }
    this.pixelRatio = getPixelRatio();
    this.sourceCanvas = sourceInfo.node;
    this.sourceContext = this.sourceCanvas.getContext("2d");
    this.strokes = [];
    this.redoStrokes = [];
    this.refreshFavorite();
  },

  async refreshFavorite() {
    try {
      const result = await getFavoriteStatus("image-repair");
      this.setData({ isFavorite: result.favorite });
    } catch (error) {
      this.setData({ syncMessage: errorMessage(error) });
    }
  },

  async onFavoriteTap() {
    try {
      const result = this.data.isFavorite
        ? await removeFavorite("image-repair")
        : await addFavorite("image-repair");
      this.setData({ isFavorite: result.favorite, syncMessage: "" });
      wx.showToast({ title: result.favorite ? "已收藏" : "已取消收藏", icon: "none" });
    } catch (error) {
      const message = errorMessage(error);
      this.setData({ syncMessage: message });
      wx.showToast({ title: message, icon: "none" });
    }
  },

  async ensureEditorCanvases() {
    if (this.editorCanvas && this.maskCanvas && this.stage) return;
    const [editorInfo, maskInfo] = await Promise.all([
      findCanvasInfo(this, "#editor-canvas"),
      findCanvasInfo(this, "#mask-canvas"),
    ]);
    if (!editorInfo || !maskInfo) throw new Error("编辑画布尚未就绪");
    this.editorCanvas = editorInfo.node;
    this.maskCanvas = maskInfo.node;
    this.editorContext = this.editorCanvas.getContext("2d");
    this.maskContext = this.maskCanvas.getContext("2d");
    this.stage = {
      width: editorInfo.width,
      height: editorInfo.height,
      left: editorInfo.left,
      top: editorInfo.top,
    };
    [this.editorCanvas, this.maskCanvas].forEach((canvas) => {
      canvas.width = Math.round(this.stage.width * this.pixelRatio);
      canvas.height = Math.round(this.stage.height * this.pixelRatio);
    });
    this.scale = 1;
    this.baseScale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
  },

  onUnload() {
    this.destroyWorker();
  },

  noop() {},

  onGuideClose() {
    wx.setStorageSync(GUIDE_STORAGE_KEY, true);
    this.setData({ showGuide: false });
  },

  async onChooseImage() {
    if (this.data.processing || !this.sourceCanvas) return;
    try {
      const response = await chooseImage();
      const originalPath = response.tempFilePaths[0];
      wx.showLoading({ title: "正在载入" });
      const info = await getImageInfo(originalPath);
      const sourcePath = await this.limitImageSize(originalPath, info.width, info.height);
      const workingInfo = await getImageInfo(sourcePath);
      if (this.data.isResult) this.clearEditorCanvasReferences();
      this.setData({
        imagePath: sourcePath,
        resultPath: "",
        isResult: false,
        canUndo: false,
        canRedo: false,
        canRepair: false,
        compareTransform: "translate(0px, 0px) scale(1)",
      });
      await nextTick();
      await this.ensureEditorCanvases();
      this.imageWidth = workingInfo.width;
      this.imageHeight = workingInfo.height;
      this.previewImage = await loadCanvasImage(this.editorCanvas, sourcePath);
      this.strokes = [];
      this.redoStrokes = [];
      this.currentStroke = null;
      this.fitImage();
      this.renderPreview();
      if (Math.max(info.width, info.height) > MAX_IMAGE_EDGE) {
        wx.showToast({ title: "已压缩至 4096 像素以内", icon: "none" });
      }
    } catch (error) {
      if (error && error.errMsg && error.errMsg.indexOf("cancel") !== -1) return;
      wx.showToast({ title: "图片加载失败，请重试", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  },

  clearEditorCanvasReferences() {
    this.editorCanvas = null;
    this.maskCanvas = null;
    this.editorContext = null;
    this.maskContext = null;
    this.stage = null;
  },

  async limitImageSize(path, width, height) {
    const longest = Math.max(width, height);
    if (longest <= MAX_IMAGE_EDGE) return path;
    const ratio = MAX_IMAGE_EDGE / longest;
    const targetWidth = Math.round(width * ratio);
    const targetHeight = Math.round(height * ratio);
    this.sourceCanvas.width = targetWidth;
    this.sourceCanvas.height = targetHeight;
    const image = await loadCanvasImage(this.sourceCanvas, path);
    this.sourceContext.clearRect(0, 0, targetWidth, targetHeight);
    this.sourceContext.drawImage(image, 0, 0, targetWidth, targetHeight);
    const result = await canvasToTempFilePath(this.sourceCanvas, targetWidth, targetHeight);
    return result.tempFilePath;
  },

  fitImage() {
    this.baseScale = Math.min(this.stage.width / this.imageWidth, this.stage.height / this.imageHeight);
    this.scale = this.baseScale;
    this.offsetX = (this.stage.width - this.imageWidth * this.scale) / 2;
    this.offsetY = (this.stage.height - this.imageHeight * this.scale) / 2;
    this.updateCompareTransform();
  },

  updateCompareTransform() {
    const relativeScale = this.baseScale ? this.scale / this.baseScale : 1;
    const baseX = (this.stage.width - this.imageWidth * this.baseScale) / 2;
    const baseY = (this.stage.height - this.imageHeight * this.baseScale) / 2;
    const compareTransform = `translate(${(this.offsetX - baseX).toFixed(2)}px, ${(this.offsetY - baseY).toFixed(2)}px) scale(${relativeScale.toFixed(4)})`;
    this.setData({
      compareTransform,
      compareImageStyle: `width: ${this.stage.width}px; height: ${this.stage.height}px; transform: ${compareTransform};`,
    });
  },

  schedulePreview() {
    if (this.previewScheduled) return;
    this.previewScheduled = true;
    setTimeout(() => {
      this.previewScheduled = false;
      this.renderPreview();
    }, 0);
  },

  renderPreview() {
    if (!this.previewImage || !this.editorContext) return;
    const contexts = [this.editorContext, this.maskContext];
    contexts.forEach((context) => {
      context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
      context.clearRect(0, 0, this.stage.width, this.stage.height);
    });
    this.editorContext.fillStyle = "#e9edf1";
    this.editorContext.fillRect(0, 0, this.stage.width, this.stage.height);
    this.editorContext.drawImage(this.previewImage, this.offsetX, this.offsetY, this.imageWidth * this.scale, this.imageHeight * this.scale);

    const maskColor = this.data.maskColor === "blue" ? "25, 118, 210" : "217, 83, 79";
    const opacity = this.data.highContrast ? 0.74 : 0.42;
    this.maskContext.save();
    this.maskContext.beginPath();
    this.maskContext.rect(this.offsetX, this.offsetY, this.imageWidth * this.scale, this.imageHeight * this.scale);
    this.maskContext.clip();
    const strokes = this.currentStroke ? [...this.strokes, this.currentStroke] : this.strokes;
    strokes.forEach((stroke) => this.drawPreviewStroke(stroke, maskColor, opacity));
    this.maskContext.restore();
  },

  drawPreviewStroke(stroke, maskColor, opacity) {
    const points = stroke.points || [];
    if (!points.length) return;
    const context = this.maskContext;
    context.save();
    context.globalCompositeOperation = stroke.erase ? "destination-out" : "source-over";
    context.strokeStyle = `rgba(${maskColor}, ${stroke.erase ? 1 : opacity})`;
    context.fillStyle = context.strokeStyle;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = stroke.size * this.scale;
    context.beginPath();
    context.moveTo(points[0].x * this.scale + this.offsetX, points[0].y * this.scale + this.offsetY);
    if (points.length === 1) {
      context.arc(points[0].x * this.scale + this.offsetX, points[0].y * this.scale + this.offsetY, (stroke.size * this.scale) / 2, 0, Math.PI * 2);
      context.fill();
    } else {
      for (let index = 1; index < points.length; index += 1) context.lineTo(points[index].x * this.scale + this.offsetX, points[index].y * this.scale + this.offsetY);
      context.stroke();
    }
    context.restore();
  },

  getImagePoint(eventTouch) {
    const point = touchPoint(eventTouch, this.stage);
    return {
      x: Math.max(0, Math.min(this.imageWidth - 1, (point.x - this.offsetX) / this.scale)),
      y: Math.max(0, Math.min(this.imageHeight - 1, (point.y - this.offsetY) / this.scale)),
    };
  },

  onEditorTouchStart(event) {
    if (this.data.processing) return;
    const touches = event.touches || [];
    if (touches.length >= 2) {
      this.beginGesture(touches);
      this.currentStroke = null;
      return;
    }
    if (!touches.length) return;
    this.currentStroke = {
      source: "manual-stroke",
      erase: this.data.brushMode === "eraser",
      size: this.data.brushSize,
      points: [this.getImagePoint(touches[0])],
    };
    this.schedulePreview();
  },

  onEditorTouchMove(event) {
    const touches = event.touches || [];
    if (touches.length >= 2 && this.gesture) {
      this.updateGesture(touches);
      this.schedulePreview();
      return;
    }
    if (!this.currentStroke || !touches.length) return;
    const point = this.getImagePoint(touches[0]);
    const previous = this.currentStroke.points[this.currentStroke.points.length - 1];
    if (Math.hypot(point.x - previous.x, point.y - previous.y) >= 0.5) this.currentStroke.points.push(point);
    this.schedulePreview();
  },

  onEditorTouchEnd() {
    this.gesture = null;
    if (!this.currentStroke) return;
    this.strokes.push(this.currentStroke);
    if (this.strokes.length > MAX_HISTORY) this.strokes.shift();
    this.currentStroke = null;
    this.redoStrokes = [];
    this.updateHistoryState();
    this.renderPreview();
  },

  beginGesture(touches) {
    const first = touchPoint(touches[0], this.stage);
    const second = touchPoint(touches[1], this.stage);
    this.gesture = {
      distance: Math.max(1, touchDistance(first, second)),
      midpoint: touchMidpoint(first, second),
      scale: this.scale,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
    };
  },

  updateGesture(touches) {
    const first = touchPoint(touches[0], this.stage);
    const second = touchPoint(touches[1], this.stage);
    const midpoint = touchMidpoint(first, second);
    const nextScale = Math.max(this.baseScale, Math.min(this.baseScale * 6, this.gesture.scale * touchDistance(first, second) / this.gesture.distance));
    const imageX = (this.gesture.midpoint.x - this.gesture.offsetX) / this.gesture.scale;
    const imageY = (this.gesture.midpoint.y - this.gesture.offsetY) / this.gesture.scale;
    this.scale = nextScale;
    this.offsetX = midpoint.x - imageX * nextScale;
    this.offsetY = midpoint.y - imageY * nextScale;
    this.updateCompareTransform();
  },

  updateHistoryState() {
    this.setData({ canUndo: this.strokes.length > 0, canRedo: this.redoStrokes.length > 0, canRepair: this.strokes.length > 0 });
  },

  onSelectBrush() { this.setData({ brushMode: "brush" }); },
  onSelectEraser() { this.setData({ brushMode: "eraser" }); },
  onBrushSizeChange(event) { this.setData({ brushSize: Number(event.detail.value) }); },
  onMaskColorTap(event) { this.setData({ maskColor: event.currentTarget.dataset.color }); this.renderPreview(); },
  onToggleContrast() { this.setData({ highContrast: !this.data.highContrast }); this.renderPreview(); },

  onUndo() {
    if (!this.strokes.length || this.data.processing) return;
    this.redoStrokes.push(this.strokes.pop());
    this.updateHistoryState();
    this.renderPreview();
  },

  onRedo() {
    if (!this.redoStrokes.length || this.data.processing) return;
    this.strokes.push(this.redoStrokes.pop());
    this.updateHistoryState();
    this.renderPreview();
  },

  buildMask() {
    const mask = new Uint8Array(this.imageWidth * this.imageHeight);
    this.strokes.forEach((stroke) => rasterizeStroke(mask, this.imageWidth, this.imageHeight, stroke));
    let markedPixels = 0;
    for (let index = 0; index < mask.length; index += 1) if (mask[index]) markedPixels += 1;
    return { mask, markedPixels };
  },

  async onRepair() {
    if (this.data.processing || !this.strokes.length) return;
    const maskData = this.buildMask();
    if (!maskData.markedPixels) {
      wx.showToast({ title: "请先涂抹需要处理的区域", icon: "none" });
      return;
    }
    if (maskData.markedPixels / maskData.mask.length >= LARGE_MASK_RATIO) {
      const confirmation = await new Promise((resolve) => {
        wx.showModal({ title: "标记范围较大", content: "当前标记范围较大，处理可能需要较长时间，是否继续？", confirmText: "继续处理", success: resolve });
      });
      if (!confirmation.confirm) return;
    }
    this.startRepair(maskData.mask);
  },

  async startRepair(mask) {
    this.setData({ processing: true, progress: 0 });
    try {
      this.sourceCanvas.width = this.imageWidth;
      this.sourceCanvas.height = this.imageHeight;
      const image = await loadCanvasImage(this.sourceCanvas, this.data.imagePath);
      this.sourceContext.clearRect(0, 0, this.imageWidth, this.imageHeight);
      this.sourceContext.drawImage(image, 0, 0, this.imageWidth, this.imageHeight);
      const imageData = this.sourceContext.getImageData(0, 0, this.imageWidth, this.imageHeight);
      this.runWorker(imageData, mask);
    } catch (error) {
      this.finishRepairError("图片读取失败，请尝试较小的图片");
    }
  },

  runWorker(imageData, mask) {
    this.destroyWorker();
    if (isDeveloperTool() || typeof wx.createWorker !== "function") {
      this.runLocalRepair(imageData, mask);
      return;
    }
    try {
      this.repairWorker = wx.createWorker("workers/image-inpaint.js");
      this.repairWorker.onMessage((event) => this.handleWorkerMessage(event));
      this.repairWorker.onError(() => this.finishRepairError("修复任务异常结束"));
      this.repairWorker.postMessage({ type: "repair", pixels: imageData.data.buffer, mask: mask.buffer, width: this.imageWidth, height: this.imageHeight });
    } catch (error) {
      this.finishRepairError("当前微信版本不支持本地修复");
    }
  },

  async handleWorkerMessage(event) {
    const message = event.message || event.data || event;
    if (!message || !this.data.processing) return;
    if (message.type === "progress") {
      this.setData({ progress: Math.max(0, Math.min(100, Number(message.progress) || 0)) });
      return;
    }
    if (message.type === "error") {
      this.finishRepairError(message.message || "图片修复失败");
      return;
    }
    if (message.type !== "done") return;
    this.completeRepair(message.pixels);
  },

  runLocalRepair(imageData, mask) {
    setTimeout(async () => {
      try {
        const job = createRepairJob({
          pixels: imageData.data,
          mask,
          width: this.imageWidth,
          height: this.imageHeight,
          onProgress: (progress) => this.setData({ progress }),
        });
        const result = job.step(12).result;
        if (result.errorCode) {
          this.finishRepairError(result.errorCode);
          return;
        }
        await this.completeRepair(result.pixels.buffer);
      } catch (error) {
        this.finishRepairError("本地修复失败，请重试");
      }
    }, 0);
  },

  async completeRepair(pixelBuffer) {
    try {
      const output = new Uint8ClampedArray(pixelBuffer);
      const outputData = this.sourceContext.createImageData(this.imageWidth, this.imageHeight);
      outputData.data.set(output);
      this.sourceContext.putImageData(outputData, 0, 0);
      const result = await canvasToTempFilePath(this.sourceCanvas, this.imageWidth, this.imageHeight);
      this.destroyWorker();
      this.setData({ processing: false, progress: 100, resultPath: result.tempFilePath, isResult: true, comparePosition: 50 });
      recordSuccessfulUse("image-repair")
        .then(() => this.setData({ syncMessage: "" }))
        .catch((error) => {
          const message = errorMessage(error);
          this.setData({ syncMessage: message });
          wx.showToast({ title: "使用记录未同步", icon: "none" });
        });
      this.updateCompareTransform();
    } catch (error) {
      console.error("图片结果导出失败", error);
      this.finishRepairError("结果导出失败，请重试");
    }
  },

  onCancelRepair() {
    if (!this.data.processing) return;
    this.destroyWorker();
    this.setData({ processing: false, progress: 0 });
    wx.showToast({ title: "已取消处理", icon: "none" });
  },

  destroyWorker() {
    if (this.repairWorker) {
      this.repairWorker.terminate();
      this.repairWorker = null;
    }
  },

  finishRepairError(message) {
    this.destroyWorker();
    this.setData({ processing: false, progress: 0 });
    wx.showToast({ title: repairFailureMessage(message), icon: "none" });
  },

  onCompareSlider(event) { this.setData({ comparePosition: Number(event.detail.value) }); },

  onCompareTouchStart(event) {
    const touches = event.touches || [];
    if (touches.length >= 2) this.beginGesture(touches);
  },

  onCompareTouchMove(event) {
    const touches = event.touches || [];
    if (touches.length >= 2 && this.gesture) this.updateGesture(touches);
  },

  onCompareTouchEnd() { this.gesture = null; },

  async onBackToEditor() {
    this.clearEditorCanvasReferences();
    this.setData({ isResult: false });
    await nextTick();
    try {
      await this.ensureEditorCanvases();
      this.previewImage = await loadCanvasImage(this.editorCanvas, this.data.imagePath);
      this.fitImage();
    } catch (error) {
      wx.showToast({ title: "编辑画布初始化失败", icon: "none" });
      return;
    }
    this.renderPreview();
  },

  async onSaveResult() {
    if (!this.data.resultPath) return;
    try {
      await new Promise((resolve, reject) => wx.saveImageToPhotosAlbum({ filePath: this.data.resultPath, success: resolve, fail: reject }));
      wx.showToast({ title: "已保存到相册", icon: "success" });
    } catch (error) {
      wx.showModal({
        title: "需要相册权限",
        content: "请在设置中允许保存图片到相册后重试。",
        confirmText: "去设置",
        success: (response) => { if (response.confirm) wx.openSetting({}); },
      });
    }
  },
});
