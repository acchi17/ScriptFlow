# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Browser (web) target — Vite
npm run dev              # Start Vite dev server with HMR
npm run build            # Build for production (output: dist/)
npm run preview          # Preview the production build
npm run lint             # Run ESLint (Vue 3 essential config)

# Electron (desktop) target — Electron Forge + Vite
npm run electron:start   # Run the desktop app in dev mode
npm run electron:package # Package the desktop app (output: out/)
npm run electron:make    # Build installer artefacts (Squirrel/zip)

```

No automated test runner is configured. For UI verification, run `npm run dev` (browser) or `npm run electron:start` (desktop).

## Project Overview

A Vue 3 drag-and-drop UI builder where users construct nested workflows by dragging blocks and containers. Blocks execute scripts; containers hold and execute child entries sequentially. The application loads block definitions from JSON and executes JavaScript scripts via Web Workers (browser) or an Electron utility process (desktop).

The project is dual-target:
- **Browser**: Vite dev/build, scripts/definitions read-only from `public/scripts/` and `public/settings/`.
- **Electron**: Electron Forge + Vite. User-editable scripts live at `<app-dir>/scripts/*.js` next to the executable, and the app-editable `<app-dir>/settings/BlockDefinitions.json` is written via Node `fs` through IPC. Both folders are seeded from `public/` on first launch if missing.

### Electron Architecture (electron/)

- `electron/main.js` (CJS): main process — creates the BrowserWindow with `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`. Resolves `<app-dir>/scripts/` and `<app-dir>/settings/`, seeds them from `public/` on first launch, and registers IPC handlers (`scripts:list`, `scripts:read`, `defs:read`, `defs:write`, `script:execute`). Spawns and manages a single long-lived utility process for script execution and kills it on `before-quit`.
- `electron/preload.js`: exposes a typed `window.electronAPI` to the renderer via `contextBridge`. Never exposes raw `fs`, `ipcRenderer`, or `child_process`.
- `electron/script-runner.js`: utility-process entry point. Receives `{ id, scriptName, inputParams }` over `parentPort`, dynamically imports `<app-dir>/scripts/{name}.js` as an ES module, calls `execute(inputParams)`, and posts `{ type, id, result|errmsg }` back. The script name is validated against `/^[A-Za-z0-9_-]+$/`, and every resolved path is clamped to the scripts directory.
- `forge.config.js`: Electron Forge config. Uses `@electron-forge/plugin-vite` to build main/preload/runner with `vite.{main,preload,runner}.config.js` and the renderer with `vite.config.js`. `extraResource: ['./public']` ships bundled defaults inside the packaged app.

## Important Patterns

### When Modifying Entry Structure
Always use EntryManager methods, never manipulate `children` arrays or parent relationships directly. The manager maintains internal maps that must stay synchronized.

### Default Bundling
- `public/scripts/` and `public/settings/BlockDefinitions.json` are the single source of truth for both targets.
- The browser build serves them directly from `public/`.
- The Electron build bundles `public/` via `extraResource` and seeds `<app-dir>/scripts/` and `<app-dir>/settings/` from it on first launch.
