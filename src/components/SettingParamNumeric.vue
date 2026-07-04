<template>
  <LabeledComboBox
    label="UI Type"
    :items="ctrlTypeOptions"
    :value="param.ctrlType"
    @update:value="onUpdate('ctrlType', $event)" />
  <SimpleListEditor v-if="param.ctrlType === 'combo_box'"
    :param="param"
    @update="onUpdate" />
  <template v-else>
    <LabeledTextBox
      labelText="Initial Value"
      :dataType="param.dataType === 'integer' ? 'integer' : 'number'"
      :value="String(param.default)"
      @update:value="onFieldChange('default', $event)" />
    <div class="detail-row">
      <span class="detail-label">Step Value</span>
      <input class="detail-input detail-input-num" type="number"
        :value="param.step"
        @change="onFieldChange('step', $event.target.value)" />
    </div>
    <div class="detail-row">
      <span class="detail-label">Min Value</span>
      <input class="detail-input detail-input-num" type="number"
        :value="param.min"
        @change="onFieldChange('min', $event.target.value)" />
    </div>
    <div class="detail-row">
      <span class="detail-label">Max Value</span>
      <input class="detail-input detail-input-num" type="number"
        :value="param.max"
        @change="onFieldChange('max', $event.target.value)" />
    </div>
  </template>
</template>

<script>
import SimpleListEditor from './SimpleListEditor.vue';
import LabeledComboBox from './LabeledComboBox.vue';
import LabeledTextBox  from './LabeledTextBox.vue';

const ctrlTypeOptions = {
  Spinner:   'spinner',
  ComboBox:  'combo_box',
};

export default {
  name: 'SettingParamNumeric',
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

<style scoped>
.detail-row {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--block-setting-label-input-gap);
}

.detail-label {
  width: var(--block-setting-label-width);
  font-size: var(--block-setting-font-size);
  color: var(--block-setting-label-font-color);
  user-select: none;
}

.detail-input {
  flex: 1;
  font-size: var(--block-setting-font-size);
  padding: var(--block-setting-input-padding);
  border: var(--base-outline-border);
  border-radius: var(--block-setting-border-radius);
  background-color: var(--block-setting-input-bg-color);
  outline: none;
}

.detail-input-num {
  text-align: right;
}
</style>
