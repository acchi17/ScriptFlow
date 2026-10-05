import sys
import json
import os
import socket
import importlib.util
import asyncio
import inspect
from socket_comm import SocketComm

scripts_dir = ''
process_socket_comm = None
script_socket_comm = None

class ShutdownRequested(Exception):
    pass

def on_message(message):
    try:
        parsed = json.loads(message)
    except json.JSONDecodeError:
        return
    if not isinstance(parsed, dict):
        return

    msg_type = parsed.get('type')
    if msg_type == 'execute':
        handle_execute_script(parsed)
    elif msg_type == 'createSocket':
        handle_create_script_comm(parsed)
    elif msg_type == 'destroySocket':
        handle_destroy_script_comm(parsed)
    elif msg_type == 'shutdown':
        clear_script_comm()
        raise ShutdownRequested()

def load_module(script_path):
    spec = importlib.util.spec_from_file_location('user_script', script_path)
    if spec is None:
        raise ImportError(f'Python script not found: {script_path}')

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    execute = getattr(module, 'execute', None)
    if not callable(execute):
        raise AttributeError(f'Script "{script_path}" does not define an execute function')
    return module

def handle_execute_script(msg):
    id_ = msg.get('id')
    script_name = msg.get('scriptName')
    input_params = msg.get('inputParams') or {}
    script_path = os.path.join(scripts_dir, f'{script_name}.py')

    try:
        module = load_module(script_path)
        result = module.execute(input_params, script_socket_comm)
        # Async execution is currently not supported
        # if inspect.iscoroutine(result):
        #     result = asyncio.run(result)
        post({'type': 'result', 'id': id_, 'result': result})
    except Exception as error:
        post({'type': 'error', 'id': id_, 'errmsg': str(error)})

def handle_create_script_comm(msg):
    global script_socket_comm
    id_ = msg.get('id')
    host = msg.get('host')
    port = msg.get('port')
    clear_script_comm()

    new_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    new_sock.settimeout(10)
    try:
        new_sock.connect((host, port))
        new_sock.settimeout(None)
        result = True
    except OSError:
        try:
            new_sock.close()
        except OSError:
            pass
        result = False
    script_socket_comm = SocketComm(new_sock)
    post({'type': 'result', 'id': id_, 'result': result})

def handle_destroy_script_comm(msg):
    id_ = msg.get('id')
    clear_script_comm()
    post({'type': 'result', 'id': id_, 'result': True})

def post(message):
    process_socket_comm.write(json.dumps(message))

def clear_script_comm():
    global script_socket_comm
    if script_socket_comm is not None:
        script_socket_comm.destroy()
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
    finally:
        process_socket_comm.destroy()

if __name__ == '__main__':
    main()
