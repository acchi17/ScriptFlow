<template>
  <LabeledComboBox
    label="UI Type"
    :value="param.ctrlType"
    :items="ctrlTypeOptions"
    @update:value="onFieldChange('ctrlType', $event)" />
  <LabeledComboBox
    label="Initial Value"
    :value="toEmptyIfNull(param.initial)"
    :items="initialValueOptions"
    @update:value="onFieldChange('initial', $event)" />
</template>

<script>
import LabeledComboBox from './LabeledComboBox.vue';

const ctrlTypeOptions = new Map([
  ['CheckBox', 'check_box'],
]);

const initialValueOptions = new Map([
  ['TRUE', 'true'],
  ['FALSE', 'false'],
]);

export default {
  name: 'SettingBooleanParam',
  components: { LabeledComboBox },
  props: {
    param: { type: Object, required: true },
  },
  emits: ['update'],
  setup(_, { emit }) {
    function toEmptyIfNull(value) {
      return value == null ? '' : String(value);
    }

    function onFieldChange(field, value) {
      if (field === 'ctrlType') {
        emit('update', field, value);
        return;
      }
      emit('update', field, value === 'true');
    }

    return { ctrlTypeOptions, initialValueOptions, toEmptyIfNull,onFieldChange };
  }
}
</script>
