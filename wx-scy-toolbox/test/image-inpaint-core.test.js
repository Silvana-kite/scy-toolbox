const assert = require("node:assert/strict");
const test = require("node:test");
const { repairImage } = require("../miniprogram/common/image-inpaint-core");

function image(width, height, red = 30) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let point = 0; point < width * height; point += 1) {
    pixels[point * 4] = red;
    pixels[point * 4 + 1] = red + 10;
    pixels[point * 4 + 2] = red + 20;
    pixels[point * 4 + 3] = 180;
  }
  return pixels;
}

test("repairs a complete marked area and preserves alpha", () => {
  const pixels = image(7, 7); const mask = new Uint8Array(49);
  for (let y = 2; y <= 4; y += 1) for (let x = 2; x <= 4; x += 1) mask[y * 7 + x] = 255;
  pixels[(3 * 7 + 3) * 4] = 240;
  const result = repairImage({ pixels, mask, width: 7, height: 7 });
  assert.equal(result.markedPixels, 9);
  assert.equal(result.pixels[(3 * 7 + 3) * 4], 30);
  assert.equal(result.pixels[(3 * 7 + 3) * 4 + 3], 180);
});

test("keeps unmarked pixels untouched, including separate regions", () => {
  const pixels = image(6, 2); const before = new Uint8ClampedArray(pixels); const mask = new Uint8Array(12);
  mask[1] = 255; mask[10] = 255;
  const result = repairImage({ pixels, mask, width: 6, height: 2 });
  for (let point = 0; point < mask.length; point += 1) {
    if (mask[point]) continue;
    assert.deepEqual(Array.from(result.pixels.slice(point * 4, point * 4 + 4)), Array.from(before.slice(point * 4, point * 4 + 4)));
  }
});

test("returns an explicit failure when there is no usable surrounding context", () => {
  const pixels = image(2, 2); const result = repairImage({ pixels, mask: new Uint8Array([255, 255, 255, 255]), width: 2, height: 2 });
  assert.equal(result.errorCode, "insufficient-context");
  assert.deepEqual(Array.from(result.pixels), Array.from(pixels));
});

test("reports progress by marked pixels", () => {
  const values = []; const pixels = image(7, 7); const mask = new Uint8Array(49);
  for (let y = 2; y <= 4; y += 1) for (let x = 2; x <= 4; x += 1) mask[y * 7 + x] = 255;
  repairImage({ pixels, mask, width: 7, height: 7, onProgress: (progress) => values.push(progress) });
  assert.equal(values.at(-1), 100);
  assert.ok(values.every((value, index) => index === 0 || value >= values[index - 1]));
});

test("removes a white watermark sample over a sky-like gradient", () => {
  const width = 9; const pixels = new Uint8ClampedArray(width * 5 * 4); const mask = new Uint8Array(width * 5);
  for (let y = 0; y < 5; y += 1) for (let x = 0; x < width; x += 1) {
    const offset = (y * width + x) * 4;
    pixels[offset] = 70 + y * 8; pixels[offset + 1] = 145 + y * 6; pixels[offset + 2] = 220 + y * 3; pixels[offset + 3] = 255;
  }
  for (let y = 2; y <= 3; y += 1) for (let x = 3; x <= 5; x += 1) {
    const offset = (y * width + x) * 4; mask[y * width + x] = 255; pixels[offset] = 255; pixels[offset + 1] = 255; pixels[offset + 2] = 255;
  }
  const output = repairImage({ pixels, mask, width, height: 5 }).pixels;
  assert.ok(output[(2 * width + 4) * 4] < 200);
  assert.ok(output[(2 * width + 4) * 4 + 2] > 180);
});
