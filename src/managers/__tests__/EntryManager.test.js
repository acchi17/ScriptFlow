import { describe, it, expect } from 'vitest'
import EntryManager from '../EntryManager.js'

describe('EntryManager.removeEntry', () => {
  it('clears a removed block from _entriesById and _parentIdById', () => {
    const entryManager = new EntryManager()
    const rootId = entryManager.addEntry(null, 'container', 'root', 0)
    const blockId = entryManager.addEntry(rootId, 'block', 'Add', 0)

    entryManager.removeEntry(blockId)

    expect(entryManager._entriesById.has(blockId)).toBe(false)
    expect(entryManager._parentIdById.has(blockId)).toBe(false)
  })

  it('recursively clears a removed container and its descendants from _entriesById, _parentIdById and _childrenById', () => {
    const entryManager = new EntryManager()
    const rootId = entryManager.addEntry(null, 'container', 'root', 0)
    const containerId = entryManager.addEntry(rootId, 'container', 'Sub', 0)
    const blockId = entryManager.addEntry(containerId, 'block', 'Add', 0)

    entryManager.removeEntry(containerId)

    for (const id of [containerId, blockId]) {
      expect(entryManager._entriesById.has(id)).toBe(false)
      expect(entryManager._parentIdById.has(id)).toBe(false)
    }
    expect(entryManager._childrenById.has(containerId)).toBe(false)
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
      expect(entryManager._parentIdById.has(id)).toBe(false)
    }
    for (const id of [containerAId, containerBId, containerCId]) {
      expect(entryManager._childrenById.has(id)).toBe(false)
    }
  })
})
