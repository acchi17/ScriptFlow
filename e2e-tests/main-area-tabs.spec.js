import { test, expect } from '@playwright/test'

const BLOCK_COUNT = 60

async function addBlock(page) {
  await page.evaluate(() => {
    const source = document.querySelector('.block-name-item')
    const dropArea = document.querySelector('.drop-area')
    const dt = new DataTransfer()
    source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }))
    dropArea.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt }))
    source.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }))
  })
}

function getScrollTop(page) {
  return page.locator('.recipe-panel').evaluate((el) => el.scrollTop)
}

test.describe('MainArea tabs scroll position', () => {
  test('restores the scroll position when switching back to a tab', async ({ page }) => {
    await page.goto('/')
    await page.click('.category-header')
    await expect(page.locator('.block-name-item').first()).toBeVisible()

    for (let i = 0; i < BLOCK_COUNT; i++) {
      await addBlock(page)
    }
    await expect(page.locator('.block-item')).toHaveCount(BLOCK_COUNT)

    await page.locator('.recipe-panel').evaluate((el) => { el.scrollTop = 500 })
    const scrolledTo = await getScrollTop(page)
    expect(scrolledTo).toBeGreaterThan(0)

    // A new tab is created, becomes active and is shown from the top.
    await page.click('.tab-add-btn')
    await expect(page.locator('.tab')).toHaveCount(2)
    await expect(page.locator('.tab').nth(1)).toHaveClass(/active/)
    await expect(page.locator('.block-item')).toHaveCount(0)
    expect(await getScrollTop(page)).toBe(0)

    // Switching back to the first tab restores its scroll position.
    await page.locator('.tab').first().click()
    await expect(page.locator('.tab').first()).toHaveClass(/active/)
    await expect(page.locator('.block-item')).toHaveCount(BLOCK_COUNT)
    await expect.poll(() => getScrollTop(page)).toBe(scrolledTo)
  })
})
