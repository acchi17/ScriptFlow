<template>
  <LabeledComboBox
    label="UI Type"
    :items="ctrlTypeOptions"
    :value="param.ctrlType"
    @update:value="onFieldChange('ctrlType', $event)" />
  <SimpleListEditor v-if="param.ctrlType === 'combo_box'"
    :items="param.items"
    :initial="String(param.initial)"
    @update="onUpdate" />
  <template v-else>
    <LabeledTextBox
      label="Initial"
      :value="String(param.initial)"
      @update:value="onFieldChange('initial', $event)" />
    <LabeledTextBox
      label="Step"
      :value="String(param.step)"
      @update:value="onFieldChange('step', $event)" />
    <LabeledTextBox
      label="Min"
      :value="String(param.min)"
      @update:value="onFieldChange('min', $event)" />
    <LabeledTextBox
      label="Max"
      :value="String(param.max)"
      @update:value="onFieldChange('max', $event)" />
  </template>
</template>

<script>
import SimpleListEditor from './SimpleListEditor.vue';
import LabeledComboBox from './LabeledComboBox.vue';
import LabeledTextBox  from './LabeledTextBox.vue';

const ctrlTypeOptions = new Map([
  ['Spinner',  'spinner'],
  ['ComboBox', 'combo_box'],
]);

export default {
  name: 'SettingNumericParam',
  components: { SimpleListEditor, LabeledComboBox, LabeledTextBox },
  props: {
    param: { type: Object, required: true },
  },
  emits: ['update'],
  setup(props, { emit }) {
    function normalizeListItem(text) {
      const n = Number(text);
      if (isNaN(n)) return null;
      return props.param.dataType === 'integer' ? Math.trunc(n) : n;
    }

    function normalizeItems(items) {
      const result = [];
      for (const raw of items) {
        const item = normalizeListItem(String(raw));
        if (item != null && !result.includes(item)) result.push(item);
      }
      return result;
    }

    function onUpdate(field, value) {
      if (field === 'items') {
        emit('update', field, normalizeItems(value));
        return;
      }
      if (field === 'initial') {
        const normalized = value === '' ? '' : normalizeListItem(value);
        emit('update', field, normalized ?? '');
        return;
      }
      emit('update', field, value);
    }

    function onFieldChange(field, rawValue) {
      if (field === 'ctrlType') {
        emit('update', field, rawValue);
        return;
      }
      const n = Number(rawValue);
      const corrected = isNaN(n) ? 0 : (props.param.dataType === 'integer' ? Math.trunc(n) : n);
      emit('update', field, corrected);
    }

    return { ctrlTypeOptions, onUpdate, onFieldChange };
  }
}
</script>
