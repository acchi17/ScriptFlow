import { createApp } from 'vue'

import './assets/styles/variables.css'
import App from './App.vue'
import appConfig from './config/app-config'
import EntryManager from './managers/EntryManager'
import EntryParamManager from './managers/EntryParamManager'
import EntryLayoutManager from './managers/EntryLayoutManager'
import EntryConnectionManager from './managers/EntryConnectionManager'
import SocketManager from './managers/SocketManager'
import FileService from './services/file/FileService'
import PlatformService from './services/platform/PlatformService'
import EntryExecutionService from './services/entry_execution/EntryExecutionService'
import ExecutionLogService from './services/log/ExecutionLogService'
import EntryDefinitionService from './services/entry_definition/EntryDefinitionService'
import ContainerChildren from './components/ContainerChildren.vue'

const app = createApp(App)

// Create Managers
const entryManager = new EntryManager()
const entryParamManager = new EntryParamManager()
const entryLayoutManager = new EntryLayoutManager()
const entryConnectionManager = new EntryConnectionManager()
const socketManager = new SocketManager()

// Create Services
const platformService = new PlatformService()
const fileService = new FileService()
const executionLogService = new ExecutionLogService()
const entryExecutionService = new EntryExecutionService(
  appConfig, entryParamManager, entryConnectionManager, executionLogService
)
const entryDefinitionService = new EntryDefinitionService(appConfig, platformService)

// Provide
app.provide('entryManager', entryManager)
app.provide('entryParamManager', entryParamManager)
app.provide('entryLayoutManager', entryLayoutManager)
app.provide('entryConnectionManager', entryConnectionManager)
app.provide('socketManager', socketManager)
app.provide('platformService', platformService)
app.provide('fileService', fileService)
app.provide('executionLogService', executionLogService)
app.provide('entryExecutionService', entryExecutionService)
app.provide('entryDefinitionService', entryDefinitionService)

app.component('ContainerChildren', ContainerChildren)

app.mount('#app')
