"""
Python-side mirror of shared/script-runner.js: a persistent worker process
managed by RunnerHost's Python channel. Unlike the JS child (which talks to
its parent over Node's native IPC), this process is a plain subprocess, so
the protocol is one JSON object per line (NDJSON) over stdin/stdout:

  in:  {"type": "execute", "id": <int>, "scriptName": <str>, "inputParams": {...}}
  out: {"type": "result", "id": <int>, "result": {...}}
       {"type": "error", "id": <int>, "errmsg": <str>}

argv[1] is the scripts directory (mirrors script-runner.js's argv[2]).
"""
import sys
import json
import os
import importlib.util
import asyncio
import inspect


def _load_and_call(script_path, input_params):
    if not os.path.isfile(script_path):
        raise FileNotFoundError(f'Python script not found: {script_path}')

    spec = importlib.util.spec_from_file_location('user_script', script_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    execute = getattr(module, 'execute', None)
    if not callable(execute):
        raise AttributeError(f'Script "{script_path}" does not define an execute function')

    result = execute(input_params)
    if inspect.iscoroutine(result):
        result = asyncio.run(result)
    return result or {}


def _handle_execute(msg, scripts_dir, real_stdout):
    script_name = msg.get('scriptName')
    input_params = msg.get('inputParams') or {}
    script_path = os.path.join(scripts_dir, f'{script_name}.py')

    # Redirect stdout for the duration of user code so a stray print() can't
    # corrupt the one-JSON-line-per-response protocol; it still reaches the
    # host process via stderr (see RunnerHost's '[python-runner]' logging).
    sys.stdout = sys.stderr
    try:
        result = _load_and_call(script_path, input_params)
        response = {'type': 'result', 'id': msg.get('id'), 'result': result}
    except Exception as error:
        response = {'type': 'error', 'id': msg.get('id'), 'errmsg': str(error)}
    finally:
        sys.stdout = real_stdout

    print(json.dumps(response), flush=True)


def main():
    scripts_dir = sys.argv[1] if len(sys.argv) > 1 else ''
    real_stdout = sys.stdout

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
        except json.JSONDecodeError:
            continue

        msg_type = msg.get('type')
        if msg_type == 'shutdown':
            break
        if msg_type == 'execute':
            _handle_execute(msg, scripts_dir, real_stdout)


if __name__ == '__main__':
    main()
