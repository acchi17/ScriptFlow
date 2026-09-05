import { createApp } from 'vue'

import './assets/styles/variables.css'
import App from './App.vue'
import EntryHandlerFacade from './ecs/component-handlers/EntryHandlerFacade'
import SocketManager from './managers/SocketManager'
import { World } from './ecs/core/World'
import PlatformService from './services/platform/PlatformService'
import EntryExecutionService from './services/entry_execution/EntryExecutionService'
import ExecutionLogService from './services/log/ExecutionLogService'
import EntryDefinitionService from './services/entry_definition/EntryDefinitionService'
import EntryPersistanceService from './services/entry_persistance/EntryPersistanceService'
import ContainerChildren from './components/ContainerChildren.vue'

const app = createApp(App)

// Create Services
const platformService = new PlatformService()
const entryDefinitionService = new EntryDefinitionService(platformService)

// Create Managers
const world = new World()
const entryManager = new EntryHandlerFacade(world, entryDefinitionService)
const socketManager = new SocketManager()

// Create remaining Services
const executionLogService = new ExecutionLogService(entryManager)
const entryExecutionService = new EntryExecutionService(
  entryManager, executionLogService
)
const entryPersistanceService = new EntryPersistanceService(
  platformService, entryManager,
  socketManager, entryDefinitionService
)

// Provide
app.provide('entryManager', entryManager)
app.provide('world', world)
app.provide('socketManager', socketManager)
app.provide('platformService', platformService)
app.provide('executionLogService', executionLogService)
app.provide('entryExecutionService', entryExecutionService)
app.provide('entryDefinitionService', entryDefinitionService)
app.provide('entryPersistanceService', entryPersistanceService)

app.component('ContainerChildren', ContainerChildren)

app.mount('#app')
