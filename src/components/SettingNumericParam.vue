<template>
  <LabeledComboBox
    label="UI Type"
    :value="param.ctrlType"
    :items="ctrlTypeOptions"
    @update:value="onFieldChange('ctrlType', $event)" />
  <LabeledListEdit v-if="param.ctrlType === 'combo_box'"
                   label="Items"
                   :value="toEmptyIfNull(param.initial)"
                   :items="param.items"
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
import LabeledComboBox from './LabeledComboBox.vue';
import LabeledListEdit from './LabeledListEdit.vue';
import LabeledTextBox  from './LabeledTextBox.vue';
import { toEmptyIfNull } from '../utils/common.js';

export default {
  name: 'SettingNumericParam',
  components: { LabeledListEdit, LabeledComboBox, LabeledTextBox },
  props: {
    param:           { type: Object, required: true },
    ctrlTypeOptions: { type: Map,    required: true },
  },
  emits: ['update'],
  setup(props, { emit }) {
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

    return { toEmptyIfNull, onFieldChange };
  }
}
</script>
