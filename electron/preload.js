const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  listScripts: () => ipcRenderer.invoke('scripts:list'),
  readScript: (name) => ipcRenderer.invoke('scripts:read', name),
  saveScript: (name, content) => ipcRenderer.invoke('scripts:save', name, content),
  readBlockDefinitions: () => ipcRenderer.invoke('defs:read'),
  writeBlockDefinitions: (data) => ipcRenderer.invoke('defs:write', data),
  executeScript: (name, inputParams) => ipcRenderer.invoke('script:execute', name, inputParams),
  createSocket: (host, port) => ipcRenderer.invoke('socket:create', host, port)
})
