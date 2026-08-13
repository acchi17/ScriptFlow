import { createApp } from 'vue'

import './assets/styles/variables.css'
import App from './App.vue'
import appConfig from './config/app-config'
import EntryManager from './managers/EntryManager'
import EntryLayoutManager from './managers/EntryLayoutManager'
import EntryConnectionManager from './managers/EntryConnectionManager'
import SocketManager from './managers/SocketManager'
import { World } from './ecs/core/World'
import FileService from './services/file/FileService'
import PlatformService from './services/platform/PlatformService'
import EntryExecutionService from './services/entry_execution/EntryExecutionService'
import ExecutionLogService from './services/log/ExecutionLogService'
import EntryDefinitionService from './services/entry_definition/EntryDefinitionService'
import EntryPersistanceService from './services/entry_persistance/EntryPersistanceService'
import ContainerChildren from './components/ContainerChildren.vue'

const app = createApp(App)

// Create Services
const platformService = new PlatformService()
const fileService = new FileService()
const entryDefinitionService = new EntryDefinitionService(appConfig, platformService)

// Create Managers
const world = new World()
const entryManager = new EntryManager(world, entryDefinitionService)
const entryLayoutManager = new EntryLayoutManager()
const entryConnectionManager = new EntryConnectionManager()
const socketManager = new SocketManager()

// Create remaining Services
const executionLogService = new ExecutionLogService(entryManager)
const entryExecutionService = new EntryExecutionService(
  appConfig, entryManager, entryConnectionManager, executionLogService
)
const entryPersistanceService = new EntryPersistanceService(
  platformService, entryManager, entryConnectionManager,
  entryLayoutManager, socketManager, entryDefinitionService
)

// Provide
app.provide('entryManager', entryManager)
app.provide('entryLayoutManager', entryLayoutManager)
app.provide('entryConnectionManager', entryConnectionManager)
app.provide('world', world)
app.provide('socketManager', socketManager)
app.provide('platformService', platformService)
app.provide('fileService', fileService)
app.provide('executionLogService', executionLogService)
app.provide('entryExecutionService', entryExecutionService)
app.provide('entryDefinitionService', entryDefinitionService)
app.provide('entryPersistanceService', entryPersistanceService)

app.component('ContainerChildren', ContainerChildren)

app.mount('#app')
