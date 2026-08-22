# Playwright: What It Is and How to Run It

## 1. What Is Playwright

[Playwright](https://playwright.dev/) is a browser automation library from Microsoft. It launches a real browser (Chromium, Firefox, or WebKit) and lets you automate it from JavaScript/TypeScript, including:

- Navigating pages, clicking, typing, and other user interactions
- Finding DOM elements and asserting on their state
- Capturing `console` logs, `pageerror` events, and network requests
- Taking screenshots and recording video

Unlike unit tests that run components in memory (e.g. jsdom-based tools), Playwright drives an actual browser, so it can exercise real DOM/CSS layout and native browser events (such as HTML5 drag-and-drop) that are hard to reproduce in a simulated DOM.

## 2. Two Ways to Use It

Playwright can be used in two independent ways. They are **alternatives**, not steps of one workflow — pick whichever fits the task.

| | A. One-off script | B. `@playwright/test` runner |
| :--- | :--- | :--- |
| What it is | Plain Node script that imports `playwright` directly | Dedicated test runner package (`@playwright/test`) with config, assertions, reports |
| Good for | Quick, throwaway manual checks | Repeatable, maintained test suites |
| Setup needed | None beyond `playwright` + browser binaries | `playwright.config.js`, `tests/` folder |
| App/server under test | **Must already be running** — the script only connects to a URL you give it | Can auto-start (and stop) the app itself via `webServer` in the config |
| How you run it | `node your-script.cjs` | `npx playwright test` |

Both require the browser binaries to be installed first — see §3.

### A. One-off script

Use this when you just want to poke at a running app once and print/inspect the result, with no lasting test file.

Because the script only calls `page.goto(url)`, it does not start the app for you — you must start the app/server yourself first (e.g. `npm run dev` in another terminal) and know which URL it's listening on.

```js
// example.cjs
const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log(`[console.${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => console.log(`[pageerror] ${err.message}`));

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.click('.some-button');
  console.log(await page.locator('.some-list-item').count());

  await page.screenshot({ path: 'result.png' });
  await browser.close();
}

main().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
```

Run it directly with Node, with the app already running:

```bash
# terminal 1
npm run dev

# terminal 2
node example.cjs
```

Notes:
- Since this uses `require()`, save it as `.cjs` (CommonJS), or use `.mjs`/ESM with `import { chromium } from 'playwright'`.
- Native HTML5 drag-and-drop is not well supported by Playwright's built-in `dragTo()`. To simulate it reliably, dispatch `DragEvent`s with a shared `DataTransfer` inside `page.evaluate()`:

```js
await page.evaluate(({ sourceSel, targetSel }) => {
  const source = document.querySelector(sourceSel);
  const target = document.querySelector(targetSel);
  const dt = new DataTransfer();

  source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
  target.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer: dt }));
  target.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt }));
  source.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }));
}, { sourceSel: '.drag-source', targetSel: '.drop-target' });
```

### B. `@playwright/test` runner

Use this when you want a maintained test suite: assertions (`expect`), automatic retries, parallel execution, and HTML reports.

Unlike the one-off script, this approach *can* start the app for you automatically before tests run (and shut it down after), via the `webServer` option in `playwright.config.js` — you don't have to manually run `npm run dev` in a separate terminal first, though `reuseExistingServer: true` will reuse one if it's already up.

```bash
npm install -D @playwright/test
npx playwright init          # scaffolds playwright.config.js and a tests/ folder
```

```js
// tests/example.spec.js
import { test, expect } from '@playwright/test';

test('clicking a category reveals its items', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await page.click('.category-header');
  await expect(page.locator('.item').first()).toBeVisible();
});
```

```js
// playwright.config.js
export default {
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
};
```

Run tests with the `playwright` CLI (no need to start the app manually — the config above does it):

```bash
npx playwright test          # run all tests
npx playwright test --ui     # interactive UI mode, step through each action
npx playwright test path/to/example.spec.js   # run a single file
npx playwright show-report   # open the HTML report from the last run
```

Useful flags:
- `--headed` — show the browser window instead of running headless
- `--debug` — run with the Playwright Inspector for step-by-step debugging
- `--project=chromium` — restrict to one configured browser project

## 3. Install Browser Binaries (Required for Either Approach)

Playwright needs actual browser binaries, separate from the npm package itself. Install once after adding `playwright` (or `@playwright/test`) to the project:

```bash
npx playwright install chromium
# or, to install all supported browsers:
npx playwright install
```
