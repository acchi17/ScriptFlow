# Script Runner: Process Creation & IPC Workflow

Explains how a script execution request travels from the host process (Web
server or Electron main) into a child process and back. There are two
independent, parallel implementations of this, selected once at host
startup by the `interpreterName` field in `appdata/settings/AppSettings.json`
(`"javascript"`, the default, or `"python"`) — never both at once, since the
interpreter is a single app-wide setting:

- **JavaScript**: `RunnerHost` forks `shared/script-runner.js` and talks to
  it over Node's native child_process IPC (`postMessage`/`send`, `message`
  event). This is the original mechanism and is unchanged by the addition of
  Python support.
- **Python**: `PythonRunnerHost` (`shared/PythonRunnerHost.js`) spawns
  `appdata/script_runner.py` as a plain subprocess and talks to it over
  newline-delimited JSON (NDJSON) on stdin/stdout, since a spawned Python
  process can't join Node's IPC channel. See "Python execution" below.

Both classes expose the same `executeScript(scriptName, inputParams)` /
`shutdown()` shape, so the rest of the host process (`ipcMain.handle` /
Express routes) doesn't need to know which one is active.

## Participants

- **Host process** — either `server/index.js` (Express/Node) or
  `electron/main.js` (Electron main process). Each owns one host (a
  `RunnerHost` or a `PythonRunnerHost`, chosen once at startup — see
  "5. Python execution").
- **RunnerHost** (`shared/RunnerHost.js`) — shared class that lazily creates
  the child process and manages the request/response bookkeeping.
- **Child process** (`shared/script-runner.js`, bundled as `script-runner.cjs`
  for Electron) — runs user scripts from `<app-dir>/scripts/*.mjs` in
  isolation from the host.

Two different fork mechanisms are used depending on host, but both go through
the same `RunnerHost` and the same message contract:

| Host | Fork call | IPC surface used by child |
|---|---|---|
| Web server (`server/index.js`) | `child_process.fork()` | `process.send` / `process.on('message')` |
| Electron main (`electron/main.js`) | `utilityProcess.fork()` | `process.parentPort` |

`script-runner.js` checks `process.parentPort` first and falls back to
`process.send`, so the same file works under either host.

Sections 1-4 below describe the JavaScript path (`RunnerHost`/`script-runner.js`).
See "5. Python execution" for the parallel `PythonRunnerHost`/`script_runner.py` path.

## 1. Lazy process creation

`RunnerHost` is constructed with a factory function, not a running process:

```js
// server/index.js
const runnerHost = new RunnerHost(() => fork(
  path.join(ROOT_DIR, 'shared', 'script-runner.js'),
  [appPaths.scriptsDir]
))
```

No child process exists yet at this point. `RunnerHost._ensureProcess()`
calls the factory the first time any method (`executeScript`, `createSocket`,
`destroySocket`) is invoked, and caches the result:

```js
_ensureProcess() {
  if (this._process) return this._process
  const proc = this._forkFn()
  proc.on('message', (msg) => this._handleMessage(msg))
  proc.on('exit', () => { /* reject all pending calls, clear this._process */ })
  this._process = proc
  return proc
}
```

The scripts directory (`appPaths.scriptsDir`) is passed as a CLI argument
(`argv[2]`), so the child knows where to load scripts from without any IPC
round trip.

## 2. Sequence: an `executeScript` call end to end

```mermaid
sequenceDiagram
    participant Caller as ScriptExecutionService
    participant Entry as Host process entry point
    participant RH as RunnerHost
    participant Child as script-runner.js (child process)

    Caller->>Entry: request to execute a script
    Note over Caller: branches on isElectron:<br/>fetch /api/scripts on Web,<br/>window.electronAPI on Electron
    Note over Entry: Web - Express route in api.js<br/>Electron - ipcMain.handle in main.js
    Entry->>RH: executeScript(scriptName, inputParams)
    alt no child yet
        RH->>Child: fork or utilityProcess.fork
        Child-->>RH: process handle - message and exit listeners attached
    end
    RH->>RH: assign id, store resolve/reject in pending map
    RH->>Child: postMessage type execute, id, scriptName, inputParams
    Note over RH: setTimeout 10s, reject if still pending
    Child->>Child: import scriptsDir/scriptName.mjs
    Child->>Child: await mod.execute(inputParams)
    alt success
        Child-->>RH: message type result, id, result
        RH->>RH: resolve pending id with result, delete from pending map
    else error
        Child-->>RH: message type error, id, errmsg
        RH->>RH: reject pending id with error, delete from pending map
    end
    RH-->>Entry: promise resolves or rejects
    Entry-->>Caller: HTTP response, or IPC invoke result
```

Key points:

- **Single client-side caller, two entry points**: `ScriptExecutionService.executeScript()`
  (`client/services/script_execution/ScriptExecutionService.js`) branches
  on `this.isElectron`. On the Web target it does a `fetch` to
  `/api/scripts/:name/execute`, handled by the Express route in
  `server/api.js`. On Electron it calls `window.electronAPI.executeScript(...)`
  (exposed via `contextBridge` in `electron/preload.js`), handled by
  `ipcMain.handle('script:execute', ...)` in `electron/main.js`. Both entry
  points do nothing more than forward to `runnerHost.executeScript(...)`.
- **Correlation by `id`**: every call increments `RunnerHost._counter` and
  stores `{resolve, reject}` in `_pending` keyed by that id. The child echoes
  the same `id` back in its reply so `_handleMessage` can look up and settle
  the right promise. This lets multiple in-flight requests share one child
  process without cross-talk.
- **Message shape in**: `{ type: 'execute' | 'createSocket' | 'destroySocket' | 'shutdown', id, ...args }`.
- **Message shape out**: `{ type: 'result' | 'error', id, result? , errmsg? }`.
- **Timeout safety net**: `executeScript` gives up after 10s (`createSocket`
  5-10s) and rejects/resolves locally even if the child never replies —
  guards against a hung script.
- **`createSocket`/`destroySocket` never reject**: their pending entry uses
  `resolve` for both slots (`{ resolve, reject: resolve }`), so a timeout or
  child error just resolves with `null`/`false` instead of throwing.

## 3. Script execution inside the child

`shared/script-runner.js` listens for messages and dispatches by `type`:

```js
function onMessage(msg) {
  if (msg.type === 'execute') handleExecute(msg)
  else if (msg.type === 'createSocket') handleCreateSocket(msg)
  else if (msg.type === 'destroySocket') handleDestroySocket(msg)
  else if (msg.type === 'shutdown') { /* destroy sockets, process.exit(0) */ }
}
```

`handleExecute` validates the script name against `SCRIPT_NAME_PATTERN`
(prevents path traversal), dynamically `import()`s the `.mjs` file from the
scripts directory, calls its exported `execute(inputParams)`, and reports the
result or error back over IPC. Because scripts are loaded via dynamic
`import()` in an isolated process, a crash or infinite loop in a user script
does not take down the host process.

Sockets opened via `createSocket` are kept in an in-child `Map<socketId,
net.Socket>` so a script can reuse a connection across multiple calls; they
self-clean on `close` and are all destroyed on `shutdown`.

## 4. Shutdown

```mermaid
sequenceDiagram
    participant Host as Host process - SIGINT/SIGTERM or app quit
    participant RH as RunnerHost
    participant Child as script-runner.js

    Host->>RH: shutdown()
    RH->>Child: postMessage type shutdown
    Note over RH: forceKill timer 2s
    Child->>Child: destroy all open sockets
    Child->>Child: process.exit(0)
    Child-->>RH: exit event
    RH->>RH: clear forceKill timer, resolve()
```

If the child doesn't exit within 2 seconds of the shutdown message, `RunnerHost`
force-kills it via `proc.kill()`.

## 5. Python execution

When `appdata/settings/AppSettings.json`'s `script.interpreterName` is `"python"`,
the host constructs a `PythonRunnerHost` instead of a `RunnerHost`. Both
classes expose the same `executeScript`/`shutdown` shape, so `ipcMain.handle`
and the Express route are unaware of which one is active — this decision is
made once, at host startup, by reading `AppSettings.json` directly (there's
no renderer-side IPC for it; the renderer's `ScriptExecutionService` sends
exactly the same `executeScript(scriptName, inputParams)` call either way).

The Python worker (`appdata/script_runner.py`) is a persistent process, like
`script-runner.js`, but since a plain `child_process.spawn`'d process can't
join Node's native IPC channel, the protocol is one JSON object per line
(NDJSON) over stdin/stdout instead:

- **in** (written to the worker's stdin): `{"type": "execute", "id": <int>, "scriptName": <str>, "inputParams": {...}}`, or `{"type": "shutdown"}`.
- **out** (read from the worker's stdout, one line per response): `{"type": "result", "id": <int>, "result": {...}}` or `{"type": "error", "id": <int>, "errmsg": <str>}`.

`PythonRunnerHost._handleChunk()` buffers partial stdout chunks and splits on
`\n` to reconstruct complete lines before parsing, since `data` events can
split a line arbitrarily. Correlation by `id`, the 10s execute timeout, and
the shutdown grace-period/force-kill behavior all mirror `RunnerHost`
exactly. `createSocket`/`destroySocket` are stubbed to resolve `null`/`false`
on `PythonRunnerHost` — Python scripts don't get the TCP socket passthrough
feature.

The worker resolves `<scriptsDir>/<scriptName>.py` (passed as `argv[1]` at
spawn time, mirroring `script-runner.js`'s own `argv[2]`), loads it via
`importlib.util`, and calls its exported `execute(input_params)`. The result
may be a coroutine (`async def execute`) — the worker detects this and drives
it with `asyncio.run()`. While running user code, `sys.stdout` is redirected
to `sys.stderr` so a stray `print()` can't corrupt the one-JSON-line-per-
response protocol; it still surfaces via `PythonRunnerHost`'s
`[python-runner]`-prefixed stderr logging, matching how `script-runner.js`'s
own stdout/stderr are logged today.

## Files involved

- [server/index.js](../server/index.js) — Web host, reads `AppSettings.json` and creates either `RunnerHost` (`child_process.fork`) or `PythonRunnerHost` (`child_process.spawn`).
- [electron/main.js](../electron/main.js) — Electron host and entry point; same choice, using `utilityProcess.fork` for `RunnerHost` and `child_process.spawn` for `PythonRunnerHost`; handles `ipcMain.handle('script:execute', ...)`.
- [shared/RunnerHost.js](../shared/RunnerHost.js) — JavaScript-child request/response bookkeeping, timeouts, shutdown.
- [shared/PythonRunnerHost.js](../shared/PythonRunnerHost.js) — Python-worker NDJSON request/response bookkeeping, timeouts, shutdown.
- [shared/script-runner.js](../shared/script-runner.js) — JS child process entry point, message dispatch, script loading. Unaffected by Python support.
- [appdata/script_runner.py](../appdata/script_runner.py) — Python worker entry point, NDJSON request loop, script loading.
- [shared/appDataPaths.js](../shared/appDataPaths.js) — `readAppSettings()`, shared by both hosts to resolve `script.interpreterName`/`script.interpreterPath` once at startup.
- [server/api.js](../server/api.js) — Web entry point, Express routes calling `runnerHost.executeScript/createSocket/destroySocket`.
- [electron/preload.js](../electron/preload.js) — exposes `window.electronAPI.executeScript/createSocket/destroySocket` to the renderer via `contextBridge`.
- [client/services/script_execution/ScriptExecutionService.js](../client/services/script_execution/ScriptExecutionService.js) — client-side caller; branches on `isElectron` to reach either entry point.
