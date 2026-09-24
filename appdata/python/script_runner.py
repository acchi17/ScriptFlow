"""
Python-side mirror of shared/script-runner.js: a persistent worker process
managed by ScriptRunnerHost's Python channel. Connects back to the parent's
control channel over a TCP socket (wrapped by SocketComm) instead of the
former NDJSON stdin/stdout protocol, so stdout is free for the user script's
print().

  in:  {"type": "execute", "id": <int>, "scriptName": <str>, "inputParams": {...}, "socketId": <str|None>}
       {"type": "createSocket", "id": <int>, "socketId": <str>, "host": <str>, "port": <int>}
       {"type": "destroySocket", "id": <int>, "socketId": <str>}
       {"type": "shutdown"}
  out: {"type": "result", "id": <int>, "result": {...}}
       {"type": "error", "id": <int>, "errmsg": <str>}

argv[1] is the control-channel port, argv[2] is the scripts directory
(mirrors script-runner.js's argv[2]/argv[3], offset by one since Python's
argv[0] is the script path itself rather than a separate interpreter slot).
"""
import sys
import json
import os
import socket
import importlib.util
import asyncio
import inspect
from socket_comm import SocketComm

script_socket = None
script_socket_comm = None
process_socket_comm = None
scripts_dir = ''


class ShutdownRequested(Exception):
    pass

def on_message(message):
    try:
        msg = json.loads(message)
    except json.JSONDecodeError:
        return
    if not isinstance(msg, dict):
        return

    msg_type = msg.get('type')
    if msg_type == 'execute':
        _handle_execute_script(msg)
    elif msg_type == 'createSocket':
        _handle_create_script_comm(msg)
    elif msg_type == 'destroySocket':
        _handle_destroy_script_comm(msg)
    elif msg_type == 'shutdown':
        _clear_script_comm()
        raise ShutdownRequested()


def _load_and_call(script_path, input_params, socket_comm):
    if not os.path.isfile(script_path):
        raise FileNotFoundError(f'Python script not found: {script_path}')

    spec = importlib.util.spec_from_file_location('user_script', script_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    execute = getattr(module, 'execute', None)
    if not callable(execute):
        raise AttributeError(f'Script "{script_path}" does not define an execute function')

    # Existing scripts only declare execute(input_params); only pass socket_comm
    # to scripts that actually accept a second argument.
    if len(inspect.signature(execute).parameters) >= 2:
        result = execute(input_params, socket_comm)
    else:
        result = execute(input_params)
    if inspect.iscoroutine(result):
        result = asyncio.run(result)
    return result or {}


def _handle_execute_script(msg):
    script_name = msg.get('scriptName')
    input_params = msg.get('inputParams') or {}
    script_path = os.path.join(scripts_dir, f'{script_name}.py')

    try:
        result = _load_and_call(script_path, input_params, script_socket_comm)
        post({'type': 'result', 'id': msg.get('id'), 'result': result})
    except Exception as error:
        post({'type': 'error', 'id': msg.get('id'), 'errmsg': str(error)})


def _handle_create_script_comm(msg):
    global script_socket, script_socket_comm
    _clear_script_comm()

    new_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    new_sock.settimeout(10)
    try:
        new_sock.connect((msg.get('host'), msg.get('port')))
        script_socket = new_sock
        script_socket_comm = SocketComm(new_sock)
        result = True
    except OSError:
        try:
            new_sock.close()
        except OSError:
            pass
        result = None

    post({'type': 'result', 'id': msg.get('id'), 'result': result})


def _handle_destroy_script_comm(msg):
    _clear_script_comm()
    post({'type': 'result', 'id': msg.get('id'), 'result': True})


def post(message):
    process_socket_comm.write(json.dumps(message))


def _clear_script_comm():
    global script_socket, script_socket_comm
    if script_socket is not None:
        try:
            script_socket.close()
        except OSError:
            pass
    script_socket = None
    script_socket_comm = None


def main():
    global scripts_dir, process_socket_comm
    port = int(sys.argv[1])
    scripts_dir = sys.argv[2] if len(sys.argv) > 2 else ''

    sock = socket.create_connection(('127.0.0.1', port))
    process_socket_comm = SocketComm(sock)
    process_socket_comm.on_message(on_message)

    try:
        process_socket_comm.receive_loop()
    except ShutdownRequested:
        pass
    except Exception:
        sys.exit(1)


if __name__ == '__main__':
    main()
