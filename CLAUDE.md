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

# End-to-end tests — Playwright, drives a real Chromium against the web target
npm run test:e2e         # Builds the web target, starts it, and runs e2e-tests/*.spec.js against it

```

Unit tests live alongside their subject in `__tests__/` directories (e.g. `client/ecs/component-handlers/__tests__/EntryManagementFacade.test.js`). End-to-end tests that need a real browser (native drag-and-drop, real layout/scrolling) live in `e2e-tests/*.spec.js` and run via `npm run test:e2e`. For UI verification beyond what unit/e2e tests cover, run `npm run electron:start`.

## Project Overview

A Vue 3 drag-and-drop UI builder where users construct nested workflows by dragging blocks and containers. Blocks execute scripts; containers hold and execute child entries sequentially. The application loads block definitions from JSON and executes JavaScript scripts via an Electron utility process.

The app ships as an Electron desktop app (Electron Forge + Vite). User-editable scripts live at `<app-dir>/scripts/*.js` next to the executable, and the app-editable `<app-dir>/settings/BlockDefinitions.json` is written via Node `fs` through IPC. Both folders are seeded from `appdata/` on first launch if missing.

## Design Process

Before writing any implementation code, output a Mermaid block diagram when:
- Creating a new file, class, or module
- Adding or modifying logic that spans multiple files

Always use `graph TD` (top-down) or `graph LR` (left-right) syntax.

## Important Patterns

### When Modifying Entry Structure
Always use EntryHandlerFacade methods, he facade maintains internal maps that must stay synchronized.

### Default Bundling
- `appdata/scripts/` and `appdata/settings/BlockDefinitions.json` are the single source of truth.
- The Electron build bundles `appdata/` via `extraResource` and seeds `<app-dir>/scripts/` and `<app-dir>/settings/` from it on first launch. The Web server target seeds the same way from `appdata/` (see `server/index.js`).
