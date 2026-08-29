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

async function startDragNear(page, edge) {
  await page.evaluate((edge) => {
    const source = document.querySelector('.block-item')
    const panel = document.querySelector('.recipe-panel')
    const rect = panel.getBoundingClientRect()
    const dt = new DataTransfer()
    source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }))
    panel.dispatchEvent(new DragEvent('dragover', {
      bubbles: true,
      dataTransfer: dt,
      clientX: rect.left + 10,
      clientY: edge === 'top' ? rect.top + 5 : rect.bottom - 5,
    }))
  }, edge)
}

async function endDrag(page) {
  await page.evaluate(() => {
    document.querySelector('.block-item').dispatchEvent(new DragEvent('dragend', { bubbles: true }))
  })
}

test.describe('RecipeItem auto-scroll while dragging', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.click('.category-header')
    await expect(page.locator('.block-name-item').first()).toBeVisible()

    for (let i = 0; i < BLOCK_COUNT; i++) {
      await addBlock(page)
    }
    await expect(page.locator('.block-item')).toHaveCount(BLOCK_COUNT)
  })

  test('scrolls down while dragging near the bottom edge, and stops on drag end', async ({ page }) => {
    expect(await getScrollTop(page)).toBe(0)

    await startDragNear(page, 'bottom')
    await page.waitForTimeout(300)
    const afterFirstWait = await getScrollTop(page)
    expect(afterFirstWait).toBeGreaterThan(0)

    await page.waitForTimeout(300)
    const afterSecondWait = await getScrollTop(page)
    expect(afterSecondWait).toBeGreaterThan(afterFirstWait)

    await endDrag(page)
    const stoppedAt = await getScrollTop(page)
    await page.waitForTimeout(300)
    expect(await getScrollTop(page)).toBe(stoppedAt)
  })

  test('scrolls up while dragging near the top edge', async ({ page }) => {
    await page.locator('.recipe-panel').evaluate((el) => { el.scrollTop = 500 })
    const startedAt = await getScrollTop(page)

    await startDragNear(page, 'top')
    await page.waitForTimeout(300)
    expect(await getScrollTop(page)).toBeLessThan(startedAt)

    await endDrag(page)
  })
})
