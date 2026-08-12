import { describe, it, expect } from 'vitest'
import EntryManager from '../EntryManager.js'

describe('EntryManager.addEntry', () => {
  it('attaches an entry to a multiply-nested container with the intended parent chain, type and name', () => {
    const entryManager = new EntryManager()
    const rootId = entryManager.addEntry(null, 'container', 'root', 0)
    const containerAId = entryManager.addEntry(rootId, 'container', 'A', 0)
    const containerBId = entryManager.addEntry(containerAId, 'container', 'B', 0)
    const containerCId = entryManager.addEntry(containerBId, 'container', 'C', 0)
    const blockId = entryManager.addEntry(containerCId, 'block', 'Add', 0)

    expect(entryManager.getParentId(blockId)).toBe(containerCId)
    expect(entryManager.getParentId(containerCId)).toBe(containerBId)
    expect(entryManager.getParentId(containerBId)).toBe(containerAId)
    expect(entryManager.getParentId(containerAId)).toBe(rootId)
    expect(entryManager.getParentId(rootId)).toBe(null)

    expect(entryManager.getEntryType(blockId)).toBe('block')
    expect(entryManager.getEntryName(blockId)).toBe('Add')
  })

  it('does not allow attaching a child to a block parent', () => {
    const entryManager = new EntryManager()
    const rootId = entryManager.addEntry(null, 'container', 'root', 0)
    const blockId = entryManager.addEntry(rootId, 'block', 'Add', 0)

    const childBlockId = entryManager.addEntry(blockId, 'block', 'Child', 0)

    expect(entryManager.getParentId(childBlockId)).toBe(null)
    expect(entryManager.getChildren(blockId)).toEqual([])
  })
})

describe('EntryManager.removeEntry', () => {
  it('clears a removed block from _entriesById and world.hierarchies', () => {
    const entryManager = new EntryManager()
    const rootId = entryManager.addEntry(null, 'container', 'root', 0)
    const blockId = entryManager.addEntry(rootId, 'block', 'Add', 0)

    entryManager.removeEntry(blockId)

    expect(entryManager._entriesById.has(blockId)).toBe(false)
    expect(entryManager._world.hierarchies.has(blockId)).toBe(false)
  })

  it('recursively clears a removed container and its descendants from _entriesById and world.hierarchies', () => {
    const entryManager = new EntryManager()
    const rootId = entryManager.addEntry(null, 'container', 'root', 0)
    const containerId = entryManager.addEntry(rootId, 'container', 'Sub', 0)
    const blockId = entryManager.addEntry(containerId, 'block', 'Add', 0)

    entryManager.removeEntry(containerId)

    for (const id of [containerId, blockId]) {
      expect(entryManager._entriesById.has(id)).toBe(false)
      expect(entryManager._world.hierarchies.has(id)).toBe(false)
    }
  })

  it('recursively clears every level of a multiply-nested container chain', () => {
    const entryManager = new EntryManager()
    const rootId = entryManager.addEntry(null, 'container', 'root', 0)
    const containerAId = entryManager.addEntry(rootId, 'container', 'A', 0)
    const containerBId = entryManager.addEntry(containerAId, 'container', 'B', 0)
    const containerCId = entryManager.addEntry(containerBId, 'container', 'C', 0)
    const blockId = entryManager.addEntry(containerCId, 'block', 'Add', 0)

    entryManager.removeEntry(containerAId)

    for (const id of [containerAId, containerBId, containerCId, blockId]) {
      expect(entryManager._entriesById.has(id)).toBe(false)
      expect(entryManager._world.hierarchies.has(id)).toBe(false)
    }
  })
})

describe('EntryManager.reorderEntry', () => {
  it('moves an entry forward within its parent to the intended position', () => {
    const entryManager = new EntryManager()
    const rootId = entryManager.addEntry(null, 'container', 'root', 0)
    const blockAId = entryManager.addEntry(rootId, 'block', 'A', 0)
    const blockBId = entryManager.addEntry(rootId, 'block', 'B', 1)
    const blockCId = entryManager.addEntry(rootId, 'block', 'C', 2)

    const reordered = entryManager.reorderEntry(rootId, blockAId, 2)

    expect(reordered).toBe(true)
    expect(entryManager.getChildren(rootId)).toEqual([blockBId, blockAId, blockCId])
    expect(entryManager.getSequenceNumber(blockBId)).toBe(1)
    expect(entryManager.getSequenceNumber(blockAId)).toBe(2)
    expect(entryManager.getSequenceNumber(blockCId)).toBe(3)
  })

  it('moves an entry backward within its parent to the intended position', () => {
    const entryManager = new EntryManager()
    const rootId = entryManager.addEntry(null, 'container', 'root', 0)
    const blockAId = entryManager.addEntry(rootId, 'block', 'A', 0)
    const blockBId = entryManager.addEntry(rootId, 'block', 'B', 1)
    const blockCId = entryManager.addEntry(rootId, 'block', 'C', 2)

    const reordered = entryManager.reorderEntry(rootId, blockCId, 0)

    expect(reordered).toBe(true)
    expect(entryManager.getChildren(rootId)).toEqual([blockCId, blockAId, blockBId])
  })

  it("leaves a reordered container's own children and their parent ids unchanged", () => {
    const entryManager = new EntryManager()
    const rootId = entryManager.addEntry(null, 'container', 'root', 0)
    const containerId = entryManager.addEntry(rootId, 'container', 'Sub', 0)
    const blockAId = entryManager.addEntry(rootId, 'block', 'A', 1)
    const blockInsideId = entryManager.addEntry(containerId, 'block', 'Inside', 0)

    const reordered = entryManager.reorderEntry(rootId, containerId, 2)

    expect(reordered).toBe(true)
    expect(entryManager.getChildren(rootId)).toEqual([blockAId, containerId])
    expect(entryManager.getChildren(containerId)).toEqual([blockInsideId])
    expect(entryManager.getParentId(blockInsideId)).toBe(containerId)
  })

  it('returns false and leaves children unchanged when the entry is not a child of the given parent', () => {
    const entryManager = new EntryManager()
    const rootId = entryManager.addEntry(null, 'container', 'root', 0)
    const blockAId = entryManager.addEntry(rootId, 'block', 'A', 0)
    const containerId = entryManager.addEntry(rootId, 'container', 'Sub', 1)
    const blockBId = entryManager.addEntry(containerId, 'block', 'B', 0)

    const reordered = entryManager.reorderEntry(rootId, blockBId, 0)

    expect(reordered).toBe(false)
    expect(entryManager.getChildren(rootId)).toEqual([blockAId, containerId])
    expect(entryManager.getChildren(containerId)).toEqual([blockBId])
  })
})

describe('EntryManager.moveEntry', () => {
  it('moves an entry from one container to another, updating both containers and the parent id', () => {
    const entryManager = new EntryManager()
    const rootId = entryManager.addEntry(null, 'container', 'root', 0)
    const containerAId = entryManager.addEntry(rootId, 'container', 'A', 0)
    const containerBId = entryManager.addEntry(rootId, 'container', 'B', 1)
    const blockXId = entryManager.addEntry(containerAId, 'block', 'X', 0)

    const moved = entryManager.moveEntry(blockXId, containerBId, 0)

    expect(moved).toBe(true)
    expect(entryManager.getParentId(blockXId)).toBe(containerBId)
    expect(entryManager.getChildren(containerAId)).toEqual([])
    expect(entryManager.getChildren(containerBId)).toEqual([blockXId])
  })

  it("moves a container along with its descendants, leaving the descendants' parent ids unchanged", () => {
    const entryManager = new EntryManager()
    const rootId = entryManager.addEntry(null, 'container', 'root', 0)
    const containerAId = entryManager.addEntry(rootId, 'container', 'A', 0)
    const containerBId = entryManager.addEntry(rootId, 'container', 'B', 1)
    const blockInsideId = entryManager.addEntry(containerAId, 'block', 'Inside', 0)

    const moved = entryManager.moveEntry(containerAId, containerBId, 0)

    expect(moved).toBe(true)
    expect(entryManager.getParentId(containerAId)).toBe(containerBId)
    expect(entryManager.getChildren(rootId)).toEqual([containerBId])
    expect(entryManager.getChildren(containerBId)).toEqual([containerAId])
    expect(entryManager.getChildren(containerAId)).toEqual([blockInsideId])
    expect(entryManager.getParentId(blockInsideId)).toBe(containerAId)
  })

  it('detaches the entry from its old parent even when attaching to the new parent fails', () => {
    const entryManager = new EntryManager()
    const rootId = entryManager.addEntry(null, 'container', 'root', 0)
    const blockTargetId = entryManager.addEntry(rootId, 'block', 'Target', 0)
    const blockMovedId = entryManager.addEntry(rootId, 'block', 'Moved', 1)

    const moved = entryManager.moveEntry(blockMovedId, blockTargetId, 0)

    expect(moved).toBe(false)
    expect(entryManager.getParentId(blockMovedId)).toBe(null)
    expect(entryManager.getChildren(rootId)).toEqual([blockTargetId])
  })

  it('returns false and makes no changes when the entry does not exist', () => {
    const entryManager = new EntryManager()
    const rootId = entryManager.addEntry(null, 'container', 'root', 0)
    const blockAId = entryManager.addEntry(rootId, 'block', 'A', 0)

    const moved = entryManager.moveEntry('nonexistent-id', rootId, 0)

    expect(moved).toBe(false)
    expect(entryManager.getChildren(rootId)).toEqual([blockAId])
  })
})
