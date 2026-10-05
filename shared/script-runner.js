import path from 'node:path'
import net from 'node:net'
import { pathToFileURL } from 'node:url'
import SocketComm from './SocketComm.js'

const port = Number(process.argv[2])
const scriptsDir = process.argv[3] || ''
let scriptSocketComm = null
let shuttingDown = false

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
    handleExecuteScript(parsed)
  } else if (parsed.type === 'createSocket') {
    handleCreateScriptComm(parsed)
  } else if (parsed.type === 'destroySocket') {
    handleDestroyScriptComm(parsed)
  } else if (parsed.type === 'shutdown') {
    shuttingDown = true
    Promise.all([clearScriptComm(), processSocketComm.end().catch(() => {})])
      .finally(() => process.exit(0))
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
    scriptSocketComm.on('error', () => {}) // without a listener, EventEmitter throws on 'error'
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

  try {
    socket.setTimeout(10000)
    socket.once('connect', onConnect)
    socket.once('error', onError)
    socket.once('timeout', onTimeout)
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

function post(message) {
  processSocketComm.write(JSON.stringify(message))
}

async function clearScriptComm() {
  const comm = scriptSocketComm
  scriptSocketComm = null
  if (!comm) return
  await comm.end().catch(() => comm.destroy())
}

const socket = net.connect(port, '127.0.0.1')
const processSocketComm = new SocketComm(socket)
processSocketComm.onMessage(onMessage)
const onControlChannelLost = () => { if (!shuttingDown) process.exit(1) }
processSocketComm.on('close', onControlChannelLost)
processSocketComm.on('error', onControlChannelLost)
