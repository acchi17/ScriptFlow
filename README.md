# ScriptFlow

A drag-and-drop workflow builder where you construct nested workflows by combining blocks and containers. Blocks execute JavaScript scripts; containers hold and run child entries sequentially.

Runs as both a **browser app** (Vite) and a **desktop app** (Electron).

## Prerequisites

- Node.js 18+
- npm

## Installation

```bash
npm install
```

## Development

### Browser

```bash
npm run dev
```

Opens at `http://localhost:8080` with hot module replacement.

### Desktop (Electron)

```bash
npm run electron:start
```

## Linting

```bash
npm run lint
```

## Production Build

### Browser

```bash
npm run build       # Output: dist/
npm run preview     # Preview the built app locally
```

### Desktop (Electron)

```bash
npm run electron:package   # Package the app → out/
npm run electron:make      # Build installer artifacts → out/make/
```

On Windows, `electron:make` produces a Squirrel installer (`.exe`) and a `.zip`.

## Project Structure

```
├── electron/                  # Electron main process
│   ├── main.js                # App entry, IPC handlers, utility-process management
│   ├── preload.js             # Exposes window.electronAPI to the renderer
│   └── script-runner.js       # Utility process that executes user scripts
├── src/                       # Vue 3 application
│   ├── components/            # UI components
│   ├── classes/               # Core managers (EntryManager, etc.)
│   ├── services/              # Execution, logging, platform services
│   ├── composables/           # Vue composables
│   └── config/app-config.js   # Centralized configuration
├── public/
│   ├── scripts/               # Default block scripts (.mjs)
│   └── settings/
│       └── BlockDefinitions.json  # Block registry (categories, parameters)
└── index.html
```

**Browser:** scripts and definitions are served read-only from `public/`.  
**Electron:** on first launch, `public/scripts/` and `public/settings/` are seeded into `<app-dir>/scripts/` and `<app-dir>/settings/`, where they can be edited by the user.

## Writing Block Scripts

Each script is an ES module (`.mjs`) that exports an `execute` function:

```js
// public/scripts/Add.mjs
export function execute(inputParams) {
  const result = { success: false };
  try {
    result.output = inputParams.NumberA + inputParams.NumberB;
    result.success = true;
  } catch (error) {
    result.errorMessage = error.message;
  }
  return result;
}
```

Add the corresponding entry to `public/settings/BlockDefinitions.json` to make the block available in the UI.
