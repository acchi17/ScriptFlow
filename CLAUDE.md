# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run lint             # Run ESLint (Vue 3 essential config)

# Tests — Vitest + @vue/test-utils (jsdom environment)
npm test                 # Run the test suite once
npm run test:watch       # Run the test suite in watch mode

# Electron (desktop) target — Electron Forge + Vite
npm run electron:start   # Run the desktop app in dev mode
npm run electron:package # Package the desktop app (output: out/)
npm run electron:make    # Build installer artefacts (Squirrel/zip)

# Web server target — Express, serves the Vite build statically
npm run web:build        # Build the Vue frontend into dist/
npm run web:start        # Run the server against dist/ (http://localhost:3000)
npm run web:package      # Assemble a portable Windows distribution (out/scriptflow-web/), see tools/package-web.js

```

Unit tests live alongside their subject in `__tests__/` directories (e.g. `src/managers/__tests__/EntryManager.test.js`). For UI verification beyond what unit tests cover, run `npm run electron:start`.

## Project Overview

A Vue 3 drag-and-drop UI builder where users construct nested workflows by dragging blocks and containers. Blocks execute scripts; containers hold and execute child entries sequentially. The application loads block definitions from JSON and executes JavaScript scripts via an Electron utility process.

The app ships as an Electron desktop app (Electron Forge + Vite). User-editable scripts live at `<app-dir>/scripts/*.js` next to the executable, and the app-editable `<app-dir>/settings/BlockDefinitions.json` is written via Node `fs` through IPC. Both folders are seeded from `configs/` on first launch if missing.

## Design Process

Before writing any implementation code, output a Mermaid block diagram when:
- Creating a new file, class, or module
- Adding or modifying logic that spans multiple files

Always use `graph TD` (top-down) or `graph LR` (left-right) syntax.

## Important Patterns

### When Modifying Entry Structure
Always use EntryManager methods, never manipulate `children` arrays or parent relationships directly. The manager maintains internal maps that must stay synchronized.

### Default Bundling
- `configs/scripts/` and `configs/settings/BlockDefinitions.json` are the single source of truth.
- The Electron build bundles `configs/` via `extraResource` and seeds `<app-dir>/scripts/` and `<app-dir>/settings/` from it on first launch. The Web server target seeds the same way from `configs/` (see `server/index.js`).

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
