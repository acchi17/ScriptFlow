const path = require('node:path')
const net = require('node:net')
const { pathToFileURL } = require('node:url')
const { randomUUID } = require('node:crypto')

const SCRIPT_NAME_PATTERN = /^[A-Za-z0-9_-]+$/
const scriptsDir = process.argv[2] || ''

// socketId (string) -> net.Socket. Sockets are created here on request and
// kept alive for later use by scripts. Entries are removed automatically
// when the underlying connection closes so the map does not grow unbounded.
const sockets = new Map()

function send(message) {
  // utilityProcess.fork in the parent communicates via process.parentPort
  // when available, falling back to process.send.
  if (process.parentPort) {
    process.parentPort.postMessage(message)
  } else if (typeof process.send === 'function') {
    process.send(message)
  }
}

async function handleExecute({ id, scriptName, inputParams }) {
  try {
    if (!SCRIPT_NAME_PATTERN.test(scriptName)) {
      throw new Error(`Invalid script name: ${scriptName}`)
    }
    const filePath = path.join(scriptsDir, `${scriptName}.mjs`)
    const moduleUrl = pathToFileURL(filePath).href
    const mod = await import(moduleUrl)
    if (typeof mod.execute !== 'function') {
      throw new Error(`Script "${scriptName}" does not export an execute function`)
    }
    const result = await mod.execute(inputParams)
    send({ type: 'result', id, result })
  } catch (error) {
    send({ type: 'error', id, errmsg: error.message })
  }
}

function handleCreateSocket({ id, host, port }) {
  let settled = false
  const finish = (socketId) => {
    if (settled) return
    settled = true
    send({ type: 'result', id, result: socketId })
  }

  try {
    const socket = new net.Socket()

    const onConnect = () => {
      socket.removeListener('error', onError)
      const socketId = randomUUID()
      sockets.set(socketId, socket)
      // Drop the entry once the connection is gone so the map cannot leak.
      socket.once('close', () => { sockets.delete(socketId) })
      finish(socketId)
    }

    const onError = () => {
      socket.removeListener('connect', onConnect)
      try { socket.destroy() } catch { /* noop */ }
      finish('')
    }

    socket.once('connect', onConnect)
    socket.once('error', onError)
    socket.connect(port, host)
  } catch {
    finish('')
  }
}

function onMessage(msg) {
  if (!msg || typeof msg !== 'object') return
  if (msg.type === 'execute') {
    handleExecute(msg)
  } else if (msg.type === 'createSocket') {
    handleCreateSocket(msg)
  }
}

if (process.parentPort) {
  process.parentPort.on('message', (event) => {
    // utilityProcess passes a { data } envelope on parentPort
    onMessage(event && event.data ? event.data : event)
  })
} else {
  process.on('message', onMessage)
}
