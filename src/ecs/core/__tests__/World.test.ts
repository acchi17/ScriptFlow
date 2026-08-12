import { describe, it, expect } from 'vitest'
import { World } from '../World'

describe('World.spawn', () => {
  it('returns a string id, unique per call', () => {
    const world = new World()
    const idA = world.spawn()
    const idB = world.spawn()

    expect(typeof idA).toBe('string')
    expect(idA).not.toBe(idB)
  })

  it('adopts an explicit id instead of generating one', () => {
    const world = new World()
    const id = world.spawn('restored-id')

    expect(id).toBe('restored-id')
    expect(world.isAlive('restored-id')).toBe(true)
  })
})

describe('World.despawn', () => {
  it('removes the entity from every component store and marks it not alive', () => {
    const world = new World()
    const id = world.spawn()
    world.entryTypes.add(id, { name: 'Add', type: 'block' })
    world.hierarchies.add(id, { parent: null, children: [] })

    world.despawn(id)

    expect(world.entryTypes.has(id)).toBe(false)
    expect(world.hierarchies.has(id)).toBe(false)
    expect(world.isAlive(id)).toBe(false)
  })
})

describe('World.isAlive', () => {
  it('is false for an id that was never spawned', () => {
    const world = new World()
    expect(world.isAlive('never-spawned')).toBe(false)
  })
})
