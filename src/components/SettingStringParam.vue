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
  <LabeledTextBox v-else
    label="Initial"
    :value="toEmptyIfNull(param.initial)"
    @update:value="onFieldChange('initial', $event)" />
</template>

<script>
import LabeledComboBox from './LabeledComboBox.vue';
import LabeledListEdit from './LabeledListEdit.vue';
import LabeledTextBox from './LabeledTextBox.vue';

export default {
  name: 'SettingStringParam',
  components: { LabeledComboBox, LabeledListEdit, LabeledTextBox },
  props: {
    param:           { type: Object, required: true },
    ctrlTypeOptions: { type: Map,    required: true },
  },
  emits: ['update'],
  setup(_, { emit }) {
    function toEmptyIfNull(value) {
      return value == null ? '' : String(value);
    }

    function onFieldChange(field, value) {
      emit('update', field, value);
    }

    return { toEmptyIfNull, onFieldChange };
  }
}
</script>
