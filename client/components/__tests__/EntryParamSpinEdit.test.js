import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EntryParamSpinEdit from '@/components/EntryParamSpinEdit.vue'

describe('EntryParamSpinEdit', () => {
  it('displays the provided value', () => {
    const paramDef = { name: 'p', dataType: 'integer' }
    const wrapper = mount(EntryParamSpinEdit, {
      props: { entryId: 'e1', paramCategory: 'input', paramDef, value: 7 }
    })

    expect(wrapper.find('input').element.value).toBe('7')
  })

  it('displays 0 when value is null', () => {
    const paramDef = { name: 'p', dataType: 'integer' }
    const wrapper = mount(EntryParamSpinEdit, {
      props: { entryId: 'e1', paramCategory: 'input', paramDef, value: null }
    })

    expect(wrapper.find('input').element.value).toBe('0')
  })

  it('uses paramDef.step as the step attribute', () => {
    const paramDef = { name: 'p', dataType: 'integer', step: 5 }
    const wrapper = mount(EntryParamSpinEdit, {
      props: { entryId: 'e1', paramCategory: 'input', paramDef, value: 0 }
    })

    expect(wrapper.find('input').attributes('step')).toBe('5')
  })

  it('defaults the step attribute to 1 when paramDef.step is not specified', () => {
    const paramDef = { name: 'p', dataType: 'integer' }
    const wrapper = mount(EntryParamSpinEdit, {
      props: { entryId: 'e1', paramCategory: 'input', paramDef, value: 0 }
    })

    expect(wrapper.find('input').attributes('step')).toBe('1')
  })

  it('emits update:value with the entered number on change', async () => {
    const paramDef = { name: 'p', dataType: 'integer' }
    const wrapper = mount(EntryParamSpinEdit, {
      props: { entryId: 'e1', paramCategory: 'input', paramDef, value: 0 }
    })

    await wrapper.find('input').setValue('7')

    expect(wrapper.emitted('update:value')[0]).toEqual([7])
  })

  it('clamps the emitted value to paramDef.max when it exceeds the max', async () => {
    const paramDef = { name: 'p', dataType: 'integer', max: 10 }
    const wrapper = mount(EntryParamSpinEdit, {
      props: { entryId: 'e1', paramCategory: 'input', paramDef, value: 5 }
    })

    await wrapper.find('input').setValue('99')

    expect(wrapper.emitted('update:value')[0]).toEqual([10])
  })

  it('clamps the emitted value to paramDef.min when it is below the min', async () => {
    const paramDef = { name: 'p', dataType: 'integer', min: 0 }
    const wrapper = mount(EntryParamSpinEdit, {
      props: { entryId: 'e1', paramCategory: 'input', paramDef, value: 5 }
    })

    await wrapper.find('input').setValue('-5')

    expect(wrapper.emitted('update:value')[0]).toEqual([0])
  })

  it('treats non-numeric input as 0', async () => {
    const paramDef = { name: 'p', dataType: 'integer' }
    const wrapper = mount(EntryParamSpinEdit, {
      props: { entryId: 'e1', paramCategory: 'input', paramDef, value: 5 }
    })

    // a real <input type="number"> never lets non-numeric characters land,
    // so the DOM value is already sanitized to '' by the time change fires
    await wrapper.find('input').setValue('abc')

    expect(wrapper.emitted('update:value')[0]).toEqual([0])
    expect(wrapper.find('input').element.value).toBe('0')
  })
})
