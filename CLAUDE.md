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

Unit tests live alongside their subject in `__tests__/` directories (e.g. `client/ecs/component-handlers/__tests__/EntryHandlerFacade.test.js`). End-to-end tests that need a real browser (native drag-and-drop, real layout/scrolling) live in `e2e-tests/*.spec.js` and run via `npm run test:e2e`. For UI verification beyond what unit/e2e tests cover, run `npm run electron:start`.

## Design Documents

- In design documents under `doc/design/` and `doc/design-draft/`, reference code by file path and identifier (e.g. `RecipeItem.vue` `measureEntries()`, `EntryHandlerFacade.clearEntries()`), never by line number. Line numbers go stale as soon as the code changes.
- Use Mermaid `graph TD` or `graph LR` for structure diagrams.

## Important Patterns

### Naming Conventions (JavaScript / TypeScript)
- Class names: PascalCase
- Function names: camelCase
- File name should match the type (class or function) of its main export

### Default Bundling
- `appdata/scripts/` and `appdata/settings/BlockDefinitions.json` are the single source of truth.
- At runtime, user-editable scripts live at `<app-dir>/scripts/*.js` and the app-editable `<app-dir>/settings/BlockDefinitions.json` (written via Node `fs` through IPC), next to the executable.
- The Electron build bundles `appdata/` via `extraResource` and seeds `<app-dir>/scripts/` and `<app-dir>/settings/` from it on first launch if missing. The Web server target seeds the same way from `appdata/` (see `server/index.js`).
