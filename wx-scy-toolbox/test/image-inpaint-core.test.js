const assert = require("node:assert/strict");
const test = require("node:test");
const { repairImage } = require("../miniprogram/workers/image-inpaint-core");

function makePixel(red, green, blue, alpha = 255) {
  return [red, green, blue, alpha];
}

test("repairs a marked horizontal segment from neighbouring pixels", () => {
  const pixels = new Uint8ClampedArray([
    ...makePixel(20, 40, 60),
    ...makePixel(60, 80, 100),
    ...makePixel(200, 30, 30),
    ...makePixel(180, 20, 20),
    ...makePixel(140, 160, 180),
    ...makePixel(180, 200, 220),
  ]);
  const mask = new Uint8Array([0, 0, 255, 255, 0, 0]);

  const result = repairImage({ pixels, mask, width: 6, height: 1 });

  assert.equal(result.markedPixels, 2);
  assert.deepEqual(Array.from(result.pixels.slice(8, 12)), [87, 107, 127, 255]);
  assert.deepEqual(Array.from(result.pixels.slice(12, 16)), [113, 133, 153, 255]);
});

test("keeps unmarked pixels untouched and reports an empty mask", () => {
  const pixels = new Uint8ClampedArray([...makePixel(12, 34, 56), ...makePixel(78, 90, 12)]);
  const result = repairImage({ pixels, mask: new Uint8Array([0, 0]), width: 2, height: 1 });

  assert.equal(result.markedPixels, 0);
  assert.deepEqual(Array.from(result.pixels), Array.from(pixels));
});
