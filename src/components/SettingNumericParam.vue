<template>
  <LabeledComboBox
    label="UI Type"
    :items="ctrlTypeOptions"
    :value="param.ctrlType"
    @update:value="onUpdate('ctrlType', $event)" />
  <SimpleListEditor v-if="param.ctrlType === 'combo_box'"
    :items="param.items"
    :initial="String(param.initial)"
    :dataType="param.dataType"
    @update="onUpdate" />
  <template v-else>
    <LabeledTextBox
      label="Initial Value"
      :value="String(param.initial)"
      :dataType="param.dataType === 'integer' ? 'integer' : 'number'"
      @update:value="onFieldChange('initial', $event)" />
    <LabeledTextBox
      label="Step Value"
      :value="String(param.step)"
      :dataType="param.dataType === 'integer' ? 'integer' : 'number'"
      @update:value="onFieldChange('step', $event)" />
    <LabeledTextBox
      label="Min Value"
      :value="String(param.min)"
      :dataType="param.dataType === 'integer' ? 'integer' : 'number'"
      @update:value="onFieldChange('min', $event)" />
    <LabeledTextBox
      label="Max Value"
      :value="String(param.max)"
      :dataType="param.dataType === 'integer' ? 'integer' : 'number'"
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
  setup(_, { emit }) {
    function onUpdate(field, value) {
      emit('update', field, value);
    }

    function onFieldChange(field, rawValue) {
      emit('update', field, Number(rawValue));
    }

    return { ctrlTypeOptions, onUpdate, onFieldChange };
  }
}
</script>
