import { describe, it, expect } from 'vitest'
import EntryManager from '@/managers/EntryManager.js'
import EntryParamManager from '@/managers/EntryParamManager.js'
import EntryConnectionManager from '@/managers/EntryConnectionManager.js'
import EntryLayoutManager from '@/managers/EntryLayoutManager.js'
import SocketManager from '@/managers/SocketManager.js'
import EntryDefinitionService from '@/services/entry_definition/EntryDefinitionService.js'
import EntryPersistanceService from '@/services/entry_persistance/EntryPersistanceService.js'
import Block from '@/models/Block.js'
import Container from '@/models/Container.js'
import blockDefinitionsRaw from '../../../../public/settings/BlockDefinitions.json'

async function createContext() {
  const entryManager = new EntryManager()
  const entryParamManager = new EntryParamManager()
  const entryConnectionManager = new EntryConnectionManager()
  const entryLayoutManager = new EntryLayoutManager()
  const socketManager = new SocketManager()
  const entryDefinitionService = new EntryDefinitionService({}, {
    readBlockDefinitions: async () => blockDefinitionsRaw
  })
  await entryDefinitionService.loadBlockDefinitions()

  const platformService = { readRecipe: async () => null, writeRecipe: async () => {} }

  const service = new EntryPersistanceService(
    platformService, entryManager, entryParamManager, entryConnectionManager,
    entryLayoutManager, socketManager, entryDefinitionService
  )

  const root = new Container('root-container')
  entryManager.addEntry(null, root, 0)

  return {
    entryManager, entryParamManager, entryConnectionManager,
    entryLayoutManager, socketManager, entryDefinitionService, service, root
  }
}

function addBlock(ctx, parentId, name, index) {
  const block = new Block(name)
  ctx.entryManager.addEntry(parentId, block, index)
  const defs = ctx.entryDefinitionService.getBlockParamDef(name)
  ctx.entryParamManager.setInputParamDef(block.id, defs.input)
  ctx.entryParamManager.setOutputParamDef(block.id, defs.output)
  return block
}

describe('EntryPersistanceService round trip', () => {
  it('round-trips a tree with nested containers, params and a connection', async () => {
    const ctx = await createContext()
    const addBlockEntry = addBlock(ctx, ctx.root.id, 'Add', 0)
    ctx.entryParamManager.setInputParam(addBlockEntry.id, 'NumberA', 3)
    ctx.entryParamManager.setInputParam(addBlockEntry.id, 'NumberB', 4)

    const subContainer = new Container('Sub')
    ctx.entryManager.addEntry(ctx.root.id, subContainer, 1)
    const mulBlock = addBlock(ctx, subContainer.id, 'Mul', 0)
    ctx.entryParamManager.setInputParam(mulBlock.id, 'NumberB', 5)

    const connId = ctx.entryConnectionManager.addConnection(
      { entryId: addBlockEntry.id, category: 'output', dataType: 'integer', paramName: 'Result' },
      { entryId: mulBlock.id, category: 'input', dataType: 'integer', paramName: 'NumberA' }
    )
    expect(connId).toBeTruthy()

    const recipe = ctx.service.buildRecipe('My recipe')
    expect(recipe.formatVersion).toBe(1)
    expect(recipe.root.children).toHaveLength(2)

    const report = await ctx.service.restoreRecipe(recipe)

    expect(report.warnings).toEqual([])
    expect(report.connectionCount).toBe(1)

    const restoredRoot = ctx.entryManager.getRootEntry()
    expect(ctx.entryManager.getChildren(restoredRoot.id).map(c => c.name)).toEqual(['Add', 'Sub'])
    expect(ctx.entryParamManager.getInputParams(addBlockEntry.id)).toEqual({ NumberA: 3, NumberB: 4 })

    const restoredSub = ctx.entryManager.getChildren(restoredRoot.id)[1]
    const restoredMul = ctx.entryManager.getChildren(restoredSub.id)[0]
    expect(ctx.entryParamManager.getInputParams(restoredMul.id)).toEqual({ NumberA: 0, NumberB: 5 })

    const connections = ctx.entryConnectionManager.getConnections()
    expect(connections).toHaveLength(1)
    expect(connections[0].output.entryId).toBe(addBlockEntry.id)
    expect(connections[0].input.entryId).toBe(mulBlock.id)
  })

  it('produces a clone-safe recipe when a connection exists (regression for "could not be cloned")', async () => {
    const ctx = await createContext()
    const addBlockEntry = addBlock(ctx, ctx.root.id, 'Add', 0)
    const mulBlock = addBlock(ctx, ctx.root.id, 'Mul', 1)

    ctx.entryConnectionManager.addConnection(
      { entryId: addBlockEntry.id, category: 'output', dataType: 'integer', paramName: 'Result' },
      { entryId: mulBlock.id, category: 'input', dataType: 'integer', paramName: 'NumberA' }
    )

    const recipe = ctx.service.buildRecipe('My recipe')

    // Mirrors what Electron's IPC/contextBridge does internally when writeRecipe()
    // sends this object to the main process. Vue's reactive Proxy objects fail
    // here with "could not be cloned" if EntryConnectionManager.toJson() ever
    // stops unwrapping connections with toRaw().
    expect(() => structuredClone(recipe)).not.toThrow()
  })

  it('remaps connections that reference the saved root id to the live root id', async () => {
    const ctx = await createContext()
    const block = addBlock(ctx, ctx.root.id, 'Add', 0)

    const recipe = ctx.service.buildRecipe()
    // Simulate a recipe saved with a different root id (e.g. from an earlier
    // session) that also references that old root id from a connection.
    const staleRootId = 'stale-root-id'
    recipe.root.id = staleRootId
    recipe.connections.push({
      id: 'stray',
      output: { entryId: staleRootId, category: 'output', dataType: 'integer', paramName: 'Result' },
      input: { entryId: block.id, category: 'input', dataType: 'integer', paramName: 'NumberA' }
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
    addBlock(ctx, ctx.root.id, 'Add', 0)
    const recipe = ctx.service.buildRecipe()
    recipe.root.children[0].name = 'GoneBlock'

    const report = await ctx.service.restoreRecipe(recipe)

    expect(report.warnings.some(w => w.includes('Block definition "GoneBlock" not found'))).toBe(true)
    const restoredRoot = ctx.entryManager.getRootEntry()
    const restoredRootChildren = ctx.entryManager.getChildren(restoredRoot.id)
    expect(restoredRootChildren).toHaveLength(1)
    expect(restoredRootChildren[0].name).toBe('GoneBlock')
    expect(ctx.entryParamManager.getInputParams(restoredRootChildren[0].id)).toEqual({})
  })

  it('drops an input param that no longer exists on the block definition, with a warning', async () => {
    const ctx = await createContext()
    addBlock(ctx, ctx.root.id, 'Add', 0)
    const recipe = ctx.service.buildRecipe()
    recipe.root.children[0].inputParams.Extra = 42

    const report = await ctx.service.restoreRecipe(recipe)

    expect(report.warnings.some(w => w.includes('Input param "Extra" no longer exists'))).toBe(true)
    const restoredBlock = ctx.entryManager.getChildren(ctx.entryManager.getRootEntry().id)[0]
    expect(ctx.entryParamManager.getInputParams(restoredBlock.id)).toEqual({ NumberA: 0, NumberB: 0 })
  })

  it('drops a connection whose output does not precede its input in DFS order, with a warning', async () => {
    const ctx = await createContext()
    const addBlockEntry = addBlock(ctx, ctx.root.id, 'Add', 0)
    const mulBlock = addBlock(ctx, ctx.root.id, 'Mul', 1)

    // Backwards: the later entry (Mul) as output feeding the earlier one (Add) as input.
    const connId = ctx.entryConnectionManager.addConnection(
      { entryId: mulBlock.id, category: 'output', dataType: 'integer', paramName: 'Result' },
      { entryId: addBlockEntry.id, category: 'input', dataType: 'integer', paramName: 'NumberA' }
    )
    expect(connId).toBeTruthy()

    const recipe = ctx.service.buildRecipe()
    const report = await ctx.service.restoreRecipe(recipe)

    expect(report.warnings.some(w => w.includes('output must precede input in execution order'))).toBe(true)
    expect(ctx.entryConnectionManager.getConnections()).toHaveLength(0)
  })

  it('throws on an unsupported formatVersion and leaves the current recipe untouched', async () => {
    const ctx = await createContext()
    const block = addBlock(ctx, ctx.root.id, 'Add', 0)
    ctx.entryParamManager.setInputParam(block.id, 'NumberA', 7)

    const badRecipe = {
      formatVersion: 999,
      meta: {},
      root: { id: 'x', type: 'container', name: 'root-container', children: [] },
      connections: []
    }

    await expect(ctx.service.restoreRecipe(badRecipe)).rejects.toThrow(/unsupported recipe formatVersion/)

    const root = ctx.entryManager.getRootEntry()
    const rootChildren = ctx.entryManager.getChildren(root.id)
    expect(rootChildren).toHaveLength(1)
    expect(rootChildren[0].id).toBe(block.id)
    expect(ctx.entryParamManager.getInputParams(block.id)).toEqual({ NumberA: 7, NumberB: 0 })
  })

  it('clears stale entries, params and layout before restoring, even into a smaller recipe', async () => {
    const ctx = await createContext()
    const block1 = addBlock(ctx, ctx.root.id, 'Add', 0)
    const container = new Container('ToBeGone')
    ctx.entryManager.addEntry(ctx.root.id, container, 1)
    const block2 = addBlock(ctx, container.id, 'Mul', 0)
    ctx.entryLayoutManager.setLayout(block1.id, 10, 20)

    const smallRecipe = ctx.service.buildRecipe()
    smallRecipe.root.children = []

    const report = await ctx.service.restoreRecipe(smallRecipe)

    expect(report.entryCount).toBe(0)
    expect(ctx.entryManager.getChildren(ctx.entryManager.getRootEntry().id)).toHaveLength(0)
    expect(ctx.entryManager.getEntry(block1.id)).toBeNull()
    expect(ctx.entryManager.getEntry(block2.id)).toBeNull()
    expect(ctx.entryParamManager.hasInputParam(block1.id)).toBe(false)
    expect(ctx.entryParamManager.hasInputParam(block2.id)).toBe(false)
    expect(ctx.entryLayoutManager.getLayout(block1.id)).toBeUndefined()
  })
})
