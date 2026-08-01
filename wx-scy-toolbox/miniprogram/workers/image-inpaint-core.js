function pixelIndex(x, y, width) {
  return (y * width + x) * 4;
}

function setPixel(output, target, first, second, ratio) {
  for (let channel = 0; channel < 4; channel += 1) {
    output[target + channel] = Math.round(output[first + channel] * (1 - ratio) + output[second + channel] * ratio);
  }
}

function repairImage({ pixels, mask, width, height, onProgress }) {
  const output = new Uint8ClampedArray(pixels);
  const horizontalValid = new Uint8Array(width * height);
  const bounds = { left: width, right: -1, top: height, bottom: -1 };
  let markedPixels = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      markedPixels += 1;
      bounds.left = Math.min(bounds.left, x);
      bounds.right = Math.max(bounds.right, x);
      bounds.top = Math.min(bounds.top, y);
      bounds.bottom = Math.max(bounds.bottom, y);
    }
  }
  if (!markedPixels) return { pixels: output, markedPixels };

  const fillSegment = (axis, fixed, start, end, valid) => {
    const before = start - 1;
    const after = end + 1;
    const limit = axis === "x" ? width : height;
    const hasBefore = before >= 0 && !mask[axis === "x" ? fixed * width + before : before * width + fixed];
    const hasAfter = after < limit && !mask[axis === "x" ? fixed * width + after : after * width + fixed];
    if (!hasBefore && !hasAfter) return;
    for (let coordinate = start; coordinate <= end; coordinate += 1) {
      const target = axis === "x" ? pixelIndex(coordinate, fixed, width) : pixelIndex(fixed, coordinate, width);
      const beforeIndex = axis === "x" ? pixelIndex(before, fixed, width) : pixelIndex(fixed, before, width);
      const afterIndex = axis === "x" ? pixelIndex(after, fixed, width) : pixelIndex(fixed, after, width);
      if (hasBefore && hasAfter) {
        setPixel(output, target, beforeIndex, afterIndex, (coordinate - start + 1) / (end - start + 2));
      } else {
        const source = hasBefore ? beforeIndex : afterIndex;
        for (let channel = 0; channel < 4; channel += 1) output[target + channel] = output[source + channel];
      }
      if (valid) valid[axis === "x" ? fixed * width + coordinate : coordinate * width + fixed] = 1;
    }
  };

  for (let y = bounds.top; y <= bounds.bottom; y += 1) {
    let x = bounds.left;
    while (x <= bounds.right) {
      if (!mask[y * width + x]) { x += 1; continue; }
      const start = x;
      while (x <= bounds.right && mask[y * width + x]) x += 1;
      fillSegment("x", y, start, x - 1, horizontalValid);
    }
    if (onProgress && (y - bounds.top) % 24 === 0) onProgress(Math.round((y - bounds.top + 1) * 45 / (bounds.bottom - bounds.top + 1)));
  }

  for (let x = bounds.left; x <= bounds.right; x += 1) {
    let y = bounds.top;
    while (y <= bounds.bottom) {
      if (!mask[y * width + x]) { y += 1; continue; }
      const start = y;
      while (y <= bounds.bottom && mask[y * width + x]) y += 1;
      fillSegment("y", x, start, y - 1, horizontalValid);
    }
    if (onProgress && (x - bounds.left) % 24 === 0) onProgress(45 + Math.round((x - bounds.left + 1) * 45 / (bounds.right - bounds.left + 1)));
  }

  const fallback = [255, 255, 255, 255];
  for (let y = bounds.top; y <= bounds.bottom; y += 1) {
    for (let x = bounds.left; x <= bounds.right; x += 1) {
      const maskIndex = y * width + x;
      if (!mask[maskIndex] || horizontalValid[maskIndex]) continue;
      const target = pixelIndex(x, y, width);
      for (let channel = 0; channel < 4; channel += 1) output[target + channel] = fallback[channel];
    }
  }
  if (onProgress) onProgress(100);
  return { pixels: output, markedPixels };
}

module.exports = { repairImage };
