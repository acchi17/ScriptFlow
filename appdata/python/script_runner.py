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
# A single worker runs execute/createSocket/destroySocket one at a time in FIFO
# order, so the main thread stays in receive_loop() and can handle shutdown
# while a script is still running.
executor = ThreadPoolExecutor(max_workers=1)
shutting_down = threading.Event()
post_lock = threading.Lock()

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
    except Exception:
        try:
            new_sock.close()
        except Exception:
            pass
        result = False
    script_socket_comm = SocketComm(new_sock)
    post({'type': 'result', 'id': id_, 'result': result})

def handle_destroy_script_comm(msg):
    id_ = msg.get('id')
    clear_script_comm()
    post({'type': 'result', 'id': id_, 'result': True})

def handle_shutdown():
    shutting_down.set()
    executor.shutdown(wait=False, cancel_futures=True)  # drop queued jobs
    raise ShutdownRequested()  # leave receive_loop(); main() closes the sockets

def enqueue(handler, msg):
    def run():
        if shutting_down.is_set():
            return
        try:
            handler(msg)
        except Exception:
            print(f'Unexpected error({msg.get("type")}):', file=sys.stderr)
            traceback.print_exc()
    try:
        executor.submit(run)
    except RuntimeError:
        pass  # executor already shut down

def post(message):
    data = json.dumps(message)
    with post_lock:  # both the worker and the main thread may write
        try:
            process_socket_comm.write(data)
        except Exception:
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
    except Exception:
        traceback.print_exc()  # log the cause before exiting
        exit_code = 1
    finally:
        shutting_down.set()
        # Close both sockets in parallel, like Promise.all in script-runner.js
        clear_thread = threading.Thread(target=clear_script_comm, daemon=True)
        clear_thread.start()
        process_socket_comm.end(END_TIMEOUT_S)
        clear_thread.join(END_TIMEOUT_S)
        sys.stdout.flush()
        sys.stderr.flush()
        # os._exit() instead of sys.exit(): a script still running on the
        # worker thread can't be stopped, and sys.exit() would wait for it.
        os._exit(exit_code)

if __name__ == '__main__':
    main()
