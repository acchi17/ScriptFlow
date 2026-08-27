# ScriptFlow

A drag-and-drop workflow builder where you construct nested workflows by combining blocks and containers. Blocks execute JavaScript scripts; containers hold and run child entries sequentially.

Runs as a **desktop app** (Electron) or as a **Web server**, accessible from a browser on the same machine or LAN.

## Prerequisites

- Node.js 18+
- npm

## Installation

```bash
npm install
```

## Development

### Desktop (Electron)

```bash
npm run electron:start
```

### Web server

```bash
npm run web:build   # builds the Vue frontend into dist/
npm run web:start   # serves dist/ and the API on http://localhost:3000
```

## Linting

```bash
npm run lint
```

## Production Build

### Desktop (Electron)

```bash
npm run electron:package   # Package the app → out/
npm run electron:make      # Build installer artifacts → out/make/
```

On Windows, `electron:make` produces a Squirrel installer (`.exe`) and a `.zip`.

### Web server (portable, Windows)

```bash
npm run web:build     # build the frontend into dist/
npm run web:package   # assemble out/ScriptFlow-Web/
```

`web:package` downloads a portable Node.js runtime and bundles it together with `server/`, `shared/`, `dist/`, `configs/`, and the production dependencies (`express`, `open`) into `out/ScriptFlow-Web/`. Copy that whole folder to the target machine and double-click `Start ScriptFlow.bat` — it starts the server and opens the default browser at `http://localhost:3000`. No Node.js installation is required on the target machine.

## Writing Block Scripts

Each script is an ES module (`.mjs`) that exports an `execute` function:

```js
// configs/scripts/Add.mjs
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

Add the corresponding entry to `configs/settings/BlockDefinitions.json` to make the block available in the UI.
