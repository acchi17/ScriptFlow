import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SettingStringParam from '@/components/SettingStringParam.vue'
import BlockDefinitionManager from '@/services/entry_definition/BlockDefinitionManager.js'

const ctrlTypeOptions = BlockDefinitionManager.CTRL_TYPE_OPTIONS.string

describe('SettingStringParam', () => {
  it('renders a single main-input (Initial) in text_box mode, with no item-add-input', () => {
    const param = { ctrlType: 'text_box', initial: 'hello', items: [] }
    const wrapper = mount(SettingStringParam, { props: { param, ctrlTypeOptions } })

    expect(wrapper.findAll('.main-input')).toHaveLength(1)
    expect(wrapper.find('.item-add-input').exists()).toBe(false)
  })

  it('renders item-add-input in combo_box mode, with no Initial main-input', () => {
    const param = { ctrlType: 'combo_box', items: ['a', 'b'], initial: 'a' }
    const wrapper = mount(SettingStringParam, { props: { param, ctrlTypeOptions } })

    expect(wrapper.find('.item-add-input').exists()).toBe(true)
    expect(wrapper.findAll('.main-input')).toHaveLength(0)
    // UI Type select + the nested Initial select inside LabeledListEdit
    expect(wrapper.findAll('.main-select')).toHaveLength(2)
  })

  it('renders a null initial value as an empty string in main-input', () => {
    const param = { ctrlType: 'text_box', initial: null, items: [] }
    const wrapper = mount(SettingStringParam, { props: { param, ctrlTypeOptions } })

    expect(wrapper.find('.main-input').element.value).toBe('')
  })

  it('emits update with the raw value when UI Type changes', async () => {
    const param = { ctrlType: 'text_box', initial: null, items: [] }
    const wrapper = mount(SettingStringParam, { props: { param, ctrlTypeOptions } })

    await wrapper.find('.main-select').setValue('combo_box')

    expect(wrapper.emitted('update')[0]).toEqual(['ctrlType', 'combo_box'])
  })

  it('emits update with the raw text (no conversion) when Initial changes in text_box mode', async () => {
    const param = { ctrlType: 'text_box', initial: null, items: [] }
    const wrapper = mount(SettingStringParam, { props: { param, ctrlTypeOptions } })

    const initialInput = wrapper.find('.main-input')
    await initialInput.setValue('hello')
    await initialInput.trigger('change')

    expect(wrapper.emitted('update')[0]).toEqual(['initial', 'hello'])
  })

  it('emits an update event with the added item appended when adding an item in combo_box mode', async () => {
    const param = { ctrlType: 'combo_box', items: ['a', 'b'], initial: 'a' }
    const wrapper = mount(SettingStringParam, { props: { param, ctrlTypeOptions } })

    await wrapper.find('.item-add-input').setValue('c')
    await wrapper.find('.item-add-btn').trigger('click')

    expect(wrapper.emitted('update')[0]).toEqual(['items', ['a', 'b', 'c']])
  })

  it('emits the first item as initial when initial is not one of items in combo_box mode', () => {
    const param = { ctrlType: 'combo_box', items: ['a', 'b'], initial: 'z' }
    const wrapper = mount(SettingStringParam, { props: { param, ctrlTypeOptions } })

    // LabeledListEdit's correctIfInvalid auto-corrects an initial value that
    // isn't one of items' string values, falling back to the first item.
    expect(wrapper.emitted('update')[0]).toEqual(['initial', 'a'])
  })
})
