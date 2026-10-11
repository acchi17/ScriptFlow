import sys
import json
import os
import socket
import importlib.util
import asyncio
import inspect
import traceback
import threading
from concurrent.futures import ThreadPoolExecutor
from socket_comm import SocketComm

END_TIMEOUT_S = 2
scripts_dir = ''
process_socket_comm = None
script_socket_comm = None
shutting_down = threading.Event()
executor = ThreadPoolExecutor(max_workers=1)

class ShutdownRequested(Exception):
    pass

def error_log(exception):
    print(f'{type(exception).__name__}: {exception}', file=sys.stderr)
    traceback.print_exception(type(exception), exception, exception.__traceback__)

def on_message(message):
    try:
        parsed = json.loads(message)
    except json.JSONDecodeError as e:
        error_log(e)
        return
    if not isinstance(parsed, dict):
        return

    msg_type = parsed.get('type')
    if msg_type == 'execute':
        enqueue(handle_execute_script, parsed)
    elif msg_type == 'createSocket':
        enqueue(handle_create_script_comm, parsed)
    elif msg_type == 'destroySocket':
        enqueue(handle_destroy_script_comm, parsed)
    elif msg_type == 'shutdown':
        handle_shutdown()

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

def handle_execute_script(message):
    id_ = message.get('id')
    script_name = message.get('scriptName')
    input_params = message.get('inputParams') or {}
    script_path = os.path.join(scripts_dir, f'{script_name}.py')

    try:
        module = load_module(script_path)
        result = module.execute(input_params, script_socket_comm)
        # Async execution is currently not supported
        # if inspect.iscoroutine(result):
        #     result = asyncio.run(result)
        post({'type': 'result', 'id': id_, 'result': result})
    except Exception as e:
        error_log(e)
        post({'type': 'error', 'id': id_, 'errmsg': str(e)})

def handle_create_script_comm(message):
    global script_socket_comm
    id_ = message.get('id')
    host = message.get('host')
    port = message.get('port')
    clear_script_comm()

    new_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    new_sock.settimeout(10)
    try:
        new_sock.connect((host, port))
        new_sock.settimeout(None)
        result = True
    except Exception as e:
        print(f'connection error({host}:{port})', file=sys.stderr)
        error_log(e)
        try:
            new_sock.close()
        except Exception:
            pass
        result = False
    script_socket_comm = SocketComm(new_sock)
    post({'type': 'result', 'id': id_, 'result': result})

def handle_destroy_script_comm(message):
    id_ = message.get('id')
    clear_script_comm()
    post({'type': 'result', 'id': id_, 'result': True})

def handle_shutdown():
    shutting_down.set()
    executor.shutdown(wait=False, cancel_futures=True)  # drop queued jobs
    raise ShutdownRequested()

def enqueue(handler, message):
    def run():
        if shutting_down.is_set():
            return
        try:
            handler(message)
        except Exception as e:
            error_log(e)
    try:
        executor.submit(run)
    except Exception as e:
        error_log(e)
        pass

def post(message):
    data = json.dumps(message)
    try:
        process_socket_comm.write(data)
    except Exception as e:
        error_log(e)
        pass

def clear_script_comm():
    global script_socket_comm
    if script_socket_comm is not None:
        script_socket_comm.end(END_TIMEOUT_S)
    script_socket_comm = None

def main():
    global scripts_dir, process_socket_comm
    port = int(sys.argv[1])
    scripts_dir = sys.argv[2] if len(sys.argv) > 2 else ''

    sock = socket.create_connection(('127.0.0.1', port))
    process_socket_comm = SocketComm(sock)
    process_socket_comm.on_message(on_message)

    exit_code = 0
    try:
        process_socket_comm.receive_loop()
    except ShutdownRequested:
        pass
    except Exception as e:
        error_log(e)
        exit_code = 1
    finally:
        shutting_down.set()
        clear_script_comm()
        process_socket_comm.end(END_TIMEOUT_S)
        sys.stdout.flush()
        sys.stderr.flush()
        # os._exit() instead of sys.exit(): a script still running on the
        # worker thread can't be stopped, and sys.exit() would wait for it.
        os._exit(exit_code)

if __name__ == '__main__':
    main()
