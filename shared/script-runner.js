import path from 'node:path'
import net from 'node:net'
import { pathToFileURL } from 'node:url'
import SocketComm from './SocketComm.js'

const SCRIPT_NAME_PATTERN = /^[A-Za-z0-9_-]+$/
const port = Number(process.argv[2])
const scriptsDir = process.argv[3] || ''
let scriptSocketComm = null

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
    clearScriptComm()
    process.exit(0)
  }
}

async function handleExecuteScript({ id, scriptName, inputParams }) {
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
    const result = await mod.execute(inputParams, scriptSocketComm)
    post({ type: 'result', id, result })
  } catch (error) {
    post({ type: 'error', id, errmsg: error.message })
  }
}

function handleCreateScriptComm({ id, host, port }) {
  clearScriptComm()
  const socket = new net.Socket()
  let finished = false
  
  const finish = (result) => {
    if (finished) return
    finished = true
    scriptSocketComm = new SocketComm(socket)
    post({ type: 'result', id, result })
  }
  const onConnect = () => {
    socket.removeListener('error', onError)
    finish(true)
  }
  const onError = () => {
    socket.removeListener('connect', onConnect)
    try { socket.destroy() } catch { /* noop */ }
    finish(false)
  }

  try {
    socket.once('connect', onConnect)
    socket.once('error', onError)
    socket.connect(port, host)
  } catch {
    try { socket.destroy() } catch { /* noop */ }
    finish(false)
  }
}

function handleDestroyScriptComm({ id }) {
  clearScriptComm()
  post({ type: 'result', id, result: true })
}

function post(message) {
  processSocketComm.write(JSON.stringify(message))
}

function clearScriptComm() {
  if (scriptSocketComm) {
    try { scriptSocketComm.destroy() } catch { /* noop */ }
  }
  scriptSocketComm = null
}

const socket = net.connect(port, '127.0.0.1')
const processSocketComm = new SocketComm(socket)
processSocketComm.onMessage(onMessage)
processSocketComm.on('close', () => process.exit(1))
processSocketComm.on('error', () => process.exit(1))
