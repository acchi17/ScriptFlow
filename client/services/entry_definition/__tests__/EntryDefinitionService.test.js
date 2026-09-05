import { describe, it, expect } from 'vitest'
import EntryDefinitionService from '../EntryDefinitionService.js'

describe('EntryDefinitionService container definitions', () => {
  it('returns the built-in if-container definition', () => {
    const service = new EntryDefinitionService({})

    const def = service.getContainerDefinition('if-container')

    expect(def).toBeTruthy()
    expect(def.parameters.input).toEqual([
      expect.objectContaining({ name: 'Execute', dataType: 'boolean', initial: true })
    ])
  })

  it('returns undefined for an unknown container name', () => {
    const service = new EntryDefinitionService({})

    expect(service.getContainerDefinition('Container')).toBeUndefined()
  })

  it('derives the Execute param def map for if-container', () => {
    const service = new EntryDefinitionService({})

    const paramDef = service.getContainerParamDef('if-container')

    expect(paramDef).toEqual({
      input: { Execute: { value: true, dataType: 'boolean' } },
      output: {}
    })
  })

  it('returns empty input/output for an unknown container name', () => {
    const service = new EntryDefinitionService({})

    expect(service.getContainerParamDef('Container')).toEqual({ input: {}, output: {} })
  })
})
