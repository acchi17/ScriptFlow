import { describe, it, expect, vi } from 'vitest'
import EntryHandlerFacade from '@/ecs/component-handlers/EntryHandlerFacade.js'
import EntryExecutionService from '@/services/entry_execution/EntryExecutionService.js'
import EntryDefinitionService from '@/services/entry_definition/EntryDefinitionService.js'
import EntryPersistanceService from '@/services/entry_persistance/EntryPersistanceService.js'
import blockDefinitionsRaw from '../../../../appdata/settings/BlockDefinitions.json'

async function createContext() {
  const entryDefinitionService = new EntryDefinitionService({
    readBlockDefinitions: async () => blockDefinitionsRaw
  })
  await entryDefinitionService.loadBlockDefinitions()

  const entryManager = new EntryHandlerFacade(undefined, entryDefinitionService)
  const entryExecutionService = new EntryExecutionService(entryManager)

  const platformService = { openRecipe: async () => null, saveRecipeAs: async () => null }

  const service = new EntryPersistanceService(
    platformService, entryManager,
    entryExecutionService, entryDefinitionService
  )

  const rootId = entryManager.addEntry('container', 'root-container')
  entryManager.moveEntry(rootId, null, 0)

  return {
    entryManager,
    entryExecutionService, entryDefinitionService, service, rootId
  }
}

function addBlock(ctx, parentId, name, index) {
  const blockId = ctx.entryManager.addEntry('block', name)
  ctx.entryManager.moveEntry(blockId, parentId, index)
  return blockId
}

describe('EntryPersistanceService round trip', () => {
  it('round-trips a tree with nested containers, params and a connection', async () => {
    const ctx = await createContext()
    const addBlockId = addBlock(ctx, ctx.rootId, 'Add', 0)
    ctx.entryManager.setInputParam(addBlockId, 'NumberA', 3)
    ctx.entryManager.setInputParam(addBlockId, 'NumberB', 4)

    const subContainerId = ctx.entryManager.addEntry('container', 'Sub')
    ctx.entryManager.moveEntry(subContainerId, ctx.rootId, 1)
    const mulBlockId = addBlock(ctx, subContainerId, 'Mul', 0)
    ctx.entryManager.setInputParam(mulBlockId, 'NumberB', 5)

    const connId = ctx.entryManager.addConnection(
      { entryId: addBlockId, category: 'output', dataType: 'integer', paramName: 'Result' },
      { entryId: mulBlockId, category: 'input', dataType: 'integer', paramName: 'NumberA' }
    )
    expect(connId).toBeTruthy()

    const recipe = ctx.service.buildRecipe(ctx.rootId)
    expect(recipe.formatVersion).toBe(1)
    expect(recipe.root.children).toHaveLength(2)

    const report = await ctx.service.restoreRecipe(recipe, ctx.rootId)

    expect(report.warnings).toEqual([])
    expect(report.connectionCount).toBe(1)

    const restoredRootId = ctx.entryManager.getRoot()
    expect(ctx.entryManager.getChildren(restoredRootId).map(id => ctx.entryManager.getEntryName(id))).toEqual(['Add', 'Sub'])
    expect(ctx.entryManager.getInputParamValues(addBlockId)).toEqual({ NumberA: 3, NumberB: 4 })

    const restoredSubId = ctx.entryManager.getChildren(restoredRootId)[1]
    const restoredMulId = ctx.entryManager.getChildren(restoredSubId)[0]
    expect(ctx.entryManager.getInputParamValues(restoredMulId)).toEqual({ NumberA: 0, NumberB: 5 })

    const connections = ctx.entryManager.getConnections(ctx.rootId)
    expect(connections).toHaveLength(1)
    expect(connections[0].output.entryId).toBe(addBlockId)
    expect(connections[0].input.entryId).toBe(mulBlockId)
  })

  it('produces a clone-safe recipe when a connection exists (regression for "could not be cloned")', async () => {
    const ctx = await createContext()
    const addBlockId = addBlock(ctx, ctx.rootId, 'Add', 0)
    const mulBlockId = addBlock(ctx, ctx.rootId, 'Mul', 1)

    ctx.entryManager.addConnection(
      { entryId: addBlockId, category: 'output', dataType: 'integer', paramName: 'Result' },
      { entryId: mulBlockId, category: 'input', dataType: 'integer', paramName: 'NumberA' }
    )

    const recipe = ctx.service.buildRecipe(ctx.rootId)

    // Mirrors what Electron's IPC/contextBridge does internally when saveRecipeAs()
    // sends this object to the main process. Guards against connections becoming
    // non-cloneable again (e.g. if EntryConnectionHandler's storage ever goes back
    // to wrapping connections in a Vue reactive Proxy).
    expect(() => structuredClone(recipe)).not.toThrow()
  })

  it('remaps connections that reference the saved root id to the live root id', async () => {
    const ctx = await createContext()
    const blockId = addBlock(ctx, ctx.rootId, 'Add', 0)

    const recipe = ctx.service.buildRecipe(ctx.rootId)
    // Simulate a recipe saved with a different root id (e.g. from an earlier
    // session) that also references that old root id from a connection.
    const staleRootId = 'stale-root-id'
    recipe.root.id = staleRootId
    recipe.connections.push({
      id: 'stray',
      output: { entryId: staleRootId, category: 'output', dataType: 'integer', paramName: 'Result' },
      input: { entryId: blockId, category: 'input', dataType: 'integer', paramName: 'NumberA' }
    })

    const report = await ctx.service.restoreRecipe(recipe, ctx.rootId)

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
    const recipe = ctx.service.buildRecipe(ctx.rootId)
    recipe.root.children[0].name = 'GoneBlock'

    const report = await ctx.service.restoreRecipe(recipe, ctx.rootId)

    expect(report.warnings.some(w => w.includes('Block definition "GoneBlock" not found'))).toBe(true)
    const restoredRootId = ctx.entryManager.getRoot()
    const restoredRootChildIds = ctx.entryManager.getChildren(restoredRootId)
    expect(restoredRootChildIds).toHaveLength(1)
    expect(ctx.entryManager.getEntryName(restoredRootChildIds[0])).toBe('GoneBlock')
    expect(ctx.entryManager.getInputParamValues(restoredRootChildIds[0])).toEqual({})
  })

  it('drops an input param that no longer exists on the block definition, with a warning', async () => {
    const ctx = await createContext()
    addBlock(ctx, ctx.rootId, 'Add', 0)
    const recipe = ctx.service.buildRecipe(ctx.rootId)
    recipe.root.children[0].inputParams.Extra = 42

    const report = await ctx.service.restoreRecipe(recipe, ctx.rootId)

    expect(report.warnings.some(w => w.includes('Input param "Extra" no longer exists'))).toBe(true)
    const restoredBlockId = ctx.entryManager.getChildren(ctx.entryManager.getRoot())[0]
    expect(ctx.entryManager.getInputParamValues(restoredBlockId)).toEqual({ NumberA: 0, NumberB: 0 })
  })

  it('drops a connection whose output does not precede its input in DFS order, with a warning', async () => {
    const ctx = await createContext()
    const addBlockId = addBlock(ctx, ctx.rootId, 'Add', 0)
    const mulBlockId = addBlock(ctx, ctx.rootId, 'Mul', 1)

    // Backwards: the later entry (Mul) as output feeding the earlier one (Add) as input.
    const connId = ctx.entryManager.addConnection(
      { entryId: mulBlockId, category: 'output', dataType: 'integer', paramName: 'Result' },
      { entryId: addBlockId, category: 'input', dataType: 'integer', paramName: 'NumberA' }
    )
    expect(connId).toBeTruthy()

    const recipe = ctx.service.buildRecipe(ctx.rootId)
    const report = await ctx.service.restoreRecipe(recipe, ctx.rootId)

    expect(report.warnings.some(w => w.includes('output must precede input in execution order'))).toBe(true)
    expect(ctx.entryManager.getConnections(ctx.rootId)).toHaveLength(0)
  })

  it('throws on an unsupported formatVersion and leaves the current recipe untouched', async () => {
    const ctx = await createContext()
    const blockId = addBlock(ctx, ctx.rootId, 'Add', 0)
    ctx.entryManager.setInputParam(blockId, 'NumberA', 7)

    const badRecipe = {
      formatVersion: 999,
      meta: {},
      root: { id: 'x', type: 'container', name: 'root-container', children: [] },
      connections: []
    }

    await expect(ctx.service.restoreRecipe(badRecipe, ctx.rootId)).rejects.toThrow(/unsupported recipe formatVersion/)

    const rootEntryId = ctx.entryManager.getRoot()
    const rootChildIds = ctx.entryManager.getChildren(rootEntryId)
    expect(rootChildIds).toHaveLength(1)
    expect(rootChildIds[0]).toBe(blockId)
    expect(ctx.entryManager.getInputParamValues(blockId)).toEqual({ NumberA: 7, NumberB: 0 })
  })

  it('round-trips an if-container\'s Execute param, keeping its children skipped', async () => {
    const ctx = await createContext()
    const ifContainerId = ctx.entryManager.addEntry('container', 'if-container')
    ctx.entryManager.moveEntry(ifContainerId, ctx.rootId, 0)
    ctx.entryManager.setInputParam(ifContainerId, 'Execute', false)
    addBlock(ctx, ifContainerId, 'Add', 0)

    const recipe = ctx.service.buildRecipe(ctx.rootId)
    const report = await ctx.service.restoreRecipe(recipe, ctx.rootId)

    expect(report.warnings).toEqual([])
    const restoredRootId = ctx.entryManager.getRoot()
    const restoredIfContainerId = ctx.entryManager.getChildren(restoredRootId)[0]
    expect(ctx.entryManager.getEntryName(restoredIfContainerId)).toBe('if-container')
    expect(ctx.entryManager.getInputParamValues(restoredIfContainerId)).toEqual({ Execute: false })
  })

  it('clears stale entries, params and layout before restoring, even into a smaller recipe', async () => {
    const ctx = await createContext()
    const block1Id = addBlock(ctx, ctx.rootId, 'Add', 0)
    const containerId = ctx.entryManager.addEntry('container', 'ToBeGone')
    ctx.entryManager.moveEntry(containerId, ctx.rootId, 1)
    const block2Id = addBlock(ctx, containerId, 'Mul', 0)
    ctx.entryManager.addLayout(block1Id, 10, 20)

    const smallRecipe = ctx.service.buildRecipe(ctx.rootId)
    smallRecipe.root.children = []

    const report = await ctx.service.restoreRecipe(smallRecipe, ctx.rootId)

    expect(report.entryCount).toBe(0)
    expect(ctx.entryManager.getChildren(ctx.entryManager.getRoot())).toHaveLength(0)
    expect(ctx.entryManager.isAlive(block1Id)).toBe(false)
    expect(ctx.entryManager.isAlive(block2Id)).toBe(false)
    expect(ctx.entryManager.hasInputParam(block1Id)).toBe(false)
    expect(ctx.entryManager.hasInputParam(block2Id)).toBe(false)
    expect(ctx.entryManager.getLayout(block1Id)).toBeUndefined()
  })

  it('loadRecipe returns null when the user cancels the open dialog', async () => {
    const ctx = await createContext()
    addBlock(ctx, ctx.rootId, 'Add', 0)

    const result = await ctx.service.loadRecipe(ctx.rootId)

    expect(result).toBeNull()
    expect(ctx.entryManager.getChildren(ctx.rootId)).toHaveLength(1)
  })

  it('saveRecipe returns null when the user cancels the save dialog', async () => {
    const ctx = await createContext()
    addBlock(ctx, ctx.rootId, 'Add', 0)

    const result = await ctx.service.saveRecipe(ctx.rootId, 'My recipe')

    expect(result).toBeNull()
  })

  it('loadRecipe restores the picked file into the given root', async () => {
    const ctx = await createContext()
    addBlock(ctx, ctx.rootId, 'Add', 0)
    const recipe = ctx.service.buildRecipe(ctx.rootId)
    ctx.entryManager.clearEntries(ctx.rootId)
    ctx.service.platformService.openRecipe = async () => ({ data: recipe })

    const report = await ctx.service.loadRecipe(ctx.rootId)

    expect(report.entryCount).toBe(1)
    const childIds = ctx.entryManager.getChildren(ctx.rootId)
    expect(childIds.map(id => ctx.entryManager.getEntryName(id))).toEqual(['Add'])
  })

  it('saveRecipe builds the given root\'s recipe and suggests "recipe.json" by default', async () => {
    const ctx = await createContext()
    addBlock(ctx, ctx.rootId, 'Add', 0)
    const saveRecipeAs = vi.fn(async () => 'saved.json')
    ctx.service.platformService.saveRecipeAs = saveRecipeAs

    const result = await ctx.service.saveRecipe(ctx.rootId)

    expect(result).toBe('saved.json')
    expect(saveRecipeAs).toHaveBeenCalledTimes(1)
    const [data, suggestedName] = saveRecipeAs.mock.calls[0]
    expect(suggestedName).toBe('recipe.json')
    expect(data.root.id).toBe(ctx.rootId)
    expect(data.root.children.map(c => c.name)).toEqual(['Add'])
  })
})

// Builds a second root with its own block pair and connection next to ctx.rootId.
function addSecondRoot(ctx) {
  const rootBId = ctx.entryManager.addEntry('container', 'root-container')
  ctx.entryManager.moveEntry(rootBId, null, 0)
  const addBId = addBlock(ctx, rootBId, 'Add', 0)
  const mulBId = addBlock(ctx, rootBId, 'Mul', 1)
  ctx.entryManager.setInputParam(addBId, 'NumberA', 9)
  const connBId = ctx.entryManager.addConnection(
    { entryId: addBId, category: 'output', dataType: 'integer', paramName: 'Result' },
    { entryId: mulBId, category: 'input', dataType: 'integer', paramName: 'NumberA' }
  )
  return { rootBId, addBId, mulBId, connBId }
}

function addFirstRootContent(ctx) {
  const addAId = addBlock(ctx, ctx.rootId, 'Add', 0)
  const mulAId = addBlock(ctx, ctx.rootId, 'Mul', 1)
  const connAId = ctx.entryManager.addConnection(
    { entryId: addAId, category: 'output', dataType: 'integer', paramName: 'Result' },
    { entryId: mulAId, category: 'input', dataType: 'integer', paramName: 'NumberA' }
  )
  return { addAId, mulAId, connAId }
}

describe('EntryPersistanceService multiple roots', () => {
  it('buildRecipe(rootA) contains only rootA\'s entries and connections', async () => {
    const ctx = await createContext()
    const a = addFirstRootContent(ctx)
    const b = addSecondRoot(ctx)

    const recipe = ctx.service.buildRecipe(ctx.rootId)

    expect(recipe.root.id).toBe(ctx.rootId)
    expect(recipe.root.children.map(c => c.id)).toEqual([a.addAId, a.mulAId])
    expect(recipe.connections.map(c => c.id)).toEqual([a.connAId])
    const serialised = JSON.stringify(recipe)
    expect(serialised).not.toContain(b.rootBId)
    expect(serialised).not.toContain(b.addBId)
    expect(serialised).not.toContain(b.connBId)
  })

  it('restoreRecipe(data, rootA) clears and restores only rootA, leaving rootB untouched', async () => {
    const ctx = await createContext()
    const a = addFirstRootContent(ctx)
    const recipe = ctx.service.buildRecipe(ctx.rootId)
    // Extra content in rootA that must be cleared by the restore.
    const staleId = addBlock(ctx, ctx.rootId, 'Add', 2)
    const b = addSecondRoot(ctx)

    const report = await ctx.service.restoreRecipe(recipe, ctx.rootId)

    expect(report.warnings).toEqual([])
    expect(report.entryCount).toBe(2)
    expect(report.connectionCount).toBe(1)
    expect(ctx.entryManager.isAlive(staleId)).toBe(false)
    expect(ctx.entryManager.getChildren(ctx.rootId)).toEqual([a.addAId, a.mulAId])
    expect(ctx.entryManager.getConnections(ctx.rootId).map(c => c.id)).toEqual([a.connAId])

    expect(ctx.entryManager.getChildren(b.rootBId)).toEqual([b.addBId, b.mulBId])
    expect(ctx.entryManager.getInputParamValues(b.addBId)).toEqual({ NumberA: 9, NumberB: 0 })
    expect(ctx.entryManager.getConnections(b.rootBId).map(c => c.id)).toEqual([b.connBId])
  })

  it('restoreRecipe(data, rootA) only deletes rootA\'s socket record', async () => {
    const ctx = await createContext()
    addFirstRootContent(ctx)
    const b = addSecondRoot(ctx)
    const recipe = ctx.service.buildRecipe(ctx.rootId)
    ctx.entryExecutionService._entrySocketMap.set(b.rootBId, { socketId: b.rootBId })
    const deleteComm = vi.spyOn(ctx.entryExecutionService, 'deleteComm')

    await ctx.service.restoreRecipe(recipe, ctx.rootId)

    expect(deleteComm).toHaveBeenCalledTimes(1)
    expect(deleteComm).toHaveBeenCalledWith(ctx.rootId)
    expect(ctx.entryExecutionService._entrySocketMap.has(b.rootBId)).toBe(true)
  })

  it('buildRecipe/restoreRecipe throw for a missing or non-root id without changing the ECS', async () => {
    const ctx = await createContext()
    const a = addFirstRootContent(ctx)
    const b = addSecondRoot(ctx)
    const recipe = ctx.service.buildRecipe(ctx.rootId)
    const deleteComm = vi.spyOn(ctx.entryExecutionService, 'deleteComm')

    expect(() => ctx.service.buildRecipe()).toThrow(/not a root entry/)
    expect(() => ctx.service.buildRecipe(a.addAId)).toThrow(/not a root entry/)
    await expect(ctx.service.restoreRecipe(recipe)).rejects.toThrow(/not a root entry/)
    await expect(ctx.service.restoreRecipe(recipe, a.addAId)).rejects.toThrow(/not a root entry/)

    expect(deleteComm).not.toHaveBeenCalled()
    expect(ctx.entryManager.getChildren(ctx.rootId)).toEqual([a.addAId, a.mulAId])
    expect(ctx.entryManager.getConnections(ctx.rootId).map(c => c.id)).toEqual([a.connAId])
    expect(ctx.entryManager.getChildren(b.rootBId)).toEqual([b.addBId, b.mulBId])
    expect(ctx.entryManager.getConnections(b.rootBId).map(c => c.id)).toEqual([b.connBId])
  })
})
