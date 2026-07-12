import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SettingBooleanParam from '@/components/SettingBooleanParam.vue'

describe('SettingBooleanParam', () => {
  it('renders 2 main-selects (UI Type/Initial Value), with no leftover text-box or list-edit inputs', () => {
    const param = { ctrlType: 'check_box', initial: false }
    const wrapper = mount(SettingBooleanParam, { props: { param } })

    expect(wrapper.findAll('.main-select')).toHaveLength(2)
    expect(wrapper.findAll('.main-input')).toHaveLength(0)
    expect(wrapper.find('.item-add-input').exists()).toBe(false)
    expect(wrapper.find('.item-add-btn').exists()).toBe(false)
  })

  it('emits update with the raw value (no conversion) when UI Type changes', async () => {
    const param = { ctrlType: 'check_box', initial: false }
    const wrapper = mount(SettingBooleanParam, { props: { param } })

    await wrapper.findAll('.main-select')[0].setValue('check_box')

    expect(wrapper.emitted('update')[0]).toEqual(['ctrlType', 'check_box'])
  })

  it('emits initial as true when Initial Value is set to true', async () => {
    const param = { ctrlType: 'check_box', initial: false }
    const wrapper = mount(SettingBooleanParam, { props: { param } })

    await wrapper.findAll('.main-select')[1].setValue('true')

    expect(wrapper.emitted('update')[0]).toEqual(['initial', true])
  })

  it('emits initial as false when Initial Value is set to false', async () => {
    const param = { ctrlType: 'check_box', initial: true }
    const wrapper = mount(SettingBooleanParam, { props: { param } })

    await wrapper.findAll('.main-select')[1].setValue('false')

    expect(wrapper.emitted('update')[0]).toEqual(['initial', false])
  })

  it('emits the first item as initial when initial is null', () => {
    const param = { ctrlType: 'check_box', initial: null }
    const wrapper = mount(SettingBooleanParam, { props: { param } })

    // LabeledComboBox's correctIfInvalid auto-corrects an initial value that
    // isn't one of initialValueOptions' string values, falling back to the first item.
    expect(wrapper.emitted('update')[0]).toEqual(['initial', true])
  })
})
