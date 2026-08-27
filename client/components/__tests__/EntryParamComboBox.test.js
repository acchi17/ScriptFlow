import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EntryParamComboBox from '@/components/EntryParamComboBox.vue'

describe('EntryParamComboBox', () => {
  it('displays a string value as the selected option', () => {
    const paramDef = { name: 'p', dataType: 'string', items: ['a', 'b', 'c'] }
    const wrapper = mount(EntryParamComboBox, {
      props: { entryId: 'e1', paramCategory: 'input', paramDef, value: 'b' }
    })

    expect(wrapper.find('select').element.value).toBe('b')
  })

  it('displays a number value as the selected option', () => {
    const paramDef = { name: 'p', dataType: 'integer', items: [1, 2, 3] }
    const wrapper = mount(EntryParamComboBox, {
      props: { entryId: 'e1', paramCategory: 'input', paramDef, value: 2 }
    })

    // native <select> options always expose their value as a string
    expect(wrapper.find('select').element.value).toBe('2')
  })

  it('falls back to the first item when value is null', () => {
    const paramDef = { name: 'p', dataType: 'string', items: ['x', 'y'] }
    const wrapper = mount(EntryParamComboBox, {
      props: { entryId: 'e1', paramCategory: 'input', paramDef, value: null }
    })

    expect(wrapper.find('select').element.value).toBe('x')
  })

  it('emits update:value with the newly selected value (string items)', async () => {
    const paramDef = { name: 'p', dataType: 'string', items: ['a', 'b', 'c'] }
    const wrapper = mount(EntryParamComboBox, {
      props: { entryId: 'e1', paramCategory: 'input', paramDef, value: 'a' }
    })

    await wrapper.find('select').setValue('c')

    expect(wrapper.emitted('update:value')[0]).toEqual(['c'])
  })

  it('emits update:value with the newly selected value (number items)', async () => {
    const paramDef = { name: 'p', dataType: 'integer', items: [1, 2, 3] }
    const wrapper = mount(EntryParamComboBox, {
      props: { entryId: 'e1', paramCategory: 'input', paramDef, value: 1 }
    })

    await wrapper.find('select').setValue('3')

    // the DOM emits the option's string form; numeric conversion (if any)
    // happens upstream in the parent via convertValue, not in this component
    expect(wrapper.emitted('update:value')[0]).toEqual(['3'])
  })
})
