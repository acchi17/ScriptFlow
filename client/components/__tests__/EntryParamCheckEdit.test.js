import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EntryParamCheckEdit from '@/components/EntryParamCheckEdit.vue'

describe('EntryParamCheckEdit', () => {
  it('displays a checked checkbox when value is true', () => {
    const paramDef = { name: 'p', dataType: 'boolean' }
    const wrapper = mount(EntryParamCheckEdit, {
      props: { entryId: 'e1', paramCategory: 'input', paramDef, value: true }
    })

    expect(wrapper.find('input').element.checked).toBe(true)
  })

  it('displays an unchecked checkbox when value is false', () => {
    const paramDef = { name: 'p', dataType: 'boolean' }
    const wrapper = mount(EntryParamCheckEdit, {
      props: { entryId: 'e1', paramCategory: 'input', paramDef, value: false }
    })

    expect(wrapper.find('input').element.checked).toBe(false)
  })

  it('emits update:value with true when the checkbox is checked', async () => {
    const paramDef = { name: 'p', dataType: 'boolean' }
    const wrapper = mount(EntryParamCheckEdit, {
      props: { entryId: 'e1', paramCategory: 'input', paramDef, value: false }
    })

    await wrapper.find('input').setValue(true)

    expect(wrapper.emitted('update:value')[0]).toEqual([true])
  })

  it('emits update:value with false when the checkbox is unchecked', async () => {
    const paramDef = { name: 'p', dataType: 'boolean' }
    const wrapper = mount(EntryParamCheckEdit, {
      props: { entryId: 'e1', paramCategory: 'input', paramDef, value: true }
    })

    await wrapper.find('input').setValue(false)

    expect(wrapper.emitted('update:value')[0]).toEqual([false])
  })
})
