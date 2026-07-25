import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EntryParamTextBox from '@/components/EntryParamTextBox.vue'

describe('EntryParamTextBox', () => {
  it('displays the provided string value', () => {
    const paramDef = { name: 'p', dataType: 'string' }
    const wrapper = mount(EntryParamTextBox, {
      props: { entryId: 'e1', paramCategory: 'input', paramDef, value: 'hello' }
    })

    expect(wrapper.find('input').element.value).toBe('hello')
  })

  it('displays an empty string by default', () => {
    const paramDef = { name: 'p', dataType: 'string' }
    const wrapper = mount(EntryParamTextBox, {
      props: { entryId: 'e1', paramCategory: 'input', paramDef }
    })

    expect(wrapper.find('input').element.value).toBe('')
  })

  it('emits update:value with the entered text on change', async () => {
    const paramDef = { name: 'p', dataType: 'string' }
    const wrapper = mount(EntryParamTextBox, {
      props: { entryId: 'e1', paramCategory: 'input', paramDef, value: '' }
    })

    await wrapper.find('input').setValue('new text')

    expect(wrapper.emitted('update:value')[0]).toEqual(['new text'])
  })
})
