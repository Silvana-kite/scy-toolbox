import { expect, test } from '@playwright/test'

async function waitForHydration(page: import('@playwright/test').Page) {
  await page.waitForTimeout(800)
}

test('searches tools and persists a favorite', async ({ page }) => {
  await page.goto('/')
  await waitForHydration(page)
  await expect(page.getByText('14 个工具')).toBeVisible()
  await page.getByRole('searchbox', { name: '搜索工具' }).fill('计算器')
  await expect(page.getByRole('link', { name: /计算器/ })).toBeVisible()
  await page.getByRole('link', { name: /计算器/ }).click()
  await waitForHydration(page)
  await page.getByRole('button', { name: '收藏工具' }).click()
  await page.goto('/me')
  await waitForHydration(page)
  await expect(page.getByRole('heading', { name: '我的收藏' })).toBeVisible()
  await expect(page.getByRole('link', { name: /计算器/ })).toBeVisible()
})

test('runs a calculator and exposes a stable tool URL', async ({ page }) => {
  await page.goto('/tool/calculator')
  await waitForHydration(page)
  const inputs = page.locator('input[type="number"]')
  await inputs.nth(0).fill('12')
  await inputs.nth(1).fill('8')
  await page.getByRole('button', { name: '开始计算' }).click()
  await expect(page.locator('pre').filter({ hasText: '12 + 8 = 20' })).toBeVisible()
  await expect(page.getByRole('button', { name: '复制结果' })).toBeVisible()
})

test('creates a QR code canvas image', async ({ page }) => {
  await page.goto('/tool/qrcode')
  await waitForHydration(page)
  await page.getByLabel('二维码内容').fill('https://example.com')
  await page.getByRole('button', { name: '生成二维码' }).click()
  await expect(page.locator('img[alt="本地图片预览"]')).toBeVisible()
})
