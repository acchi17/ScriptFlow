import path from 'node:path'
import net from 'node:net'
import { pathToFileURL } from 'node:url'
import SocketComm from './SocketComm.js'

const processPort = Number(process.argv[2])
const scriptsDir = process.argv[3] || ''
const END_TIMEOUT_MS = 2000
let scriptSocketComm = null
let shuttingDown = false
let queue = Promise.resolve()

function onMessage(message) {
  let parsed
  try {
    parsed = JSON.parse(message)
  } catch {
    return
  }
  if (!parsed || typeof parsed !== 'object')
    return

  if (parsed.type === 'execute') {
    enqueue(handleExecuteScript, parsed)
  } else if (parsed.type === 'createSocket') {
    enqueue(handleCreateScriptComm, parsed)
  } else if (parsed.type === 'destroySocket') {
    enqueue(handleDestroyScriptComm, parsed)
  } else if (parsed.type === 'shutdown') {
    handleShutdown()
  }
}

async function handleExecuteScript({ id, scriptName, inputParams }) {
  try {
    const scriptPath = path.join(scriptsDir, `${scriptName}.mjs`)
    const moduleUrl = pathToFileURL(scriptPath).href
    const mod = await import(moduleUrl)
    if (typeof mod.execute !== 'function') {
      throw new Error(`Script "${scriptPath}" does not export an execute function`)
    }
    const result = await mod.execute(inputParams, scriptSocketComm)
    post({ type: 'result', id, result })
  } catch (error) {
    post({ type: 'error', id, errmsg: error.message })
  }
}

async function handleCreateScriptComm({ id, host, port }) {
  await clearScriptComm()
  const socket = new net.Socket()
  let finished = false
  
  const finish = (result) => {
    if (finished) return
    finished = true
    scriptSocketComm = new SocketComm(socket)
    // Without a listener, EventEmitter throws the error and the process crashes.
    scriptSocketComm.on('error', (err) => {
      console.error(`script socket error:${err.message}`)
    })
    post({ type: 'result', id, result })
  }
  const onConnect = () => {
    socket.removeListener('error', onError)
    socket.removeListener('timeout', onTimeout)
    socket.setTimeout(0)
    finish(true)
  }
  const onError = () => {
    socket.removeListener('connect', onConnect)
    socket.removeListener('timeout', onTimeout)
    try { socket.destroy() } catch { /* noop */ }
    finish(false)
  }
  const onTimeout = () => {
    socket.removeListener('connect', onConnect)
    socket.removeListener('error', onError)
    try { socket.destroy() } catch { /* noop */ }
    finish(false)
  }

  socket.setTimeout(10000)
  socket.once('connect', onConnect)
  socket.once('error', onError)
  socket.once('timeout', onTimeout)
  try {
    socket.connect(port, host)
  } catch {
    try { socket.destroy() } catch { /* noop */ }
    finish(false)
  }
}

async function handleDestroyScriptComm({ id }) {
  await clearScriptComm()
  post({ type: 'result', id, result: true })
}

function handleShutdown() {
  shuttingDown = true
  Promise.all([clearScriptComm(), processSocketComm.end(END_TIMEOUT_MS)
    .catch(() => { /* noop */ })])
    .finally(() => process.exit(0))
}

function enqueue(handler, message) {
  queue = queue
    .then(() => shuttingDown || handler(message))
    .catch((err) => { console.error(`Unexpected error(${message.type}):`, err) })
}

function post(message) {
  const data = JSON.stringify(message)
  try {
    processSocketComm.write(data)
  } catch { /* noop */ }
}

async function clearScriptComm() {
  const comm = scriptSocketComm
  scriptSocketComm = null
  if (!comm) return
  await comm.end(END_TIMEOUT_MS).catch(() => comm.destroy())
}

// Log the cause before exiting
process.on('uncaughtException', (err) => {
  console.error('uncaught exception:', err)
  process.exit(1)
})
process.on('unhandledRejection', (reason) => {
  console.error('unhandled rejection:', reason)
  process.exit(1)
})

const socket = net.connect(processPort, '127.0.0.1')
const processSocketComm = new SocketComm(socket)
processSocketComm.onMessage(onMessage)
const onControlChannelLost = () => { if (!shuttingDown) process.exit(1) }
processSocketComm.on('close', onControlChannelLost)
processSocketComm.on('error', onControlChannelLost)
