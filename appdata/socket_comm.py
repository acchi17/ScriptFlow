"""
Wraps a connected socket.socket with a send() that writes and blocks for the
response. Constructed by appdata/script_runner.py and handed to a user
script's execute() as its second argument; only the script itself calls
send() -- this class is not used by any other application code.
"""

class SocketComm:
    def __init__(self, sock):
        self._sock = sock

    def send(self, data):
        self._sock.sendall(data)
        return self._sock.recv(4096)
