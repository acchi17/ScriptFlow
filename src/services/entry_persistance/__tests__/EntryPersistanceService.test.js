import { describe, it, expect } from 'vitest'
import EntryManager from '@/managers/EntryManager.js'
import EntryLayoutManager from '@/managers/EntryLayoutManager.js'
import SocketManager from '@/managers/SocketManager.js'
import EntryDefinitionService from '@/services/entry_definition/EntryDefinitionService.js'
import EntryPersistanceService from '@/services/entry_persistance/EntryPersistanceService.js'
import blockDefinitionsRaw from '../../../../public/settings/BlockDefinitions.json'

async function createContext() {
  const entryDefinitionService = new EntryDefinitionService({}, {
    readBlockDefinitions: async () => blockDefinitionsRaw
  })
  await entryDefinitionService.loadBlockDefinitions()

  const entryManager = new EntryManager(undefined, entryDefinitionService)
  const entryLayoutManager = new EntryLayoutManager()
  const socketManager = new SocketManager()

  const platformService = { readRecipe: async () => null, writeRecipe: async () => {} }

  const service = new EntryPersistanceService(
    platformService, entryManager,
    entryLayoutManager, socketManager, entryDefinitionService
  )

  const rootId = entryManager.addEntry('container', 'root-container')
  entryManager.hierarchyHandler.moveEntry(rootId, null, 0)

  return {
    entryManager,
    entryLayoutManager, socketManager, entryDefinitionService, service, rootId
  }
}

function addBlock(ctx, parentId, name, index) {
  const blockId = ctx.entryManager.addEntry('block', name)
  ctx.entryManager.hierarchyHandler.moveEntry(blockId, parentId, index)
  const defs = ctx.entryDefinitionService.getBlockParamDef(name)
  ctx.entryManager.paramHandler.setInputParams(blockId, defs.input)
  ctx.entryManager.paramHandler.setOutputParams(blockId, defs.output)
  return blockId
}

describe('EntryPersistanceService round trip', () => {
  it('round-trips a tree with nested containers, params and a connection', async () => {
    const ctx = await createContext()
    const addBlockId = addBlock(ctx, ctx.rootId, 'Add', 0)
    ctx.entryManager.paramHandler.setInputParam(addBlockId, 'NumberA', 3)
    ctx.entryManager.paramHandler.setInputParam(addBlockId, 'NumberB', 4)

    const subContainerId = ctx.entryManager.addEntry('container', 'Sub')
    ctx.entryManager.hierarchyHandler.moveEntry(subContainerId, ctx.rootId, 1)
    const mulBlockId = addBlock(ctx, subContainerId, 'Mul', 0)
    ctx.entryManager.paramHandler.setInputParam(mulBlockId, 'NumberB', 5)

    const connId = ctx.entryManager.connectionHandler.addConnection(
      { entryId: addBlockId, category: 'output', dataType: 'integer', paramName: 'Result' },
      { entryId: mulBlockId, category: 'input', dataType: 'integer', paramName: 'NumberA' }
    )
    expect(connId).toBeTruthy()

    const recipe = ctx.service.buildRecipe('My recipe')
    expect(recipe.formatVersion).toBe(1)
    expect(recipe.root.children).toHaveLength(2)

    const report = await ctx.service.restoreRecipe(recipe)

    expect(report.warnings).toEqual([])
    expect(report.connectionCount).toBe(1)

    const restoredRootId = ctx.entryManager.hierarchyHandler.getRootEntry()
    expect(ctx.entryManager.hierarchyHandler.getChildren(restoredRootId).map(id => ctx.entryManager.getEntryName(id))).toEqual(['Add', 'Sub'])
    expect(ctx.entryManager.paramHandler.getInputParams(addBlockId)).toEqual({ NumberA: 3, NumberB: 4 })

    const restoredSubId = ctx.entryManager.hierarchyHandler.getChildren(restoredRootId)[1]
    const restoredMulId = ctx.entryManager.hierarchyHandler.getChildren(restoredSubId)[0]
    expect(ctx.entryManager.paramHandler.getInputParams(restoredMulId)).toEqual({ NumberA: 0, NumberB: 5 })

    const connections = ctx.entryManager.connectionHandler.getConnections()
    expect(connections).toHaveLength(1)
    expect(connections[0].output.entryId).toBe(addBlockId)
    expect(connections[0].input.entryId).toBe(mulBlockId)
  })

  it('produces a clone-safe recipe when a connection exists (regression for "could not be cloned")', async () => {
    const ctx = await createContext()
    const addBlockId = addBlock(ctx, ctx.rootId, 'Add', 0)
    const mulBlockId = addBlock(ctx, ctx.rootId, 'Mul', 1)

    ctx.entryManager.connectionHandler.addConnection(
      { entryId: addBlockId, category: 'output', dataType: 'integer', paramName: 'Result' },
      { entryId: mulBlockId, category: 'input', dataType: 'integer', paramName: 'NumberA' }
    )

    const recipe = ctx.service.buildRecipe('My recipe')

    // Mirrors what Electron's IPC/contextBridge does internally when writeRecipe()
    // sends this object to the main process. Guards against connections becoming
    // non-cloneable again (e.g. if EntryConnectionHandler's storage ever goes back
    // to wrapping connections in a Vue reactive Proxy).
    expect(() => structuredClone(recipe)).not.toThrow()
  })

  it('remaps connections that reference the saved root id to the live root id', async () => {
    const ctx = await createContext()
    const blockId = addBlock(ctx, ctx.rootId, 'Add', 0)

    const recipe = ctx.service.buildRecipe()
    // Simulate a recipe saved with a different root id (e.g. from an earlier
    // session) that also references that old root id from a connection.
    const staleRootId = 'stale-root-id'
    recipe.root.id = staleRootId
    recipe.connections.push({
      id: 'stray',
      output: { entryId: staleRootId, category: 'output', dataType: 'integer', paramName: 'Result' },
      input: { entryId: blockId, category: 'input', dataType: 'integer', paramName: 'NumberA' }
    })

    const report = await ctx.service.restoreRecipe(recipe)

    // The stray connection is still dropped (the root has no params), but it
    // must be dropped for "param not found" -- proving the id was correctly
    // remapped to the live (existing) root -- not "entry not found", which
    // would mean the remap silently failed.
    expect(report.warnings.some(w => w.includes('output param "Result" no longer exists'))).toBe(true)
    expect(report.warnings.some(w => w.includes('entry not found'))).toBe(false)
  })

  it('keeps an entry with no params when its block definition is missing, and warns', async () => {
    const ctx = await createContext()
    addBlock(ctx, ctx.rootId, 'Add', 0)
    const recipe = ctx.service.buildRecipe()
    recipe.root.children[0].name = 'GoneBlock'

    const report = await ctx.service.restoreRecipe(recipe)

    expect(report.warnings.some(w => w.includes('Block definition "GoneBlock" not found'))).toBe(true)
    const restoredRootId = ctx.entryManager.hierarchyHandler.getRootEntry()
    const restoredRootChildIds = ctx.entryManager.hierarchyHandler.getChildren(restoredRootId)
    expect(restoredRootChildIds).toHaveLength(1)
    expect(ctx.entryManager.getEntryName(restoredRootChildIds[0])).toBe('GoneBlock')
    expect(ctx.entryManager.paramHandler.getInputParams(restoredRootChildIds[0])).toEqual({})
  })

  it('drops an input param that no longer exists on the block definition, with a warning', async () => {
    const ctx = await createContext()
    addBlock(ctx, ctx.rootId, 'Add', 0)
    const recipe = ctx.service.buildRecipe()
    recipe.root.children[0].inputParams.Extra = 42

    const report = await ctx.service.restoreRecipe(recipe)

    expect(report.warnings.some(w => w.includes('Input param "Extra" no longer exists'))).toBe(true)
    const restoredBlockId = ctx.entryManager.hierarchyHandler.getChildren(ctx.entryManager.hierarchyHandler.getRootEntry())[0]
    expect(ctx.entryManager.paramHandler.getInputParams(restoredBlockId)).toEqual({ NumberA: 0, NumberB: 0 })
  })

  it('drops a connection whose output does not precede its input in DFS order, with a warning', async () => {
    const ctx = await createContext()
    const addBlockId = addBlock(ctx, ctx.rootId, 'Add', 0)
    const mulBlockId = addBlock(ctx, ctx.rootId, 'Mul', 1)

    // Backwards: the later entry (Mul) as output feeding the earlier one (Add) as input.
    const connId = ctx.entryManager.connectionHandler.addConnection(
      { entryId: mulBlockId, category: 'output', dataType: 'integer', paramName: 'Result' },
      { entryId: addBlockId, category: 'input', dataType: 'integer', paramName: 'NumberA' }
    )
    expect(connId).toBeTruthy()

    const recipe = ctx.service.buildRecipe()
    const report = await ctx.service.restoreRecipe(recipe)

    expect(report.warnings.some(w => w.includes('output must precede input in execution order'))).toBe(true)
    expect(ctx.entryManager.connectionHandler.getConnections()).toHaveLength(0)
  })

  it('throws on an unsupported formatVersion and leaves the current recipe untouched', async () => {
    const ctx = await createContext()
    const blockId = addBlock(ctx, ctx.rootId, 'Add', 0)
    ctx.entryManager.paramHandler.setInputParam(blockId, 'NumberA', 7)

    const badRecipe = {
      formatVersion: 999,
      meta: {},
      root: { id: 'x', type: 'container', name: 'root-container', children: [] },
      connections: []
    }

    await expect(ctx.service.restoreRecipe(badRecipe)).rejects.toThrow(/unsupported recipe formatVersion/)

    const rootEntryId = ctx.entryManager.hierarchyHandler.getRootEntry()
    const rootChildIds = ctx.entryManager.hierarchyHandler.getChildren(rootEntryId)
    expect(rootChildIds).toHaveLength(1)
    expect(rootChildIds[0]).toBe(blockId)
    expect(ctx.entryManager.paramHandler.getInputParams(blockId)).toEqual({ NumberA: 7, NumberB: 0 })
  })

  it('clears stale entries, params and layout before restoring, even into a smaller recipe', async () => {
    const ctx = await createContext()
    const block1Id = addBlock(ctx, ctx.rootId, 'Add', 0)
    const containerId = ctx.entryManager.addEntry('container', 'ToBeGone')
    ctx.entryManager.hierarchyHandler.moveEntry(containerId, ctx.rootId, 1)
    const block2Id = addBlock(ctx, containerId, 'Mul', 0)
    ctx.entryLayoutManager.setLayout(block1Id, 10, 20)

    const smallRecipe = ctx.service.buildRecipe()
    smallRecipe.root.children = []

    const report = await ctx.service.restoreRecipe(smallRecipe)

    expect(report.entryCount).toBe(0)
    expect(ctx.entryManager.hierarchyHandler.getChildren(ctx.entryManager.hierarchyHandler.getRootEntry())).toHaveLength(0)
    expect(ctx.entryManager.isAlive(block1Id)).toBe(false)
    expect(ctx.entryManager.isAlive(block2Id)).toBe(false)
    expect(ctx.entryManager.paramHandler.hasInputParam(block1Id)).toBe(false)
    expect(ctx.entryManager.paramHandler.hasInputParam(block2Id)).toBe(false)
    expect(ctx.entryLayoutManager.getLayout(block1Id)).toBeUndefined()
  })
})
