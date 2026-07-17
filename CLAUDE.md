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

## Design Process

Before writing any implementation code, output a Mermaid block diagram when:
- Creating a new file, class, or module
- Adding or modifying logic that spans multiple files

Always use `graph TD` (top-down) or `graph LR` (left-right) syntax.

## Important Patterns

### When Modifying Entry Structure
Always use EntryManager methods, never manipulate `children` arrays or parent relationships directly. The manager maintains internal maps that must stay synchronized.

### Default Bundling
- `public/scripts/` and `public/settings/BlockDefinitions.json` are the single source of truth for both targets.
- The browser build serves them directly from `public/`.
- The Electron build bundles `public/` via `extraResource` and seeds `<app-dir>/scripts/` and `<app-dir>/settings/` from it on first launch.

### Class Design Conventions

The codebase uses a four-layer architecture. Place new classes in the correct layer:

| Layer | Directory | Role |
|---|---|---|
| **Models** | `src/models/` | Lightweight data carriers. No Vue imports. Shallow inheritance from `Entry` is allowed. |
| **Managers** | `src/managers/` | Stateful lifecycle and relationship management (e.g. tree structure, connections, parameters). Injected into composables via `provide/inject`. |
| **Services** | `src/services/<domain>/` | I/O, orchestration, and engine abstraction. Group by domain subdirectory (e.g. `entry_execution/`, `script_execution/`). Mostly stateless facades. |
| **Composables** | `src/composables/` | Vue 3 reactive glue only. Use `ref`/`reactive`/`computed` here, not in classes. Delegate business logic to managers and services. |

Rules:
- One class per file. File name matches class name.
- Prefer composition over inheritance. Inheritance is reserved for models only.
- Models must not import from Vue (`reactive`, `ref`, etc.).
- Composables must not contain business logic — delegate to the appropriate manager or service.
- If a manager or service exceeds ~250 lines or has more than ~12 public methods, consider splitting it by concern.
