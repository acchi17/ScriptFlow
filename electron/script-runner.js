const path = require('node:path')
const { pathToFileURL } = require('node:url')

const SCRIPT_NAME_PATTERN = /^[A-Za-z0-9_-]+$/
const scriptsDir = process.argv[2] || ''

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

function onMessage(msg) {
  if (!msg || typeof msg !== 'object') return
  if (msg.type === 'execute') {
    handleExecute(msg)
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
