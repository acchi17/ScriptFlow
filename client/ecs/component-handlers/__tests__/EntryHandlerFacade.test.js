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
