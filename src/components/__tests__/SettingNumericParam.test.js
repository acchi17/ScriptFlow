import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SettingNumericParam from '@/components/SettingNumericParam.vue'
import BlockDefinitionManager from '@/services/entry_definition/BlockDefinitionManager.js'

const ctrlTypeOptions = BlockDefinitionManager.CTRL_TYPE_OPTIONS.numeric

describe('SettingNumericParam', () => {
  it('renders 4 main-inputs (Initial/Step/Min/Max) in spinner mode, with no item-add-input', () => {
    const param = { ctrlType: 'spinner', dataType: 'float', initial: null, step: 2, min: 0, max: 10 }
    const wrapper = mount(SettingNumericParam, { props: { param, ctrlTypeOptions } })

    const inputs = wrapper.findAll('.main-input')
    expect(inputs).toHaveLength(4)
    expect(wrapper.find('.item-add-input').exists()).toBe(false)
  })

  it('renders item-add-input in combo_box mode, with no Initial/Step/Min/Max main-inputs', () => {
    const param = { ctrlType: 'combo_box', dataType: 'float', items: ['1', '2'], initial: '1' }
    const wrapper = mount(SettingNumericParam, { props: { param, ctrlTypeOptions } })

    expect(wrapper.find('.item-add-input').exists()).toBe(true)
    expect(wrapper.findAll('.main-input')).toHaveLength(0)
    // UI Type select + the nested Initial select inside LabeledListEdit
    expect(wrapper.findAll('.main-select')).toHaveLength(2)
  })

  it('renders null values as empty strings in main-input', () => {
    const param = { ctrlType: 'spinner', dataType: 'float', initial: null, step: 2, min: 0, max: 10 }
    const wrapper = mount(SettingNumericParam, { props: { param, ctrlTypeOptions } })

    const inputs = wrapper.findAll('.main-input')
    expect(inputs[0].element.value).toBe('') // Initial
    expect(inputs[1].element.value).toBe('2') // Step
  })

  it('emits update with the raw value (no conversion) when UI Type changes', async () => {
    const param = { ctrlType: 'spinner', dataType: 'float', initial: null, step: null, min: null, max: null }
    const wrapper = mount(SettingNumericParam, { props: { param, ctrlTypeOptions } })

    await wrapper.find('.main-select').setValue('combo_box')

    expect(wrapper.emitted('update')[0]).toEqual(['ctrlType', 'combo_box'])
  })

  it('converts input text to a Number and emits update when dataType is float', async () => {
    const param = { ctrlType: 'spinner', dataType: 'float', initial: null, step: null, min: null, max: null }
    const wrapper = mount(SettingNumericParam, { props: { param, ctrlTypeOptions } })

    const initialInput = wrapper.findAll('.main-input')[0]
    await initialInput.setValue('3.5')
    await initialInput.trigger('change')

    expect(wrapper.emitted('update')[0]).toEqual(['initial', 3.5])
  })

  it('truncates the converted value to an integer when dataType is integer', async () => {
    const param = { ctrlType: 'spinner', dataType: 'integer', initial: null, step: null, min: null, max: null }
    const wrapper = mount(SettingNumericParam, { props: { param, ctrlTypeOptions } })

    const stepInput = wrapper.findAll('.main-input')[1]
    await stepInput.setValue('3.9')
    await stepInput.trigger('change')

    expect(wrapper.emitted('update')[0]).toEqual(['step', 3]) // Math.trunc(3.9) === 3
  })

  it('emits null when the input text cannot be converted to a number', async () => {
    const param = { ctrlType: 'spinner', dataType: 'float', initial: null, step: null, min: null, max: null }
    const wrapper = mount(SettingNumericParam, { props: { param, ctrlTypeOptions } })

    const minInput = wrapper.findAll('.main-input')[2]
    await minInput.setValue('abc')
    await minInput.trigger('change')

    expect(wrapper.emitted('update')[0]).toEqual(['min', null])
  })

  it('converts added items to numbers and dedupes them when adding an item in combo_box mode', async () => {
    const param = { ctrlType: 'combo_box', dataType: 'float', items: ['1', '2'], initial: '1' }
    const wrapper = mount(SettingNumericParam, { props: { param, ctrlTypeOptions } })

    await wrapper.find('.item-add-input').setValue('1.0') // numerically duplicates the existing '1'
    await wrapper.find('.item-add-btn').trigger('click')

    expect(wrapper.emitted('update')[0]).toEqual(['items', [1, 2]])
  })

  it('emits an update event with items converted to a list of integers when adding an item in combo_box mode', async () => {
    const param = { ctrlType: 'combo_box', dataType: 'float', items: ['1', '2'], initial: '1' }
    const wrapper = mount(SettingNumericParam, { props: { param, ctrlTypeOptions } })

    await wrapper.find('.item-add-input').setValue('3')
    await wrapper.find('.item-add-btn').trigger('click')

    const [field, items] = wrapper.emitted('update')[0]

    expect(field).toBe('items')
    expect(items).toEqual([1, 2, 3])
    items.forEach(item => expect(Number.isInteger(item)).toBe(true))
  })

  it('excludes an added item from the update payload when it cannot be converted to a number', async () => {
    const param = { ctrlType: 'combo_box', dataType: 'float', items: ['1', '2'], initial: '1' }
    const wrapper = mount(SettingNumericParam, { props: { param, ctrlTypeOptions } })

    await wrapper.find('.item-add-input').setValue('abc')
    await wrapper.find('.item-add-btn').trigger('click')

    // LabeledListEdit itself emits ['1', '2', 'abc'] via update:items, but
    // SettingNumericParam's convertTexts excludes the unconvertible element,
    // so 'abc' does not appear in the final update event.
    expect(wrapper.emitted('update')[0]).toEqual(['items', [1, 2]])
  })

  it('emits the first item as initial when initial cannot be converted to a number in combo_box mode', () => {
    const param = { ctrlType: 'combo_box', dataType: 'float', items: ['1', '2'], initial: 'abc' }
    const wrapper = mount(SettingNumericParam, { props: { param, ctrlTypeOptions } })

    // LabeledListEdit's correctIfInvalid auto-corrects an initial value that
    // isn't one of items' string values, falling back to the first item.
    expect(wrapper.emitted('update')[0]).toEqual(['initial', 1])
  })
})
