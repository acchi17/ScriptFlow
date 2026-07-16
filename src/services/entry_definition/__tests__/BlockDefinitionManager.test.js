import { describe, it, expect } from 'vitest'
import BlockDefinitionManager from '@/services/entry_definition/BlockDefinitionManager.js'

function buildManager() {
  const blockDefinitions = [
    {
      name: 'math',
      blocks: [
        {
          name: 'Add',
          command: 'Add',
          parameters: {
            input: [
              {
                name: 'NumberA',
                dataType: 'integer',
                ctrlType: 'spinner',
                initial: 0,
                min: -100,
                max: 100,
                step: 1,
                items: [],
                comment: 'first operand',
              },
            ],
            output: [
              {
                name: 'Result',
                dataType: 'integer',
                ctrlType: 'spinner',
                initial: null,
                min: null,
                max: null,
                step: null,
                items: [],
                comment: '',
              },
            ],
          },
        },
      ],
    },
  ]
  return new BlockDefinitionManager(blockDefinitions)
}

describe('BlockDefinitionManager.addParam', () => {
  it('creates an input param with dataType, ctrlType, and value-constraint fields', () => {
    const manager = buildManager()

    const name = manager.addParam('Add', 'input')

    const param = manager.getBlockDefinition('Add').parameters.input.find(p => p.name === name)
    expect(param).toEqual({
      name,
      dataType: '',
      ctrlType: '',
      initial: null,
      min: null,
      max: null,
      step: null,
      items: [],
      comment: '',
    })
  })

  it('creates an output param with only name, dataType, and comment', () => {
    const manager = buildManager()

    const name = manager.addParam('Add', 'output')

    const param = manager.getBlockDefinition('Add').parameters.output.find(p => p.name === name)
    expect(param).toEqual({ name, dataType: '', comment: '' })
  })
})

describe('BlockDefinitionManager.updateParam', () => {
  it('resets ctrlType/initial/min/max/step/items when dataType changes', () => {
    const manager = buildManager()

    manager.updateParam('Add', 'input', 'NumberA', { dataType: 'boolean' })

    const param = manager.getBlockDefinition('Add').parameters.input[0]
    expect(param.dataType).toBe('boolean')
    expect(param.ctrlType).toBe('')
    expect(param.initial).toBeNull()
    expect(param.min).toBeNull()
    expect(param.max).toBeNull()
    expect(param.step).toBeNull()
    expect(param.items).toEqual([])
  })

  it('leaves name and comment untouched when dataType changes', () => {
    const manager = buildManager()

    manager.updateParam('Add', 'input', 'NumberA', { dataType: 'string' })

    const param = manager.getBlockDefinition('Add').parameters.input[0]
    expect(param.name).toBe('NumberA')
    expect(param.comment).toBe('first operand')
  })

  it('does not reset other fields when dataType is set to its current value', () => {
    const manager = buildManager()

    manager.updateParam('Add', 'input', 'NumberA', { dataType: 'integer' })

    const param = manager.getBlockDefinition('Add').parameters.input[0]
    expect(param.ctrlType).toBe('spinner')
    expect(param.initial).toBe(0)
    expect(param.min).toBe(-100)
    expect(param.max).toBe(100)
    expect(param.step).toBe(1)
  })

  it('only changes the given field when neither dataType nor ctrlType is part of the update', () => {
    const manager = buildManager()

    manager.updateParam('Add', 'input', 'NumberA', { comment: 'updated comment' })

    const param = manager.getBlockDefinition('Add').parameters.input[0]
    expect(param.comment).toBe('updated comment')
    expect(param.ctrlType).toBe('spinner')
    expect(param.initial).toBe(0)
    expect(param.min).toBe(-100)
    expect(param.max).toBe(100)
    expect(param.step).toBe(1)
  })

  it('resets initial/min/max/step/items when ctrlType changes', () => {
    const manager = buildManager()

    manager.updateParam('Add', 'input', 'NumberA', { ctrlType: 'combo_box' })

    const param = manager.getBlockDefinition('Add').parameters.input[0]
    expect(param.dataType).toBe('integer')
    expect(param.ctrlType).toBe('combo_box')
    expect(param.initial).toBeNull()
    expect(param.min).toBeNull()
    expect(param.max).toBeNull()
    expect(param.step).toBeNull()
    expect(param.items).toEqual([])
    expect(param.comment).toBe('first operand')
  })

  it('does not reset other fields when ctrlType is set to its current value', () => {
    const manager = buildManager()

    manager.updateParam('Add', 'input', 'NumberA', { ctrlType: 'spinner' })

    const param = manager.getBlockDefinition('Add').parameters.input[0]
    expect(param.initial).toBe(0)
    expect(param.min).toBe(-100)
    expect(param.max).toBe(100)
    expect(param.step).toBe(1)
  })

  it('resets via the dataType branch and applies the requested ctrlType when both change together', () => {
    const manager = buildManager()

    manager.updateParam('Add', 'input', 'NumberA', { dataType: 'string', ctrlType: 'combo_box' })

    const param = manager.getBlockDefinition('Add').parameters.input[0]
    expect(param.dataType).toBe('string')
    expect(param.ctrlType).toBe('combo_box')
    expect(param.initial).toBeNull()
    expect(param.min).toBeNull()
    expect(param.max).toBeNull()
    expect(param.step).toBeNull()
    expect(param.items).toEqual([])
  })

  it('changes dataType on an output param without introducing ctrlType or value-constraint fields', () => {
    const manager = buildManager()
    manager.addParam('Add', 'output') // real output params only have { name, dataType, comment }
    const addedName = manager.getBlockDefinition('Add').parameters.output[1].name

    manager.updateParam('Add', 'output', addedName, { dataType: 'string' })

    const param = manager.getBlockDefinition('Add').parameters.output[1]
    expect(param).toEqual({ name: addedName, dataType: 'string', comment: '' })
  })

  it('returns false when the block does not exist', () => {
    const manager = buildManager()
    expect(manager.updateParam('DoesNotExist', 'input', 'NumberA', { dataType: 'string' })).toBe(false)
  })

  it('returns false when the param does not exist', () => {
    const manager = buildManager()
    expect(manager.updateParam('Add', 'input', 'DoesNotExist', { dataType: 'string' })).toBe(false)
  })
})
