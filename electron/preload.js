const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  listScripts: () => ipcRenderer.invoke('scripts:list'),
  readScript: (name) => ipcRenderer.invoke('scripts:read', name),
  saveScript: (name, content) => ipcRenderer.invoke('scripts:save', name, content),
  readBlockDefinitions: () => ipcRenderer.invoke('defs:read'),
  writeBlockDefinitions: (data) => ipcRenderer.invoke('defs:write', data),
  saveRecipeAs: (data, suggestedName) => ipcRenderer.invoke('recipe:saveAs', data, suggestedName),
  openRecipe: () => ipcRenderer.invoke('recipe:open'),
  executeScript: (name, inputParams, entryId) => ipcRenderer.invoke('script:execute', name, inputParams, entryId),
  createSocket: (socketId, json, entryId) => ipcRenderer.invoke('socket:create', socketId, json, entryId),
  destroySocket: (socketId, entryId) => ipcRenderer.invoke('socket:destroy', socketId, entryId)
})
