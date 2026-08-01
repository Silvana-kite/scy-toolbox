function neighbours(point, width, total, callback) {
  const x = point % width;
  if (x > 0) callback(point - 1);
  if (x < width - 1) callback(point + 1);
  if (point >= width) callback(point - width);
  if (point < total - width) callback(point + width);
}

class MinHeap {
  constructor() { this.items = []; }
  push(point, distance) {
    const item = { point, distance }; this.items.push(item);
    let index = this.items.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].distance <= item.distance) break;
      this.items[index] = this.items[parent]; index = parent;
    }
    this.items[index] = item;
  }
  pop() {
    const first = this.items[0]; const last = this.items.pop();
    if (!first || !last) return null;
    if (this.items.length) {
      let index = 0;
      while (index * 2 + 1 < this.items.length) {
        let child = index * 2 + 1;
        if (child + 1 < this.items.length && this.items[child + 1].distance < this.items[child].distance) child += 1;
        if (this.items[child].distance >= last.distance) break;
        this.items[index] = this.items[child]; index = child;
      }
      this.items[index] = last;
    }
    return first;
  }
  get size() { return this.items.length; }
}

function collectComponents(mask, width) {
  const seen = new Uint8Array(mask.length); const components = [];
  for (let seed = 0; seed < mask.length; seed += 1) {
    if (!mask[seed] || seen[seed]) continue;
    const pixels = []; const queue = [seed]; seen[seed] = 1; let head = 0;
    let left = seed % width; let right = left; let top = Math.floor(seed / width); let bottom = top;
    while (head < queue.length) {
      const point = queue[head++]; pixels.push(point);
      const x = point % width; const y = Math.floor(point / width);
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      neighbours(point, width, mask.length, (next) => {
        if (mask[next] && !seen[next]) { seen[next] = 1; queue.push(next); }
      });
    }
    components.push({ pixels, left, right, top, bottom });
  }
  return components.sort((first, second) => first.pixels.length - second.pixels.length);
}

function repairImage({ pixels, mask, width, height, onProgress }) {
  const output = new Uint8ClampedArray(pixels); let markedPixels = 0;
  for (let index = 0; index < mask.length; index += 1) if (mask[index]) markedPixels += 1;
  if (!markedPixels) return { pixels: output, markedPixels };
  if (markedPixels === mask.length) return { pixels: output, markedPixels, errorCode: "insufficient-context" };
  const components = collectComponents(mask, width); let repairedPixels = 0;
  const report = () => { if (onProgress) onProgress(Math.min(99, Math.round(repairedPixels / markedPixels * 100))); };

  for (const component of components) {
    const membership = new Set(component.pixels); const filled = new Set(); const distance = new Map(); const heap = new MinHeap();
    const available = (point) => !mask[point] || filled.has(point);
    const fill = (point) => {
      const x = point % width; const y = Math.floor(point / width); const totals = [0, 0, 0]; let totalWeight = 0;
      for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) {
        if (!dx && !dy) continue;
        const sampleX = x + dx; const sampleY = y + dy;
        if (sampleX < 0 || sampleX >= width || sampleY < 0 || sampleY >= height) continue;
        const sample = sampleY * width + sampleX;
        if (!available(sample)) continue;
        const offset = sample * 4; const weight = 1 / (dx * dx + dy * dy);
        for (let channel = 0; channel < 3; channel += 1) totals[channel] += output[offset + channel] * weight;
        totalWeight += weight;
      }
      if (!totalWeight) return false;
      const offset = point * 4;
      for (let channel = 0; channel < 3; channel += 1) output[offset + channel] = Math.round(totals[channel] / totalWeight);
      return true;
    };
    component.pixels.forEach((point) => {
      let boundary = false; neighbours(point, width, mask.length, (next) => { if (!mask[next]) boundary = true; });
      if (!boundary || !fill(point)) return;
      filled.add(point); distance.set(point, 1); heap.push(point, 1); repairedPixels += 1;
    });
    if (!heap.size) return { pixels: new Uint8ClampedArray(pixels), markedPixels, errorCode: "insufficient-context" };
    while (heap.size) {
      const current = heap.pop();
      if (distance.get(current.point) !== current.distance) continue;
      neighbours(current.point, width, mask.length, (next) => {
        if (!membership.has(next) || filled.has(next) || !fill(next)) return;
        const nextDistance = current.distance + 1;
        filled.add(next); distance.set(next, nextDistance); heap.push(next, nextDistance); repairedPixels += 1;
        if (repairedPixels % 512 === 0) report();
      });
    }
    const blended = new Map();
    filled.forEach((point) => {
      if (distance.get(point) > 2) return;
      const x = point % width; const y = Math.floor(point / width); const totals = [0, 0, 0]; let totalWeight = 0;
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
        const sampleX = x + dx; const sampleY = y + dy;
        if (sampleX < 0 || sampleX >= width || sampleY < 0 || sampleY >= height) continue;
        const sample = sampleY * width + sampleX;
        if (mask[sample] && !filled.has(sample)) continue;
        const weight = dx || dy ? 1 : 4; const offset = sample * 4;
        for (let channel = 0; channel < 3; channel += 1) totals[channel] += output[offset + channel] * weight;
        totalWeight += weight;
      }
      blended.set(point, totals.map((value) => Math.round(value / totalWeight)));
    });
    blended.forEach((values, point) => { const offset = point * 4; for (let channel = 0; channel < 3; channel += 1) output[offset + channel] = values[channel]; });
  }
  if (onProgress) onProgress(100);
  return { pixels: output, markedPixels };
}

function createRepairJob(options) {
  let complete = false; let result = null;
  return {
    step() {
      if (!complete) { result = repairImage(options); complete = true; }
      return { complete, result };
    },
  };
}

module.exports = { repairImage, createRepairJob };
