# Python Runner Control Channel: Extra Pipe vs Socket

> Status: Exploratory comparison, no decision made yet. Created 2026-09-19.

## Background

`appdata/python/script_runner.py` currently exchanges its control protocol
(`execute` / `createSocket` / `destroySocket` / `shutdown`) as NDJSON over
stdin/stdout, driven from the Node side by `shared/PythonRunnerHost.js`
(`child_process.spawn`). Because stdout is shared with the protocol, user
script `print()` calls have to be redirected to stderr for the duration of
`_handle_execute` (see `sys.stdout = sys.stderr` in `_handle_execute`) and are
then forwarded to the host process as `[python-runner]` diagnostic logs.

`shared/RunnerHostRegistry.js` will spawn one `script_runner.py` process per
recipe (root container entry), so any replacement channel must scale to
multiple concurrent Python processes without manual, per-process
configuration.

Two alternatives were discussed to free up stdin/stdout for the user script's
own I/O: an extra OS pipe (additional file descriptor) passed to the child
process, or a loopback TCP socket dedicated to the control protocol.

## Comparison

| Criteria | Extra pipe (additional fd) | Loopback TCP socket |
|---|---|---|
| Address/port management | None needed — the fd is inherited directly from `spawn`'s `stdio` array | Node must allocate a port per process. Using `listen(0)` (OS-assigned ephemeral port) avoids hardcoding, but adds a listen-then-spawn sequencing step |
| Multiple-process scalability | Trivial — each spawned process gets its own fds automatically, no shared registry needed | Needs an ephemeral port per process; must track/pass the assigned port to each child |
| stdout/stdin independence | Full — protocol lives entirely on fd 3/4, stdin/stdout stay free for user script `print()` and interactive input | Full — same benefit, protocol is off stdio entirely |
| Extra dependencies | None — Python: `os.fdopen`; Node: `stdio` array in `spawn` options. Both stdlib-only | None — Python: `socket` (stdlib); Node: `net` (stdlib). Both stdlib-only |
| Setup complexity | Low — `stdio: ['pipe','pipe','pipe','pipe','pipe']` on spawn, fixed fd numbers agreed by convention (e.g. 3=write, 4=read) | Medium — server must be listening before spawn, child must connect, connection failure/retry handling needed |
| Cross-platform behavior | Consistent on POSIX and Windows — Node/libuv handle extra pipe fds the same way on both | Consistent — TCP loopback works identically on POSIX and Windows, no named-pipe/AF_UNIX platform quirks |
| Message framing | Same as today — newline-delimited JSON needs no change | Same as today — newline-delimited JSON works the same way over a socket |
| Debuggability | Slightly less visible with generic OS tools (no address to connect a debugging client to) | Easier to inspect ad hoc (e.g. connect a test client to the port during development) |
| Failure modes | Pipe closes when either end exits — detected the same way stdin/stdout EOF is detected today | Extra failure surface: connection refused, connect timeout, port exhaustion (mitigated by ephemeral ports) |

## Recommendation

The extra-pipe approach is the closer fit: it solves both problems raised in
discussion (no per-process port bookkeeping, and stdin/stdout remain fully
available to user scripts) with less new machinery than a socket-based
channel, since no listen/connect handshake or port assignment is needed at
all — the fd is simply part of the child process at spawn time.

The main cost is losing ad hoc debuggability (you can't just `nc` into a
pipe), which matters less once the protocol is stable, since normal
development can still rely on `[python-runner]` stderr logging.
