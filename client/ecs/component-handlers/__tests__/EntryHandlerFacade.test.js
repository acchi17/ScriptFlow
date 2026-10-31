import { describe, it, expect } from 'vitest'
import EntryHandlerFacade from '../EntryHandlerFacade.js'

// Mirrors the pre-refactor addEntry(parentId, type, name, index, id) shape,
// composed from the current addEntry() + moveEntry() API.
function addAndAttach(entryManager, parentId, type, name, index, id = null) {
  const entryId = entryManager.addEntry(type, name, id)
  entryManager.moveEntry(entryId, parentId, index)
  return entryId
}

describe('EntryHandlerFacade.addEntry', () => {
  it('attaches an entry to a multiply-nested container with the intended parent chain, type and name', () => {
    const entryManager = new EntryHandlerFacade()
    const rootId = addAndAttach(entryManager, null, 'container', 'root', 0)
    const containerAId = addAndAttach(entryManager, rootId, 'container', 'A', 0)
    const containerBId = addAndAttach(entryManager, containerAId, 'container', 'B', 0)
    const containerCId = addAndAttach(entryManager, containerBId, 'container', 'C', 0)
    const blockId = addAndAttach(entryManager, containerCId, 'block', 'Add', 0)

    expect(entryManager.getParent(blockId)).toBe(containerCId)
    expect(entryManager.getParent(containerCId)).toBe(containerBId)
    expect(entryManager.getParent(containerBId)).toBe(containerAId)
    expect(entryManager.getParent(containerAId)).toBe(rootId)
    expect(entryManager.getParent(rootId)).toBe(null)

    expect(entryManager.isBlock(blockId)).toBe(true)
    expect(entryManager.getEntryName(blockId)).toBe('Add')
  })

  it('does not allow attaching a child to a block parent', () => {
    const entryManager = new EntryHandlerFacade()
    const rootId = addAndAttach(entryManager, null, 'container', 'root', 0)
    const blockId = addAndAttach(entryManager, rootId, 'block', 'Add', 0)

    const childBlockId = entryManager.addEntry('block', 'Child')
    const attached = entryManager.moveEntry(childBlockId, blockId, 0)

    expect(attached).toBe(false)
    expect(entryManager.getParent(childBlockId)).toBe(null)
    expect(entryManager.getChildren(blockId)).toEqual([])
  })
})

describe('EntryHandlerFacade.addEntry container param defs', () => {
  it('sets the built-in Execute input param when the name matches a known container kind', () => {
    const entryDefnitionStore = {
      getContainerParamDef: (name) => name === 'if-container'
        ? { input: { Execute: { value: true, dataType: 'boolean' } }, output: {} }
        : { input: {}, output: {} }
    }
    const entryManager = new EntryHandlerFacade(undefined, entryDefnitionStore)

    const ifContainerId = entryManager.addEntry('container', 'if-container')

    expect(entryManager.getInputParamValues(ifContainerId)).toEqual({ Execute: true })
  })

  it('leaves a plain (unrecognized-name) container with no input params', () => {
    const entryDefnitionStore = {
      getContainerParamDef: () => ({ input: {}, output: {} })
    }
    const entryManager = new EntryHandlerFacade(undefined, entryDefnitionStore)

    const containerId = entryManager.addEntry('container', 'Container')

    expect(entryManager.getInputParamValues(containerId)).toEqual({})
  })
})

describe('EntryHandlerFacade.removeEntry', () => {
  it('clears a removed block from the world', () => {
    const entryManager = new EntryHandlerFacade()
    const rootId = addAndAttach(entryManager, null, 'container', 'root', 0)
    const blockId = addAndAttach(entryManager, rootId, 'block', 'Add', 0)

    entryManager.removeEntry(blockId)

    expect(entryManager.isAlive(blockId)).toBe(false)
    expect(entryManager._world.hierarchies.has(blockId)).toBe(false)
  })

  it('recursively clears a removed container and its descendants from the world', () => {
    const entryManager = new EntryHandlerFacade()
    const rootId = addAndAttach(entryManager, null, 'container', 'root', 0)
    const containerId = addAndAttach(entryManager, rootId, 'container', 'Sub', 0)
    const blockId = addAndAttach(entryManager, containerId, 'block', 'Add', 0)

    entryManager.removeEntry(containerId)

    for (const id of [containerId, blockId]) {
      expect(entryManager.isAlive(id)).toBe(false)
      expect(entryManager._world.hierarchies.has(id)).toBe(false)
    }
  })

  it('recursively clears every level of a multiply-nested container chain', () => {
    const entryManager = new EntryHandlerFacade()
    const rootId = addAndAttach(entryManager, null, 'container', 'root', 0)
    const containerAId = addAndAttach(entryManager, rootId, 'container', 'A', 0)
    const containerBId = addAndAttach(entryManager, containerAId, 'container', 'B', 0)
    const containerCId = addAndAttach(entryManager, containerBId, 'container', 'C', 0)
    const blockId = addAndAttach(entryManager, containerCId, 'block', 'Add', 0)

    entryManager.removeEntry(containerAId)

    for (const id of [containerAId, containerBId, containerCId, blockId]) {
      expect(entryManager.isAlive(id)).toBe(false)
      expect(entryManager._world.hierarchies.has(id)).toBe(false)
    }
  })

  it('removes a root entry and all its descendants, leaving other roots untouched', () => {
    const entryManager = new EntryHandlerFacade()
    const rootAId = addAndAttach(entryManager, null, 'container', 'rootA', 0)
    const rootBId = addAndAttach(entryManager, null, 'container', 'rootB', 0)
    const blockAId = addAndAttach(entryManager, rootAId, 'block', 'A', 0)
    const blockB1Id = addAndAttach(entryManager, rootBId, 'block', 'B1', 0)
    const blockB2Id = addAndAttach(entryManager, rootBId, 'block', 'B2', 1)

    const removed = entryManager.removeEntry(rootAId)

    expect(removed).toBe(true)
    expect(entryManager.isAlive(rootAId)).toBe(false)
    expect(entryManager.isAlive(blockAId)).toBe(false)
    expect(entryManager._world.hierarchies.has(rootAId)).toBe(false)
    expect(entryManager.isRoot(rootAId)).toBe(false)
    expect(entryManager.getRootOf(blockAId)).toBe(null)

    expect(entryManager.isAlive(rootBId)).toBe(true)
    expect(entryManager.isRoot(rootBId)).toBe(true)
    expect(entryManager.hierarchyHandler.getSequenceNumber(blockB1Id)).toBe(1)
    expect(entryManager.hierarchyHandler.getSequenceNumber(blockB2Id)).toBe(2)
  })

  it('returns false when the entry id does not exist', () => {
    const entryManager = new EntryHandlerFacade()

    expect(entryManager.removeEntry('nonexistent-id')).toBe(false)
  })
})

describe('EntryHandlerFacade root entries', () => {
  it('registers a parentless entry as a root', () => {
    const entryManager = new EntryHandlerFacade()
    const rootId = addAndAttach(entryManager, null, 'container', 'root', 0)

    expect(entryManager.getParent(rootId)).toBe(null)
    expect(entryManager.isRoot(rootId)).toBe(true)
  })

  it('supports two independent roots, with getRoot() returning the first one created', () => {
    const entryManager = new EntryHandlerFacade()
    const rootAId = addAndAttach(entryManager, null, 'container', 'rootA', 0)
    const rootBId = addAndAttach(entryManager, null, 'container', 'rootB', 0)

    expect(entryManager.isRoot(rootAId)).toBe(true)
    expect(entryManager.isRoot(rootBId)).toBe(true)
    expect(entryManager.getRoot()).toBe(rootAId)
  })

  it('resolves a descendant back to the root it belongs to via getRootOf', () => {
    const entryManager = new EntryHandlerFacade()
    const rootAId = addAndAttach(entryManager, null, 'container', 'rootA', 0)
    const rootBId = addAndAttach(entryManager, null, 'container', 'rootB', 0)
    const blockAId = addAndAttach(entryManager, rootAId, 'block', 'A', 0)
    const blockBId = addAndAttach(entryManager, rootBId, 'block', 'B', 0)

    expect(entryManager.getRootOf(blockAId)).toBe(rootAId)
    expect(entryManager.getRootOf(blockBId)).toBe(rootBId)
  })

  it('numbers each root\'s children independently, starting at 1', () => {
    const entryManager = new EntryHandlerFacade()
    const rootAId = addAndAttach(entryManager, null, 'container', 'rootA', 0)
    const rootBId = addAndAttach(entryManager, null, 'container', 'rootB', 0)
    const blockA1Id = addAndAttach(entryManager, rootAId, 'block', 'A1', 0)
    const blockA2Id = addAndAttach(entryManager, rootAId, 'block', 'A2', 1)
    const blockB1Id = addAndAttach(entryManager, rootBId, 'block', 'B1', 0)

    expect(entryManager.hierarchyHandler.getSequenceNumber(blockA1Id)).toBe(1)
    expect(entryManager.hierarchyHandler.getSequenceNumber(blockA2Id)).toBe(2)
    expect(entryManager.hierarchyHandler.getSequenceNumber(blockB1Id)).toBe(1)
  })
})

describe('EntryHandlerFacade.getHierarchyTick', () => {
  it("bumps only the changed root's tick, leaving other roots' ticks untouched", () => {
    const entryManager = new EntryHandlerFacade()
    const rootAId = addAndAttach(entryManager, null, 'container', 'rootA', 0)
    const rootBId = addAndAttach(entryManager, null, 'container', 'rootB', 0)

    const tickA = entryManager.getHierarchyTick(rootAId).value
    const tickB = entryManager.getHierarchyTick(rootBId).value

    addAndAttach(entryManager, rootAId, 'block', 'A', 0)

    expect(entryManager.getHierarchyTick(rootAId).value).toBe(tickA + 1)
    expect(entryManager.getHierarchyTick(rootBId).value).toBe(tickB)
  })

  it("invalidates a root's own tick when the root entry itself is removed", () => {
    const entryManager = new EntryHandlerFacade()
    const rootId = addAndAttach(entryManager, null, 'container', 'root', 0)
    expect(entryManager.getHierarchyTick(rootId)).toBeDefined()

    entryManager.removeEntry(rootId)

    expect(entryManager.getHierarchyTick(rootId)).toBeUndefined()
  })
})

describe('EntryHandlerFacade.reorderInParent', () => {
  it('moves an entry forward within its parent to the intended position', () => {
    const entryManager = new EntryHandlerFacade()
    const rootId = addAndAttach(entryManager, null, 'container', 'root', 0)
    const blockAId = addAndAttach(entryManager, rootId, 'block', 'A', 0)
    const blockBId = addAndAttach(entryManager, rootId, 'block', 'B', 1)
    const blockCId = addAndAttach(entryManager, rootId, 'block', 'C', 2)

    const reordered = entryManager.reorderInParent(rootId, blockAId, 2)

    expect(reordered).toBe(true)
    expect(entryManager.getChildren(rootId)).toEqual([blockBId, blockAId, blockCId])
    expect(entryManager.hierarchyHandler.getSequenceNumber(blockBId)).toBe(1)
    expect(entryManager.hierarchyHandler.getSequenceNumber(blockAId)).toBe(2)
    expect(entryManager.hierarchyHandler.getSequenceNumber(blockCId)).toBe(3)
  })

  it('moves an entry backward within its parent to the intended position', () => {
    const entryManager = new EntryHandlerFacade()
    const rootId = addAndAttach(entryManager, null, 'container', 'root', 0)
    const blockAId = addAndAttach(entryManager, rootId, 'block', 'A', 0)
    const blockBId = addAndAttach(entryManager, rootId, 'block', 'B', 1)
    const blockCId = addAndAttach(entryManager, rootId, 'block', 'C', 2)

    const reordered = entryManager.reorderInParent(rootId, blockCId, 0)

    expect(reordered).toBe(true)
    expect(entryManager.getChildren(rootId)).toEqual([blockCId, blockAId, blockBId])
  })

  it("leaves a reordered container's own children and their parent ids unchanged", () => {
    const entryManager = new EntryHandlerFacade()
    const rootId = addAndAttach(entryManager, null, 'container', 'root', 0)
    const containerId = addAndAttach(entryManager, rootId, 'container', 'Sub', 0)
    const blockAId = addAndAttach(entryManager, rootId, 'block', 'A', 1)
    const blockInsideId = addAndAttach(entryManager, containerId, 'block', 'Inside', 0)

    const reordered = entryManager.reorderInParent(rootId, containerId, 2)

    expect(reordered).toBe(true)
    expect(entryManager.getChildren(rootId)).toEqual([blockAId, containerId])
    expect(entryManager.getChildren(containerId)).toEqual([blockInsideId])
    expect(entryManager.getParent(blockInsideId)).toBe(containerId)
  })

  it('returns false and leaves children unchanged when the entry is not a child of the given parent', () => {
    const entryManager = new EntryHandlerFacade()
    const rootId = addAndAttach(entryManager, null, 'container', 'root', 0)
    const blockAId = addAndAttach(entryManager, rootId, 'block', 'A', 0)
    const containerId = addAndAttach(entryManager, rootId, 'container', 'Sub', 1)
    const blockBId = addAndAttach(entryManager, containerId, 'block', 'B', 0)

    const reordered = entryManager.reorderInParent(rootId, blockBId, 0)

    expect(reordered).toBe(false)
    expect(entryManager.getChildren(rootId)).toEqual([blockAId, containerId])
    expect(entryManager.getChildren(containerId)).toEqual([blockBId])
  })
})

describe('EntryHandlerFacade.moveEntry', () => {
  it('moves an entry from one container to another, updating both containers and the parent id', () => {
    const entryManager = new EntryHandlerFacade()
    const rootId = addAndAttach(entryManager, null, 'container', 'root', 0)
    const containerAId = addAndAttach(entryManager, rootId, 'container', 'A', 0)
    const containerBId = addAndAttach(entryManager, rootId, 'container', 'B', 1)
    const blockXId = addAndAttach(entryManager, containerAId, 'block', 'X', 0)

    const moved = entryManager.moveEntry(blockXId, containerBId, 0)

    expect(moved).toBe(true)
    expect(entryManager.getParent(blockXId)).toBe(containerBId)
    expect(entryManager.getChildren(containerAId)).toEqual([])
    expect(entryManager.getChildren(containerBId)).toEqual([blockXId])
  })

  it("moves a container along with its descendants, leaving the descendants' parent ids unchanged", () => {
    const entryManager = new EntryHandlerFacade()
    const rootId = addAndAttach(entryManager, null, 'container', 'root', 0)
    const containerAId = addAndAttach(entryManager, rootId, 'container', 'A', 0)
    const containerBId = addAndAttach(entryManager, rootId, 'container', 'B', 1)
    const blockInsideId = addAndAttach(entryManager, containerAId, 'block', 'Inside', 0)

    const moved = entryManager.moveEntry(containerAId, containerBId, 0)

    expect(moved).toBe(true)
    expect(entryManager.getParent(containerAId)).toBe(containerBId)
    expect(entryManager.getChildren(rootId)).toEqual([containerBId])
    expect(entryManager.getChildren(containerBId)).toEqual([containerAId])
    expect(entryManager.getChildren(containerAId)).toEqual([blockInsideId])
    expect(entryManager.getParent(blockInsideId)).toBe(containerAId)
  })

  it('detaches the entry from its old parent even when attaching to the new parent fails', () => {
    const entryManager = new EntryHandlerFacade()
    const rootId = addAndAttach(entryManager, null, 'container', 'root', 0)
    const blockTargetId = addAndAttach(entryManager, rootId, 'block', 'Target', 0)
    const blockMovedId = addAndAttach(entryManager, rootId, 'block', 'Moved', 1)

    const moved = entryManager.moveEntry(blockMovedId, blockTargetId, 0)

    expect(moved).toBe(false)
    expect(entryManager.getParent(blockMovedId)).toBe(null)
    expect(entryManager.getChildren(rootId)).toEqual([blockTargetId])
  })

  it('returns false and makes no changes when the entry does not exist', () => {
    const entryManager = new EntryHandlerFacade()
    const rootId = addAndAttach(entryManager, null, 'container', 'root', 0)
    const blockAId = addAndAttach(entryManager, rootId, 'block', 'A', 0)

    const moved = entryManager.moveEntry('nonexistent-id', rootId, 0)

    expect(moved).toBe(false)
    expect(entryManager.getChildren(rootId)).toEqual([blockAId])
  })
})

function connect(entryManager, outputEntryId, inputEntryId) {
  return entryManager.addConnection(
    { entryId: outputEntryId, category: 'output', dataType: 'integer', paramName: 'Result' },
    { entryId: inputEntryId, category: 'input', dataType: 'integer', paramName: 'NumberA' }
  )
}

// Two roots, each with its own descendants and one connection between them.
function createTwoRoots() {
  const entryManager = new EntryHandlerFacade()
  const rootAId = addAndAttach(entryManager, null, 'container', 'rootA', 0)
  const rootBId = addAndAttach(entryManager, null, 'container', 'rootB', 0)
  const blockA1Id = addAndAttach(entryManager, rootAId, 'block', 'A1', 0)
  const containerAId = addAndAttach(entryManager, rootAId, 'container', 'CA', 1)
  const blockA2Id = addAndAttach(entryManager, containerAId, 'block', 'A2', 0)
  const blockB1Id = addAndAttach(entryManager, rootBId, 'block', 'B1', 0)
  const blockB2Id = addAndAttach(entryManager, rootBId, 'block', 'B2', 1)
  const connAId = connect(entryManager, blockA1Id, blockA2Id)
  const connBId = connect(entryManager, blockB1Id, blockB2Id)
  return {
    entryManager, rootAId, rootBId,
    blockA1Id, containerAId, blockA2Id, blockB1Id, blockB2Id, connAId, connBId
  }
}

describe('EntryHandlerFacade.clearEntries', () => {
  it('removes only the given root\'s descendants, keeping the root itself and other roots intact', () => {
    const t = createTwoRoots()

    expect(t.entryManager.clearEntries(t.rootAId)).toBe(true)

    expect(t.entryManager.isAlive(t.rootAId)).toBe(true)
    expect(t.entryManager.isRoot(t.rootAId)).toBe(true)
    expect(t.entryManager.getChildren(t.rootAId)).toEqual([])
    expect(t.entryManager.isAlive(t.blockA1Id)).toBe(false)
    expect(t.entryManager.isAlive(t.containerAId)).toBe(false)
    expect(t.entryManager.isAlive(t.blockA2Id)).toBe(false)
    expect(t.entryManager.getConnections(t.rootAId)).toEqual([])

    expect(t.entryManager.getChildren(t.rootBId)).toEqual([t.blockB1Id, t.blockB2Id])
    expect(t.entryManager.isAlive(t.blockB1Id)).toBe(true)
    expect(t.entryManager.isAlive(t.blockB2Id)).toBe(true)
    expect(t.entryManager.getConnections(t.rootBId).map(c => c.id)).toEqual([t.connBId])
  })

  it('throws when rootId is missing or not a root, without removing anything', () => {
    const t = createTwoRoots()

    expect(() => t.entryManager.clearEntries()).toThrow(/not a root entry/)
    expect(() => t.entryManager.clearEntries(t.containerAId)).toThrow(/not a root entry/)
    expect(() => t.entryManager.clearEntries('no-such-id')).toThrow(/not a root entry/)

    expect(t.entryManager.getChildren(t.rootAId)).toEqual([t.blockA1Id, t.containerAId])
    expect(t.entryManager.getChildren(t.containerAId)).toEqual([t.blockA2Id])
    expect(t.entryManager.getChildren(t.rootBId)).toEqual([t.blockB1Id, t.blockB2Id])
  })
})

describe('EntryHandlerFacade.getConnections', () => {
  it('returns only the connections whose endpoints belong to the given root', () => {
    const t = createTwoRoots()

    const connsA = t.entryManager.getConnections(t.rootAId)
    expect(connsA.map(c => c.id)).toEqual([t.connAId])
    expect(connsA[0].output.entryId).toBe(t.blockA1Id)
    expect(connsA[0].input.entryId).toBe(t.blockA2Id)

    expect(t.entryManager.getConnections(t.rootBId).map(c => c.id)).toEqual([t.connBId])
  })

  it('throws when rootId is missing or not a root', () => {
    const t = createTwoRoots()

    expect(() => t.entryManager.getConnections()).toThrow(/not a root entry/)
    expect(() => t.entryManager.getConnections(t.blockA1Id)).toThrow(/not a root entry/)
  })
})

describe('EntryHandlerFacade layouts', () => {
  it("returns only the given root's layouts from getAllLayouts", () => {
    const t = createTwoRoots()
    t.entryManager.addLayout(t.blockA1Id, 10, 20)
    t.entryManager.addLayout(t.blockA2Id, 40, 20)
    t.entryManager.addLayout(t.blockB1Id, 10, 20)

    const idsA = t.entryManager.getAllLayouts(t.rootAId).map(([id]) => id)
    const idsB = t.entryManager.getAllLayouts(t.rootBId).map(([id]) => id)

    expect(idsA.sort()).toEqual([t.blockA1Id, t.blockA2Id].sort())
    expect(idsB).toEqual([t.blockB1Id])
    expect(t.entryManager.getLayout(t.blockA1Id)).toEqual({ y: 10, height: 20, rootId: t.rootAId })
  })

  it("keeps other roots' layouts when clearing one root", () => {
    const t = createTwoRoots()
    t.entryManager.addLayout(t.blockA1Id, 10, 20)
    t.entryManager.addLayout(t.blockB1Id, 30, 20)

    t.entryManager.clearLayouts(t.rootAId)

    expect(t.entryManager.getAllLayouts(t.rootAId)).toEqual([])
    expect(t.entryManager.getLayout(t.blockA1Id)).toBeUndefined()
    expect(t.entryManager.getAllLayouts(t.rootBId)).toEqual([
      [t.blockB1Id, { y: 30, height: 20, rootId: t.rootBId }]
    ])
  })

  it("bumps only the affected root's layouts tick on addLayout/clearLayouts", () => {
    const t = createTwoRoots()
    const tickA = t.entryManager.getLayoutsTick(t.rootAId)
    const tickB = t.entryManager.getLayoutsTick(t.rootBId)
    expect(tickA).toBeDefined()
    expect(tickB).toBeDefined()
    const a0 = tickA.value
    const b0 = tickB.value

    t.entryManager.addLayout(t.blockA1Id, 10, 20)
    expect(tickA.value).toBe(a0 + 1)
    expect(tickB.value).toBe(b0)

    t.entryManager.clearLayouts(t.rootAId)
    expect(tickA.value).toBe(a0 + 2)
    expect(tickB.value).toBe(b0)
  })

  it("drops a root's layouts tick when the root itself is removed", () => {
    const t = createTwoRoots()
    expect(t.entryManager.getLayoutsTick(t.rootAId)).toBeDefined()

    t.entryManager.removeEntry(t.rootAId)

    expect(t.entryManager.getLayoutsTick(t.rootAId)).toBeUndefined()
    expect(t.entryManager.getLayoutsTick(t.rootBId)).toBeDefined()
  })

  it('throws from clearLayouts/getAllLayouts when rootId is missing or not a root', () => {
    const t = createTwoRoots()
    t.entryManager.addLayout(t.blockA1Id, 10, 20)

    expect(() => t.entryManager.clearLayouts()).toThrow(/not a root entry/)
    expect(() => t.entryManager.clearLayouts(t.blockA1Id)).toThrow(/not a root entry/)
    expect(() => t.entryManager.getAllLayouts()).toThrow(/not a root entry/)
    expect(() => t.entryManager.getAllLayouts(t.blockA1Id)).toThrow(/not a root entry/)
    expect(t.entryManager.getLayout(t.blockA1Id)).toBeDefined()
  })
})
