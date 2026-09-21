import socket

DELIMITER = '\n'

"""
Wraps a connected socket.socket, framing messages on DELIMITER so callers
always deal in complete messages regardless of how TCP chunks the
underlying bytes. Used both as the control channel between a
ScriptRunnerHost and this child process, and as the object handed to a
user script's execute() for talking to an external host.

- request(data): writes data and returns the next complete message --
  a single request/response round trip.
- write(data) / on_message(callback): a continuous, independent pair used
  by control channels that exchange commands in either direction without
  a strict request/response order. on_message callbacks only fire while
  receive_loop() is running.

Python sockets are synchronous, so there is no event-driven equivalent of
SocketComm.js's 'data' event: receive_loop() must be called explicitly and
blocks for the lifetime of the connection. Likewise there is no 'close'/
'error' event to relay -- receive_loop() and request() raise
ConnectionError when the peer closes the connection, and any other socket
exception (e.g. a reset connection) propagates as-is.
"""
class SocketComm:
    def __init__(self, sock):
        self._sock = sock
        self._buffer = ''
        self._message_listeners = []
        self._sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)

    def on_message(self, callback):
        self._message_listeners.append(callback)

    def write(self, data):
        self._sock.sendall(f'{data}{DELIMITER}'.encode())

    def request(self, data):
        response = None

        def on_message(msg):
            nonlocal response
            response = msg
            self._message_listeners.remove(on_message)

        self._message_listeners.append(on_message)
        self.write(data)
        while response is None:
            chunk = self._sock.recv(4096)
            if not chunk:
                self._message_listeners.remove(on_message)
                raise ConnectionError('Socket closed before a response was received')
            self._on_data(chunk)
        return response

    def receive_loop(self):
        while True:
            chunk = self._sock.recv(4096)
            if not chunk:
                raise ConnectionError('Socket closed by peer')
            self._on_data(chunk)

    def _on_data(self, chunk):
        self._buffer += chunk.decode()
        index = self._buffer.find(DELIMITER)
        while index != -1:
            message = self._buffer[:index]
            self._buffer = self._buffer[index + len(DELIMITER):]
            for listener in list(self._message_listeners):
                listener(message)
            index = self._buffer.find(DELIMITER)
