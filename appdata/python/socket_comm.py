import socket

DELIMITER = '\n'
RECV_CHUNK_SIZE = 4096

class SocketComm:
    """
    - request(data): writes data and returns the next complete message --
      a single request/response round trip.
    - write(data) / on_message(callback): a continuous, independent pair used
      by control channels that exchange commands in either direction without
      a strict request/response order. on_message callbacks fire whenever a
      read (receive_loop() or a concurrent request()) delivers data, not only
      while receive_loop() is running.
    - end(timeout): sends FIN, then discards incoming data until the peer has
      closed too, and always closes the socket on return -- use it before
      exiting on a channel whose peer should see a clean close. timeout
      (seconds) bounds each wait; on timeout the socket is closed anyway.
      timeout = 0 waits indefinitely.
    """

    def __init__(self, sock):
        self._sock = sock
        self._buffer = ''
        self._message_listeners = []
        if not self._is_closed(sock):
            self._sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)

    def _is_closed(self, sock):
        return sock is None or sock.fileno() == -1

    def _on_data(self, chunk):
        self._buffer += chunk.decode()
        index = self._buffer.find(DELIMITER)
        while index != -1:
            message = self._buffer[:index]
            self._buffer = self._buffer[index + len(DELIMITER):]
            for listener in list(self._message_listeners):
                listener(message)
            index = self._buffer.find(DELIMITER)
            
    def on_message(self, callback):
        self._message_listeners.append(callback)

    def write(self, data):
        if self._is_closed(self._sock):
            raise OSError(f'{self.__class__.__name__}: socket is closed')
        self._sock.sendall(f'{data}{DELIMITER}'.encode())

    def request(self, data):
        if self._is_closed(self._sock):
            raise OSError(f'{self.__class__.__name__}: socket is closed')
        response = None

        def on_message(msg):
            nonlocal response
            response = msg

        self._message_listeners.append(on_message)
        try:
            self.write(data)
            while response is None:
                chunk = self._sock.recv(RECV_CHUNK_SIZE)
                if not chunk:
                    raise ConnectionError('Socket closed before a response was received')
                self._on_data(chunk)
            return response
        finally:
            if on_message in self._message_listeners:
                self._message_listeners.remove(on_message)

    def receive_loop(self):
        if self._is_closed(self._sock):
            raise OSError(f'{self.__class__.__name__}: socket is closed')
        while True:
            chunk = self._sock.recv(RECV_CHUNK_SIZE)
            if not chunk:
                raise ConnectionError('Socket closed by peer')
            self._on_data(chunk)

    def end(self, timeout=0):
        if self._is_closed(self._sock):
            return
        try:
            self._sock.shutdown(socket.SHUT_WR)
            self._sock.settimeout(timeout if timeout > 0 else None)
            while self._sock.recv(RECV_CHUNK_SIZE):
                pass
        except Exception:
            pass
        finally:
            try:
                self._sock.close()
            except Exception:
                pass
