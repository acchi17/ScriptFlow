<template>
  <LabeledComboBox
    label="UI Type"
    :items="ctrlTypeOptions"
    :value="param.ctrlType"
    @update:value="onFieldChange('ctrlType', $event)" />
  <LabeledListEdit v-if="param.ctrlType === 'combo_box'"
    label="Items"
    :items="param.items"
    :value="toEmptyIfNull(param.initial)"
    @update:value="onFieldChange('initial', $event)"
    @update:items="onFieldChange('items', $event)" />
  <template v-else>
    <LabeledTextBox
      label="Initial"
      :value="toEmptyIfNull(param.initial)"
      @update:value="onFieldChange('initial', $event)" />
    <LabeledTextBox
      label="Step"
      :value="toEmptyIfNull(param.step)"
      @update:value="onFieldChange('step', $event)" />
    <LabeledTextBox
      label="Min"
      :value="toEmptyIfNull(param.min)"
      @update:value="onFieldChange('min', $event)" />
    <LabeledTextBox
      label="Max"
      :value="toEmptyIfNull(param.max)"
      @update:value="onFieldChange('max', $event)" />
  </template>
</template>

<script>
import LabeledListEdit from './LabeledListEdit.vue';
import LabeledComboBox from './LabeledComboBox.vue';
import LabeledTextBox  from './LabeledTextBox.vue';

const ctrlTypeOptions = new Map([
  ['Spinner',  'spinner'],
  ['ComboBox', 'combo_box'],
]);

export default {
  name: 'SettingNumericParam',
  components: { LabeledListEdit, LabeledComboBox, LabeledTextBox },
  props: {
    param: { type: Object, required: true },
  },
  emits: ['update'],
  setup(props, { emit }) {
    function toEmptyIfNull(value) {
      return value == null ? '' : String(value);
    }

    function convertText(text) {
      const n = Number(text);
      if (isNaN(n)) return null;
      return props.param.dataType === 'integer' ? Math.trunc(n) : n;
    }

    function convertTexts(textArray) {
      const result = [];
      for (const text of textArray) {
        const item = convertText(text);
        if (item != null && !result.includes(item)) result.push(item);
      }
      return result;
    }

    function onFieldChange(field, value) {
      if (field === 'ctrlType') {
        emit('update', field, value);
        return;
      }
      if (field === 'items') {
        emit('update', field, convertTexts(value));
        return;
      }
      emit('update', field, convertText(value));
    }

    return { ctrlTypeOptions, toEmptyIfNull, onFieldChange };
  }
}
</script>
