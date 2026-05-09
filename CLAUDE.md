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

## Core Architecture

### Entities

- **Entry** (base class): Represents any draggable element with `id`, `name`, `type`, and `children`
- **Block** (extends Entry): Leaf node that executes a single script
- **Container** (extends Entry): Can hold nested Blocks/Containers, executes children sequentially

**EntryManager** (`src/classes/EntryManager.js`): Centralized manager for all parent-child relationships
- Uses two maps: `_entriesById` (entry objects) and `_parentIdById` (child→parent lookup)
- Key methods: `addEntry()`, `removeEntry()`, `moveEntry()`, `reorderEntry()`, `getAllDescendantIds()`
- All structural changes (add/move/remove/reorder) must go through EntryManager

**EntryParamManager** (`src/classes/EntryParamManager.js`): Manages input/output parameters for each entry, enabling data flow between blocks in a workflow.

**EntryLayoutManager** (`src/classes/EntryLayoutManager.js`): Stores measured Y position and height of each entry's header in a reactive Map; used to align connection lines in the connection panel with entry headers.

**EntryConnectionManager** (`src/classes/EntryConnectionManager.js`): Manages directed connections between entry output and input parameter endpoints.

**PlatformService** (`src/services/platform/PlatformService.js`): Thin facade for file I/O that routes between Electron (`window.electronAPI` exposed via the preload script) and the browser (`fetch()` against `/settings`). Methods: `readBlockDefinitions()`, `writeBlockDefinitions()`, `listScripts()`. The `writeBlockDefinitions` call throws in the browser build (read-only).

### Components

- **App.vue**: 3-column layout (SideArea | MainArea | ExecutionLogView)
- **RecipeItem.vue**: Holds the root container (`id: 'main-area'`) registered in EntryManager without a parent
- **SideArea.vue**: Drag sources for creating new blocks and containers
- **BlockItem.vue**: Renders individual blocks
- **ContainerItem.vue**: Recursive component rendering nested entries with drop zones
- **EntryParamsRow.vue**: Displays an In/Out toggle and parameter name badges inside a selected entry rectangle; used by both BlockItem and ContainerItem
- **EntryParamItem.vue**: Clickable badge displaying a parameter name; toggles pending connection state via `useEntryState`.
- **EntryView.vue**: Detail panel for the selected entry; shows its name and editable input parameters via `EntryParamManager`
- **ExecutionLogView.vue**: Displays execution logs from ExecutionLogService
- **ContainerChildren.vue**: Renders a container's child list with drop zones between entries, dispatching drop events to add/reorder/move entries.
- **ConnectionView.vue**: SVG overlay rendering all parameter connections as `ConnectionItem`s, with lane indices assigned via greedy interval packing to prevent overlap.
- **ConnectionItem.vue**: SVG `<g>` drawing a single connection line between two entry headers at a computed lane X, with parameter name badges at each endpoint.

### Composables

- **useDragDropState.js**: Module-level singleton tracking `isDragging` and `draggedItemIds`; shared across components to prevent dropping onto self or descendants.
- **useDraggable.js**: Provides `onDragStart`/`onDragEnd` handlers for draggable elements, updating `useDragDropState` on drag lifecycle.
- **useDroppable.js**: Provides `onDragOver`/`onDrop`/`isDroppable()` for drop zones; calls a registered callback with the drop event and target index.
- **useEntryExecution.js**: Bridges UI to `EntryExecutionService`, exposing `executeEntry()`, `isExecuting`, `getLogs()`, and `clearLogs()`.
- **useEntryOperation.js**: Bridges UI to `EntryManager`, exposing add/remove/move/reorder operations with automatic selection cleanup on removal.
- **useEntryRect.js**: Measures Y position and height of each entry's header and writes them into `EntryLayoutManager` for connection-line alignment; re-measures on structural changes.
- **useEntryState.js**: Module-level singleton managing entry selection (`selectedEntryId`) and parameter connection waiting state (`pendingConnection`) across all components.

### Entry Execution System

**Execution Flow:**
1. User triggers execution on a block or container (via `useEntryExecution` composable)
2. `EntryExecutionService.executeEntry(entry, traceId)` is called
   - Pushes the entry ID onto `_executionStack` to prevent concurrent re-execution
   - Generates a unique `executionId` (format: `{sessionId}_{sequence}_{entryId}`)
   - Logs execution start via `ExecutionLogService.addLog()`
3. Dispatch by entry type:
   - **Block** → `_executeBlock()` → `ScriptExecutionService.executeScript(blockName, inputParams)`
   - **Container** → `_executeContainer()` → recursively calls `executeEntry()` on each child in order
4. `ExecutionLogService.updateLog()` records the result and elapsed time
5. Entry ID is popped from `_executionStack` (in a `finally` block)

**Script Execution Pipeline** (`src/services/script_execution/`):
- `ScriptExecutionService`: Unified interface; delegates to an engine created by `ScriptExecutionFactory`
- `ScriptExecutionFactory`: Factory that instantiates the appropriate engine (currently JavaScript only)
- `IScriptExecutionEngine`: Abstract base defining the engine contract (`initialize`, `executeScript`, `terminate`)
- `JavaScriptExecutionEngine`: Runtime-aware engine.
  - **Browser**: spawns a Web Worker on `initialize()` and dynamically imports the script via `/scripts/{name}.js` (Vite serves `public/` at the root). Falls back to direct dynamic import if the Worker fails.
  - **Electron**: detects `window.electronAPI` in the constructor, skips Worker creation, and routes `executeScript()` through IPC (`script:execute`) to the main process.
- `JavaScriptExecutionWorker.js`: Browser-only Worker code — dynamically imports `/scripts/{scriptName}.js` and calls `module.execute(inputParams)`.

**Execution Log Hierarchy** (`src/services/log/ExecutionLogService.js`):
- Root executions are stored in `rootExecutions`; child executions are linked via `parentExecutionId`
- `addLog()` builds the tree; `updateLog()` fills in result and exec time after completion
- Auto-cleans oldest entries when the total exceeds the configured max (default 1000)

### Configuration (src/config/app-config.js)

Centralized configuration. **Logical names only** — the actual filesystem paths are resolved by `PlatformService` per environment (Electron uses `<app-dir>/{scripts,settings}/`; the browser serves the same files from `public/`).
- `block.definitionsFile`: Logical filename for block definitions JSON (default: `'BlockDefinitions.json'`)
- `script.engineName`: Script execution engine (default: `'javascript'`)
- `script.scriptsDir`: Logical scripts directory name (default: `'scripts'`)

### Electron Architecture (electron/)

- `electron/main.js` (CJS): main process — creates the BrowserWindow with `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`. Resolves `<app-dir>/scripts/` and `<app-dir>/settings/`, seeds them from `public/` on first launch, and registers IPC handlers (`scripts:list`, `scripts:read`, `defs:read`, `defs:write`, `script:execute`). Spawns and manages a single long-lived utility process for script execution and kills it on `before-quit`.
- `electron/preload.js`: exposes a typed `window.electronAPI` to the renderer via `contextBridge`. Never exposes raw `fs`, `ipcRenderer`, or `child_process`.
- `electron/script-runner.js`: utility-process entry point. Receives `{ id, scriptName, inputParams }` over `parentPort`, dynamically imports `<app-dir>/scripts/{name}.js` as an ES module, calls `execute(inputParams)`, and posts `{ type, id, result|errmsg }` back. The script name is validated against `/^[A-Za-z0-9_-]+$/`, and every resolved path is clamped to the scripts directory.
- `forge.config.js`: Electron Forge config. Uses `@electron-forge/plugin-vite` to build main/preload/runner with `vite.{main,preload,runner}.config.js` and the renderer with `vite.config.js`. `extraResource: ['./public']` ships bundled defaults inside the packaged app.

## Typical Use Case

### Place entries & Execution Flow

1. User drags blocks/containers from SideArea into RecipeItem
2. EntryManager maintains the hierarchical structure
3. When user triggers execution, EntryExecutionService:
   - For containers: recursively executes each child
   - For blocks: calls ScriptExecutionService with the block's name
4. ScriptExecutionService loads script from `/scripts/{blockName}.js` (browser, served from `public/scripts/`) or `<app-dir>/scripts/{blockName}.js` (Electron, via the utility-process runner) and executes via `JavaScriptExecutionEngine`
5. EntryParamManager manages parameter passing between blocks
6. ExecutionLogService records results with hierarchical tracing

### Parameter Connection Flow

1. User clicks an `EntryParamItem` badge → `useEntryState.startConnection()` stores the source endpoint (`entryId`, `paramName`, `paramCategory`, `paramType`) in the module-level `connectingSource` ref
2. While connecting, `isConnectingTarget` computes eligible target entries by comparing sequence numbers via `EntryManager.getSequenceNumber()`: output sources accept input badges on later entries; input sources accept output badges on earlier entries
3. User clicks a badge on an eligible target entry → `useEntryState.endConnection()` normalises the two endpoints into `(outputEndpoint, inputEndpoint)` order and calls `EntryConnectionManager.addConnection()`
4. Clicking the active source badge cancels the pending connection via `cancelConnection()`
5. `ConnectionView` reactively reads all connections from `EntryConnectionManager` and Y positions from `EntryLayoutManager` to render `ConnectionItem` lines in the SVG overlay

## Coding Conventions

- **Indentation**: 2 spaces
- **Quotes**: Single quotes in JS
- **Naming**:
  - Components: PascalCase (e.g., `MainArea.vue`)
  - Composables: `useSomething` (e.g., `useDraggable.js`)
  - Classes: PascalCase (e.g., `EntryManager`)
  - Services: PascalCase with "Service" suffix (e.g., `FileService`)
- **Vue Style**: Match the existing Options API or Composition API style in the file being edited

## Important Patterns

### When Modifying Entry Structure
Always use EntryManager methods, never manipulate `children` arrays or parent relationships directly. The manager maintains internal maps that must stay synchronized.

### Cleanup on Unmount
`EntryExecutionService.terminate()` must be called to clean up Web Workers. App.vue handles this on `beforeunload` and `onBeforeUnmount`. In the Electron build, the main-process utility runner is killed in `app.on('before-quit')`.

### Default Bundling
- `public/scripts/` and `public/settings/BlockDefinitions.json` are the single source of truth for both targets.
- The browser build serves them directly from `public/`.
- The Electron build bundles `public/` via `extraResource` and seeds `<app-dir>/scripts/` and `<app-dir>/settings/` from it on first launch.
